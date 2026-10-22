/**
 * En testbase i SQL Server bygget fra `database/migrasjoner/` med runneren
 * (`server/migrering.ts`), slik en base i test og produksjon skal bygges (#53).
 */

import { createHash, randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { lesMigrasjoner, migrer } from '../migrering.ts';
import {
  AZURE_INNSTILLINGER,
  feilnummer,
  koble,
  kobleTilServer,
  krevDeveloperEdition,
  opprettTestbase,
  somTestbase,
  sql,
  testbasenavn,
  type Pool,
  type Testbase,
} from './sqlserver.ts';

export async function opprettMigrertTestbase(
  navn: string,
  valg: Parameters<typeof opprettTestbase>[1] = {}
): Promise<Testbase> {
  const base = await opprettTestbase(navn, valg);
  try {
    await migrer(base.pool, lesMigrasjoner());
  } catch (feil) {
    await base.slett();
    throw feil;
  }
  return base;
}

/** Filene utenom migrasjonene som former malen: runneren, poolen og `CREATE DATABASE` (#945). */
const MALFILER = ['../migrering.ts', '../datalag.ts', './sqlserver.ts'].map((f) =>
  fileURLToPath(new URL(f, import.meta.url))
);

const medSkilletegn = (mappe: string) => mappe.replace(/\/?$/, '/');

/** En forespørsel med sin egen tidsgrense. `mssql` tar den, men typene mangler den. */
const medGrense = (pool: Pool, requestTimeout: number) =>
  (pool as unknown as { request(o: { requestTimeout: number }): sql.Request }).request({
    requestTimeout,
  });

/** Hvor lenge en kopi av malen kan ta å skrive, og en annen fil venter på låsen. */
const BYGGETID = 600_000;

/** Grensen for en ledig forbindelse i `underLaas`, ms; lenger enn 30 s, standarden i poolen. */
export const LEDIG_FORBINDELSE = 2 ** 31 - 1;

/**
 * Sesjonslåsen `ressurs` på en egen forbindelse til `master`, mens `arbeid` kjører
 * med forbindelsen. Venter i opptil `laasfrist` ms og feiler med svarkoden fra
 * `sp_getapplock` uten låsen. Låsen eies av sesjonen fordi `BACKUP` ikke går i en
 * transaksjon, så poolen har én forbindelse og lukker den ikke før den har vært
 * ledig i `ledig` ms. Grensen for hver forespørsel settes på forespørselen.
 */
export async function underLaas<T>(
  ressurs: string,
  laasfrist: number,
  arbeid: (laas: Pool) => Promise<T>,
  { ledig = LEDIG_FORBINDELSE } = {}
): Promise<T> {
  const laas = await koble('master', 1, { pool: { idleTimeoutMillis: ledig } });
  try {
    await medGrense(laas, laasfrist + 60_000).batch(
      `DECLARE @svar int;
       EXEC @svar = sp_getapplock @Resource = N'${ressurs}', @LockMode = 'Exclusive', @LockOwner = 'Session', @LockTimeout = ${laasfrist};
       IF @svar < 0
       BEGIN
         DECLARE @melding nvarchar(200) = CONCAT(N'sp_getapplock ga ', @svar, N' for låsen ${ressurs}.');
         THROW 50000, @melding, 1;
       END`
    );
    return await arbeid(laas);
  } finally {
    await laas.close();
  }
}

/**
 * Om `fil` er en fullført kopi: hodet i fila har ID-en til en kopi som `msdb` har
 * ført. `msdb` fører kopien når den er skrevet ferdig, så en kopi som ble avbrutt,
 * eller som skrives nå, er ikke ført. Leser bare hodet, ikke hele fila. Fila som
 * mangler (3201 med feil 2 fra operativsystemet), som en annen skriver (3201 med
 * 32) eller som er tom (3254), er ikke fullført. Andre feil, som en brutt
 * forbindelse eller en vranglås i `msdb`, kastes, så en fullført kopi ikke
 * skrives over mens andre gjenoppretter fra den (#969).
 */
export async function fullfoert(pool: Pool, fil: string): Promise<boolean> {
  let hode;
  try {
    hode = await pool
      .request()
      .query<{ BackupSetGUID: string }>(`RESTORE HEADERONLY FROM DISK = N'${fil}'`);
  } catch (feil) {
    if (ikkeEnKopi(feil)) return false;
    throw feil;
  }
  const foert = await pool
    .request()
    .input('id', sql.UniqueIdentifier, hode.recordset[0].BackupSetGUID)
    .query<{
      n: number;
    }>('SELECT COUNT(*) AS n FROM msdb.dbo.backupset WHERE backup_set_uuid = @id');
  return foert.recordset[0].n > 0;
}

function ikkeEnKopi(feil: unknown): boolean {
  const { precedingErrors = [] } = feil as { precedingErrors?: unknown[] };
  return [feil, ...precedingErrors].some((f) => {
    const { number, message } = f as { number?: number; message?: string };
    return (
      number === 3254 || (number === 3201 && /Operating system error (2|32)\(/.test(message ?? ''))
    );
  });
}

let malen: Promise<{ fil: string; bygget: boolean }> | undefined;

/**
 * Malen for testbasene: en sikkerhetskopi på serveren av en base migrert fra
 * filene, navngitt etter summen av filene, runneren og innstillingene (#887, #930).
 * Er kopien fullført, brukes den uten lås. Ellers bygger den første som mangler
 * den, kopien med `opprettMigrertTestbase` under en applås, og de andre venter i
 * opptil `BYGGETID`. `globalSetup` for serverprosjektet i `vite.config.ts` bygger
 * den før testfilene starter. Gir stien til kopien på serveren, og om den ble
 * bygget nå, én gang per modul.
 */
export function byggMal({ frist = 180_000 } = {}): Promise<{ fil: string; bygget: boolean }> {
  malen ??= byggMalNaa(frist).catch((feil: unknown) => {
    malen = undefined;
    throw feil;
  });
  return malen;
}

/**
 * Summen malen navngis etter. Filnavnet er med, så en migrasjon som bare får ny
 * versjon, gir en ny mal med den nye versjonen i historikken (#1103).
 */
export const malsum = (mappe?: string) =>
  createHash('sha256')
    .update(
      JSON.stringify([
        lesMigrasjoner(mappe).map((m) => [m.filnavn, m.sha256]),
        MALFILER.map((f) => createHash('sha256').update(readFileSync(f)).digest('hex')),
        AZURE_INNSTILLINGER,
      ])
    )
    .digest('hex')
    .slice(0, 16);

async function malfil(master: Pool, sum: string): Promise<string> {
  const sti = await master.request().query<{
    kopier: string;
  }>(`SELECT CAST(SERVERPROPERTY('InstanceDefaultBackupPath') AS nvarchar(400)) AS kopier`);
  return `${medSkilletegn(sti.recordset[0].kopier)}koe_testmal_${sum}.bak`;
}

async function byggMalNaa(frist: number): Promise<{ fil: string; bygget: boolean }> {
  const sum = malsum();
  const master = await kobleTilServer(frist);
  let fil: string;
  try {
    await krevDeveloperEdition(master);
    fil = await malfil(master, sum);
    if (await fullfoert(master, fil)) return { fil, bygget: false };
  } finally {
    await master.close();
  }
  return underLaas(`koe_testmal_${sum}`, BYGGETID, async (laas) => {
    if (await fullfoert(laas, fil)) return { fil, bygget: false };
    const mal = await opprettMigrertTestbase('mal', { maks: 1, frist });
    try {
      await medGrense(laas, BYGGETID).batch(
        `IF APPLOCK_MODE('public', N'koe_testmal_${sum}', 'Session') <> 'Exclusive'
             THROW 50000, N'Sesjonen har mistet låsen for malen; kopien skrives ikke.', 1;
           BACKUP DATABASE [${mal.navn}] TO DISK = N'${fil}' WITH INIT, FORMAT, COPY_ONLY, CHECKSUM`
      );
    } finally {
      await mal.slett();
    }
    return { fil, bygget: true };
  });
}

/**
 * Sletter malen for filene i treet når `msdb` har ført den som skrevet ferdig
 * etter `startet` (ms fra `Date.now()`), uansett hvem i kjøringen som bygget den
 * (#945). Alderen regnes på serverens klokke og sammenliknes med tiden som er
 * gått her, så klokkene trenger ikke gå likt. Gir om malen ble slettet.
 */
export async function slettMalByggetEtter(startet: number): Promise<boolean> {
  const sum = malsum();
  const master = await kobleTilServer(0);
  try {
    const fil = await malfil(master, sum);
    if (!(await fullfoert(master, fil))) return false;
    const svar = await master
      .request()
      .input('fil', sql.NVarChar(400), fil)
      .query<{ alder: number | null }>(
        `SELECT DATEDIFF_BIG(millisecond, MAX(b.backup_finish_date), GETDATE()) AS alder
           FROM msdb.dbo.backupset b
           JOIN msdb.dbo.backupmediafamily f ON f.media_set_id = b.media_set_id
          WHERE f.physical_device_name = @fil`
      );
    const alder = svar.recordset[0].alder;
    if (alder === null || Number(alder) > Date.now() - startet) return false;
    await master
      .request()
      .input('fil', sql.NVarChar(400), fil)
      .batch('EXEC sys.xp_delete_files @fil');
    return true;
  } finally {
    await master.close();
  }
}

/**
 * En migrert testbase gjenopprettet fra malen (`byggMal`), så filene migreres én
 * gang per sett av migrasjoner og ikke én gang per testfil, parallelt med de
 * andre (#887). Katalogen er malens, så tester av migreringen selv bruker
 * `opprettMigrertTestbase`.
 */
export async function kopierMigrertTestbase(
  navn: string,
  { maks = 8, frist = 180_000 } = {}
): Promise<Testbase> {
  const { fil } = await byggMal({ frist });
  const database = testbasenavn(navn);
  const master = await kobleTilServer(frist);
  try {
    const stier = await master.request().query<{ data: string; logg: string }>(
      `SELECT CAST(SERVERPROPERTY('InstanceDefaultDataPath') AS nvarchar(400)) AS data,
              CAST(SERVERPROPERTY('InstanceDefaultLogPath') AS nvarchar(400)) AS logg`
    );
    const { data, logg } = stier.recordset[0];
    const filer = await master
      .request()
      .query<{ LogicalName: string; Type: string }>(`RESTORE FILELISTONLY FROM DISK = N'${fil}'`);
    const flytt = filer.recordset.map(
      (f, i) =>
        `MOVE N'${f.LogicalName}' TO N'${medSkilletegn(f.Type === 'L' ? logg : data)}${database}_${i}.${f.Type === 'L' ? 'ldf' : 'mdf'}'`
    );
    await master
      .request()
      .batch(
        `RESTORE DATABASE [${database}] FROM DISK = N'${fil}' WITH ${flytt.join(', ')}, CHECKSUM`
      );
  } finally {
    await master.close();
  }
  return somTestbase(database, maks);
}

/**
 * Katalogen i basen som sammenliknbare linjer: skjemaene med eierne, objektene,
 * kolonnene, begrensningene, indeksene, modulene, triggerne, rollene med
 * medlemmene og rettighetene, uten ID-er og tidspunkter. Rollene og rettighetene
 * tas med for alle mottakere, også `public` og de faste rollene (#564, #567).
 * En rettighet har målet for hver klasse og kolonnen for en kolonnerettighet, og
 * en begrensning har om den er slått av eller ikke betrodd (#644). En rettighet i
 * en klasse spørringen ikke kjenner, får ID-en i målet, så to baser skiller seg.
 * Hver del er en egen spørring, så sorteringene i katalogvisningene ikke blandes.
 */
const KATALOG: Record<string, string> = {
  skjema: `SELECT name, USER_NAME(principal_id) AS eier FROM sys.schemas`,
  objekt: `SELECT SCHEMA_NAME(schema_id) AS skjema, name, type_desc,
                  OBJECT_SCHEMA_NAME(parent_object_id) AS forelder_skjema, OBJECT_NAME(parent_object_id) AS forelder
             FROM sys.objects WHERE is_ms_shipped = 0`,
  kolonne: `SELECT OBJECT_SCHEMA_NAME(c.object_id) AS skjema, OBJECT_NAME(c.object_id) AS tabell, c.name,
                   TYPE_NAME(c.user_type_id) AS type, c.max_length, c.precision, c.scale, c.is_nullable,
                   c.column_id, c.collation_name
              FROM sys.columns c JOIN sys.objects o ON o.object_id = c.object_id WHERE o.is_ms_shipped = 0`,
  default: `SELECT OBJECT_SCHEMA_NAME(parent_object_id) AS skjema, name, definition FROM sys.default_constraints`,
  check: `SELECT OBJECT_SCHEMA_NAME(parent_object_id) AS skjema, name, definition, is_disabled, is_not_trusted
            FROM sys.check_constraints`,
  fk: `SELECT OBJECT_SCHEMA_NAME(parent_object_id) AS skjema, name,
              OBJECT_SCHEMA_NAME(referenced_object_id) AS til_skjema, OBJECT_NAME(referenced_object_id) AS til,
              delete_referential_action_desc, is_disabled, is_not_trusted
         FROM sys.foreign_keys`,
  fkkolonne: `SELECT OBJECT_NAME(constraint_object_id) AS fk, constraint_column_id,
                     COL_NAME(parent_object_id, parent_column_id) AS fra, COL_NAME(referenced_object_id, referenced_column_id) AS til
                FROM sys.foreign_key_columns`,
  indeks: `SELECT OBJECT_SCHEMA_NAME(i.object_id) AS skjema, OBJECT_NAME(i.object_id) AS tabell, i.name, i.type_desc,
                  i.is_unique, i.filter_definition
             FROM sys.indexes i JOIN sys.objects o ON o.object_id = i.object_id
            WHERE o.is_ms_shipped = 0 AND i.type > 0`,
  indekskolonne: `SELECT OBJECT_NAME(ic.object_id) AS tabell, i.name AS indeks, ic.key_ordinal, ic.is_included_column,
                         COL_NAME(ic.object_id, ic.column_id) AS kolonne
                    FROM sys.index_columns ic JOIN sys.indexes i ON i.object_id = ic.object_id AND i.index_id = ic.index_id
                    JOIN sys.objects o ON o.object_id = ic.object_id WHERE o.is_ms_shipped = 0`,
  modul: `SELECT OBJECT_SCHEMA_NAME(object_id) AS skjema, OBJECT_NAME(object_id) AS navn, definition
            FROM sys.sql_modules WHERE OBJECTPROPERTY(object_id, 'IsMSShipped') = 0`,
  trigger: `SELECT OBJECT_SCHEMA_NAME(t.parent_id) AS skjema, OBJECT_NAME(t.parent_id) AS tabell, t.name,
                   t.is_instead_of_trigger, t.is_disabled, e.type_desc AS hendelse
              FROM sys.triggers t JOIN sys.trigger_events e ON e.object_id = t.object_id
             WHERE t.parent_class = 1 AND t.is_ms_shipped = 0`,
  policy: `SELECT OBJECT_SCHEMA_NAME(object_id) AS skjema, name, is_enabled, is_schema_bound
             FROM sys.security_policies`,
  predikat: `SELECT OBJECT_NAME(object_id) AS policy, OBJECT_SCHEMA_NAME(target_object_id) AS skjema,
                    OBJECT_NAME(target_object_id) AS tabell, predicate_type_desc, operation_desc, predicate_definition
               FROM sys.security_predicates`,
  rolle: 'SELECT name, type_desc FROM sys.database_principals',
  rollemedlem: `SELECT USER_NAME(role_principal_id) AS rolle, USER_NAME(member_principal_id) AS medlem
                  FROM sys.database_role_members`,
  rett: `SELECT USER_NAME(grantee_principal_id) AS mottaker, state_desc, permission_name, class_desc,
                CASE class WHEN 1 THEN OBJECT_SCHEMA_NAME(major_id) WHEN 3 THEN SCHEMA_NAME(major_id)
                           WHEN 6 THEN (SELECT SCHEMA_NAME(schema_id) FROM sys.types WHERE user_type_id = major_id)
                           WHEN 10 THEN (SELECT SCHEMA_NAME(schema_id) FROM sys.xml_schema_collections
                                          WHERE xml_collection_id = major_id) END AS skjema,
                CASE class WHEN 0 THEN N'' WHEN 1 THEN OBJECT_NAME(major_id) WHEN 3 THEN N''
                           WHEN 4 THEN USER_NAME(major_id)
                           WHEN 5 THEN (SELECT name FROM sys.assemblies WHERE assembly_id = major_id)
                           WHEN 6 THEN TYPE_NAME(major_id)
                           WHEN 10 THEN (SELECT name FROM sys.xml_schema_collections WHERE xml_collection_id = major_id)
                           WHEN 23 THEN (SELECT name FROM sys.fulltext_catalogs WHERE fulltext_catalog_id = major_id)
                           WHEN 24 THEN (SELECT name FROM sys.symmetric_keys WHERE symmetric_key_id = major_id)
                           WHEN 25 THEN (SELECT name FROM sys.certificates WHERE certificate_id = major_id)
                           WHEN 26 THEN (SELECT name FROM sys.asymmetric_keys WHERE asymmetric_key_id = major_id)
                           ELSE CONCAT(N'ukjent klasse ', class, N': ', major_id) END AS maal,
                IIF(class = 1 AND minor_id > 0, COL_NAME(major_id, minor_id), NULL) AS kolonne
           FROM sys.database_permissions`,
};

export async function katalog(base: Testbase): Promise<string[]> {
  const linjer: string[] = [];
  for (const [del, sporring] of Object.entries(KATALOG)) {
    const svar = await base.pool.request().query(sporring);
    for (const rad of svar.recordset) linjer.push(`${del} ${JSON.stringify(rad)}`);
  }
  return linjer.sort();
}

/** Et SQL-uttrykk som settes inn som det står, ikke som parameter. */
export type Uttrykk = { sql: string };
export type Rad = Record<string, unknown>;
export type Foresp = () => sql.Request;

/** Konteksten testene binder før arbeidet; `team: null` er en skriving uten team. */
export interface Kontekst {
  aktor: string;
  prosjekt: string;
  side: string | null;
  team: string | null;
}

/** En ny bruker med en Catenda-identitet, gjennom `koe_api.catenda_identitet`. Gir `app_users.id`. */
export async function catendaBruker(
  pool: Pool,
  subjekt = randomBytes(16).toString('hex')
): Promise<string> {
  const svar = await pool
    .request()
    .input('subjekt', sql.NVarChar(400), subjekt)
    .input('epost', sql.NVarChar(320), '')
    .input('navn', sql.NVarChar(400), '')
    .output('bruker', sql.UniqueIdentifier)
    .execute('koe_api.catenda_identitet');
  return String(svar.output.bruker).toLowerCase();
}

/** `INSERT koe.<tabell>` med verdiene som parametre, og et `Uttrykk` som det står. */
export function settInn(r: Foresp, tabell: string, rad: Rad) {
  const foresp = r();
  const verdier = Object.entries(rad).map(([kolonne, verdi]) => {
    if (verdi && typeof verdi === 'object' && 'sql' in verdi) return (verdi as Uttrykk).sql;
    foresp.input(kolonne, verdi);
    return `@${kolonne}`;
  });
  return foresp.query(
    `INSERT koe.${tabell} (${Object.keys(rad).join(', ')}) VALUES (${verdier.join(', ')})`
  );
}

/** Feilnummeret fra basen, eller `undefined` når setningen gikk gjennom. */
export const avvisning = (p: Promise<unknown>) => p.then(() => undefined, feilnummer);

/** Feilnummeret og meldingen fra basen, eller `undefined` når setningen gikk gjennom. */
export const avvisningMedMelding = (p: Promise<unknown>) =>
  p.then(
    () => undefined,
    (feil: unknown) => ({ nummer: feilnummer(feil), melding: (feil as Error).message })
  );

/**
 * Én transaksjon i `pool` med konteksten satt først (uten kontekst når `k` er
 * `null`), og en ny skriving. Feiler arbeidet, rulles transaksjonen tilbake.
 * Kjøretiden prøves med sin egen pool (`opprettKjoeretid`), ikke med
 * `EXECUTE AS`: etter en feil med `XACT_ABORT` er transaksjonen alt avbrutt, så
 * en `REVERT` når ikke fram, og forbindelsen gikk tilbake til poolen som
 * kjøretiden (#583).
 */
export async function iTransaksjon<T>(
  pool: Pool,
  k: Kontekst | null,
  arbeid: (r: Foresp) => Promise<T>
): Promise<T> {
  const tx = new sql.Transaction(pool);
  await tx.begin();
  const r = () => new sql.Request(tx);
  try {
    if (k)
      await r()
        .input('aktor', sql.NVarChar(4000), k.aktor)
        .input('prosjekt', sql.NVarChar(4000), k.prosjekt)
        .input('side', sql.NVarChar(4000), k.side)
        .input('team', sql.NVarChar(4000), k.team).batch(`
          DECLARE @tx bigint = CURRENT_TRANSACTION_ID(), @skriving uniqueidentifier = NEWID();
          EXEC sp_set_session_context N'koe_aktor', @aktor;
          EXEC sp_set_session_context N'koe_prosjekt', @prosjekt;
          EXEC sp_set_session_context N'koe_side', @side;
          EXEC sp_set_session_context N'koe_team', @team;
          EXEC sp_set_session_context N'koe_tx', @tx;
          EXEC sp_set_session_context N'koe_skriving', @skriving;`);
    const svar = await arbeid(r);
    await tx.commit();
    return svar;
  } catch (feil) {
    await tx.rollback().catch(() => {});
    throw feil;
  }
}

/**
 * Basens klokke når den har passert `tid`. En medlemsliste hentet i samme
 * millisekund som en rad basen førte, er ikke nyere (`synced_at >= @hentet`,
 * `observed_at >= @hentet`).
 */
export async function basensKlokkeEtter(pool: Pool, tid: Date): Promise<Date> {
  const frist = Date.now() + 2_000;
  while (Date.now() < frist) {
    const svar = await pool.request().query<{
      naa: Date;
    }>('SELECT CAST(DATETRUNC(millisecond, SYSUTCDATETIME()) AS datetime2(3)) AS naa');
    const naa = svar.recordset[0].naa;
    if (naa.getTime() > tid.getTime()) return naa;
    await new Promise((r) => setTimeout(r, 1));
  }
  throw new Error(`Basens klokke har ikke passert ${tid.toISOString()}.`);
}
