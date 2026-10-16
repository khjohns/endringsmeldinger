/**
 * En testbase i SQL Server bygget fra `database/migrasjoner/` med runneren
 * (`server/migrering.ts`), slik en base i test og produksjon skal bygges (#53).
 */

import { lesMigrasjoner, migrer } from '../migrering.ts';
import { opprettTestbase, type Testbase } from './sqlserver.ts';

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
 * Katalogen i basen som sammenliknbare linjer: skjemaene, objektene, kolonnene,
 * begrensningene, indeksene, modulene og rettighetene, uten ID-er og tidspunkter.
 * Hver del er en egen spørring, så sorteringene i katalogvisningene ikke blandes.
 */
const KATALOG: Record<string, string> = {
  skjema: 'SELECT name FROM sys.schemas WHERE schema_id BETWEEN 5 AND 16383',
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
  rolle:
    'SELECT name, type_desc FROM sys.database_principals WHERE principal_id BETWEEN 5 AND 16383',
  rett: `SELECT USER_NAME(grantee_principal_id) AS mottaker, state_desc, permission_name, class_desc,
                CASE class WHEN 1 THEN OBJECT_SCHEMA_NAME(major_id) WHEN 3 THEN SCHEMA_NAME(major_id) END AS skjema,
                CASE class WHEN 1 THEN OBJECT_NAME(major_id) END AS objekt
           FROM sys.database_permissions WHERE grantee_principal_id BETWEEN 5 AND 16383`,
};

export async function katalog(base: Testbase): Promise<string[]> {
  const linjer: string[] = [];
  for (const [del, sporring] of Object.entries(KATALOG)) {
    const svar = await base.pool.request().query(sporring);
    for (const rad of svar.recordset) linjer.push(`${del} ${JSON.stringify(rad)}`);
  }
  return linjer.sort();
}
