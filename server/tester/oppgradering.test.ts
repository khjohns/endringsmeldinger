/**
 * Oppgradering med data (#1057 del 2). De andre testbasene bygges fra tom, så
 * en migrasjon som endrer eller strammer inn rader som alt finnes, er ellers
 * bare prøvd mot tomme tabeller.
 *
 * Basen migreres til før `GRENSE`, får rader, og migreres så til siste fil med
 * den samme runneren, slik en utrulling gjør. Forventningene:
 *
 * - Runneren anvender bare filene fra og med `GRENSE`, og basen får samme
 *   katalog som en base bygget fra tom. Kilde: «Katalogen i testbasen er kilden
 *   for skjemaet» og runnerens historikk (`.claude/rules/database.md`).
 * - `20261020000000_synkroniseringsgrense.sql` gjør den tomme Catenda-ID-en, som
 *   var markøren for «ingen liste» før DL-U10 ble bygget, om til `NULL`, og lar en
 *   ekte ID stå. Deretter avvises den tomme ID-en. Kilde: DL-U10 og #726 punkt 6,
 *   som fila viser til.
 * - Radene i `koe.projects` og `koe.app_membership_sync` overlever alle senere
 *   filer, også innstrammingene av tegnklassen og tomme ID-er (#609).
 *
 * Krever `KOE_SQLSERVER_TILKOBLING`.
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { lesMigrasjoner, migrer } from '../migrering.ts';
import { avvisning, katalog, opprettMigrertTestbase } from './sqlserver_migrert.ts';
import { opprettTestbase, slettAlle, SQLSERVER_TILKOBLING, type Testbase } from './sqlserver.ts';

const GRENSE = '20261020000000';
const TOM_ID = '00000000-0000-0000-0000-000000000000';
const EKTE_ID = '6f1c2a8e-3b4d-4e5f-8a9b-0c1d2e3f4a5b';

describe.skipIf(!SQLSERVER_TILKOBLING)('oppgradering av en base med data', () => {
  let oppgradert: Testbase;
  let fraTom: Testbase;
  let anvendt: string[];

  beforeAll(async () => {
    const filer = lesMigrasjoner();
    [oppgradert, fraTom] = await Promise.all([
      opprettTestbase('oppgradering'),
      opprettMigrertTestbase('oppgradering_fra_tom'),
    ]);
    await migrer(
      oppgradert.pool,
      filer.filter((f) => f.versjon < GRENSE)
    );
    await oppgradert.pool.request().input('tom', TOM_ID).input('ekte', EKTE_ID).batch(`
      INSERT koe.projects (id, name, organisasjon_id, is_active)
      VALUES (N'p_markoer', N'Markør', N'org', 1), (N'p_koblet', N'Koblet', N'org', 1);
      INSERT koe.app_membership_sync (project_id, catenda_project_id, synced_at)
      VALUES (N'p_markoer', @tom, '2026-10-19T12:00:00.000'),
             (N'p_koblet', @ekte, '2026-10-19T13:00:00.000');`);
    anvendt = await migrer(oppgradert.pool, filer);
  }, 480_000);
  afterAll(async () => {
    await slettAlle(oppgradert, fraTom);
  }, 120_000);

  it('anvender bare filene fra og med grensen', () => {
    const forventet = lesMigrasjoner()
      .filter((f) => f.versjon >= GRENSE)
      .map((f) => f.versjon);
    expect(forventet[0]).toBe(GRENSE);
    expect(anvendt).toEqual(forventet);
  });

  it('gir samme katalog som en base bygget fra tom', async () => {
    expect(await katalog(oppgradert)).toEqual(await katalog(fraTom));
  });

  it('gjør den tomme Catenda-ID-en om til NULL og lar den ekte stå (DL-U10)', async () => {
    const svar = await oppgradert.pool.request().query<{
      project_id: string;
      catenda_project_id: string | null;
      synced_at: Date;
    }>(`SELECT project_id, catenda_project_id, synced_at
          FROM koe.app_membership_sync ORDER BY project_id`);
    expect(
      svar.recordset.map((r) => ({
        ...r,
        catenda_project_id: r.catenda_project_id?.toLowerCase() ?? null,
        synced_at: r.synced_at.toISOString(),
      }))
    ).toEqual([
      {
        project_id: 'p_koblet',
        catenda_project_id: EKTE_ID,
        synced_at: '2026-10-19T13:00:00.000Z',
      },
      { project_id: 'p_markoer', catenda_project_id: null, synced_at: '2026-10-19T12:00:00.000Z' },
    ]);
  });

  it('beholder prosjektene', async () => {
    const svar = await oppgradert.pool
      .request()
      .query<{ id: string; name: string }>(`SELECT id, name FROM koe.projects ORDER BY id`);
    expect(svar.recordset).toEqual([
      { id: 'p_koblet', name: 'Koblet' },
      { id: 'p_markoer', name: 'Markør' },
    ]);
  });

  it('avviser den tomme Catenda-ID-en etter oppgraderingen', async () => {
    const svar = avvisning(
      oppgradert.pool
        .request()
        .input('tom', TOM_ID)
        .query(
          `UPDATE koe.app_membership_sync SET catenda_project_id = @tom WHERE project_id = N'p_koblet'`
        )
    );
    expect(await svar).toBe(547);
  });
});
