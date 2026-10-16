/**
 * `docs/datamodell/katalog.json` mot en base i SQL Server bygget fra
 * `database/migrasjoner/` (#558), som `test_katalog_json.py` for PostgreSQL.
 *
 * Registrene i `docs/datamodell/` kontrolleres mot øyeblikksbildet. Denne testen
 * holder SQL Server-delen av det lik katalogen, så en ny migrasjon som endrer
 * en tabell, en kolonne eller en nøkkel, gjør testen rød til bildet er tatt på
 * nytt med `docs/verktoy/katalog.py`.
 */

import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { lesSqlServer } from './katalog.ts';
import { SQLSERVER_TILKOBLING, type Testbase } from './sqlserver.ts';
import { opprettMigrertTestbase } from './sqlserver_migrert.ts';

const KATALOG = new URL('../../docs/datamodell/katalog.json', import.meta.url);

describe.skipIf(!SQLSERVER_TILKOBLING)('katalog.json mot SQL Server', () => {
  let base: Testbase;

  beforeAll(async () => {
    base = await opprettMigrertTestbase('katalog');
  }, 240_000);
  afterAll(async () => {
    await base?.slett();
  }, 60_000);

  it('SQL Server-delen er lik katalogen i en base bygget fra migrasjonene', async () => {
    const lagret = JSON.parse(readFileSync(KATALOG, 'utf-8')).sqlserver;
    expect(
      await lesSqlServer(base.pool),
      'katalog.json er utdatert. Kjør docs/verktoy/katalog.py med KOE_TESTBASE_URL og KOE_SQLSERVER_TILKOBLING, og så datamodell.py.'
    ).toEqual(lagret);
  });
});
