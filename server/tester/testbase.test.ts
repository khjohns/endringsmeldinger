/**
 * `somJobbkjoerer` (`testbase.ts`) på en pool med én forbindelse, så spørringen
 * etterpå går på den samme forbindelsen som setningen (#922, #813).
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { feilnummer } from '../datalag.ts';
import { koble, SQLSERVER_TILKOBLING, type Pool, type Testbase } from './sqlserver.ts';
import { kopierMigrertTestbase } from './sqlserver_migrert.ts';
import { somJobbkjoerer } from './testbase.ts';

describe.skipIf(!SQLSERVER_TILKOBLING)('somJobbkjoerer', () => {
  let base: Testbase;
  // Gir et tidsavbrudd (attention) etter 1 s.
  let kort: Pool;
  beforeAll(async () => {
    base = await kopierMigrertTestbase('jobbkjoerer', { maks: 1 });
    kort = await koble(base.navn, 1, { requestTimeout: 1_000 });
  }, 300_000);
  afterAll(async () => {
    await kort?.close();
    await base?.slett();
  });

  const tilstand = async (pool = base.pool) =>
    (
      await pool.request().query<{ bruker: string; transaksjoner: number; rettigheter: number }>(
        `SELECT USER_NAME() AS bruker, @@TRANCOUNT AS transaksjoner,
                (SELECT COUNT(*) FROM sys.database_permissions
                  WHERE grantee_principal_id = USER_ID('koe_jobbkjoerer') AND class = 1
                    AND major_id = OBJECT_ID('koe.jobb')) AS rettigheter`
      )
    ).recordset[0];

  it('en setning som feiler, gir den egentlige feilen, og forbindelsen er eieren uten transaksjon og uten testrettighetene', async () => {
    const foer = await tilstand();
    const feil = await somJobbkjoerer({ datalag: { base } }, 'SELECT 1 / 0').then(
      () => undefined,
      (e: unknown) => e
    );
    expect(feilnummer(feil)).toBe(8134);
    expect(await tilstand()).toEqual({ ...foer, bruker: 'dbo', transaksjoner: 0 });
  });

  it.each([
    ['uten parametre', {}],
    ['med parametre', { n: 1 }],
  ])(
    'en setning som avbrytes av et tidsavbrudd (%s), etterlater forbindelsen som eieren uten transaksjon og uten testrettighetene',
    async (_, parametre) => {
      const foer = await tilstand(kort);
      const feil = await somJobbkjoerer(
        { datalag: { base: { pool: kort } } },
        "WAITFOR DELAY '00:00:05'",
        parametre
      ).then(
        () => undefined,
        (e: { code?: string }) => e
      );
      expect(feil?.code).toBe('ETIMEOUT');
      expect(await tilstand(kort)).toEqual({ ...foer, bruker: 'dbo', transaksjoner: 0 });
    }
  );
});
