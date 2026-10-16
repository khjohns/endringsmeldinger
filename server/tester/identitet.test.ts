/**
 * Identiteten og tabellene i den første migrasjonen (#53, del 1), i en base
 * bygget fra `database/migrasjoner/`. Kildene er sikkerhetsinvariantene i
 * AGENTS.md (én brukerrad per person, samme issuer og normaliserte subjekt,
 * ingen default for prosjekt, fail-closed), SQ-20 og SQ-21 i
 * `docs/prove-azuresql-2026-10-11.md`, og DL-U3 for tidspunktene. Krever
 * `KOE_SQLSERVER_TILKOBLING`.
 */

import { randomBytes } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { opprettMigrertTestbase } from './sqlserver_migrert.ts';
import { feilnummer, sql, SQLSERVER_TILKOBLING, type Testbase } from './sqlserver.ts';

const IKKE_NORMALISERT = 52022;
const CHECK_BRUDD = 547;
const INGEN_RETT = 229;

const subjekt = () => randomBytes(16).toString('hex');

describe.skipIf(!SQLSERVER_TILKOBLING)('identiteten i SQL Server', () => {
  let base: Testbase;

  beforeAll(async () => {
    base = await opprettMigrertTestbase('identitet', { maks: 24 });
    await base.pool.request().batch(`
      CREATE USER koe_runtime_prove WITHOUT LOGIN;
      ALTER ROLE koe_runtime ADD MEMBER koe_runtime_prove;`);
  }, 240_000);
  afterAll(async () => {
    await base?.slett();
  }, 60_000);

  function catendaIdentitet(s: string | null, epost = '', navn = '', bruker?: string) {
    const r = base.pool
      .request()
      .input('subjekt', sql.NVarChar(400), s)
      .input('epost', sql.NVarChar(320), epost)
      .input('navn', sql.NVarChar(400), navn)
      .output('bruker', sql.UniqueIdentifier);
    if (!bruker) return r.execute('koe_api.catenda_identitet');
    return r.query(
      `EXECUTE AS USER = '${bruker}';
       BEGIN TRY EXEC koe_api.catenda_identitet @subjekt, @epost, @navn, @bruker OUTPUT; END TRY
       BEGIN CATCH REVERT; THROW; END CATCH;
       REVERT;`
    );
  }

  async function antall(s: string) {
    const svar = await base.pool
      .request()
      .input('s', sql.NVarChar(400), s)
      .query<{
        identiteter: number;
        brukere: number;
      }>(
        `SELECT COUNT(*) AS identiteter, COUNT(DISTINCT user_id) AS brukere
         FROM koe.app_identities WHERE subject = @s`
      );
    return svar.recordset[0];
  }

  it('tjue samtidige oppslag av et nytt subjekt gir én bruker og én identitet (SQ-20)', async () => {
    const s = subjekt();
    const svar = await Promise.all(Array.from({ length: 20 }, () => catendaIdentitet(s)));
    expect(new Set(svar.map((r) => String(r.output.bruker).toLowerCase())).size).toBe(1);
    expect(await antall(s)).toEqual({ identiteter: 1, brukere: 1 });
  });

  it('et oppslag mens et annet med samme subjekt er åpent, venter og gir samme bruker (SQ-20)', async () => {
    const s = subjekt();
    const tx = new sql.Transaction(base.pool);
    await tx.begin();
    const foerste = await new sql.Request(tx)
      .input('subjekt', sql.NVarChar(400), s)
      .input('epost', sql.NVarChar(320), '')
      .input('navn', sql.NVarChar(400), '')
      .output('bruker', sql.UniqueIdentifier)
      .execute('koe_api.catenda_identitet');
    const andre = catendaIdentitet(s);
    await new Promise((ok) => setTimeout(ok, 500));
    await tx.commit();
    const svar = await andre;
    expect(String(svar.output.bruker).toLowerCase()).toBe(
      String(foerste.output.bruker).toLowerCase()
    );
    expect(await antall(s)).toEqual({ identiteter: 1, brukere: 1 });
  });

  it('en Catenda-identitet får issueren https://api.catenda.com', async () => {
    const s = subjekt();
    await catendaIdentitet(s);
    const svar = await base.pool
      .request()
      .input('s', sql.NVarChar(400), s)
      .query('SELECT provider, issuer FROM koe.app_identities WHERE subject = @s');
    expect(svar.recordset).toEqual([{ provider: 'catenda', issuer: 'https://api.catenda.com' }]);
  });

  it('en tom e-post eller et tomt navn skriver ikke over det som står', async () => {
    const s = subjekt();
    const { output } = await catendaIdentitet(s, 'a@b.no', 'Navn');
    await catendaIdentitet(s, '', '');
    const svar = await base.pool
      .request()
      .input('id', sql.UniqueIdentifier, output.bruker)
      .query('SELECT email, name FROM koe.app_users WHERE id = @id');
    expect(svar.recordset).toEqual([{ email: 'a@b.no', name: 'Navn' }]);
  });

  it.each([
    ['store bokstaver', subjekt().toUpperCase()],
    ['UUID med bindestreker', '0123abcd-0123-abcd-0123-0123456789ab'],
    ['31 tegn', subjekt().slice(1)],
    ['33 tegn', subjekt() + 'a'],
    ['mellomrom til slutt', subjekt().slice(1) + ' '],
    ['et annet tegn', subjekt().slice(1) + 'g'],
    ['tomt', ''],
    ['NULL', null],
  ])('den smale inngangen avviser subjektet med %s, og skriver ingenting (SQ-21)', async (_, s) => {
    const foer = await base.pool
      .request()
      .query<{ n: number }>('SELECT COUNT(*) AS n FROM koe.app_users');
    const feil = await catendaIdentitet(s).catch((f: unknown) => f);
    expect(feilnummer(feil)).toBe(IKKE_NORMALISERT);
    const etter = await base.pool
      .request()
      .query<{ n: number }>('SELECT COUNT(*) AS n FROM koe.app_users');
    expect(etter.recordset[0].n).toBe(foer.recordset[0].n);
  });

  it('kontrollsaken: den smale inngangen godtar catenda_id()-formen', async () => {
    await expect(catendaIdentitet(subjekt())).resolves.toBeDefined();
  });

  it.each([
    ['et subjekt med store bokstaver', 'https://api.catenda.com', subjekt().toUpperCase()],
    ['en annen issuer', 'https://api.catenda.com/', subjekt()],
    ['issueren i store bokstaver', 'HTTPS://API.CATENDA.COM', subjekt()],
  ])('tabellen avviser en Catenda-identitet med %s, også fra eieren', async (_, issuer, s) => {
    const feil = await base.pool
      .request()
      .input('provider', sql.NVarChar(16), 'catenda')
      .input('issuer', sql.NVarChar(400), issuer)
      .input('subject', sql.NVarChar(400), s)
      .input('email', sql.NVarChar(320), '')
      .input('name', sql.NVarChar(400), '')
      .output('user_id', sql.UniqueIdentifier)
      .execute('koe.resolve_identity')
      .catch((f: unknown) => f);
    expect(feilnummer(feil)).toBe(CHECK_BRUDD);
  });

  it('kjøretiden kan kalle den smale inngangen', async () => {
    const s = subjekt();
    await catendaIdentitet(s, '', '', 'koe_runtime_prove');
    expect(await antall(s)).toEqual({ identiteter: 1, brukere: 1 });
  });

  it.each([
    [
      'den generelle prosedyren',
      "DECLARE @u uniqueidentifier; EXEC koe.resolve_identity N'entra', N'x', N'y', N'', N'', @u OUTPUT;",
    ],
    ['brukerne', 'SELECT * FROM koe.app_users;'],
    ['identitetene', 'SELECT * FROM koe.app_identities;'],
    ['medlemskapet', 'SELECT * FROM koe.app_project_memberships;'],
    ['kontraktsteamene', 'SELECT * FROM koe.catenda_contract_teams;'],
    ['historikken', 'SELECT * FROM koe_migrering.historikk;'],
    ['å skrive en bruker', "INSERT koe.app_users (id, email, name) VALUES (NEWID(), N'', N'');"],
  ])('kjøretiden avvises ved %s (229)', async (_, setning) => {
    const feil = await base.pool
      .request()
      .batch(
        `EXECUTE AS USER = 'koe_runtime_prove';
         BEGIN TRY ${setning} END TRY BEGIN CATCH REVERT; THROW; END CATCH;
         REVERT;`
      )
      .catch((f: unknown) => f);
    expect(feilnummer(feil)).toBe(INGEN_RETT);
  });

  describe('katalogen', () => {
    it('ingen kolonne for prosjekt har en standardverdi', async () => {
      const svar = await base.pool.request().query<{ kolonne: string; har_default: boolean }>(
        `SELECT CONCAT(OBJECT_SCHEMA_NAME(c.object_id), N'.', OBJECT_NAME(c.object_id), N'.', c.name) AS kolonne,
                CAST(IIF(c.default_object_id <> 0, 1, 0) AS bit) AS har_default
           FROM sys.columns c JOIN sys.tables t ON t.object_id = c.object_id
          WHERE c.name IN (N'project_id', N'prosjekt_id', N'internal_project_id')`
      );
      expect(svar.recordset.map((r) => r.kolonne).sort()).toEqual([
        'koe.app_project_memberships.project_id',
        'koe.catenda_contract_teams.internal_project_id',
      ]);
      expect(svar.recordset.filter((r) => r.har_default)).toEqual([]);
      const pk = await base.pool.request().query<{ har_default: boolean }>(
        `SELECT CAST(IIF(default_object_id <> 0, 1, 0) AS bit) AS har_default
           FROM sys.columns WHERE object_id = OBJECT_ID(N'koe.projects') AND name = N'id'`
      );
      expect(pk.recordset).toEqual([{ har_default: false }]);
    });

    it('hvert tidspunkt er datetime2(3) med SYSUTCDATETIME() som standard (DL-U3)', async () => {
      const svar = await base.pool.request().query<{
        kolonne: string;
        type: string;
        scale: number;
        standard: string | null;
      }>(
        `SELECT CONCAT(OBJECT_SCHEMA_NAME(c.object_id), N'.', OBJECT_NAME(c.object_id), N'.', c.name) AS kolonne,
                TYPE_NAME(c.user_type_id) AS type, c.scale, d.definition AS standard
           FROM sys.columns c JOIN sys.tables t ON t.object_id = c.object_id
           LEFT JOIN sys.default_constraints d ON d.object_id = c.default_object_id
          WHERE TYPE_NAME(c.user_type_id) IN (N'datetime2', N'datetimeoffset', N'datetime', N'smalldatetime', N'date', N'time')`
      );
      expect(svar.recordset.length).toBeGreaterThan(0);
      expect(svar.recordset.filter((r) => r.type !== 'datetime2' || r.scale !== 3)).toEqual([]);
      expect(svar.recordset.filter((r) => r.standard !== '(sysutcdatetime())')).toEqual([]);
    });

    it('identiteten er unik på provider, issuer og subjekt', async () => {
      const svar = await base.pool.request().query<{ kolonner: string }>(
        `SELECT STRING_AGG(COL_NAME(ic.object_id, ic.column_id), N',') WITHIN GROUP (ORDER BY ic.key_ordinal) AS kolonner
           FROM sys.indexes i JOIN sys.index_columns ic ON ic.object_id = i.object_id AND ic.index_id = i.index_id
          WHERE i.object_id = OBJECT_ID(N'koe.app_identities') AND i.is_unique = 1 AND i.is_primary_key = 0
          GROUP BY i.index_id`
      );
      expect(svar.recordset).toEqual([{ kolonner: 'provider,issuer,subject' }]);
    });
  });
});
