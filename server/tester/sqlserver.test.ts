/**
 * Testbasen i SQL Server mot standardinnstillingene i Azure SQL Database,
 * samtidige skrivinger i samme sak med READ_COMMITTED_SNAPSHOT på (#488), og
 * oppryddingen av innloggingen fra `opprettKjoeretid` (#727).
 * Forventningene har kilde i #78 (svaret på A3: basen får standardinnstillingene
 * i Azure) og punkt 2 og 3 i #488.
 *
 * Datalaget i T-SQL finnes ikke ennå (#419). Skrivingen er derfor en prosedyre
 * i testen, med versjonskontrollen fra prøven (`prove/azuresql/sql/03_kommandoer.sql`):
 * siste versjon leses med `UPDLOCK, HOLDLOCK`, og en annen versjon enn den
 * forventede gir versjonskonflikt. Unikheten på (sak, versjon) er den andre
 * vakten. Krever `KOE_SQLSERVER_TILKOBLING`.
 */

import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  avvikFraAzure,
  feilnummer,
  koble,
  opprettKjoeretid,
  opprettTestbase,
  sql,
  SQLSERVER_TILKOBLING,
  type Pool,
  type Testbase,
} from './sqlserver.ts';

const VERSJONSKONFLIKT = 51409;
const VRANGLAAS = 1205;

const SKJEMA = [
  `CREATE TABLE hendelse (
     event_id uniqueidentifier NOT NULL CONSTRAINT hendelse_pk PRIMARY KEY,
     sak_id nvarchar(36) NOT NULL,
     versjon int NOT NULL,
     CONSTRAINT hendelse_sak_versjon UNIQUE (sak_id, versjon)
   )`,
  `CREATE TABLE svar (
     event_id uniqueidentifier NOT NULL CONSTRAINT svar_hendelse REFERENCES hendelse (event_id),
     plass int NOT NULL,
     CONSTRAINT svar_pk PRIMARY KEY (event_id, plass)
   )`,
  `CREATE PROCEDURE skriv_hendelse
     @sak_id nvarchar(36), @forventet_versjon int, @event_id uniqueidentifier
   AS
   BEGIN
     SET XACT_ABORT ON;
     DECLARE @siste int = (SELECT MAX(versjon) FROM hendelse WITH (UPDLOCK, HOLDLOCK) WHERE sak_id = @sak_id);
     IF ISNULL(@siste, 0) <> @forventet_versjon THROW ${VERSJONSKONFLIKT}, N'Versjonskonflikt', 1;
     INSERT hendelse (event_id, sak_id, versjon) VALUES (@event_id, @sak_id, @forventet_versjon + 1);
     INSERT svar (event_id, plass) VALUES (@event_id, 1), (@event_id, 2);
   END`,
];

async function nySak(pool: Pool): Promise<string> {
  const sakId = randomUUID();
  await pool
    .request()
    .input('sak', sql.NVarChar(36), sakId)
    .input('event', sql.UniqueIdentifier, randomUUID())
    .query('INSERT hendelse (event_id, sak_id, versjon) VALUES (@event, @sak, 1)');
  return sakId;
}

/** Siste versjon lest uten låsehint, som en klient som viser saken. */
async function sisteVersjon(kilde: Pool | sql.Transaction, sakId: string): Promise<number> {
  const r = await new sql.Request(kilde as sql.ConnectionPool)
    .input('sak', sql.NVarChar(36), sakId)
    .query<{ v: number }>('SELECT MAX(versjon) AS v FROM hendelse WHERE sak_id = @sak');
  return r.recordset[0].v;
}

function skriv(tx: sql.Transaction, sakId: string, forventet: number, eventId: string) {
  return new sql.Request(tx)
    .input('sak_id', sql.NVarChar(36), sakId)
    .input('forventet_versjon', sql.Int, forventet)
    .input('event_id', sql.UniqueIdentifier, eventId)
    .execute('skriv_hendelse');
}

/** Én skriving i egen transaksjon. Feiler den, rulles transaksjonen tilbake. */
async function skrivOgCommit(pool: Pool, sakId: string, forventet: number, eventId: string) {
  const tx = new sql.Transaction(pool);
  await tx.begin();
  try {
    await skriv(tx, sakId, forventet, eventId);
    await tx.commit();
  } catch (feil) {
    await tx.rollback().catch(() => undefined);
    throw feil;
  }
}

/** Hvor lenge oppryddingen venter på en skriving før forbindelsen lukkes, ms. */
const RYDDEFRIST = 5_000;

/**
 * Ruller `tx` tilbake når `skriving` er ferdig: en transaksjon kan ikke rulles
 * tilbake mens en forespørsel i den pågår. Gir `false` når skrivingen ikke er
 * ferdig etter `RYDDEFRIST`, for eksempel fordi den venter på en lås noe utenfor
 * testen holder; da ruller bare lukkingen av forbindelsen transaksjonen tilbake.
 */
async function rullTilbakeEtter(
  tx: sql.Transaction,
  skriving: Promise<unknown> | undefined
): Promise<boolean> {
  let tidtaker: ReturnType<typeof setTimeout> | undefined;
  const ferdig = await Promise.race([
    Promise.resolve(skriving).then(
      () => true,
      () => true
    ),
    new Promise<boolean>((ok) => (tidtaker = setTimeout(() => ok(false), RYDDEFRIST))),
  ]);
  clearTimeout(tidtaker);
  if (ferdig) await tx.rollback().catch(() => undefined);
  return ferdig;
}

/** Antall forespørsler i basen som venter på en lås, lest i `sys.dm_exec_requests`. */
async function ventendeILaas(pool: Pool): Promise<number> {
  const r = await pool.request().query<{
    n: number;
  }>("SELECT COUNT(*) AS n FROM sys.dm_exec_requests WHERE database_id = DB_ID() AND wait_type LIKE N'LCK[_]%'");
  return r.recordset[0].n;
}

async function lagret(pool: Pool, sakId: string) {
  const r = await pool
    .request()
    .input('sak', sql.NVarChar(36), sakId)
    .query<{ event_id: string; versjon: number; svar: number }>(
      `SELECT LOWER(CAST(h.event_id AS nvarchar(36))) AS event_id, h.versjon,
              (SELECT COUNT(*) FROM svar s WHERE s.event_id = h.event_id) AS svar
         FROM hendelse h WHERE h.sak_id = @sak ORDER BY h.versjon`
    );
  return r.recordset;
}

if (!SQLSERVER_TILKOBLING) {
  console.warn(
    'KOE_SQLSERVER_TILKOBLING er ikke satt: testene av SQL Server-testbasen hoppes over (#488).'
  );
}

describe.skipIf(!SQLSERVER_TILKOBLING)('SQL Server-testbasen (#488)', () => {
  let base: Testbase;

  beforeAll(async () => {
    // Åtte åpne transaksjoner og oppslaget i sys.dm_exec_requests samtidig.
    base = await opprettTestbase('samtidighet', { maks: 12 });
    for (const batch of SKJEMA) await base.pool.request().batch(batch);
  }, 240_000);

  afterAll(async () => {
    await base?.slett();
  }, 60_000);

  describe('innstillingene i sys.databases (#78 A3, #488 punkt 2)', () => {
    it('testbasen har RCSI, ADR og sorteringen Latin1_General_100_BIN2_UTF8 som i Azure SQL Database', async () => {
      expect(await avvikFraAzure(base.pool)).toEqual([]);
    });

    it('en base med standardinnstillingene i SQL Server gir avvik for alle tre', async () => {
      const standard = await opprettTestbase('standard', { maks: 1, azure: false });
      try {
        expect(await avvikFraAzure(standard.pool)).toEqual([
          'collation_name er SQL_Latin1_General_CP1_CI_AS',
          'READ_COMMITTED_SNAPSHOT er av',
          'ACCELERATED_DATABASE_RECOVERY er av',
        ]);
      } finally {
        await standard.slett();
      }
    }, 60_000);
  });

  describe('oppryddingen i opprettKjoeretid (#727)', () => {
    it('innloggingen slettes også når en økt med den ennå er åpen', async () => {
      await base.pool.request().batch('CREATE ROLE koe_test_rolle;');
      const kjoeretid = await opprettKjoeretid(base, { maks: 1, rolle: 'koe_test_rolle' });
      const navn = (
        await kjoeretid.pool.request().query<{ navn: string }>('SELECT SUSER_NAME() AS navn')
      ).recordset[0].navn;
      // En økt utenfor bassenget, som en forbindelse close() ikke har fått lukket ennå.
      const passord = `${randomUUID()}aA1!`;
      await base.pool.request().batch(`ALTER LOGIN [${navn}] WITH PASSWORD = N'${passord}'`);
      const config = sql.ConnectionPool.parseConnectionString(SQLSERVER_TILKOBLING);
      const aapen = await new sql.ConnectionPool({
        ...config,
        user: navn,
        password: passord,
        database: base.navn,
        pool: { max: 1 },
      }).connect();
      try {
        await aapen.request().query('SELECT 1');
        await kjoeretid.slett();
        const igjen = await base.pool.request().input('navn', sql.NVarChar(128), navn).query<{
          n: number;
        }>('SELECT COUNT(*) AS n FROM sys.server_principals WHERE name = @navn');
        expect(igjen.recordset[0].n).toBe(0);
      } finally {
        // Innloggingen hører til serveren, så base.slett() fjerner den ikke når
        // kjoeretid.slett() har kastet.
        await aapen.close().catch(() => undefined);
        await kjoeretid.pool.close().catch(() => undefined);
        await base.pool
          .request()
          .batch(`IF SUSER_ID(N'${navn}') IS NOT NULL DROP LOGIN [${navn}]`)
          .catch(() => undefined);
      }
    }, 60_000);
  });

  // Testene venter på låser, så de får mer enn standardgrensen i vitest.
  describe(
    'samtidige skrivinger i samme sak med RCSI på (#488 punkt 3)',
    { timeout: 30_000 },
    () => {
      it('en lesing venter ikke på en åpen skriving og ser siste committede versjon', async () => {
        const sakId = await nySak(base.pool);
        const t1 = new sql.Transaction(base.pool);
        await t1.begin();
        try {
          await skriv(t1, sakId, 1, randomUUID());
          expect(await sisteVersjon(t1, sakId)).toBe(2);
          expect(await sisteVersjon(base.pool, sakId)).toBe(1);
        } finally {
          await t1.rollback();
        }
      });

      it('to transaksjoner som leste samme versjon: den første skriver, den andre får versjonskonflikt og etterlater ingenting', async () => {
        const sakId = await nySak(base.pool);
        const [forste, andre] = [randomUUID(), randomUUID()];
        const pool = await koble(base.navn, 2);
        const t1 = new sql.Transaction(pool);
        const t2 = new sql.Transaction(pool);
        let andreSkriving: Promise<unknown> | undefined;
        await t1.begin();
        try {
          await t2.begin();
          expect(await sisteVersjon(t1, sakId)).toBe(1);
          expect(await sisteVersjon(t2, sakId)).toBe(1);

          await skriv(t1, sakId, 1, forste);
          let ferdig = false;
          andreSkriving = skriv(t2, sakId, 1, andre).finally(() => (ferdig = true));
          andreSkriving.catch(() => undefined);
          await new Promise((ok) => setTimeout(ok, 500));
          expect(ferdig, 'den andre venter på låsen den første holder').toBe(false);
          await t1.commit();

          const feil = await andreSkriving.then(
            () => undefined,
            (f: unknown) => f
          );
          expect(feilnummer(feil)).toBe(VERSJONSKONFLIKT);
        } finally {
          // t1 først: den andre skrivingen venter på låsene til t1.
          await t1.rollback().catch(() => undefined);
          await rullTilbakeEtter(t2, andreSkriving);
          await pool.close();
        }

        expect(await lagret(base.pool, sakId)).toEqual([
          { event_id: expect.any(String), versjon: 1, svar: 0 },
          { event_id: forste, versjon: 2, svar: 2 },
        ]);
      });

      it('åtte samtidige skrivinger med samme forventede versjon: nøyaktig én lagres, de andre får versjonskonflikt eller vranglås', async () => {
        // Alle åtte har lest før den første committer: den første holder transaksjonen
        // åpen til de sju andre venter på en lås i basen eller er avvist. Uten
        // `UPDLOCK, HOLDLOCK` venter de da på unikheten og får 2627 (#560).
        const sakId = await nySak(base.pool);
        const hendelser = Array.from({ length: 8 }, () => randomUUID());
        const pool = await koble(base.navn, hendelser.length);
        const transaksjoner = hendelser.map(() => new sql.Transaction(pool));
        await Promise.all(transaksjoner.map((tx) => tx.begin()));
        const utfall: (PromiseSettledResult<unknown> | undefined)[] = hendelser.map(
          () => undefined
        );
        const skrivinger = hendelser.map((id, i) =>
          skriv(transaksjoner[i], sakId, 1, id).then(
            (verdi) => (utfall[i] = { status: 'fulfilled', value: verdi }),
            (reason: unknown) => (utfall[i] = { status: 'rejected', reason })
          )
        );
        try {
          const slutt = Date.now() + 10_000;
          for (;;) {
            const ferdige = utfall.filter((u) => u !== undefined).length;
            const venter = await ventendeILaas(base.pool);
            if (ferdige + venter === hendelser.length && utfall.some(Boolean)) break;
            if (Date.now() > slutt)
              throw new Error(
                `${ferdige} skrivinger er ferdige og ${venter} venter på en lås etter 10 s`
              );
            await new Promise((ok) => setTimeout(ok, 50));
          }
          const forste = utfall.findIndex((u) => u?.status === 'fulfilled');
          expect(forste, 'én skriving er ferdig uten å vente').toBeGreaterThanOrEqual(0);
          await transaksjoner[forste].commit();
          await Promise.all(skrivinger);
        } finally {
          // En skriving som venter, venter på låsene til en ferdig transaksjon som
          // ennå er åpen, så alle rulles tilbake samtidig. Den committede gir en
          // feil som svelges.
          await Promise.all(transaksjoner.map((tx, i) => rullTilbakeEtter(tx, skrivinger[i])));
          await pool.close();
        }

        const lyktes = hendelser.filter((_, i) => utfall[i]?.status === 'fulfilled');
        expect(lyktes).toHaveLength(1);
        // Et vranglåsoffer er også en avvist skriving (#547).
        for (const u of utfall) {
          if (u?.status === 'rejected')
            expect([VERSJONSKONFLIKT, VRANGLAAS]).toContain(feilnummer(u.reason));
        }
        const rader = await lagret(base.pool, sakId);
        expect(rader.map((r) => r.versjon)).toEqual([1, 2]);
        expect(rader[1]).toEqual({ event_id: lyktes[0], versjon: 2, svar: 2 });
      });

      it('skrivere som leser på nytt etter versjonskonflikt eller vranglås, mister ingen hendelse', async () => {
        const sakId = await nySak(base.pool);
        const hendelser = Array.from({ length: 8 }, () => randomUUID());
        await Promise.all(
          hendelser.map(async (id) => {
            for (let forsok = 0; ; forsok++) {
              try {
                return await skrivOgCommit(
                  base.pool,
                  sakId,
                  await sisteVersjon(base.pool, sakId),
                  id
                );
              } catch (feil) {
                const nummer = feilnummer(feil);
                if ((nummer !== VERSJONSKONFLIKT && nummer !== VRANGLAAS) || forsok > 50)
                  throw feil;
              }
            }
          })
        );

        const rader = await lagret(base.pool, sakId);
        expect(rader.map((r) => r.versjon)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
        expect(rader.slice(1).map((r) => r.event_id)).toEqual(expect.arrayContaining(hendelser));
        expect(rader.slice(1).every((r) => r.svar === 2)).toBe(true);
      });
    }
  );
});
