/**
 * Prøveserveren og testene skriver bare til en base `scripts/testbase/bygg_testbase.sh`
 * har merket kastbar, samme vakt som `krev_kastbar_testbase` i pytest.
 */

import pg from 'pg';

export const TESTBASE_MERKE = 'koe-kastbar-testbase';

/** En tilkoblingspool mot `url`, eller en feil når basen ikke er merket kastbar. */
export async function kobleTilKastbarTestbase(url: string, max = 8): Promise<pg.Pool> {
  const pool = new pg.Pool({ connectionString: url, max, connectionTimeoutMillis: 10_000 });
  const svar = await pool.query<{ merke: string | null }>(
    "SELECT shobj_description(oid, 'pg_database') AS merke FROM pg_database WHERE datname = current_database()"
  );
  if (svar.rows[0]?.merke !== TESTBASE_MERKE) {
    await pool.end();
    throw new Error('KOE_TESTBASE_URL peker ikke på en kastbar testbase.');
  }
  return pool;
}
