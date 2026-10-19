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
  KONTEKSTNOEKLER,
  opprettPool,
  sql,
  Tilbakerulling,
  transaksjon,
  TransaksjonAvbrutt,
  UgyldigKontekst,
  UsikkertUtfall,
  type Forbindelse,
  type Kontekst,
  type Pool,
} from '../datalag.ts';
import { enGang, tidsavbrudd, vedNesteLaan, type Kall } from './forbindelse.ts';
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
    expect(logg).toHaveBeenCalledWith(expect.any(String), aarsak);
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
    expect(logg).toHaveBeenCalledWith(expect.any(String), lukking);
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
    expect(logg).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ message: expect.stringMatching(/kontekstnøkler med verdi/) })
    );
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
