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
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  KONTEKSTNOEKLER,
  opprettPool,
  sql,
  transaksjon,
  TransaksjonAvbrutt,
  UgyldigKontekst,
  UsikkertUtfall,
  type Forbindelse,
  type Kontekst,
  type Pool,
} from '../datalag.ts';
import { feilnummer, opprettTestbase, SQLSERVER_TILKOBLING, type Testbase } from './sqlserver.ts';

const KONTEKST: Kontekst = {
  aktor: randomUUID(),
  prosjekt: 'prosjekt-a',
  side: 'TE',
  team: 'a'.repeat(64),
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

/** Endrer forbindelsen poolen gir ut ved neste lån, før `transaksjon` får den. */
function vedNesteLaan(pool: Pool, endre: (f: Forbindelse) => void): void {
  const utlaan = pool as unknown as { acquire: (...a: unknown[]) => Promise<Forbindelse> };
  const ekte = utlaan.acquire;
  utlaan.acquire = async (...a) => {
    utlaan.acquire = ekte;
    const f = await ekte.apply(pool, a);
    endre(f);
    return f;
  };
}

type Kall = (callback: (feil?: Error) => void, ...rest: unknown[]) => void;

/** Erstatter metoden for ett kall; den opprinnelige brukes igjen etterpå. */
function enGang(
  f: Forbindelse,
  metode: 'commitTransaction' | 'reset',
  erstatning: (ekte: Kall) => Kall
) {
  const objekt = f as unknown as Record<string, Kall>;
  const ekte = objekt[metode].bind(f);
  objekt[metode] = (...a) => {
    objekt[metode] = ekte;
    return erstatning(ekte)(...a);
  };
}

const tidsavbrudd = () =>
  Object.assign(new Error('Timeout: Request failed to complete in 60000ms'), { code: 'ETIMEOUT' });

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

  it('nullstilling som feiler etter COMMIT: svaret gis, og forbindelsen forkastes i stedet for å gå tilbake med konteksten', async () => {
    vedNesteLaan(pool, (f) =>
      enGang(f, 'reset', () => (cb) => setImmediate(cb, new Error('nullstillingen feilet')))
    );
    const inne = await transaksjon(pool, KONTEKST, (f) => sesjonen(f));
    const etter = await sesjonen(() => pool.request());
    expect(etter).toMatchObject({ trancount: 0, ...ingenKontekst });
    expect(etter.forbindelse).not.toBe(inne.forbindelse);
  });

  it('nullstilling som melder suksess uten å rydde: kontrollen etterpå ser konteksten, og forbindelsen forkastes', async () => {
    vedNesteLaan(pool, (f) => enGang(f, 'reset', () => (cb) => setImmediate(cb)));
    const inne = await transaksjon(pool, KONTEKST, (f) => sesjonen(f));
    const etter = await sesjonen(() => pool.request());
    expect(etter).toMatchObject({ trancount: 0, ...ingenKontekst });
    expect(etter.forbindelse).not.toBe(inne.forbindelse);
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

  it.each<[string, Partial<Record<keyof Kontekst, unknown>>]>([
    ['aktøren er et navn', { aktor: 'Kari Nordmann' }],
    ['aktøren mangler', { aktor: undefined }],
    ['prosjektet er tomt', { prosjekt: ' ' }],
    ['prosjektet mangler', { prosjekt: undefined }],
    ['siden er ukjent', { side: 'EO' }],
    ['teamet er ikke heks', { team: 'team-1' }],
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
