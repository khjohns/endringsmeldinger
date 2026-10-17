/**
 * Prosjektinngangene mot testbasene (F0b-6, #660). Forventningene er
 * `list_projects` og `get_project` i `backend/routes/project_routes.py`, med
 * `AuthService.user_projects` for utvalget, og `Project` i
 * `src/lib/types/project.ts` for svaret. Tilgangen til hver inngang prøves i
 * `register.test.ts`.
 */

import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { catendaId, sha256, type Catenda } from '../autorisasjon.ts';
import {
  catendaFra,
  kall,
  lagOppsett,
  rydd,
  startServer,
  BEGGE_BASENE,
  type KjorendeServer,
  type Oppsett,
  type Testbruker,
} from './testbase.ts';
import { settInn } from './sqlserver_migrert.ts';

describe.skipIf(!BEGGE_BASENE)('prosjektinngangene mot testbasene', () => {
  let o: Oppsett;
  let server: KjorendeServer;
  const eier = () => o.datalag!.base.pool.request();

  beforeAll(async () => {
    o = await lagOppsett();
    server = await startServer(o);
  });
  afterAll(async () => {
    await server?.stopp();
    if (o) await rydd(o);
  });

  /** Et prosjekt i SQL Server med `bruker` som medlem, og medlemslisten hentet for `alder` sekunder siden. */
  async function prosjekt(
    bruker: Testbruker,
    {
      navn = 'Prosjekt',
      aktivt = true,
      koblet = true,
      medlem = true,
      leser = false,
      alder = 0,
    } = {}
  ): Promise<string> {
    const id = `p-liste-${randomUUID().slice(0, 8)}`;
    const catenda = randomUUID();
    await settInn(eier, 'projects', {
      id,
      name: navn,
      description: 'Beskrivelse',
      organisasjon_id: 'org-liste',
      is_active: aktivt,
    });
    await settInn(eier, 'catenda_project_configs', {
      internal_project_id: id,
      catenda_project_id: catenda,
      is_active: koblet,
    });
    await settInn(eier, 'app_membership_sync', {
      project_id: id,
      catenda_project_id: catenda,
      synced_at: { sql: `DATEADD(second, -${alder}, SYSUTCDATETIME())` },
    });
    await settInn(eier, 'app_project_memberships', {
      project_id: id,
      user_id: bruker.id,
      catenda_subject: catendaId(randomUUID()),
      user_email: `${bruker.id}@test.example`,
      display_name: 'Testbruker',
      role: 'member',
      viewer_override: leser,
      active: medlem,
    });
    return id;
  }

  /** En innlogget bruker uten medlemskap. */
  async function nyBruker(): Promise<Testbruker> {
    const b = { id: randomUUID(), subjekt: randomUUID(), token: randomUUID(), csrf: randomUUID() };
    await settInn(eier, 'app_users', { id: b.id, email: `${b.id}@test.example`, name: 'Ny' });
    await settInn(eier, 'app_sessions', {
      token_hash: sha256(b.token),
      user_id: b.id,
      csrf_token: b.csrf,
      expires_at: { sql: 'DATEADD(hour, 1, SYSUTCDATETIME())' },
    });
    return b;
  }

  const liste = async (bruker: Testbruker, url = server.url) => {
    const svar = await kall(url, '/api/projects', { bruker, prosjektId: null });
    return { status: svar.status, kropp: svar.kropp };
  };
  const ider = (kropp: Record<string, unknown>) =>
    (kropp.projects as { id: string }[]).map((p) => p.id);

  it('lista har prosjektene brukeren er medlem i, i Project-formen, og ikke andres', async () => {
    const svar = await liste(o.te);
    expect(svar.status).toBe(200);
    expect(svar.kropp.projects).toEqual([
      {
        id: o.prosjekt.id,
        organisasjon_id: 'org-test',
        name: 'Testmiljøet',
        description: null,
        settings: {},
        created_at: expect.stringMatching(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/),
        created_by: null,
        is_active: true,
      },
    ]);
    expect(ider((await liste(o.utenfor)).kropp)).toEqual([o.annetProsjekt.id]);
  });

  it('en bruker uten medlemskap får en tom liste', async () => {
    expect(await liste(await nyBruker())).toEqual({ status: 200, kropp: { projects: [] } });
  });

  it('lista har et aktivt medlemskap med leserolle, ikke et inaktivt medlemskap, en inaktiv kobling eller et inaktivt prosjekt', async () => {
    const b = await nyBruker();
    const leser = await prosjekt(b, { navn: 'B', leser: true });
    const medlem = await prosjekt(b, { navn: 'A' });
    await prosjekt(b, { medlem: false });
    await prosjekt(b, { koblet: false });
    await prosjekt(b, { aktivt: false });
    // Sortert på navnet, som `list_active`.
    expect(ider((await liste(b)).kropp)).toEqual([medlem, leser]);
  });

  it('et gammelt medlemskap synkroniseres før lista leses, og et medlemskap synkroniseringen fjerner, er ikke med', async () => {
    const b = await nyBruker();
    const fersk = await prosjekt(b, { navn: 'A' });
    const gammel = await prosjekt(b, { navn: 'B', alder: 3600 });
    const synkronisert: string[] = [];
    const catenda: Catenda = {
      ...catendaFra(o.teammedlemmer),
      async synkroniser(prosjektId) {
        synkronisert.push(prosjektId);
        await eier()
          .input('prosjekt', prosjektId)
          .query('UPDATE koe.app_project_memberships SET active = 0 WHERE project_id = @prosjekt');
      },
    };
    const egen = await startServer(o, { catenda });
    try {
      expect(ider((await liste(b, egen.url)).kropp)).toEqual([fersk]);
      expect(synkronisert).toEqual([gammel]);
    } finally {
      await egen.stopp();
    }
  });

  it('feiler synkroniseringen, gir lista 503', async () => {
    const b = await nyBruker();
    await prosjekt(b, { alder: 3600 });
    const egen = await startServer(o, {
      catenda: {
        ...catendaFra(o.teammedlemmer),
        async synkroniser() {
          throw new Error('Catenda er nede');
        },
      },
    });
    try {
      const svar = await liste(b, egen.url);
      expect(svar.status).toBe(503);
      expect(svar.kropp.error).toBe('ACCESS_UNAVAILABLE');
    } finally {
      await egen.stopp();
    }
  });

  it('prosjektet er det samme som i lista, også for et medlem uten kontraktsteam', async () => {
    const [iLista] = (await liste(o.te)).kropp.projects as unknown[];
    for (const bruker of [o.te, o.utenTeam]) {
      const svar = await kall(server.url, `/api/projects/${encodeURIComponent(o.prosjekt.id)}`, {
        bruker,
        prosjektId: o.prosjekt.id,
      });
      expect(svar.status).toBe(200);
      expect(svar.kropp).toEqual(iLista);
    }
  });

  it('et medlem med leserolle får prosjektet, som `require_project_access()` med `viewer`', async () => {
    const b = await nyBruker();
    const id = await prosjekt(b, { leser: true });
    const svar = await kall(server.url, `/api/projects/${id}`, { bruker: b, prosjektId: id });
    expect(svar.status).toBe(200);
    expect(svar.kropp.id).toBe(id);
  });
});
