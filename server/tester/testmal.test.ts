/**
 * Malen `kopierMigrertTestbase` gjenoppretter testbasene fra (#887). En kopi skal
 * være den samme basen som `opprettMigrertTestbase` bygger fra filene: samme
 * katalog, samme bokføring i runneren og innstillingene fra Azure SQL Database.
 */

import { randomBytes } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { avvikFraAzure, kobleTilServer, SQLSERVER_TILKOBLING, type Testbase } from './sqlserver.ts';
import { feilnummer } from '../datalag.ts';
import {
  katalog,
  kopierMigrertTestbase,
  opprettMigrertTestbase,
  underLaas,
} from './sqlserver_migrert.ts';

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

  // En egen ressurs, så låsen ikke blokkerer malen for de andre filene (#930).
  describe('låsen', () => {
    const ressurs = () => `koe_testlaas_${randomBytes(4).toString('hex')}`;
    const laasmodus = async (r: string) => {
      const m = await kobleTilServer(0);
      try {
        return (
          await m.request().query<{
            modus: number;
          }>(`SELECT APPLOCK_TEST('public', N'${r}', 'Exclusive', 'Session') AS modus`)
        ).recordset[0].modus;
      } finally {
        await m.close();
      }
    };

    it('en annen som venter på låsen lenger enn fristen, får en feil med svarkoden fra sp_getapplock', async () => {
      const r = ressurs();
      let slipp!: () => void;
      const holdt = new Promise<void>((ok) => (slipp = ok));
      let tatt!: () => void;
      const erTatt = new Promise<void>((ok) => (tatt = ok));
      const foerste = underLaas(r, 1_000, async () => {
        tatt();
        await holdt;
      });
      try {
        await erTatt;
        const feil = await underLaas(r, 500, async () => {}).then(
          () => undefined,
          (e: Error) => e
        );
        expect(feilnummer(feil)).toBe(50000);
        expect(feil?.message).toContain(`sp_getapplock ga -1 for låsen ${r}`);
      } finally {
        slipp();
        await foerste;
      }
    });

    it('låsen holder mens forbindelsen er ledig lenger enn 30 s, standarden for ledige forbindelser i poolen', async () => {
      const r = ressurs();
      const svar = await underLaas(r, 1_000, async () => {
        await new Promise((ok) => setTimeout(ok, 35_000));
        return laasmodus(r);
      });
      // 0: en annen sesjon får ikke låsen.
      expect(svar).toBe(0);
      expect(await laasmodus(r)).toBe(1);
    }, 60_000);
  });
});
