/**
 * Prøveserveren og testene skriver bare til en base `scripts/testbase/bygg_testbase.sh`
 * har merket kastbar, samme vakt som `krev_kastbar_testbase` i pytest, og bare
 * når basen er bygget av migrasjonene i arbeidstreet (#379).
 */

import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

export const TESTBASE_MERKE = 'koe-kastbar-testbase';
const ROT = fileURLToPath(new URL('..', import.meta.url));

/**
 * Summen `bygg_testbase.sh` lagrer i `koe.migrasjonssum`: sha256sum av
 * plattformstubben og migrasjonene i filnavnrekkefølge, og så av den lista.
 * Samme sum regnes i `backend/tests/test_database/conftest.py`.
 */
export function migrasjonssum(rot = ROT): string {
  const sha256 = (data: string | Buffer) => createHash('sha256').update(data).digest('hex');
  const filer = [
    'scripts/testbase/plattformstubb.sql',
    ...readdirSync(`${rot}/supabase/migrations`)
      .filter((navn) => navn.endsWith('.sql'))
      .sort()
      .map((navn) => `supabase/migrations/${navn}`),
  ];
  return sha256(filer.map((fil) => `${sha256(readFileSync(`${rot}/${fil}`))}  ${fil}\n`).join(''));
}

/**
 * En tilkoblingspool mot `url`, eller en feil når basen ikke er merket kastbar
 * eller er bygget av andre migrasjoner enn dem i `rot`.
 */
export async function kobleTilKastbarTestbase(url: string, max = 8, rot = ROT): Promise<pg.Pool> {
  const pool = new pg.Pool({ connectionString: url, max, connectionTimeoutMillis: 10_000 });
  const svar = await pool.query<{ merke: string | null; sum: string | null }>(
    `SELECT shobj_description(oid, 'pg_database') AS merke,
            current_setting('koe.migrasjonssum', true) AS sum
       FROM pg_database WHERE datname = current_database()`
  );
  const feil =
    svar.rows[0]?.merke !== TESTBASE_MERKE
      ? 'KOE_TESTBASE_URL peker ikke på en kastbar testbase.'
      : svar.rows[0].sum !== migrasjonssum(rot)
        ? 'Testbasen i KOE_TESTBASE_URL er ikke bygget av migrasjonene i arbeidstreet. ' +
          'Bygg den på nytt med scripts/testbase/bygg_paa_nytt.sh fra repo-roten; ' +
          'URL-en er den samme etterpå.'
        : null;
  if (feil) {
    await pool.end();
    throw new Error(feil);
  }
  return pool;
}
