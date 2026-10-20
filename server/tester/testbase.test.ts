/**
 * `somJobbkjoerer` (`testbase.ts`) på en pool med én forbindelse, så spørringen
 * etterpå går på den samme forbindelsen som setningen (#922, #813). Samme
 * `connection_id` viser at forbindelsen er satt tilbake og ikke forkastet (#945 punkt 3).
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { feilnummer } from '../datalag.ts';
import {
  koble,
  opprettKjoeretid,
  SQLSERVER_TILKOBLING,
  type Pool,
  type Testbase,
} from './sqlserver.ts';
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
      await pool.request().query<{
        forbindelse: string;
        bruker: string;
        transaksjoner: number;
        rettigheter: number;
      }>(
        `SELECT (SELECT connection_id FROM sys.dm_exec_connections WHERE session_id = @@SPID) AS forbindelse,
                USER_NAME() AS bruker, @@TRANCOUNT AS transaksjoner,
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

  it.each([
    // Satsen går gjennom `sp_executesql`, som melder 266 for den åpne transaksjonen.
    ['RETURN', 'RETURN', /Transaction count after EXECUTE/],
    ['en egen EXECUTE AS', "EXECUTE AS USER = 'koe_jobbkjoerer'", /etterlot en egen EXECUTE AS/],
    [
      'to egne EXECUTE AS',
      "EXECUTE AS USER = 'koe_jobbkjoerer'; EXECUTE AS USER = 'koe_jobbkjoerer'",
      /etterlot en egen EXECUTE AS/,
    ],
  ])(
    'en setning med %s, gir en feil, og forbindelsen er eieren uten transaksjon og uten testrettighetene (#945 punkt 3)',
    async (_, setning, melding) => {
      const foer = await tilstand();
      const feil = await somJobbkjoerer({ datalag: { base } }, setning).then(
        () => undefined,
        (e: unknown) => e
      );
      expect(String(feil)).toMatch(melding);
      expect(await tilstand()).toEqual({ ...foer, bruker: 'dbo', transaksjoner: 0 });
    }
  );

  it('jobbkjørerens prosedyrer venter ikke på rettighetene somJobbkjoerer har gitt i en åpen transaksjon, men direkte lesing som koe_jobbkjoerer gjør det (#813 punkt 2)', async () => {
    const drift = await opprettKjoeretid(base, { maks: 1 });
    const direkte = await koble(base.navn, 1);
    try {
      const jobbkjoerer = somJobbkjoerer({ datalag: { base } }, "WAITFOR DELAY '00:00:03'");
      await harRettighetslaas();
      const prosedyre = await drift.pool
        .request()
        .query('SET LOCK_TIMEOUT 1000; EXEC koe_api.hent_jobb @leasetid_sekunder = 60;')
        .then(
          () => 0,
          (e: unknown) => feilnummer(e)
        );
      const lesing = await direkte
        .request()
        .query(
          `SET LOCK_TIMEOUT 1000; EXECUTE AS USER = 'koe_jobbkjoerer';
           SELECT COUNT(*) FROM koe.jobb; REVERT;`
        )
        .then(
          () => 0,
          (e: unknown) => feilnummer(e)
        );
      await jobbkjoerer;
      expect({ prosedyre, lesing }).toEqual({ prosedyre: 0, lesing: 1222 });
    } finally {
      await direkte.close();
      await drift.slett();
    }
  }, 60_000);

  /** Til en sesjon holder låsen `GRANT` tar på rettighetene. */
  async function harRettighetslaas() {
    for (let i = 0; i < 100; i++) {
      const { n } = (
        await kort.request().query<{ n: number }>(
          `SELECT COUNT(*) AS n FROM sys.dm_tran_locks
            WHERE resource_database_id = DB_ID() AND resource_subtype = 'PERMISSIONS'
              AND request_mode = 'Sch-M'`
        )
      ).recordset[0];
      if (n > 0) return;
      await new Promise((ok) => setTimeout(ok, 50));
    }
    throw new Error('Ingen sesjon holder låsen på rettighetene.');
  }
});
