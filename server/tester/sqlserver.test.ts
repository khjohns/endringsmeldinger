/**
 * Testbasen i SQL Server mot standardinnstillingene i Azure SQL Database, og
 * samtidige skrivinger i samme sak med READ_COMMITTED_SNAPSHOT på (#488).
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
  opprettTestbase,
  sql,
  SQLSERVER_TILKOBLING,
  type Pool,
  type Testbase,
} from './sqlserver.ts';

const VERSJONSKONFLIKT = 51409;

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
    base = await opprettTestbase('samtidighet');
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

  describe('samtidige skrivinger i samme sak med RCSI på (#488 punkt 3)', () => {
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
      const t1 = new sql.Transaction(base.pool);
      const t2 = new sql.Transaction(base.pool);
      await t1.begin();
      await t2.begin();
      expect(await sisteVersjon(t1, sakId)).toBe(1);
      expect(await sisteVersjon(t2, sakId)).toBe(1);

      await skriv(t1, sakId, 1, forste);
      let ferdig = false;
      const andreSkriving = skriv(t2, sakId, 1, andre).finally(() => (ferdig = true));
      andreSkriving.catch(() => undefined);
      await new Promise((ok) => setTimeout(ok, 500));
      expect(ferdig, 'den andre venter på låsen den første holder').toBe(false);
      await t1.commit();

      const feil = await andreSkriving.then(
        () => undefined,
        (f: unknown) => f
      );
      expect(feilnummer(feil)).toBe(VERSJONSKONFLIKT);
      await t2.rollback().catch(() => undefined);

      expect(await lagret(base.pool, sakId)).toEqual([
        { event_id: expect.any(String), versjon: 1, svar: 0 },
        { event_id: forste, versjon: 2, svar: 2 },
      ]);
    });

    it('åtte samtidige skrivinger med samme forventede versjon: nøyaktig én lagres, de andre får versjonskonflikt', async () => {
      const sakId = await nySak(base.pool);
      const hendelser = Array.from({ length: 8 }, () => randomUUID());
      const utfall = await Promise.allSettled(
        hendelser.map((id) => skrivOgCommit(base.pool, sakId, 1, id))
      );

      const lyktes = hendelser.filter((_, i) => utfall[i].status === 'fulfilled');
      expect(lyktes).toHaveLength(1);
      for (const u of utfall) {
        if (u.status === 'rejected') expect(feilnummer(u.reason)).toBe(VERSJONSKONFLIKT);
      }
      const rader = await lagret(base.pool, sakId);
      expect(rader.map((r) => r.versjon)).toEqual([1, 2]);
      expect(rader[1]).toEqual({ event_id: lyktes[0], versjon: 2, svar: 2 });
    });

    it('skrivere som leser på nytt etter versjonskonflikt, mister ingen hendelse', async () => {
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
              if (feilnummer(feil) !== VERSJONSKONFLIKT || forsok > 50) throw feil;
            }
          }
        })
      );

      const rader = await lagret(base.pool, sakId);
      expect(rader.map((r) => r.versjon)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
      expect(rader.slice(1).map((r) => r.event_id)).toEqual(expect.arrayContaining(hendelser));
      expect(rader.slice(1).every((r) => r.svar === 2)).toBe(true);
    });
  });
});
