/**
 * Malen `kopierMigrertTestbase` gjenoppretter testbasene fra (#887). En kopi skal
 * være den samme basen som `opprettMigrertTestbase` bygger fra filene: samme
 * katalog, samme bokføring i runneren og innstillingene fra Azure SQL Database.
 */

import { randomBytes } from 'node:crypto';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { avvikFraAzure, kobleTilServer, SQLSERVER_TILKOBLING, type Testbase } from './sqlserver.ts';
import { feilnummer } from '../datalag.ts';
import {
  fullfoert,
  katalog,
  kopierMigrertTestbase,
  LEDIG_FORBINDELSE,
  malsum,
  opprettMigrertTestbase,
  slettMalByggetEtter,
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

    it('låsen følger forbindelsen: med en kortere grense for ledige forbindelser enn ventetiden mister sesjonen den', async () => {
      const r = ressurs();
      const svar = await underLaas(
        r,
        1_000,
        async () => {
          await new Promise((ok) => setTimeout(ok, 3_000));
          return laasmodus(r);
        },
        { ledig: 200 }
      );
      // 1: en annen sesjon får låsen.
      expect(svar).toBe(1);
    });

    it('med standardgrensen holder låsen mens forbindelsen er ledig, og grensen er lenger enn 30 s, standarden i poolen', async () => {
      expect(LEDIG_FORBINDELSE).toBeGreaterThan(30_000);
      const r = ressurs();
      const svar = await underLaas(r, 1_000, async () => {
        await new Promise((ok) => setTimeout(ok, 3_000));
        return laasmodus(r);
      });
      // 0: en annen sesjon får ikke låsen.
      expect(svar).toBe(0);
      expect(await laasmodus(r)).toBe(1);
    });
  });

  // #969: bare en kopi som mangler eller ikke kan leses som kopi, gir `false`.
  describe('fullfoert', () => {
    it('en fil som ikke finnes, er ikke en fullført kopi', async () => {
      const m = await kobleTilServer(0);
      try {
        expect(
          await fullfoert(
            m,
            `/var/opt/mssql/data/koe_finnes_ikke_${randomBytes(4).toString('hex')}.bak`
          )
        ).toBe(false);
      } finally {
        await m.close();
      }
    });

    it('en brutt forbindelse når fram som feil, ikke som en kopi som mangler', async () => {
      const m = await kobleTilServer(0);
      await m.close();
      await expect(fullfoert(m, '/var/opt/mssql/data/koe_finnes_ikke.bak')).rejects.toThrow();
    });
  });

  it('en mal som var skrevet før kjøringen startet, slettes ikke etter kjøringen (#945)', async () => {
    await kopierMigrertTestbase('mal_foer').then((b) => b.slett());
    expect(await slettMalByggetEtter(Date.now())).toBe(false);
  }, 300_000);
});

describe('summen malen navngis etter', () => {
  /** En mappe med én migrasjon, med samme innhold under hvert filnavn. */
  const sumFor = (filnavn: string, innhold = 'SELECT 1;\n') => {
    const mappe = mkdtempSync(join(tmpdir(), 'koe-malsum-'));
    try {
      writeFileSync(join(mappe, filnavn), innhold);
      return malsum(mappe);
    } finally {
      rmSync(mappe, { recursive: true, force: true });
    }
  };

  it('kontrollsak: samme filnavn og samme innhold gir samme sum', () => {
    expect(sumFor('20261020200000_flyttet.sql')).toBe(sumFor('20261020200000_flyttet.sql'));
  });

  it('en migrasjon med samme innhold og ny versjon i filnavnet gir en ny sum (#1103)', () => {
    expect(sumFor('20261020201000_flyttet.sql')).not.toBe(sumFor('20261020200000_flyttet.sql'));
  });

  it('nytt innhold under samme filnavn gir en ny sum', () => {
    expect(sumFor('20261020200000_flyttet.sql', 'SELECT 2;\n')).not.toBe(
      sumFor('20261020200000_flyttet.sql')
    );
  });
});
