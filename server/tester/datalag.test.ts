/**
 * Poolen og transaksjonshjelperen i `server/datalag.ts` mot SQL Server (#419).
 * Forventningene har kilde i «Ferdig når» i #419 og akseptkriteriet i F0b om at
 * kontekst fra én forespørsel ikke finnes på en gjenbrukt forbindelse etter
 * commit eller rollback (hovedplanen, F0b leveranse 1).
 *
 * Poolen har én forbindelse, så neste lån er samme forbindelse når den går
 * tilbake, og en ny når den er forkastet. `sesjonen` leser med en vanlig
 * forespørsel fra `mssql`, som ikke nullstiller noe selv (SQ-02), så den ser det
 * forbindelsen faktisk bærer. Feil i COMMIT, ROLLBACK og nullstillingen
 * injiseres i forbindelsen fra `tedious` for ett lån. Krever
 * `KOE_SQLSERVER_TILKOBLING`.
 */

import { randomUUID } from 'node:crypto';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import {
  CommitIkkeSendt,
  feilnummer,
  FristUtloept,
  KONTEKSTNOEKLER,
  opprettPool,
  sql,
  Tilbakerulling,
  transaksjon,
  TRANSAKSJONSFRIST_MS,
  TransaksjonAvbrutt,
  UgyldigKontekst,
  UsikkertUtfall,
  VRANGLAAS,
  VRANGLAASFORSOEK,
  type Forbindelse,
  type Kontekst,
  type Pool,
} from '../datalag.ts';
import { enGang, feilFraBasen, tidsavbrudd, vedNesteLaan, type Kall } from './forbindelse.ts';
import { opprettTestbase, SQLSERVER_TILKOBLING, type Testbase } from './sqlserver.ts';

const KONTEKST: Kontekst = {
  aktor: randomUUID(),
  prosjekt: 'prosjekt-a',
  side: 'TE',
  team: 'a'.repeat(32),
};

interface Sesjon {
  forbindelse: string;
  trancount: number;
  xact_abort: number;
  koe_aktor: string | null;
  koe_prosjekt: string | null;
  koe_side: string | null;
  koe_team: string | null;
  koe_tx: number | null;
  koe_skriving: string | null;
  tx: number | null;
}

const SESJON = `SELECT LOWER(CAST(c.connection_id AS nvarchar(36))) AS forbindelse,
         @@TRANCOUNT AS trancount,
         CASE WHEN @@OPTIONS & 16384 = 16384 THEN 1 ELSE 0 END AS xact_abort,
         ${KONTEKSTNOEKLER.map((n) => `CAST(SESSION_CONTEXT(N'${n}') AS nvarchar(100)) AS ${n}`).join(', ')},
         CAST(CURRENT_TRANSACTION_ID() AS bigint) AS tx
    FROM sys.dm_exec_connections c WHERE c.session_id = @@SPID`;

async function sesjonen(kilde: () => sql.Request): Promise<Sesjon> {
  return (await kilde().query<Sesjon>(SESJON)).recordset[0];
}

const ingenKontekst = Object.fromEntries(KONTEKSTNOEKLER.map((n) => [n, null]));

async function lagret(pool: Pool, id: string): Promise<boolean> {
  const r = await pool
    .request()
    .input('id', sql.UniqueIdentifier, id)
    .query<{ n: number }>('SELECT COUNT(*) AS n FROM skriving WHERE id = @id');
  return r.recordset[0].n === 1;
}

function skriv(foresp: () => sql.Request, id: string) {
  return foresp().input('id', sql.UniqueIdentifier, id).query('INSERT skriving (id) VALUES (@id)');
}

/** Serveren har ingen forbindelse med ID-en, innen to sekunder. */
async function borte(pool: Pool, forbindelse: string): Promise<boolean> {
  for (let i = 0; i < 20; i++) {
    const r = await pool.request().input('id', sql.UniqueIdentifier, forbindelse).query<{
      n: number;
    }>('SELECT COUNT(*) AS n FROM sys.dm_exec_connections WHERE connection_id = @id');
    if (r.recordset[0].n === 0) return true;
    await new Promise((ok) => setTimeout(ok, 100));
  }
  return false;
}

if (!SQLSERVER_TILKOBLING) {
  console.warn('KOE_SQLSERVER_TILKOBLING er ikke satt: testene av datalaget hoppes over (#419).');
}

describe.skipIf(!SQLSERVER_TILKOBLING)('transaksjonshjelperen mot SQL Server (#419)', () => {
  let base: Testbase;
  let pool: Pool;

  beforeAll(async () => {
    base = await opprettTestbase('datalag', { maks: 1 });
    await base.pool
      .request()
      .batch('CREATE TABLE skriving (id uniqueidentifier NOT NULL PRIMARY KEY)');
    pool = await opprettPool(
      { ...sql.ConnectionPool.parseConnectionString(SQLSERVER_TILKOBLING), database: base.navn },
      { maks: 1 }
    );
  }, 240_000);

  afterAll(async () => {
    await pool?.close();
    await base?.slett();
  }, 60_000);

  afterEach(() => {
    vi.restoreAllMocks();
  });

  /** `console.error` uten utskrift, så loggen fra datalaget kan leses i testen. */
  const loggen = () => vi.spyOn(console, 'error').mockImplementation(() => undefined);

  it('i transaksjonen er xact_abort på og konteksten satt og bundet til transaksjonen', async () => {
    const inne = await transaksjon(pool, KONTEKST, (f) => sesjonen(f));
    expect(inne).toMatchObject({
      trancount: 1,
      xact_abort: 1,
      koe_aktor: KONTEKST.aktor.toUpperCase(),
      koe_prosjekt: KONTEKST.prosjekt,
      koe_side: 'TE',
      koe_team: KONTEKST.team,
    });
    expect(Number(inne.koe_tx)).toBe(Number(inne.tx));
  });

  it('arbeidet kan ikke skrive over konteksten, som er skrivebeskyttet for sesjonen', async () => {
    const feil = await transaksjon(pool, KONTEKST, (f) =>
      f().batch(`EXEC sp_set_session_context N'koe_prosjekt', N'prosjekt-b'`)
    ).catch((e: unknown) => e);
    expect(feil).toBeInstanceOf(Error);
    expect(feilnummer(feil)).toBe(15664);
  });

  it('etter COMMIT er forbindelsen gjenbrukt uten åpen transaksjon og uten kontekst, og skrivingen er lagret', async () => {
    const id = randomUUID();
    const inne = await transaksjon(pool, KONTEKST, async (f) => {
      await skriv(f, id);
      return sesjonen(f);
    });
    const etter = await sesjonen(() => pool.request());
    expect(etter).toMatchObject({
      forbindelse: inne.forbindelse,
      trancount: 0,
      xact_abort: 1,
      ...ingenKontekst,
    });
    expect(await lagret(pool, id)).toBe(true);
  });

  it('etter ROLLBACK fordi arbeidet kaster, er forbindelsen gjenbrukt uten transaksjon og kontekst, og ingenting er lagret', async () => {
    const id = randomUUID();
    let inne: Sesjon | undefined;
    await expect(
      transaksjon(pool, KONTEKST, async (f) => {
        await skriv(f, id);
        inne = await sesjonen(f);
        throw new Error('arbeidet feilet');
      })
    ).rejects.toThrow('arbeidet feilet');
    const etter = await sesjonen(() => pool.request());
    expect(etter).toMatchObject({ forbindelse: inne!.forbindelse, trancount: 0, ...ingenKontekst });
    expect(await lagret(pool, id)).toBe(false);
  });

  it('etter en feil der serveren avbryter transaksjonen (XACT_ABORT), er forbindelsen gjenbrukt uten transaksjon og kontekst', async () => {
    const id = randomUUID();
    let inne: Sesjon | undefined;
    const feil = await transaksjon(pool, KONTEKST, async (f) => {
      await skriv(f, id);
      inne = await sesjonen(f);
      await f().batch(`THROW 51409, N'Versjonskonflikt', 1`);
    }).catch((e: unknown) => e);
    expect(feilnummer(feil)).toBe(51409);
    const etter = await sesjonen(() => pool.request());
    expect(etter).toMatchObject({ forbindelse: inne!.forbindelse, trancount: 0, ...ingenKontekst });
    expect(await lagret(pool, id)).toBe(false);
  });

  // Kilde: rollbacken er bekreftet, så utfallet er ikke usikkert, og #419 forkaster
  // bare når COMMIT, ROLLBACK eller nullstillingen feiler (review av #530).
  it('arbeidet fanger en feil der serveren avbrøt transaksjonen: TransaksjonAvbrutt, ikke usikkert utfall, og forbindelsen gjenbrukes', async () => {
    const id = randomUUID();
    let inne: Sesjon | undefined;
    const feil = await transaksjon(pool, KONTEKST, async (f) => {
      await skriv(f, id);
      inne = await sesjonen(f);
      await f()
        .batch(`THROW 51409, N'Versjonskonflikt', 1`)
        .catch(() => undefined);
    }).catch((e: unknown) => e);
    expect(feil).toBeInstanceOf(TransaksjonAvbrutt);
    expect(feilnummer((feil as Error).cause)).toBe(51409);
    const etter = await sesjonen(() => pool.request());
    expect(etter).toMatchObject({ forbindelse: inne!.forbindelse, trancount: 0, ...ingenKontekst });
    expect(await lagret(pool, id)).toBe(false);
  });

  it('COMMIT som får tidsavbrudd uten å nå serveren: forbindelsen forkastes, og neste lån ser verken kontekst, åpen transaksjon eller skrivingen', async () => {
    const id = randomUUID();
    vedNesteLaan(pool, (f) =>
      enGang(f, 'commitTransaction', () => (cb) => setImmediate(cb, tidsavbrudd()))
    );
    let inne: Sesjon | undefined;
    const feil = await transaksjon(pool, KONTEKST, async (f) => {
      await skriv(f, id);
      inne = await sesjonen(f);
    }).catch((e: unknown) => e);
    expect(feil).toBeInstanceOf(UsikkertUtfall);

    const etter = await sesjonen(() => pool.request());
    expect(etter).toMatchObject({ trancount: 0, ...ingenKontekst });
    expect(etter.forbindelse).not.toBe(inne!.forbindelse);
    expect(await borte(pool, inne!.forbindelse)).toBe(true);
    expect(await lagret(pool, id)).toBe(false);
  });

  it('COMMIT som lykkes på serveren mens klienten får feil: forbindelsen forkastes, og utfallet meldes som usikkert', async () => {
    const id = randomUUID();
    vedNesteLaan(pool, (f) =>
      enGang(
        f,
        'commitTransaction',
        (ekte) =>
          (cb, ...rest) =>
            ekte(() => cb(tidsavbrudd()), ...rest)
      )
    );
    let inne: Sesjon | undefined;
    const feil = await transaksjon(pool, KONTEKST, async (f) => {
      await skriv(f, id);
      inne = await sesjonen(f);
    }).catch((e: unknown) => e);
    expect(feil).toBeInstanceOf(UsikkertUtfall);
    const etter = await sesjonen(() => pool.request());
    expect(etter).toMatchObject({ trancount: 0, ...ingenKontekst });
    expect(etter.forbindelse).not.toBe(inne!.forbindelse);
    expect(await lagret(pool, id)).toBe(true);
  });

  // Kilde: serveren har bekreftet tilbakerullingen, så utfallet er kjent (#534, som
  // testen over der arbeidet fanger feilen). Injisert: COMMIT sendes som ROLLBACK,
  // så forbindelsen får `rollbackTransaction` fra serveren og COMMIT en feil.
  it('COMMIT som serveren ruller tilbake: TransaksjonAvbrutt, ingenting lagret, og forbindelsen gjenbrukes', async () => {
    const id = randomUUID();
    vedNesteLaan(pool, (f) =>
      enGang(f, 'commitTransaction', () => (cb) => {
        const rull = (f as unknown as { rollbackTransaction: Kall }).rollbackTransaction;
        rull.call(f, () => cb(new Error('COMMIT ble rullet tilbake')));
      })
    );
    let inne: Sesjon | undefined;
    const feil = await transaksjon(pool, KONTEKST, async (f) => {
      await skriv(f, id);
      inne = await sesjonen(f);
    }).catch((e: unknown) => e);
    expect(feil).toBeInstanceOf(TransaksjonAvbrutt);
    const etter = await sesjonen(() => pool.request());
    expect(etter).toMatchObject({ forbindelse: inne!.forbindelse, trancount: 0, ...ingenKontekst });
    expect(await lagret(pool, id)).toBe(false);
  });

  // Kilde: #543 punkt 1. Serveren melder tilbakerulling under COMMIT og COMMIT
  // feiler ikke: utfallet er kjent, ikke vellykket og ikke usikkert.
  it('tilbakerulling under COMMIT uten feil fra COMMIT: TransaksjonAvbrutt, ikke svaret', async () => {
    vedNesteLaan(pool, (f) =>
      enGang(
        f,
        'commitTransaction',
        (ekte) =>
          (cb, ...rest) =>
            ekte(
              () => {
                (f as unknown as { emit: (h: string) => void }).emit('rollbackTransaction');
                cb();
              },
              ...rest
            )
      )
    );
    const feil = await transaksjon(pool, KONTEKST, async () => 'svar').catch((e: unknown) => e);
    expect(feil).toBeInstanceOf(TransaksjonAvbrutt);
    expect(feil).not.toBeInstanceOf(UsikkertUtfall);
  });

  // Vakten mot en annen versjon av mssql (#533): uten `_abort` som lytter sendes
  // ikke COMMIT, og forbindelsen forkastes med den åpne transaksjonen.
  it('lytter ikke transaksjonen med _abort før COMMIT: ingenting lagres, og forbindelsen forkastes', async () => {
    const id = randomUUID();
    let laant: Forbindelse | undefined;
    vedNesteLaan(pool, (f) => (laant = f));
    let inne: Sesjon | undefined;
    const feil = await transaksjon(pool, KONTEKST, async (f) => {
      await skriv(f, id);
      inne = await sesjonen(f);
      (laant as unknown as { removeAllListeners: (h: string) => void }).removeAllListeners(
        'rollbackTransaction'
      );
    }).catch((e: unknown) => e);
    expect(feil).toBeInstanceOf(CommitIkkeSendt);
    const etter = await sesjonen(() => pool.request());
    expect(etter).toMatchObject({ trancount: 0, ...ingenKontekst });
    expect(etter.forbindelse).not.toBe(inne!.forbindelse);
    expect(await lagret(pool, id)).toBe(false);
  });

  // Kilde: #543 punkt 3. Med en forespørsel som pågår, avviser `mssql` COMMIT
  // (EREQINPROG), så utfallet ville blitt meldt som usikkert.
  it('arbeidet returnerer mens en forespørsel pågår: CommitIkkeSendt, ingenting lagres, og forbindelsen forkastes', async () => {
    loggen();
    const id = randomUUID();
    let inne: Sesjon | undefined;
    let pagaaende: Promise<unknown> | undefined;
    const feil = await transaksjon(pool, KONTEKST, async (f) => {
      await skriv(f, id);
      inne = await sesjonen(f);
      pagaaende = f()
        .batch("WAITFOR DELAY '00:00:00.200'")
        .catch((e: unknown) => e);
    }).catch((e: unknown) => e);
    await pagaaende;
    expect(feil).toBeInstanceOf(CommitIkkeSendt);
    const etter = await sesjonen(() => pool.request());
    expect(etter).toMatchObject({ trancount: 0, ...ingenKontekst });
    expect(etter.forbindelse).not.toBe(inne!.forbindelse);
    expect(await lagret(pool, id)).toBe(false);
  });

  it('nullstilling som feiler etter COMMIT: svaret gis, forbindelsen forkastes i stedet for å gå tilbake med konteksten, og årsaken logges', async () => {
    const logg = loggen();
    const aarsak = new Error('nullstillingen feilet');
    vedNesteLaan(pool, (f) => enGang(f, 'reset', () => (cb) => setImmediate(cb, aarsak)));
    const inne = await transaksjon(pool, KONTEKST, (f) => sesjonen(f));
    const etter = await sesjonen(() => pool.request());
    expect(etter).toMatchObject({ trancount: 0, ...ingenKontekst });
    expect(etter.forbindelse).not.toBe(inne.forbindelse);
    expect(JSON.parse(String(logg.mock.calls[0][0]))).toMatchObject({
      sted: 'Datalaget: forbindelsen forkastes etter nullstillingen',
      feilklasse: 'Error',
    });
  });

  it('forkastingen kaster etter COMMIT: svaret gis likevel, og feilen logges', async () => {
    const logg = loggen();
    const lukking = new Error('close feilet');
    vedNesteLaan(pool, (f) => {
      enGang(f, 'reset', () => (cb) => setImmediate(cb, new Error('nullstillingen feilet')));
      enGang(f, 'close', () => () => {
        throw lukking;
      });
    });
    const inne = await transaksjon(pool, KONTEKST, async (f) => (await sesjonen(f)).forbindelse);
    expect(inne).toMatch(/^[0-9a-f-]{36}$/);
    expect(logg.mock.calls.map(([l]) => JSON.parse(String(l)))).toContainEqual(
      expect.objectContaining({
        sted: 'Datalaget: forkastingen av forbindelsen feilet',
        feilklasse: 'Error',
      })
    );
    const etter = await sesjonen(() => pool.request());
    expect(etter.forbindelse).not.toBe(inne);
  });

  it('forkastingen kaster etter feilet COMMIT: UsikkertUtfall kastes likevel', async () => {
    loggen();
    vedNesteLaan(pool, (f) => {
      enGang(f, 'commitTransaction', () => (cb) => setImmediate(cb, tidsavbrudd()));
      enGang(f, 'close', () => () => {
        throw new Error('close feilet');
      });
    });
    const feil = await transaksjon(pool, KONTEKST, async () => undefined).catch((e: unknown) => e);
    expect(feil).toBeInstanceOf(UsikkertUtfall);
    expect(await sesjonen(() => pool.request())).toMatchObject({ trancount: 0, ...ingenKontekst });
  });

  it('nullstilling som melder suksess uten å rydde: kontrollen etterpå ser konteksten, forbindelsen forkastes, og funnet logges', async () => {
    const logg = loggen();
    vedNesteLaan(pool, (f) => enGang(f, 'reset', () => (cb) => setImmediate(cb)));
    const inne = await transaksjon(pool, KONTEKST, (f) => sesjonen(f));
    const etter = await sesjonen(() => pool.request());
    expect(etter).toMatchObject({ trancount: 0, ...ingenKontekst });
    expect(etter.forbindelse).not.toBe(inne.forbindelse);
    expect(JSON.parse(String(logg.mock.calls[0][0]))).toMatchObject({
      sted: 'Datalaget: forbindelsen forkastes etter nullstillingen',
      feilklasse: 'Error',
    });
  });

  it('ROLLBACK som feiler: feilen fra arbeidet kastes, og forbindelsen forkastes med den åpne transaksjonen', async () => {
    const id = randomUUID();
    vedNesteLaan(pool, (f) => {
      const objekt = f as unknown as { rollbackTransaction: Kall };
      const ekte = objekt.rollbackTransaction.bind(f);
      objekt.rollbackTransaction = (cb) => {
        objekt.rollbackTransaction = ekte;
        setImmediate(cb, tidsavbrudd());
      };
    });
    let inne: Sesjon | undefined;
    await expect(
      transaksjon(pool, KONTEKST, async (f) => {
        await skriv(f, id);
        inne = await sesjonen(f);
        throw new Error('arbeidet feilet');
      })
    ).rejects.toThrow('arbeidet feilet');
    const etter = await sesjonen(() => pool.request());
    expect(etter).toMatchObject({ trancount: 0, ...ingenKontekst });
    expect(etter.forbindelse).not.toBe(inne!.forbindelse);
    expect(await borte(pool, inne!.forbindelse)).toBe(true);
    expect(await lagret(pool, id)).toBe(false);
  });

  // Kilde: utfallet «rull tilbake med dette svaret» i #597 punkt 2. Svaret skal ikke
  // kreve et unntak, og forbindelsen behandles som etter ROLLBACK fordi arbeidet kaster.
  it('arbeidet returnerer en Tilbakerulling: svaret gis, ingenting lagres, og forbindelsen gjenbrukes uten transaksjon og kontekst', async () => {
    const id = randomUUID();
    let inne: Sesjon | undefined;
    const svar = await transaksjon(pool, KONTEKST, async (f) => {
      await skriv(f, id);
      inne = await sesjonen(f);
      return new Tilbakerulling({ skriv: false as const, grunn: 'avvist' });
    });
    expect(svar).toEqual({ skriv: false, grunn: 'avvist' });
    const etter = await sesjonen(() => pool.request());
    expect(etter).toMatchObject({ forbindelse: inne!.forbindelse, trancount: 0, ...ingenKontekst });
    expect(await lagret(pool, id)).toBe(false);
  });

  it('Tilbakerulling etter at serveren avbrøt transaksjonen: svaret gis, ikke TransaksjonAvbrutt, og forbindelsen gjenbrukes', async () => {
    const id = randomUUID();
    let inne: Sesjon | undefined;
    const svar = await transaksjon(pool, KONTEKST, async (f) => {
      await skriv(f, id);
      inne = await sesjonen(f);
      await f()
        .batch(`THROW 51409, N'Versjonskonflikt', 1`)
        .catch(() => undefined);
      return new Tilbakerulling('avvist');
    });
    expect(svar).toBe('avvist');
    const etter = await sesjonen(() => pool.request());
    expect(etter).toMatchObject({ forbindelse: inne!.forbindelse, trancount: 0, ...ingenKontekst });
    expect(await lagret(pool, id)).toBe(false);
  });

  it('Tilbakerulling der ROLLBACK feiler: svaret gis, og forbindelsen forkastes med den åpne transaksjonen', async () => {
    const id = randomUUID();
    vedNesteLaan(pool, (f) => {
      const objekt = f as unknown as { rollbackTransaction: Kall };
      const ekte = objekt.rollbackTransaction.bind(f);
      objekt.rollbackTransaction = (cb) => {
        objekt.rollbackTransaction = ekte;
        setImmediate(cb, tidsavbrudd());
      };
    });
    let inne: Sesjon | undefined;
    const svar = await transaksjon(pool, KONTEKST, async (f) => {
      await skriv(f, id);
      inne = await sesjonen(f);
      return new Tilbakerulling('avvist');
    });
    expect(svar).toBe('avvist');
    const etter = await sesjonen(() => pool.request());
    expect(etter).toMatchObject({ trancount: 0, ...ingenKontekst });
    expect(etter.forbindelse).not.toBe(inne!.forbindelse);
    expect(await borte(pool, inne!.forbindelse)).toBe(true);
    expect(await lagret(pool, id)).toBe(false);
  });

  // Kilde: #894 punkt 3. `mssql` validerer tegnparametrene i en batch mot
  // sorteringen til forelderen, og uten den avvises parameteren med EPARAM.
  it('batch med varchar- og char-parametre i transaksjonen: ingen EPARAM, og verdiene kommer tilbake', async () => {
    const svar = await transaksjon(
      pool,
      KONTEKST,
      async (f) =>
        (
          await f()
            .input('v', sql.VarChar(10), 'abc')
            .input('k', sql.Char(3), 'xyz')
            .batch<{ v: string; k: string }>('SELECT @v AS v, @k AS k')
        ).recordset[0]
    );
    expect(svar).toEqual({ v: 'abc', k: 'xyz' });
  });

  // Kilde: #894 punkt 1. Serveren har rullet tilbake, så utfallet er kjent, som når
  // arbeidet fanger en feil der serveren avbrøt transaksjonen. Injisert: hendelsen
  // fra serveren holdes igjen til neste runde av hendelsesløkka, etter at arbeidet
  // har returnert og før ventingen i `committ` er over.
  it('tilbakerulling fra serveren etter at arbeidet har returnert, før COMMIT: TransaksjonAvbrutt, ikke CommitIkkeSendt, ingenting lagret, og forbindelsen gjenbrukes', async () => {
    const id = randomUUID();
    let laant: Forbindelse | undefined;
    vedNesteLaan(pool, (f) => (laant = f));
    let inne: Sesjon | undefined;
    let holdtIgjen = false;
    const feil = await transaksjon(pool, KONTEKST, async (f) => {
      await skriv(f, id);
      inne = await sesjonen(f);
      const utsender = laant as unknown as { emit: (h: string, ...a: unknown[]) => boolean };
      const ekte = utsender.emit;
      utsender.emit = function (h, ...a) {
        if (h !== 'rollbackTransaction') return ekte.call(this, h, ...a);
        holdtIgjen = true;
        return true;
      };
      await f()
        .batch(`THROW 51409, N'Versjonskonflikt', 1`)
        .catch(() => undefined);
      utsender.emit = ekte;
      setImmediate(() => utsender.emit('rollbackTransaction'));
    }).catch((e: unknown) => e);
    expect(holdtIgjen).toBe(true);
    expect(feil).toBeInstanceOf(TransaksjonAvbrutt);
    const etter = await sesjonen(() => pool.request());
    expect(etter).toMatchObject({ forbindelse: inne!.forbindelse, trancount: 0, ...ingenKontekst });
    expect(await lagret(pool, id)).toBe(false);
  });

  // Kilde: #923. Som før COMMIT kan tilbakerullingen fra serveren komme én runde etter
  // at arbeidet har returnert, og ROLLBACK ville da feilet og forbindelsen blitt forkastet.
  it('tilbakerulling fra serveren etter at arbeidet har returnert en Tilbakerulling: svaret gis, ingenting lagret, og forbindelsen gjenbrukes', async () => {
    const id = randomUUID();
    let laant: Forbindelse | undefined;
    vedNesteLaan(pool, (f) => (laant = f));
    let inne: Sesjon | undefined;
    let holdtIgjen = false;
    const svar = await transaksjon(pool, KONTEKST, async (f) => {
      await skriv(f, id);
      inne = await sesjonen(f);
      const utsender = laant as unknown as { emit: (h: string, ...a: unknown[]) => boolean };
      const ekte = utsender.emit;
      utsender.emit = function (h, ...a) {
        if (h !== 'rollbackTransaction') return ekte.call(this, h, ...a);
        holdtIgjen = true;
        return true;
      };
      await f()
        .batch(`THROW 51409, N'Versjonskonflikt', 1`)
        .catch(() => undefined);
      utsender.emit = ekte;
      setImmediate(() => utsender.emit('rollbackTransaction'));
      return new Tilbakerulling('avvist');
    });
    expect(holdtIgjen).toBe(true);
    expect(svar).toBe('avvist');
    const etter = await sesjonen(() => pool.request());
    expect(etter).toMatchObject({ forbindelse: inne!.forbindelse, trancount: 0, ...ingenKontekst });
    expect(await lagret(pool, id)).toBe(false);
  });

  // Kilde: #597 og `koe.skrivetidspunkt` (20261016120000_kommandoer.sql): raden
  // gjelder når økta logget inn, og `sp_reset_connection` gir økta et nytt
  // `login_time` på samme forbindelse og samme økt-ID. Uten nullstilling er
  // tidspunktet det samme (kontrollsaken). Under last kan basens klokke stå på
  // samme verdi i flere rundturer, så kontrollsaken og nullstillingen venter til
  // klokka har passert `login_time` (#960). `login_time` er `datetime`, og et nytt
  // `login_time` er målt inntil 2 ms før `SYSDATETIME()` lest før nullstillingen: verdien
  // kuttes til hele millisekunder og rundes så til 1/300 s, så klokka .3784 rundes til
  // .380 mens `login_time` .378 rundes til .377 (#1428). Etter 5 ms er et nytt
  // `login_time` minst 3 ms senere enn det forrige.
  it('nullstillingen etter en transaksjon gir samme forbindelse og økt-ID et senere login_time, og uten nullstilling er det uendret', async () => {
    const innlogging = async () =>
      (
        await pool.request().query<{ innlogget: string; oekt: number; forbindelse: string }>(
          `SELECT CONVERT(varchar(23), s.login_time, 121) AS innlogget, @@SPID AS oekt,
                  LOWER(CAST(c.connection_id AS nvarchar(36))) AS forbindelse
             FROM sys.dm_exec_sessions s JOIN sys.dm_exec_connections c ON c.session_id = s.session_id
            WHERE s.session_id = @@SPID`
        )
      ).recordset[0];
    /** Basens klokke, og mikrosekundene siden `login_time` til økta. */
    const klokka = async () =>
      (
        await pool.request().query<{ naa: string; siden: string }>(
          `SELECT CONVERT(varchar(27), SYSDATETIME(), 121) AS naa,
                  CAST(DATEDIFF_BIG(microsecond, s.login_time, SYSDATETIME()) AS varchar(20)) AS siden
             FROM sys.dm_exec_sessions s WHERE s.session_id = @@SPID`
        )
      ).recordset[0];
    const foer = await innlogging();
    const frist = Date.now() + 2_000;
    let passert = await klokka();
    while (Number(passert.siden) < 5_000 && Date.now() < frist) {
      await new Promise((ok) => setTimeout(ok, 1));
      passert = await klokka();
    }
    expect(
      Number(passert.siden) >= 5_000,
      `klokka ${passert.naa}, login_time ${foer.innlogget}`
    ).toBe(true);
    expect(await innlogging()).toEqual(foer);
    await transaksjon(pool, KONTEKST, async () => undefined);
    const etter = await innlogging();
    expect(etter).toMatchObject({ oekt: foer.oekt, forbindelse: foer.forbindelse });
    // Verdiene i meldingen skiller et uendret fra et tidligere tidspunkt (#960).
    expect(
      etter.innlogget > foer.innlogget,
      `login_time før ${foer.innlogget}, klokka før nullstillingen ${passert.naa}, etter ${etter.innlogget}`
    ).toBe(true);
  });

  it('opprettPool bruker konfig.pool.max når maks ikke er oppgitt, og maks foran den', async () => {
    const konfig = {
      ...sql.ConnectionPool.parseConnectionString(SQLSERVER_TILKOBLING!),
      database: base.navn,
    };
    const fra = async (p: Promise<Pool>) => {
      const ny = await p;
      await ny.close();
      return (ny as unknown as { config: sql.config }).config.pool?.max;
    };
    expect(await fra(opprettPool({ ...konfig, pool: { max: 3 } }))).toBe(3);
    expect(await fra(opprettPool({ ...konfig, pool: { max: 3 } }, { maks: 2 }))).toBe(2);
    // Tilkoblingsstrengen kan ha en egen grense, så standarden prøves uten den (#544 punkt 2).
    expect(await fra(opprettPool({ ...konfig, pool: undefined }))).toBe(10);
  });

  // Kilde: «Ferdig når» i #50 (RK-05): en transaksjon som varer lenger enn grensen,
  // avbrytes og etterlater ingen delvis skriving.
  it('arbeidet venter forbi fristen etter en skriving: FristUtloept, ingenting lagret, og forbindelsen forkastes', async () => {
    const id = randomUUID();
    let inne: Sesjon | undefined;
    const feil = await transaksjon(
      pool,
      KONTEKST,
      async (f) => {
        await skriv(f, id);
        inne = await sesjonen(f);
        await new Promise((ok) => setTimeout(ok, 800));
      },
      { frist: 300 }
    ).catch((e: unknown) => e);
    expect(feil).toBeInstanceOf(FristUtloept);
    expect(await borte(pool, inne!.forbindelse)).toBe(true);
    expect(await sesjonen(() => pool.request())).toMatchObject({ trancount: 0, ...ingenKontekst });
    expect(await lagret(pool, id)).toBe(false);
  });

  it('en forespørsel pågår ved fristen: den avbrytes straks, FristUtloept, og ingenting er lagret', async () => {
    const id = randomUUID();
    const start = Date.now();
    const feil = await transaksjon(
      pool,
      KONTEKST,
      async (f) => {
        await skriv(f, id);
        await f().batch(`WAITFOR DELAY '00:00:20'`);
      },
      { frist: 500 }
    ).catch((e: unknown) => e);
    expect(feil).toBeInstanceOf(FristUtloept);
    // Kilde: utfallet er kjent, og ingenting er committet (#50). Innboksen prøver en
    // forbigående feil i basen igjen (#957), og før fristen ga samme treghet et
    // tidsavbrudd med koden 'ETIMEOUT'.
    expect(feil).toBeInstanceOf(sql.MSSQLError);
    expect((feil as sql.MSSQLError).code).toBe('ETIMEOUT');
    expect((feil as Error).cause).toBeInstanceOf(sql.RequestError);
    expect(Date.now() - start).toBeLessThan(5_000);
    expect(await lagret(pool, id)).toBe(false);
  });

  it('Tilbakerulling etter fristen: FristUtloept, ikke svaret, og ingenting lagret', async () => {
    const id = randomUUID();
    const feil = await transaksjon(
      pool,
      KONTEKST,
      async (f) => {
        await skriv(f, id);
        await new Promise((ok) => setTimeout(ok, 600));
        return new Tilbakerulling('avvist');
      },
      { frist: 200 }
    ).catch((e: unknown) => e);
    expect(feil).toBeInstanceOf(FristUtloept);
    expect(await lagret(pool, id)).toBe(false);
  });

  // Kontrollsaken: fristen avbryter ikke COMMIT som er sendt, så utfallet forblir kjent.
  it('COMMIT som er sendt før fristen og svarer etter den: svaret gis, og skrivingen er lagret', async () => {
    const id = randomUUID();
    vedNesteLaan(pool, (f) =>
      enGang(
        f,
        'commitTransaction',
        (ekte) =>
          (...a) =>
            setTimeout(() => ekte(...a), 700)
      )
    );
    const svar = await transaksjon(pool, KONTEKST, async (f) => (await skriv(f, id), 'ok'), {
      frist: 300,
    });
    expect(svar).toBe('ok');
    expect(await lagret(pool, id)).toBe(true);
  });

  it.each([0, -1, Number.NaN, TRANSAKSJONSFRIST_MS + 1])(
    'fristen %s ms avvises før forbindelsen lånes',
    async (frist) => {
      let laant = false;
      vedNesteLaan(pool, () => (laant = true));
      await expect(
        transaksjon(pool, KONTEKST, async () => undefined, { frist })
      ).rejects.toBeInstanceOf(RangeError);
      expect(laant).toBe(false);
      delete (pool as unknown as { acquire?: unknown }).acquire;
    }
  );

  it.each<[string, Partial<Record<keyof Kontekst, unknown>>]>([
    ['aktøren er et navn', { aktor: 'Kari Nordmann' }],
    ['aktøren mangler', { aktor: undefined }],
    ['prosjektet er tomt', { prosjekt: ' ' }],
    ['prosjektet mangler', { prosjekt: undefined }],
    ['siden er ukjent', { side: 'EO' }],
    ['teamet er ikke heks', { team: 'team-1' }],
    ['teamet er 64 tegn', { team: 'a'.repeat(64) }],
    ['teamet har store bokstaver', { team: 'A'.repeat(32) }],
    ['prosjektet har mellomrom på slutten', { prosjekt: 'prosjekt-a ' }],
    ['prosjektet har mellomrom foran', { prosjekt: ' prosjekt-a' }],
  ])('ugyldig kontekst avvises før forbindelsen lånes: %s', async (_navn, endring) => {
    let laant = false;
    vedNesteLaan(pool, () => (laant = true));
    await expect(
      transaksjon(pool, { ...KONTEKST, ...endring } as Kontekst, async () => undefined)
    ).rejects.toBeInstanceOf(UgyldigKontekst);
    expect(laant).toBe(false);
    delete (pool as unknown as { acquire?: unknown }).acquire;
  });

  // Kilde: F0b i hovedplanen, krav 2 og 4, og #555: en feil midt i transaksjonen
  // etterlater ingen delvise skrivinger, en vranglås prøves på nytt, og en avvisning
  // som aldri kan lykkes, prøves ikke på nytt.
  describe('flere skrivinger og nye forsøk (#555)', () => {
    beforeAll(async () => {
      await base.pool
        .request()
        .batch(
          'CREATE TABLE laas (id int NOT NULL PRIMARY KEY, n int NOT NULL); INSERT laas VALUES (1, 0), (2, 0);'
        );
    });

    async function tellerne(): Promise<number[]> {
      const r = await pool.request().query<{ n: number }>('SELECT n FROM laas ORDER BY id');
      return r.recordset.map((rad) => rad.n);
    }

    /**
     * Gjør transaksjonen i `arbeid` til vranglåsoffer: den oppdaterer rad 1 og venter på
     * rad 2, mens en annen transaksjon holder rad 2 og venter på rad 1. Den andre legger
     * 10 til begge radene og committer. Løftet er den andre transaksjonen.
     */
    function motpart(): { arbeid: (f: () => sql.Request) => Promise<void>; ferdig: Promise<void> } {
      let aHar1!: () => void;
      const harRad1 = new Promise<void>((ok) => (aHar1 = ok));
      let bHar2!: () => void;
      const harRad2 = new Promise<void>((ok) => (bHar2 = ok));
      const ferdig = (async () => {
        const tx = new sql.Transaction(base.pool);
        await tx.begin();
        await new sql.Request(tx).batch('UPDATE laas SET n = n + 10 WHERE id = 2');
        bHar2();
        await harRad1;
        await new sql.Request(tx).batch('UPDATE laas SET n = n + 10 WHERE id = 1');
        await tx.commit();
      })();
      return {
        ferdig,
        arbeid: async (f) => {
          await f().batch('SET DEADLOCK_PRIORITY LOW; UPDATE laas SET n = n + 1 WHERE id = 1');
          aHar1();
          await harRad2;
          await f().batch('UPDATE laas SET n = n + 1 WHERE id = 2');
        },
      };
    }

    it('en feil etter tre skrivinger i hver sin forespørsel etterlater ingen av dem', async () => {
      const ider = [randomUUID(), randomUUID(), randomUUID()];
      const foer = await tellerne();
      const feil = await transaksjon(pool, KONTEKST, async (f) => {
        for (const id of ider) await skriv(f, id);
        await f().batch('UPDATE laas SET n = n + 1');
        await f().batch(`THROW 51422, N'Ugyldig', 1`);
      }).catch((e: unknown) => e);
      expect(feilnummer(feil)).toBe(51422);
      for (const id of ider) expect(await lagret(pool, id)).toBe(false);
      expect(await tellerne()).toEqual(foer);
    });

    it('en feil i arbeidet etter tre skrivinger, uten feil fra basen, etterlater ingen av dem', async () => {
      const ider = [randomUUID(), randomUUID(), randomUUID()];
      await expect(
        transaksjon(pool, KONTEKST, async (f) => {
          for (const id of ider) await skriv(f, id);
          throw new Error('arbeidet feilet etter skrivingene');
        })
      ).rejects.toThrow('arbeidet feilet etter skrivingene');
      for (const id of ider) expect(await lagret(pool, id)).toBe(false);
    });

    it('vranglåsoffer: transaksjonen kjøres på nytt fra begynnelsen, og bare skrivingene i det andre forsøket er lagret', async () => {
      const { arbeid, ferdig } = motpart();
      const ider: string[] = [];
      const foer = await tellerne();
      const svar = await transaksjon(pool, KONTEKST, async (f) => {
        const id = randomUUID();
        ider.push(id);
        await skriv(f, id);
        if (ider.length === 1) await arbeid(f);
        else
          await f().batch('SET DEADLOCK_PRIORITY NORMAL; UPDATE laas SET n = n + 1 WHERE id = 1');
        return sesjonen(f);
      });
      await ferdig;
      expect(ider).toHaveLength(2);
      expect(await lagret(pool, ider[0])).toBe(false);
      expect(await lagret(pool, ider[1])).toBe(true);
      expect(await tellerne()).toEqual([foer[0] + 11, foer[1] + 10]);
      expect(svar).toMatchObject({ trancount: 1, koe_prosjekt: KONTEKST.prosjekt });
      const etter = await sesjonen(() => pool.request());
      expect(etter).toMatchObject({ trancount: 0, ...ingenKontekst });
    }, 30_000);

    it('vranglåsoffer som arbeidet fanger: serveren har rullet tilbake, og transaksjonen kjøres på nytt', async () => {
      const { arbeid, ferdig } = motpart();
      let kall = 0;
      const svar = await transaksjon(pool, KONTEKST, async (f) => {
        kall++;
        if (kall === 1) await arbeid(f).catch(() => undefined);
        else await f().batch('SET DEADLOCK_PRIORITY NORMAL');
        return kall;
      });
      await ferdig;
      expect(svar).toBe(2);
    }, 30_000);

    it('vranglåsoffer i hvert forsøk: arbeidet kjøres VRANGLAASFORSOEK ganger, og feilen fra siste forsøk kastes', async () => {
      const ider: string[] = [];
      let siste: Error | undefined;
      const feil = await transaksjon(pool, KONTEKST, async (f) => {
        const id = randomUUID();
        ider.push(id);
        await skriv(f, id);
        throw (siste = feilFraBasen(VRANGLAAS));
      }).catch((e: unknown) => e);
      expect(ider).toHaveLength(VRANGLAASFORSOEK);
      expect(feil).toBe(siste);
      for (const id of ider) expect(await lagret(pool, id)).toBe(false);
    });

    // Bare vranglåsen gir et nytt forsøk. En avvisning, en versjonskonflikt og en ugyldig
    // kommando gir samme feil igjen (F0b krav 4), og et usikkert utfall kan være committet.
    it.each<[string, number]>([
      ['avvisning', 51403],
      ['versjonskonflikt', 51409],
      ['kommando-ID-en er brukt', 51410],
      ['ugyldig', 51422],
    ])('%s (%i): arbeidet kjøres én gang, og feilen kastes', async (_navn, nummer) => {
      let kall = 0;
      const feil = await transaksjon(pool, KONTEKST, async (f) => {
        kall++;
        await f().batch(`THROW ${nummer}, N'Fra basen', 1`);
      }).catch((e: unknown) => e);
      expect(kall).toBe(1);
      expect(feilnummer(feil)).toBe(nummer);
    });

    it('usikkert utfall: arbeidet kjøres én gang, selv om COMMIT feilet med 1205', async () => {
      vedNesteLaan(pool, (f) =>
        enGang(f, 'commitTransaction', () => (cb) => setImmediate(cb, feilFraBasen(VRANGLAAS)))
      );
      let kall = 0;
      const feil = await transaksjon(pool, KONTEKST, async () => {
        kall++;
      }).catch((e: unknown) => e);
      expect(feil).toBeInstanceOf(UsikkertUtfall);
      expect(kall).toBe(1);
    });

    it('fristen rekker ikke til et nytt forsøk etter 1205: arbeidet kjøres én gang', async () => {
      let kall = 0;
      const feil = await transaksjon(
        pool,
        KONTEKST,
        async () => {
          kall++;
          // Det som er igjen av fristen, er under den korteste pausen (20 ms).
          await new Promise((ok) => setTimeout(ok, 85));
          throw feilFraBasen(VRANGLAAS);
        },
        { frist: 100 }
      ).catch((e: unknown) => e);
      expect(kall).toBe(1);
      expect(feil instanceof FristUtloept || feilnummer(feil) === VRANGLAAS).toBe(true);
    });

    it('fristen utløper før arbeidet kaster 1205: FristUtloept, og arbeidet kjøres én gang', async () => {
      let kall = 0;
      const feil = await transaksjon(
        pool,
        KONTEKST,
        async () => {
          kall++;
          await new Promise((ok) => setTimeout(ok, 150));
          throw feilFraBasen(VRANGLAAS);
        },
        { frist: 100 }
      ).catch((e: unknown) => e);
      expect(feil).toBeInstanceOf(FristUtloept);
      expect(kall).toBe(1);
    });
  });
});

describe('datalaget uten SQL Server', () => {
  // Kilde: #704 punkt 1. `mssql` pakker en feil fra `tedious` i `originalError`
  // uten å kopiere nummeret, som i `TransactionError`.
  it('feilnummer leser nummeret på feilen og i originalError.info', () => {
    const fraTedious = Object.assign(new Error('Transaksjonen er avbrutt.'), {
      info: { number: 3903 },
    });
    expect(feilnummer(new sql.TransactionError(fraTedious))).toBe(3903);
    expect(feilnummer(new sql.RequestError(fraTedious))).toBe(3903);
    expect(feilnummer(new Error('uten nummer'))).toBeUndefined();
    // #926: uten `info` har `mssql` koden fra `tedious` i `number`, og den er ikke et nummer.
    const utenInfo = new sql.RequestError(
      Object.assign(new Error('Tidsavbrudd.'), { code: 'ETIMEOUT' })
    );
    expect(utenInfo.number).toBe('ETIMEOUT');
    expect(feilnummer(utenInfo)).toBeUndefined();
    expect(feilnummer(undefined)).toBeUndefined();
  });

  // Kilde: #544 punkt 1. Grensene kontrolleres før tilkoblingen, så serveren
  // nedenfor blir aldri kontaktet.
  it.each<[string, sql.config['pool'], number | undefined]>([
    ['min over maks', { min: 3 }, 2],
    ['min over max i konfigurasjonen', { min: 3, max: 2 }, undefined],
    ['maks 0', {}, 0],
    ['maks negativ', {}, -1],
    ['maks er ikke et heltall', {}, 1.5],
    ['max er NaN', { max: Number.NaN }, undefined],
    ['min negativ', { min: -1 }, 2],
    ['min er ikke et heltall', { min: 0.5 }, 2],
  ])('opprettPool avviser grensene før den kobler til: %s', async (_navn, grenser, maks) => {
    const konfig: sql.config = { server: 'ingen.invalid', pool: grenser };
    await expect(opprettPool(konfig, { maks })).rejects.toBeInstanceOf(RangeError);
  });
});
