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
  TESTBASE_URL,
  type KjorendeServer,
  type Oppsett,
  type Testbruker,
} from './testbase.ts';
import { settInn } from './sqlserver_migrert.ts';
import { sql } from '../datalag.ts';

describe.skipIf(!TESTBASE_URL)('prosjektinngangene mot testbasene', () => {
  let o: Oppsett;
  let server: KjorendeServer;
  const eier = () => o.datalag.base.pool.request();

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
      library_id: randomUUID(),
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
      // En fullstendig liste uten brukeren gjør medlemskapet inaktivt.
      async medlemmer(catendaProsjekt) {
        synkronisert.push(catendaProsjekt);
        return [];
      },
    };
    const kobling = await eier().input('prosjekt', gammel).query<{
      c: string;
    }>('SELECT catenda_project_id AS c FROM koe.catenda_project_configs WHERE internal_project_id = @prosjekt');
    const egen = await startServer(o, { catenda });
    try {
      expect(ider((await liste(b, egen.url)).kropp)).toEqual([fersk]);
      expect(synkronisert).toEqual([kobling.recordset[0].c.toLowerCase()]);
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
        async medlemmer() {
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

/**
 * Medlemsinngangene (F-1a, #820). Forventningene er `list_members`,
 * `sync_members` og `limit_member` i `backend/routes/membership_routes.py`, med
 * `AuthService.sync` for tellingen. Tilgangen til hver inngang prøves i
 * `register.test.ts`; her prøves rollen admin og hva inngangene skriver.
 */
describe.skipIf(!TESTBASE_URL)('medlemsinngangene mot testbasene', () => {
  let o: Oppsett;
  let server: KjorendeServer;
  const eier = () => o.datalag.base.pool.request();

  beforeAll(async () => {
    o = await lagOppsett();
    server = await startServer(o);
  });
  afterAll(async () => {
    await server?.stopp();
    if (o) await rydd(o);
  });

  type Deltaker = Testbruker & { catendaSubjekt: string };

  /** Et koblet prosjekt med fersk medlemsliste og ett medlem per rolle i `roller`. */
  async function prosjektMed(
    roller: { rolle: 'admin' | 'member'; leser?: boolean; aktiv?: boolean }[]
  ): Promise<{ id: string; catenda: string; deltakere: Deltaker[] }> {
    const id = `p-medl-${randomUUID().slice(0, 8)}`;
    const catenda = randomUUID();
    await settInn(eier, 'projects', {
      id,
      name: 'Medlemmer',
      organisasjon_id: 'org-medl',
      is_active: true,
    });
    await settInn(eier, 'catenda_project_configs', {
      internal_project_id: id,
      catenda_project_id: catenda,
      library_id: randomUUID(),
      is_active: true,
    });
    await settInn(eier, 'app_membership_sync', {
      project_id: id,
      catenda_project_id: catenda,
      synced_at: { sql: 'SYSUTCDATETIME()' },
    });
    const deltakere: Deltaker[] = [];
    for (const [i, { rolle, leser = false, aktiv = true }] of roller.entries()) {
      const b = {
        id: randomUUID(),
        subjekt: randomUUID(),
        token: randomUUID(),
        csrf: randomUUID(),
      };
      const d = { ...b, catendaSubjekt: catendaId(b.subjekt)! };
      await settInn(eier, 'app_users', { id: b.id, email: `${b.id}@test.example`, name: 'X' });
      // Identiteten, så synkroniseringen finner samme bruker for subjektet.
      await settInn(eier, 'app_identities', {
        id: randomUUID(),
        user_id: b.id,
        provider: 'catenda',
        issuer: 'https://api.catenda.com',
        subject: d.catendaSubjekt,
      });
      await settInn(eier, 'app_sessions', {
        token_hash: sha256(b.token),
        user_id: b.id,
        csrf_token: b.csrf,
        expires_at: { sql: 'DATEADD(hour, 1, SYSUTCDATETIME())' },
      });
      await settInn(eier, 'app_project_memberships', {
        project_id: id,
        user_id: b.id,
        catenda_subject: d.catendaSubjekt,
        user_email: `${b.id}@test.example`,
        display_name: `Medlem ${i}`,
        role: rolle,
        viewer_override: leser,
        active: aktiv,
      });
      deltakere.push(d);
    }
    return { id, catenda, deltakere };
  }

  const leserolle = async (prosjekt: string, bruker: string) =>
    (
      await eier().input('p', prosjekt).input('b', bruker).query<{
        v: boolean;
      }>('SELECT viewer_override AS v FROM koe.app_project_memberships WHERE project_id = @p AND user_id = @b')
    ).recordset[0].v;

  it('medlemmene er de aktive, i formen fra public_member, med leserollen som rollen viewer', async () => {
    const p = await prosjektMed([
      { rolle: 'admin' },
      { rolle: 'member', leser: true },
      { rolle: 'member', aktiv: false },
    ]);
    const [admin, leser] = p.deltakere;
    const svar = await kall(server.url, `/api/projects/${p.id}/members`, {
      bruker: leser,
      prosjektId: p.id,
    });
    expect(svar.status).toBe(200);
    const tid = expect.stringMatching(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/);
    expect(svar.kropp.members).toEqual([
      {
        id: admin.id,
        project_id: p.id,
        user_id: admin.id,
        user_email: `${admin.id}@test.example`,
        display_name: 'Medlem 0',
        created_at: tid,
        updated_at: tid,
        external_id: admin.catendaSubjekt,
        source: 'catenda',
        role: 'admin',
        catenda_role: 'admin',
        viewer_override: false,
      },
      expect.objectContaining({
        id: leser.id,
        role: 'viewer',
        catenda_role: 'member',
        viewer_override: true,
      }),
    ]);
  });

  it('admin setter og fjerner leserollen til et annet medlem', async () => {
    const p = await prosjektMed([{ rolle: 'admin' }, { rolle: 'member' }]);
    const [admin, medlem] = p.deltakere;
    for (const verdi of [true, false]) {
      const svar = await kall(server.url, `/api/projects/${p.id}/members/${medlem.id}`, {
        bruker: admin,
        prosjektId: p.id,
        metode: 'PATCH',
        kropp: { viewer_override: verdi },
      });
      expect(svar).toEqual({ status: 200, kropp: { success: true } });
      expect(await leserolle(p.id, medlem.id)).toBe(verdi);
    }
  });

  it('en kropp med annet enn viewer_override som boolsk verdi gir 400 og endrer ingenting', async () => {
    const p = await prosjektMed([{ rolle: 'admin' }, { rolle: 'member' }]);
    const [admin, medlem] = p.deltakere;
    for (const kropp of [
      {},
      { viewer_override: 'true' },
      { viewer_override: 1 },
      { viewer_override: true, role: 'admin' },
    ]) {
      const svar = await kall(server.url, `/api/projects/${p.id}/members/${medlem.id}`, {
        bruker: admin,
        prosjektId: p.id,
        metode: 'PATCH',
        kropp,
      });
      expect(svar.status, JSON.stringify(kropp)).toBe(400);
      expect(svar.kropp.error).toBe('INVALID_REQUEST');
    }
    expect(await leserolle(p.id, medlem.id)).toBe(false);
  });

  it('eget medlemskap, et inaktivt medlem, et medlem i et annet prosjekt og en ID som ikke er en UUID gir 403', async () => {
    const p = await prosjektMed([{ rolle: 'admin' }, { rolle: 'member', aktiv: false }]);
    const annet = await prosjektMed([{ rolle: 'member' }]);
    const [admin, inaktiv] = p.deltakere;
    for (const medlem of [admin.id, inaktiv.id, annet.deltakere[0].id, 'ikke-en-uuid']) {
      const svar = await kall(server.url, `/api/projects/${p.id}/members/${medlem}`, {
        bruker: admin,
        prosjektId: p.id,
        metode: 'PATCH',
        kropp: { viewer_override: true },
      });
      expect(svar.status, medlem).toBe(403);
      expect(svar.kropp.error).toBe('FORBIDDEN');
    }
    expect(await leserolle(p.id, admin.id)).toBe(false);
    expect(await leserolle(annet.id, annet.deltakere[0].id)).toBe(false);
  });

  it('et medlem og en admin med leserolle får 403 på synkroniseringen og leserollen, som min_role="admin"', async () => {
    const p = await prosjektMed([
      { rolle: 'member' },
      { rolle: 'admin', leser: true },
      { rolle: 'member' },
    ]);
    const [medlem, leserAdmin, maal] = p.deltakere;
    for (const bruker of [medlem, leserAdmin]) {
      const sync = await kall(server.url, `/api/projects/${p.id}/members/sync`, {
        bruker,
        prosjektId: p.id,
        kropp: {},
      });
      expect(sync.status).toBe(403);
      const patch = await kall(server.url, `/api/projects/${p.id}/members/${maal.id}`, {
        bruker,
        prosjektId: p.id,
        metode: 'PATCH',
        kropp: { viewer_override: true },
      });
      expect(patch.status).toBe(403);
    }
    expect(await leserolle(p.id, maal.id)).toBe(false);
  });

  it('prosedyren endrer ikke leserollen for en aktør som ikke er aktiv admin, også kalt direkte', async () => {
    const p = await prosjektMed([{ rolle: 'member' }, { rolle: 'member' }]);
    const [aktor, maal] = p.deltakere;
    const svar = await o.datalag.kjoeretid.pool
      .request()
      .input('aktor', sql.UniqueIdentifier, aktor.id)
      .input('prosjekt', sql.NVarChar(4000), p.id)
      .input('medlem', sql.UniqueIdentifier, maal.id)
      .input('leserolle', sql.Bit, true)
      .output('endret', sql.Bit)
      .execute('koe_api.sett_leserolle');
    expect(svar.output.endret).toBe(false);
    expect(await leserolle(p.id, maal.id)).toBe(false);
  });

  it('prosedyren gir en tom liste, ikke et manglende resultatsett, til en aktør som ikke er aktivt medlem i prosjektet', async () => {
    const p = await prosjektMed([{ rolle: 'admin' }, { rolle: 'member', aktiv: false }]);
    const annet = await prosjektMed([{ rolle: 'admin' }]);
    for (const aktor of [p.deltakere[1].id, annet.deltakere[0].id, randomUUID(), null]) {
      const svar = await o.datalag.kjoeretid.pool
        .request()
        .input('aktor', sql.UniqueIdentifier, aktor)
        .input('prosjekt', sql.NVarChar(4000), p.id)
        .execute('koe_api.medlemmer');
      expect(svar.recordset).toEqual([]);
    }
  });

  it('synkroniseringen skriver listen fra det koblede Catenda-prosjektet og teller medlemmene og de deaktiverte', async () => {
    const p = await prosjektMed([{ rolle: 'admin' }, { rolle: 'member' }]);
    const [admin, fjernet] = p.deltakere;
    const nytt = catendaId(randomUUID())!;
    const hentetFra: string[] = [];
    const egen = await startServer(o, {
      catenda: {
        ...catendaFra(o.teammedlemmer),
        async medlemmer(c) {
          hentetFra.push(c);
          return [
            { subjekt: admin.catendaSubjekt, epost: 'a@test.example', navn: 'A', rolle: 'admin' },
            { subjekt: nytt, epost: 'n@test.example', navn: 'N', rolle: 'member' },
          ];
        },
      },
    });
    try {
      const svar = await kall(egen.url, `/api/projects/${p.id}/members/sync`, {
        bruker: admin,
        prosjektId: p.id,
        kropp: {},
      });
      expect(svar).toEqual({
        status: 200,
        kropp: { success: true, members: 2, deactivated: 1 },
      });
      expect(hentetFra).toEqual([p.catenda.toLowerCase()]);
      const aktive = await eier().input('p', p.id).query<{
        s: string;
      }>('SELECT catenda_subject AS s FROM koe.app_project_memberships WHERE project_id = @p AND active = 1');
      expect(aktive.recordset.map((r) => r.s).sort()).toEqual([admin.catendaSubjekt, nytt].sort());
      expect(aktive.recordset.map((r) => r.s)).not.toContain(fjernet.catendaSubjekt);
    } finally {
      await egen.stopp();
    }
  });

  it('feiler hentingen fra Catenda, gir synkroniseringen 503 SYNC_UNAVAILABLE', async () => {
    const p = await prosjektMed([{ rolle: 'admin' }]);
    const egen = await startServer(o, {
      catenda: {
        ...catendaFra(o.teammedlemmer),
        async medlemmer() {
          throw new Error('Catenda er nede');
        },
      },
    });
    try {
      const svar = await kall(egen.url, `/api/projects/${p.id}/members/sync`, {
        bruker: p.deltakere[0],
        prosjektId: p.id,
        kropp: {},
      });
      expect(svar.status).toBe(503);
      expect(svar.kropp.error).toBe('SYNC_UNAVAILABLE');
    } finally {
      await egen.stopp();
    }
  });
});
