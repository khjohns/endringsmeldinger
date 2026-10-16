/**
 * Runneren for migrasjonene i T-SQL (`server/migrering.ts`, #53). Forventningene
 * har kilde i arbeidsvalget fra oppdragsgiver 16.10 i #53: filene anvendes i
 * filnavnrekkefølge, versjonen er prefikset, historikken lagrer sha256 av hele
 * fila, og runneren nekter å kjøre når en anvendt fil er endret, også bare i en
 * kommentar. Regelen om at en anvendt migrasjon er uforanderlig står i
 * `.claude/rules/database.md`. Delingen på `GO`, endelsen, BOM, sorteringen i
 * `migrer`, tidsgrensen og avvisningen av en fil med egen `COMMIT` har kilde i
 * #564, og `ROLLBACK` i en fil, feilen etter en `COMMIT`, applåsen gjennom en
 * `COMMIT` og linjeskiftet i #576 og #577. Testene mot basen krever `KOE_SQLSERVER_TILKOBLING`.
 */

import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { opprettPool } from '../datalag.ts';
import {
  avvik,
  delPaaGo,
  egenKonfig,
  lesMigrasjoner,
  MIGRASJONSMAPPE,
  migrer,
  MigreringAvvist,
  type Migrasjon,
} from '../migrering.ts';
import { katalog, opprettMigrertTestbase } from './sqlserver_migrert.ts';
import {
  opprettKjoeretid,
  opprettTestbase,
  SQLSERVER_TILKOBLING,
  type Testbase,
} from './sqlserver.ts';

const mapper: string[] = [];

function mappe(filer: Record<string, string>): string {
  const m = mkdtempSync(join(tmpdir(), 'koe-migrering-'));
  mapper.push(m);
  for (const [navn, tekst] of Object.entries(filer)) writeFileSync(join(m, navn), tekst);
  return m;
}

afterAll(() => {
  for (const m of mapper) rmSync(m, { recursive: true, force: true });
});

const A = '20260101000000_a.sql';
const B = '20260102000000_b.sql';
const C = '20260103000000_c.sql';

describe('lesingen av migrasjonsfilene', () => {
  it('deler på linjer med bare GO, uansett store og små bokstaver og en kommentar etter', () => {
    expect(delPaaGo('SELECT 1\nGO\nSELECT 2\r\n  go  -- slutt\nSELECT 3\nGO\n')).toEqual([
      'SELECT 1',
      'SELECT 2',
      'SELECT 3',
    ]);
  });

  it('deler på en GO-linje som slutter på en enslig CR, også med en kommentar', () => {
    expect(delPaaGo('SELECT 1\nGO\r')).toEqual(['SELECT 1']);
    expect(delPaaGo('SELECT 1\nGO -- slutt\r')).toEqual(['SELECT 1']);
  });

  it('deler ikke på GO inne i en linje eller i et navn', () => {
    expect(delPaaGo("SELECT N'GO' AS GOTO\nGOTO slutt")).toHaveLength(1);
  });

  it.each([
    ['en tekst over flere linjer', "SELECT N'\nGO\n' AS a\nGO\nSELECT 2", 2],
    ['en tekst med dobbel apostrof', "SELECT 'it''s\nGO\nok'\nGO\nSELECT 2", 2],
    ['en blokkommentar', 'SELECT 1 /*\nGO\n*/\nGO\nSELECT 2', 2],
    ['en nøstet blokkommentar', 'SELECT 1 /* /* */\nGO\n*/\nGO\nSELECT 2', 2],
    ['et navn i hakeparentes', 'SELECT 1 AS [a]]\nGO\nb]\nGO\nSELECT 2', 2],
    ['en linjekommentar med apostrof', "SELECT 1 -- it's\nGO\nSELECT 2", 2],
  ])('deler ikke på GO inne i %s', (_, tekst, antall) => {
    expect(delPaaGo(tekst)).toHaveLength(antall);
  });

  it.each([
    ['GO 5', 'SELECT 1\nGO 5\nSELECT 2'],
    ['GO;', 'SELECT 1\nGO;\nSELECT 2'],
    ['GO med en blokkommentar', 'SELECT 1\nGO /* x */\nSELECT 2'],
  ])('avviser %s med linjenummeret', (_, tekst) => {
    expect(() => delPaaGo(tekst)).toThrow(/^Linje 2 begynner med GO/);
  });

  it.each([
    ['en tekst', "SELECT 1\nSELECT 'a\nGO\nSELECT 2", /^Teksten som begynner på linje 2/],
    ['en kommentar', 'SELECT 1\n/* a /* b */\nGO', /^Kommentaren som begynner på linje 2/],
  ])('avviser %s som ikke er avsluttet, med linjen den begynner på', (_, tekst, melding) => {
    expect(() => delPaaGo(tekst)).toThrow(melding);
  });

  it('feilen fra delingen sier hvilken fil den gjelder', () => {
    const m = mappe({ [A]: 'SELECT 1\nGO 2' });
    expect(() => lesMigrasjoner(m)).toThrow(`${A}: Linje 2`);
    try {
      lesMigrasjoner(m);
    } catch (feil) {
      expect((feil as Error).cause).toBeInstanceOf(MigreringAvvist);
    }
  });

  it.each([['20260101000000_a.SQL'], ['20260101000000_a.sql.bak'], ['README.md']])(
    'avviser %s i mappa i stedet for å hoppe over den',
    (navn) => {
      expect(() => lesMigrasjoner(mappe({ [A]: 'SELECT 1', [navn]: 'SELECT 2' }))).toThrow(
        `${navn} har ikke endelsen .sql.`
      );
    }
  );

  it('avviser en fil med UTF-8-BOM, og godtar samme fil uten', () => {
    expect(() => lesMigrasjoner(mappe({ [A]: '\uFEFFSELECT 1' }))).toThrow(
      `${A} begynner med UTF-8-BOM.`
    );
    expect(lesMigrasjoner(mappe({ [A]: 'SELECT 1' }))[0].satser).toEqual(['SELECT 1']);
  });

  it('sorterer filene på filnavn, ikke på rekkefølgen i mappa', () => {
    const m = mappe({ [C]: 'SELECT 3', [A]: 'SELECT 1', [B]: 'SELECT 2' });
    expect(lesMigrasjoner(m).map((f) => f.filnavn)).toEqual([A, B, C]);
  });

  it.each([
    ['20260101_a.sql', 'for kort versjon'],
    ['20260101000000-a.sql', 'bindestrek'],
    ['20260101000000_A.sql', 'store bokstaver'],
  ])('avviser filnavnet %s (%s)', (navn) => {
    expect(() => lesMigrasjoner(mappe({ [navn]: 'SELECT 1' }))).toThrow(MigreringAvvist);
  });

  it('avviser to filer med samme versjon', () => {
    const m = mappe({ '20260101000000_a.sql': 'SELECT 1', '20260101000000_b.sql': 'SELECT 2' });
    expect(() => lesMigrasjoner(m)).toThrow(/samme versjonen|versjonen 20260101000000/);
  });

  it('summen er av hele fila, også kommentarene', () => {
    const [en] = lesMigrasjoner(mappe({ [A]: 'SELECT 1 -- a' }));
    const [to] = lesMigrasjoner(mappe({ [A]: 'SELECT 1 -- b' }));
    expect(en.satser).toEqual(['SELECT 1 -- a']);
    expect(en.sha256).not.toBe(to.sha256);
  });

  it.each([
    ['en kommentar etter GO', 'SELECT 1\nGO\n', 'SELECT 1\nGO -- slutt\n'],
    ['en tom linje', 'SELECT 1\nGO\n', 'SELECT 1\n\nGO\n'],
  ])('summen endres av %s, som ikke er med i satsene', (_, foer, etter) => {
    const [en] = lesMigrasjoner(mappe({ [A]: foer }));
    const [to] = lesMigrasjoner(mappe({ [A]: etter }));
    expect(en.sha256).not.toBe(to.sha256);
  });
});

describe('kontrollen mot historikken', () => {
  const fil = (versjon: string, sha256 = 'x'): Migrasjon => ({
    versjon,
    filnavn: `${versjon}_a.sql`,
    sha256,
    satser: [],
  });
  const anvendt = (f: Migrasjon) => ({ versjon: f.versjon, filnavn: f.filnavn, sha256: f.sha256 });

  it('godtar uendrede anvendte filer og nye filer etter dem', () => {
    const [a, b] = [fil('20260101000000'), fil('20260102000000')];
    expect(avvik([anvendt(a)], [a, b])).toEqual([]);
  });

  it('avviser en anvendt fil med en annen sum', () => {
    const a = fil('20260101000000');
    expect(avvik([anvendt(a)], [{ ...a, sha256: 'y' }])).toEqual([
      `${a.filnavn} er endret etter at den ble anvendt.`,
    ]);
  });

  it('avviser en anvendt fil som ikke finnes', () => {
    expect(avvik([anvendt(fil('20260101000000'))], [])).toHaveLength(1);
  });

  it('avviser en ny fil foran en anvendt', () => {
    const [a, b] = [fil('20260101000000'), fil('20260102000000')];
    expect(avvik([anvendt(b)], [a, b])).toEqual([
      `${a.filnavn} er ikke anvendt og kommer foran ${b.versjon}, som er anvendt.`,
    ]);
  });

  it.each([
    ['uten grense i poolen', 0, 0],
    ['med standarden i mssql', undefined, 90_000],
    ['med lavere grense i poolen', 1_000, 90_000],
    ['med høyere grense i poolen', 600_000, 600_000],
  ])(
    'runnerens forbindelse har poolens tidsgrense, men minst 90 s (%s)',
    (_, grense, forventet) => {
      const pool = { config: { server: 's', requestTimeout: grense, pool: { max: 10 } } };
      expect(egenKonfig(pool as unknown as Parameters<typeof egenKonfig>[0])).toMatchObject({
        server: 's',
        requestTimeout: forventet,
        pool: { min: 1, max: 1 },
      });
    }
  );

  it('migrer avviser to filer med samme versjon før den kobler til basen', async () => {
    const a = fil('20260101000000');
    const ingenBase = {} as Parameters<typeof migrer>[0];
    await expect(migrer(ingenBase, [a, { ...a, filnavn: '20260101000000_b.sql' }])).rejects.toThrow(
      'To filer har versjonen 20260101000000.'
    );
  });
});

describe.skipIf(!SQLSERVER_TILKOBLING)('runneren mot SQL Server', () => {
  let base: Testbase;

  beforeAll(async () => {
    base = await opprettTestbase('migrering');
  }, 240_000);
  afterAll(async () => {
    await base?.slett();
  }, 60_000);
  afterEach(async () => {
    await base.pool.request().batch(`
      IF OBJECT_ID(N'koe_migrering.historikk') IS NOT NULL DELETE koe_migrering.historikk;
      DROP TABLE IF EXISTS dbo.prove_b, dbo.prove_a;`);
  });

  async function historikk(): Promise<string[]> {
    const svar = await base.pool.request().query<{
      versjon: string;
    }>('SELECT versjon FROM koe_migrering.historikk ORDER BY anvendt, versjon');
    return svar.recordset.map((r) => r.versjon);
  }

  async function tabeller(): Promise<string[]> {
    const svar = await base.pool.request().query<{
      name: string;
    }>("SELECT name FROM sys.tables WHERE name LIKE 'prove[_]%' ORDER BY name");
    return svar.recordset.map((r) => r.name);
  }

  it('anvender filene i filnavnrekkefølge, og hver fil én gang', async () => {
    // B bygger på A, og C på B: i en annen rekkefølge feiler den første.
    const m = mappe({
      [C]: 'ALTER TABLE dbo.prove_b ADD c int NULL;',
      [A]: 'CREATE TABLE dbo.prove_a (id int NOT NULL PRIMARY KEY);',
      [B]: 'CREATE TABLE dbo.prove_b (id int NOT NULL REFERENCES dbo.prove_a (id));\nGO\nALTER TABLE dbo.prove_a ADD b int NULL;',
    });
    expect(await migrer(base.pool, lesMigrasjoner(m))).toEqual([
      '20260101000000',
      '20260102000000',
      '20260103000000',
    ]);
    expect(await historikk()).toEqual(['20260101000000', '20260102000000', '20260103000000']);
    expect(await migrer(base.pool, lesMigrasjoner(m))).toEqual([]);
  });

  it('sorterer filene selv når kalleren gir dem i en annen rekkefølge', async () => {
    const m = mappe({
      [A]: 'CREATE TABLE dbo.prove_a (id int NOT NULL PRIMARY KEY);',
      [B]: 'CREATE TABLE dbo.prove_b (id int NOT NULL REFERENCES dbo.prove_a (id));',
    });
    const [a, b] = lesMigrasjoner(m);
    expect(await migrer(base.pool, [b, a])).toEqual(['20260101000000', '20260102000000']);
    expect(await migrer(base.pool, lesMigrasjoner(m))).toEqual([]);
  });

  it.each([
    ['avslutter den med COMMIT', 'CREATE TABLE dbo.prove_a (id int NOT NULL);\nCOMMIT;'],
    [
      'avslutter og åpner en ny',
      'CREATE TABLE dbo.prove_a (id int NOT NULL);\nCOMMIT;\nBEGIN TRANSACTION;',
    ],
    [
      'åpner en til uten å avslutte den',
      'BEGIN TRANSACTION;\nCREATE TABLE dbo.prove_a (id int NOT NULL);',
    ],
  ])('avviser en fil som %s, før historikkraden skrives og før neste fil', async (_, tekst) => {
    const m = mappe({ [A]: tekst, [B]: 'CREATE TABLE dbo.prove_b (id int NOT NULL);' });
    await expect(migrer(base.pool, lesMigrasjoner(m))).rejects.toThrow(
      `${A}, sats 1: satsen avsluttet eller åpnet en transaksjon`
    );
    expect(await historikk()).toEqual([]);
    expect(await tabeller()).not.toContain('prove_b');
  });

  it('godtar en nøstet transaksjon som avsluttes i samme sats', async () => {
    const m = mappe({
      [A]: 'BEGIN TRANSACTION;\nCREATE TABLE dbo.prove_a (id int NOT NULL);\nCOMMIT;',
    });
    expect(await migrer(base.pool, lesMigrasjoner(m))).toEqual(['20260101000000']);
    expect(await historikk()).toEqual(['20260101000000']);
  });

  it('en runner som venter på applåsen lenger enn poolens requestTimeout, får den og anvender', async () => {
    const m = mappe({ [A]: 'CREATE TABLE dbo.prove_a (id int NOT NULL);' });
    // Poolen lagrer konfigurasjonen den ble opprettet med, men typene viser den ikke.
    const { config } = base.pool as unknown as { config: Parameters<typeof opprettPool>[0] };
    const kort = await opprettPool({ ...config, requestTimeout: 1_000 }, { maks: 2 });
    const holder = base.pool.transaction();
    await holder.begin();
    try {
      await holder
        .request()
        .query(
          "EXEC sp_getapplock @Resource = N'koe_migrering', @LockMode = 'Exclusive', @LockOwner = 'Transaction', @DbPrincipal = N'db_owner'"
        );
      const kjoering = migrer(kort, lesMigrasjoner(m));
      await new Promise((ok) => setTimeout(ok, 3_000));
      await holder.rollback();
      expect(await kjoering).toEqual(['20260101000000']);
    } finally {
      await kort.close();
    }
  }, 30_000);

  /** Transaksjonene som er åpne i testbasen, utenom denne forespørselens. */
  async function aapneTransaksjoner(): Promise<number> {
    const svar = await base.pool.request().query<{ n: number }>(
      `SELECT COUNT(*) AS n FROM sys.dm_tran_session_transactions t
         JOIN sys.dm_exec_sessions s ON s.session_id = t.session_id
        WHERE s.database_id = DB_ID() AND t.session_id <> @@SPID`
    );
    return svar.recordset[0].n;
  }

  it('avviser en fil med ROLLBACK og en ny transaksjon, og etterlater ingen åpen transaksjon', async () => {
    const m = mappe({
      [A]: 'ROLLBACK;\nBEGIN TRANSACTION;\nCREATE TABLE dbo.prove_a (id int NOT NULL);',
      [B]: 'CREATE TABLE dbo.prove_b (id int NOT NULL);',
    });
    const feil = await migrer(base.pool, lesMigrasjoner(m)).catch((f: unknown) => f);
    expect(feil).toBeInstanceOf(MigreringAvvist);
    expect((feil as Error).message).toBe(
      `${A}, sats 1: satsen avsluttet eller åpnet en transaksjon (@@TRANCOUNT 1). ` +
        'Runneren anvender hver fil i sin egen transaksjon. Ingenting fra fila er lagret.'
    );
    expect(await aapneTransaksjoner()).toBe(0);
    expect(await tabeller()).toEqual([]);
    expect(await historikk()).toEqual([]);
  });

  it('sier at det før COMMIT er lagret når en sats committer og så feiler', async () => {
    const m = mappe({
      [A]: 'CREATE TABLE dbo.prove_a (id int NOT NULL);\nCOMMIT;\nSELECT 1/0;',
      [B]: 'CREATE TABLE dbo.prove_b (id int NOT NULL);',
    });
    await expect(migrer(base.pool, lesMigrasjoner(m))).rejects.toThrow(
      /^20260101000000_a\.sql, sats 1: .*Fila committet runnerens transaksjon, så det den gjorde før COMMIT, er lagret uten historikkrad\.$/
    );
    expect(await tabeller()).toEqual(['prove_a']);
    expect(await historikk()).toEqual([]);
  });

  it('sier at ingenting er lagret når en sats feiler uten COMMIT', async () => {
    const m = mappe({ [A]: 'CREATE TABLE dbo.prove_a (id int NOT NULL);\nSELECT 1/0;' });
    await expect(migrer(base.pool, lesMigrasjoner(m))).rejects.toThrow(
      /^20260101000000_a\.sql, sats 1: .*\. Ingenting fra fila er lagret\.$/
    );
    expect(await tabeller()).toEqual([]);
  });

  it('holder applåsen også etter en COMMIT i en fil', async () => {
    const m = mappe({
      [A]: `COMMIT;
IF APPLOCK_MODE(N'db_owner', N'koe_migrering', N'Session') <> 'Exclusive'
  THROW 50000, N'applåsen er sluppet', 1;
BEGIN TRANSACTION;`,
    });
    await expect(migrer(base.pool, lesMigrasjoner(m))).rejects.toThrow(
      `${A}, sats 1: satsen avsluttet eller åpnet en transaksjon`
    );
  });

  it('fortsetter ikke på en ny sesjon når forbindelsen faller ut midt i en fil', async () => {
    const m = mappe({
      [A]: "WAITFOR DELAY '00:00:30';\nGO\nCREATE TABLE dbo.prove_a (id int NOT NULL);",
    });
    const kjoering = migrer(base.pool, lesMigrasjoner(m)).catch((f: unknown) => f);
    let sesjon: number | undefined;
    for (let i = 0; i < 40 && sesjon === undefined; i++) {
      await new Promise((ok) => setTimeout(ok, 100));
      sesjon = (
        await base.pool.request().query<{
          id: number;
        }>("SELECT session_id AS id FROM sys.dm_exec_requests WHERE wait_type = 'WAITFOR' AND database_id = DB_ID()")
      ).recordset[0]?.id;
    }
    expect(sesjon).toBeTypeOf('number');
    await base.pool.request().batch(`KILL ${sesjon};`);
    const feil = await kjoering;
    expect(feil).toBeInstanceOf(MigreringAvvist);
    expect((feil as Error).message).toMatch(
      /^20260101000000_a\.sql, sats 1: .*Tilstanden etter feilen kunne ikke leses/
    );
    expect(await tabeller()).toEqual([]);
    expect(await historikk()).toEqual([]);
  }, 30_000);

  it('en applås som kjøretiden tar, stopper ikke runneren, og kjøretiden kan ikke ta runnerens', async () => {
    await base.pool
      .request()
      .batch("IF DATABASE_PRINCIPAL_ID(N'koe_runtime') IS NULL CREATE ROLE koe_runtime;");
    const kjoeretid = await opprettKjoeretid(base, { maks: 2 });
    const laas = (foresp: ReturnType<typeof kjoeretid.pool.request>, eier: string) =>
      foresp.query<{ r: number }>(
        `DECLARE @r int; EXEC @r = sp_getapplock @Resource = N'koe_migrering', @LockMode = 'Exclusive', @LockTimeout = 0, ${eier}; SELECT @r AS r;`
      );
    const holder = kjoeretid.pool.transaction();
    await holder.begin();
    try {
      await expect(
        laas(kjoeretid.pool.request(), "@LockOwner = 'Session', @DbPrincipal = N'db_owner'")
      ).rejects.toThrow(/db_owner/);
      expect((await laas(holder.request(), "@LockOwner = 'Transaction'")).recordset[0].r).toBe(0);
      const m = mappe({ [A]: 'CREATE TABLE dbo.prove_a (id int NOT NULL);' });
      const start = Date.now();
      expect(await migrer(base.pool, lesMigrasjoner(m))).toEqual(['20260101000000']);
      expect(Date.now() - start).toBeLessThan(10_000);
    } finally {
      await holder.rollback().catch(() => undefined);
      await kjoeretid.slett();
    }
  }, 60_000);

  it('lagrer versjonen, filnavnet og sha256 av hele fila', async () => {
    const m = mappe({ [A]: '-- en kommentar\nCREATE TABLE dbo.prove_a (id int NOT NULL);' });
    const [fil] = lesMigrasjoner(m);
    await migrer(base.pool, [fil]);
    const svar = await base.pool
      .request()
      .query('SELECT versjon, filnavn, sha256 FROM koe_migrering.historikk');
    expect(svar.recordset).toEqual([{ versjon: fil.versjon, filnavn: A, sha256: fil.sha256 }]);
  });

  it('nekter å kjøre når en anvendt fil er endret bare i en kommentar, og anvender ikke den neste', async () => {
    const m = mappe({ [A]: '-- versjon 1\nCREATE TABLE dbo.prove_a (id int NOT NULL);' });
    await migrer(base.pool, lesMigrasjoner(m));
    writeFileSync(join(m, A), '-- versjon 2\nCREATE TABLE dbo.prove_a (id int NOT NULL);');
    writeFileSync(join(m, B), 'CREATE TABLE dbo.prove_b (id int NOT NULL);');
    await expect(migrer(base.pool, lesMigrasjoner(m))).rejects.toThrow(
      `${A} er endret etter at den ble anvendt.`
    );
    expect(await historikk()).toEqual(['20260101000000']);
    expect(await tabeller()).toEqual(['prove_a']);
  });

  it('nekter å kjøre når en ny fil kommer foran en anvendt', async () => {
    const m = mappe({ [B]: 'CREATE TABLE dbo.prove_b (id int NOT NULL);' });
    await migrer(base.pool, lesMigrasjoner(m));
    writeFileSync(join(m, A), 'CREATE TABLE dbo.prove_a (id int NOT NULL);');
    await expect(migrer(base.pool, lesMigrasjoner(m))).rejects.toThrow(MigreringAvvist);
    expect(await tabeller()).toEqual(['prove_b']);
  });

  it('nekter å kjøre når en anvendt fil er fjernet', async () => {
    const m = mappe({ [A]: 'CREATE TABLE dbo.prove_a (id int NOT NULL);' });
    await migrer(base.pool, lesMigrasjoner(m));
    rmSync(join(m, A));
    writeFileSync(join(m, B), 'CREATE TABLE dbo.prove_b (id int NOT NULL);');
    await expect(migrer(base.pool, lesMigrasjoner(m))).rejects.toThrow(`${A} er anvendt`);
    expect(await tabeller()).toEqual(['prove_a']);
  });

  it('en feil i en sats ruller tilbake hele fila og stopper de neste', async () => {
    const m = mappe({
      [A]: 'CREATE TABLE dbo.prove_a (id int NOT NULL);\nGO\nSELECT 1/0;',
      [B]: 'CREATE TABLE dbo.prove_b (id int NOT NULL);',
    });
    await expect(migrer(base.pool, lesMigrasjoner(m))).rejects.toThrow(`${A}, sats 2`);
    expect(await historikk()).toEqual([]);
    expect(await tabeller()).toEqual([]);
  });

  it('to runnere samtidig anvender hver fil én gang', async () => {
    const m = mappe({
      [A]: 'CREATE TABLE dbo.prove_a (id int NOT NULL);',
      [B]: 'CREATE TABLE dbo.prove_b (id int NOT NULL);',
    });
    const filer = lesMigrasjoner(m);
    const [en, to] = await Promise.all([migrer(base.pool, filer), migrer(base.pool, filer)]);
    expect([...en, ...to].sort()).toEqual(['20260101000000', '20260102000000']);
    expect(await historikk()).toEqual(['20260101000000', '20260102000000']);
  });
});

describe.skipIf(!SQLSERVER_TILKOBLING)('migrasjonene i database/migrasjoner', () => {
  it('har filer, og hver har formen runneren godtar', () => {
    expect(lesMigrasjoner(MIGRASJONSMAPPE).length).toBeGreaterThan(0);
  });

  it('to nye baser bygget fra filene får samme katalog', async () => {
    const [en, to] = await Promise.all([
      opprettMigrertTestbase('katalog_en'),
      opprettMigrertTestbase('katalog_to'),
    ]);
    try {
      const [k1, k2] = await Promise.all([katalog(en), katalog(to)]);
      const tabeller = k1.filter((l) => l.includes('"type_desc":"USER_TABLE"'));
      expect(tabeller.map((l) => JSON.parse(l.slice('objekt '.length)).name).sort()).toEqual([
        'app_identities',
        'app_membership_sync',
        'app_project_memberships',
        'app_users',
        'catenda_contract_teams',
        'catenda_project_configs',
        'hendelse',
        'historikk',
        'kjernebuffer',
        'leveringsoppdrag',
        'notat',
        'projects',
        'sak_metadata',
        'skrivetidspunkt',
      ]);
      expect(k2).toEqual(k1);
    } finally {
      await Promise.all([en.slett(), to.slett()]);
    }
  }, 300_000);

  it('nekter en base uten den binære sorteringen (SQ-08)', async () => {
    const base = await opprettTestbase('sortering', { azure: false });
    try {
      await expect(migrer(base.pool, lesMigrasjoner())).rejects.toThrow(
        /Latin1_General_100_BIN2_UTF8/
      );
      const svar = await base.pool
        .request()
        .query<{ n: number }>("SELECT COUNT(*) AS n FROM sys.schemas WHERE name = N'koe'");
      expect(svar.recordset[0].n).toBe(0);
    } finally {
      await base.slett();
    }
  }, 240_000);
});
