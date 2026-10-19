/**
 * Malen `kopierMigrertTestbase` gjenoppretter testbasene fra (#887). En kopi skal
 * være den samme basen som `opprettMigrertTestbase` bygger fra filene: samme
 * katalog, samme bokføring i runneren og innstillingene fra Azure SQL Database.
 */

import { describe, expect, it } from 'vitest';
import { avvikFraAzure, SQLSERVER_TILKOBLING, type Testbase } from './sqlserver.ts';
import { katalog, kopierMigrertTestbase, opprettMigrertTestbase } from './sqlserver_migrert.ts';

const historikk = async (base: Testbase) =>
  (
    await base.pool
      .request()
      .query('SELECT versjon, sha256 FROM koe_migrering.historikk ORDER BY versjon')
  ).recordset;

describe.skipIf(!SQLSERVER_TILKOBLING)('malen for testbasene', () => {
  it('en kopi har katalogen og historikken til en base migrert fra filene, og innstillingene fra Azure', async () => {
    const [fraFilene, kopi] = await Promise.all([
      opprettMigrertTestbase('mal_fra_filene'),
      kopierMigrertTestbase('mal_kopi'),
    ]);
    try {
      expect(await katalog(kopi)).toEqual(await katalog(fraFilene));
      expect(await historikk(kopi)).toEqual(await historikk(fraFilene));
      expect(await avvikFraAzure(kopi.pool)).toEqual([]);
    } finally {
      await Promise.all([fraFilene.slett(), kopi.slett()]);
    }
  }, 300_000);
});
