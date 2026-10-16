/**
 * Tabellene og nøklene i SQL Server, til `docs/datamodell/katalog.json` (#558).
 *
 * Basen bygges fra `database/migrasjoner/` med runneren, som for testene, og
 * leses i `sys.tables`, `sys.columns`, `sys.indexes` og `sys.foreign_keys`.
 * Formen er den `docs/verktoy/katalog.py` gir PostgreSQL-delen, med
 * tabellnavnet kvalifisert med skjemaet (`koe.app_users`), så navnene ikke
 * kolliderer med PostgreSQL-tabellene. `koe_migrering` er runnerens bokføring
 * og står ikke i registrene.
 *
 * `katalog.py` kjører fila og leser JSON fra stdout:
 *   node server/tester/katalog.ts
 */

import { fileURLToPath } from 'node:url';
import { opprettMigrertTestbase } from './sqlserver_migrert.ts';
import type { Pool } from './sqlserver.ts';

export interface Fremmednoekkel {
  kolonner: string[];
  til: string;
  til_kolonner: string[];
  ved_sletting: string;
}

export interface Tabell {
  kolonner: [string, string, 'NOT NULL' | 'NULL'][];
  primærnøkkel: string[];
  unike: string[][];
  unike_indekser: string[];
  fremmednøkler: Fremmednoekkel[];
}

const TABELLER = `
SELECT t.object_id, SCHEMA_NAME(t.schema_id) + '.' + t.name AS navn
  FROM sys.tables t
 WHERE t.is_ms_shipped = 0 AND SCHEMA_NAME(t.schema_id) <> 'koe_migrering'`;

const KOLONNER = `
SELECT c.object_id, c.name, TYPE_NAME(c.user_type_id) AS type, c.max_length, c.precision, c.scale, c.is_nullable
  FROM sys.columns c JOIN sys.tables t ON t.object_id = c.object_id
 ORDER BY c.object_id, c.column_id`;

const INDEKSER = `
SELECT i.object_id, i.is_primary_key, i.is_unique_constraint, i.filter_definition,
       STRING_AGG(CONVERT(nvarchar(max), COL_NAME(ic.object_id, ic.column_id)), N',')
         WITHIN GROUP (ORDER BY ic.key_ordinal) AS kolonner
  FROM sys.indexes i
  JOIN sys.tables t ON t.object_id = i.object_id
  JOIN sys.index_columns ic ON ic.object_id = i.object_id AND ic.index_id = i.index_id AND ic.key_ordinal > 0
 WHERE i.is_unique = 1
 GROUP BY i.object_id, i.index_id, i.is_primary_key, i.is_unique_constraint, i.filter_definition`;

const FREMMEDNOEKLER = `
SELECT f.parent_object_id AS object_id,
       OBJECT_SCHEMA_NAME(f.referenced_object_id) + '.' + OBJECT_NAME(f.referenced_object_id) AS til,
       f.delete_referential_action_desc AS ved_sletting,
       STRING_AGG(CONVERT(nvarchar(max), COL_NAME(k.parent_object_id, k.parent_column_id)), N',')
         WITHIN GROUP (ORDER BY k.constraint_column_id) AS kolonner,
       STRING_AGG(CONVERT(nvarchar(max), COL_NAME(k.referenced_object_id, k.referenced_column_id)), N',')
         WITHIN GROUP (ORDER BY k.constraint_column_id) AS til_kolonner
  FROM sys.foreign_keys f JOIN sys.foreign_key_columns k ON k.constraint_object_id = f.object_id
 GROUP BY f.object_id, f.parent_object_id, f.referenced_object_id, f.delete_referential_action_desc`;

/** Typen slik T-SQL skriver den i en kolonnedefinisjon, som `nvarchar(100)` og `datetime2(3)`. */
function typenavn(type: string, lengde: number, presisjon: number, skala: number): string {
  if (['nvarchar', 'nchar'].includes(type)) return `${type}(${lengde === -1 ? 'max' : lengde / 2})`;
  if (['varchar', 'char', 'varbinary', 'binary'].includes(type))
    return `${type}(${lengde === -1 ? 'max' : lengde})`;
  if (['datetime2', 'datetimeoffset', 'time'].includes(type)) return `${type}(${skala})`;
  if (['decimal', 'numeric'].includes(type)) return `${type}(${presisjon},${skala})`;
  return type;
}

const sammenlikn = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

export async function lesSqlServer(pool: Pool): Promise<{ tabeller: Record<string, Tabell> }> {
  const navn = new Map<number, string>();
  const tabeller: Record<string, Tabell> = {};
  for (const rad of (await pool.request().query(TABELLER)).recordset) {
    navn.set(rad.object_id, rad.navn);
    tabeller[rad.navn] = {
      kolonner: [],
      primærnøkkel: [],
      unike: [],
      unike_indekser: [],
      fremmednøkler: [],
    };
  }
  const tabell = (id: number) => tabeller[navn.get(id) ?? ''];
  for (const k of (await pool.request().query(KOLONNER)).recordset) {
    tabell(k.object_id)?.kolonner.push([
      k.name,
      typenavn(k.type, k.max_length, k.precision, k.scale),
      k.is_nullable ? 'NULL' : 'NOT NULL',
    ]);
  }
  for (const i of (await pool.request().query(INDEKSER)).recordset) {
    const t = tabell(i.object_id);
    if (!t) continue;
    const kolonner: string[] = i.kolonner.split(',');
    if (i.is_primary_key) t.primærnøkkel = kolonner;
    else if (i.is_unique_constraint) t.unike.push(kolonner);
    else
      t.unike_indekser.push(
        `(${kolonner.join(', ')})${i.filter_definition ? ` WHERE ${i.filter_definition}` : ''}`
      );
  }
  for (const f of (await pool.request().query(FREMMEDNOEKLER)).recordset) {
    tabell(f.object_id)?.fremmednøkler.push({
      kolonner: f.kolonner.split(','),
      til: f.til,
      til_kolonner: f.til_kolonner.split(','),
      ved_sletting: f.ved_sletting.replace('_', ' '),
    });
  }
  const sortert: Record<string, Tabell> = {};
  for (const n of Object.keys(tabeller).sort(sammenlikn)) {
    const t = tabeller[n];
    t.unike.sort((a, b) => sammenlikn(a.join(), b.join()));
    t.unike_indekser.sort(sammenlikn);
    t.fremmednøkler.sort((a, b) => sammenlikn(a.kolonner.join(), b.kolonner.join()));
    sortert[n] = t;
  }
  return { tabeller: sortert };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const base = await opprettMigrertTestbase('katalog');
  try {
    process.stdout.write(JSON.stringify(await lesSqlServer(base.pool)));
  } finally {
    await base.slett();
  }
}
