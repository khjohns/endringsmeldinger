/**
 * En testbase i SQL Server bygget fra `database/migrasjoner/` med runneren
 * (`server/migrering.ts`), slik en base i test og produksjon skal bygges (#53).
 */

import { randomBytes } from 'node:crypto';
import { lesMigrasjoner, migrer } from '../migrering.ts';
import { feilnummer, opprettTestbase, sql, type Pool, type Testbase } from './sqlserver.ts';

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

/**
 * Katalogen i basen som sammenliknbare linjer: skjemaene med eierne, objektene,
 * kolonnene, begrensningene, indeksene, modulene, triggerne, rollene med
 * medlemmene og rettighetene, uten ID-er og tidspunkter. Rollene og rettighetene
 * tas med for alle mottakere, også `public` og de faste rollene (#564, #567).
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
  check: `SELECT OBJECT_SCHEMA_NAME(parent_object_id) AS skjema, name, definition FROM sys.check_constraints`,
  fk: `SELECT OBJECT_SCHEMA_NAME(parent_object_id) AS skjema, name,
              OBJECT_SCHEMA_NAME(referenced_object_id) AS til_skjema, OBJECT_NAME(referenced_object_id) AS til,
              delete_referential_action_desc
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
                CASE class WHEN 1 THEN OBJECT_SCHEMA_NAME(major_id) WHEN 3 THEN SCHEMA_NAME(major_id) END AS skjema,
                CASE class WHEN 1 THEN OBJECT_NAME(major_id) END AS objekt
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
  side: string;
  team: string | null;
}

/** En ny bruker med en Catenda-identitet, gjennom `koe_api.catenda_identitet`. Gir `app_users.id`. */
export async function catendaBruker(pool: Pool): Promise<string> {
  const svar = await pool
    .request()
    .input('subjekt', sql.NVarChar(400), randomBytes(16).toString('hex'))
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
