/**
 * Prøveserveren og testene skriver bare til en base `scripts/testbase/bygg_testbase.sh`
 * har merket kastbar, samme vakt som `krev_kastbar_testbase` i pytest, og bare
 * når basen er bygget av migrasjonene i arbeidstreet (#379).
 */

import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

export const TESTBASE_MERKE = 'koe-kastbar-testbase';
const ROT = fileURLToPath(new URL('..', import.meta.url));

/** Summen av det testbasen bygges av i `rot`, fra `scripts/testbase/migrasjonssum.sh`. */
export function migrasjonssum(rot = ROT): string {
  return execFileSync('bash', [`${ROT}/scripts/testbase/migrasjonssum.sh`, rot], {
    encoding: 'utf8',
  }).trim();
}

/**
 * En tilkoblingspool mot `url`, eller en feil når basen ikke er merket kastbar
 * eller er bygget av andre migrasjoner enn dem i `rot`.
 */
export async function kobleTilKastbarTestbase(url: string, max = 8, rot = ROT): Promise<pg.Pool> {
  const sum = migrasjonssum(rot);
  const pool = new pg.Pool({ connectionString: url, max, connectionTimeoutMillis: 10_000 });
  try {
    const svar = await pool.query<{ merke: string | null; sum: string | null }>(
      `SELECT shobj_description(oid, 'pg_database') AS merke,
              current_setting('koe.migrasjonssum', true) AS sum
         FROM pg_database WHERE datname = current_database()`
    );
    if (svar.rows[0]?.merke !== TESTBASE_MERKE) {
      throw new Error('KOE_TESTBASE_URL peker ikke på en kastbar testbase.');
    }
    if (svar.rows[0].sum !== sum) {
      throw new Error(
        'Testbasen i KOE_TESTBASE_URL er ikke bygget av migrasjonene i arbeidstreet. ' +
          'Bygg den på nytt med scripts/testbase/bygg_paa_nytt.sh fra repo-roten; ' +
          'URL-en er den samme etterpå.'
      );
    }
  } catch (feil) {
    await pool.end();
    throw feil;
  }
  return pool;
}
