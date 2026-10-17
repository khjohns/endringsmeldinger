/**
 * Oppsett mot den kastbare testbasen for TS-serveren. Radene er de
 * innloggingen og medlemssynkroniseringen ellers skriver: bruker, sesjon,
 * prosjektmedlemskap, registrert prosjekt, fersk synkronisering og
 * kontraktsteam. Alt får ID-er unike for kjøringen og slettes av `rydd`.
 *
 * Journalen står i PostgreSQL fram til F0b-7 (#661), og tilgangen i SQL Server
 * (#658). `startServer` lager derfor en migrert base i SQL Server med de samme
 * radene og sakene og gir serveren kjøretidens pool mot den. Den krever
 * `KOE_SQLSERVER_TILKOBLING` i tillegg til `KOE_TESTBASE_URL` (`BEGGE_BASENE`).
 *
 * Kjør ikke samtidig med pytest mot samme base: oppryddingen der setter alle
 * tabeller tilbake til frødataene og sletter radene herfra.
 */

import { randomUUID } from 'node:crypto';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import pg from 'pg';
import { lagServer, type Avhengigheter } from '../app.ts';
import { catendaId, sha256, type Catenda } from '../autorisasjon.ts';
import { kobleTilKastbarTestbase } from '../kastbar.ts';
import { opprettKjoeretid, SQLSERVER_TILKOBLING, type Pool, type Testbase } from './sqlserver.ts';
import { iTransaksjon, opprettMigrertTestbase, settInn } from './sqlserver_migrert.ts';
export const TESTBASE_URL = process.env.KOE_TESTBASE_URL ?? '';
/** Serveren i testene trenger begge basene fram til F0b-7 (#661). */
export const BEGGE_BASENE = Boolean(TESTBASE_URL && SQLSERVER_TILKOBLING);
export interface Testbruker {
  id: string;
  subjekt: string;
  token: string;
  csrf: string;
}

export interface Testprosjekt {
  id: string;
  catendaProsjekt: string;
  teTeam: string;
  bhTeam: string;
}

export interface Oppsett {
  pool: pg.Pool;
  prosjekt: Testprosjekt;
  annetProsjekt: Testprosjekt;
  te: Testbruker;
  bh: Testbruker;
  /** Medlem i prosjektet, men i ingen av kontraktsteamene. */
  utenTeam: Testbruker;
  /** Medlem bare i det andre prosjektet. */
  utenfor: Testbruker;
  /** Catendas team-API, slik serverne får det i miljøet (`TESTMILJO_TEAMMEDLEMMER`). */
  teammedlemmer: Record<string, string[]>;
  /** Tilgangsradene i SQL Server, når `startServer` har laget dem. */
  datalag?: Datalag;
}

interface Datalag {
  base: Testbase;
  kjoeretid: { pool: Pool; slett(): Promise<void> };
}

async function prosjekt(pool: pg.Pool, navn: string): Promise<Testprosjekt> {
  const p: Testprosjekt = {
    id: `p-test-${navn}-${randomUUID().slice(0, 8)}`,
    catendaProsjekt: randomUUID(),
    teTeam: randomUUID(),
    bhTeam: randomUUID(),
  };
  await pool.query(
    "INSERT INTO projects (id, name, organisasjon_id) VALUES ($1, 'Testmiljøet', 'org-test')",
    [p.id]
  );
  await pool.query(
    'INSERT INTO catenda_project_configs (internal_project_id, catenda_project_id, library_id) VALUES ($1, $2, $3)',
    [p.id, p.catendaProsjekt, randomUUID()]
  );
  await pool.query(
    'INSERT INTO app_membership_sync (project_id, catenda_project_id, synced_at) VALUES ($1, $2, now())',
    [p.id, p.catendaProsjekt]
  );
  await pool.query(
    "INSERT INTO catenda_contract_teams (internal_project_id, team_id, contract_role) VALUES ($1, $2, 'TE'), ($1, $3, 'BH')",
    [p.id, p.teTeam, p.bhTeam]
  );
  return p;
}

async function bruker(pool: pg.Pool, prosjektId: string, navn: string): Promise<Testbruker> {
  const b: Testbruker = {
    id: randomUUID(),
    subjekt: randomUUID(),
    token: randomUUID(),
    csrf: randomUUID(),
  };
  await pool.query('INSERT INTO app_users (id, email, name) VALUES ($1, $2, $3)', [
    b.id,
    `${navn}@test.example`,
    navn,
  ]);
  await pool.query(
    "INSERT INTO app_project_memberships (project_id, user_id, catenda_subject, role) VALUES ($1, $2, $3, 'member')",
    [prosjektId, b.id, b.subjekt]
  );
  await pool.query(
    "INSERT INTO app_sessions (token_hash, user_id, csrf_token, expires_at) VALUES ($1, $2, $3, now() + interval '1 hour')",
    [sha256(b.token), b.id, b.csrf]
  );
  return b;
}

export async function lagOppsett(): Promise<Oppsett> {
  const pool = await kobleTilKastbarTestbase(TESTBASE_URL, 4);
  const p = await prosjekt(pool, 'a');
  const annet = await prosjekt(pool, 'b');
  const te = await bruker(pool, p.id, 'te');
  const bh = await bruker(pool, p.id, 'bh');
  const utenTeam = await bruker(pool, p.id, 'uten-team');
  const utenfor = await bruker(pool, annet.id, 'utenfor');
  return {
    pool,
    prosjekt: p,
    annetProsjekt: annet,
    te,
    bh,
    utenTeam,
    utenfor,
    teammedlemmer: {
      [p.teTeam]: [te.subjekt],
      [p.bhTeam]: [bh.subjekt],
      [annet.teTeam]: [utenfor.subjekt],
    },
  };
}

export async function rydd(o: Oppsett): Promise<void> {
  const prosjekter = [o.prosjekt.id, o.annetProsjekt.id];
  const brukere = [o.te, o.bh, o.utenTeam, o.utenfor].map((b) => b.id);
  try {
    await o.pool.query('DELETE FROM sak_metadata WHERE prosjekt_id = ANY($1)', [prosjekter]);
    await o.pool.query('DELETE FROM projects WHERE id = ANY($1)', [prosjekter]);
    await o.pool.query('DELETE FROM app_users WHERE id = ANY($1::uuid[])', [brukere]);
  } finally {
    await o.pool.end();
    if (o.datalag) {
      await o.datalag.kjoeretid.slett();
      await o.datalag.base.slett();
    }
  }
}

/** Saken i SQL Server, opprettet av TE i prosjektet, under radsikkerheten. */
async function sakIDatalaget(o: Oppsett, sakId: string, prosjekt: Testprosjekt): Promise<void> {
  const te = prosjekt === o.prosjekt ? o.te : o.utenfor;
  const kontekst = {
    aktor: te.id,
    prosjekt: prosjekt.id,
    side: 'TE',
    team: catendaId(prosjekt.teTeam),
  };
  await iTransaksjon(o.datalag!.base.pool, kontekst, (r) =>
    settInn(r, 'sak_metadata', {
      sak_id: sakId,
      prosjekt_id: prosjekt.id,
      sakstype: 'standard',
      created_by: te.id,
    })
  );
}

/**
 * En migrert base i SQL Server med radene fra `lagOppsett` og sakene i de to
 * prosjektene, og kjøretidens pool mot den. Lages én gang per oppsett.
 */
async function datalag(o: Oppsett): Promise<Pool> {
  if (o.datalag) return o.datalag.kjoeretid.pool;
  const base = await opprettMigrertTestbase('serveren', { maks: 4 });
  const r = () => base.pool.request();
  const prosjekter: [Testprosjekt, Testbruker[]][] = [
    [o.prosjekt, [o.te, o.bh, o.utenTeam]],
    [o.annetProsjekt, [o.utenfor]],
  ];
  try {
    for (const [p, brukere] of prosjekter) {
      await settInn(r, 'projects', {
        id: p.id,
        name: 'Testmiljøet',
        organisasjon_id: 'org-test',
        is_active: true,
      });
      await settInn(r, 'catenda_project_configs', {
        internal_project_id: p.id,
        catenda_project_id: p.catendaProsjekt,
        is_active: true,
      });
      await settInn(r, 'app_membership_sync', {
        project_id: p.id,
        catenda_project_id: p.catendaProsjekt,
        synced_at: { sql: 'SYSUTCDATETIME()' },
      });
      for (const [team, side] of [
        [p.teTeam, 'TE'],
        [p.bhTeam, 'BH'],
      ])
        await settInn(r, 'catenda_contract_teams', {
          internal_project_id: p.id,
          team_id: catendaId(team),
          contract_role: side,
        });
      for (const b of brukere) {
        await settInn(r, 'app_users', {
          id: b.id,
          email: `${b.id}@test.example`,
          name: 'Testbruker',
        });
        await settInn(r, 'app_project_memberships', {
          project_id: p.id,
          user_id: b.id,
          catenda_subject: catendaId(b.subjekt),
          user_email: `${b.id}@test.example`,
          display_name: 'Testbruker',
          role: 'member',
          viewer_override: false,
          active: true,
        });
        await settInn(r, 'app_sessions', {
          token_hash: sha256(b.token),
          user_id: b.id,
          csrf_token: b.csrf,
          expires_at: { sql: 'DATEADD(hour, 1, SYSUTCDATETIME())' },
        });
      }
    }
    o.datalag = { base, kjoeretid: await opprettKjoeretid(base) };
  } catch (feil) {
    await base.slett();
    throw feil;
  }
  for (const p of [o.prosjekt, o.annetProsjekt]) {
    const saker = await o.pool.query<{ sak_id: string }>(
      'SELECT sak_id FROM sak_metadata WHERE prosjekt_id = $1',
      [p.id]
    );
    for (const { sak_id } of saker.rows) await sakIDatalaget(o, sak_id, p);
  }
  return o.datalag.kjoeretid.pool;
}

/**
 * En KOE-sak med `sak_opprettet` i kjernens format. Kjernen har ingen kommando
 * for opprettelsen ennå (#370); radene er de
 * `sprakprove/kjernelagring/bane.ts` skriver. Med `format: null` er den en sak
 * Python har skrevet.
 */
export async function opprettKjernesak(
  o: Oppsett,
  prosjekt = o.prosjekt,
  format: 1 | null = 1
): Promise<string> {
  const sakId = randomUUID();
  await o.pool.query(
    "INSERT INTO sak_metadata (sak_id, prosjekt_id, created_by, sakstype, catenda_topic_id) VALUES ($1, $2, 'testmiljo', 'standard', $3)",
    [sakId, prosjekt.id, randomUUID()]
  );
  await o.pool.query(
    `INSERT INTO hendelse (event_id, source, type, subject, actorid, actorrole, data, prosjekt_id, sak_id, event_type, versjon, format)
     VALUES ($1, $2, 'no.oslo.koe.sak_opprettet', $3, $4, 'TE', $5::jsonb, $6, $3, 'sak_opprettet', 1, $7)`,
    [
      randomUUID(),
      `/projects/${prosjekt.id}/cases/${sakId}`,
      sakId,
      o.te.id,
      JSON.stringify({ sakstittel: 'Skiva', sakstype: 'standard' }),
      prosjekt.id,
      format,
    ]
  );
  if (o.datalag) await sakIDatalaget(o, sakId, prosjekt);
  return sakId;
}

export interface Svar {
  status: number;
  kropp: Record<string, unknown> & { error?: string; rule?: string };
}

/** Forespørsel som en innlogget nettleser sender den. `bruker: null` er uten sesjon. */
export async function kall(
  url: string,
  sti: string,
  {
    bruker,
    prosjektId,
    kropp,
    metode = kropp === undefined ? 'GET' : 'POST',
    csrf = bruker?.csrf,
  }: {
    bruker: Testbruker | null;
    prosjektId: string | null;
    kropp?: unknown;
    metode?: string;
    csrf?: string | null;
  }
): Promise<Svar> {
  const hoder: Record<string, string> = {};
  if (prosjektId) hoder['X-Project-ID'] = prosjektId;
  if (bruker) hoder.Cookie = `__Host-koe_session=${bruker.token}`;
  if (csrf) hoder['X-CSRF-Token'] = csrf;
  if (kropp !== undefined) hoder['Content-Type'] = 'application/json';
  const svar = await fetch(`${url}${sti}`, {
    method: metode,
    headers: hoder,
    body: kropp === undefined ? undefined : JSON.stringify(kropp),
  });
  return { status: svar.status, kropp: (await svar.json()) as Svar['kropp'] };
}

export interface KjorendeServer {
  url: string;
  stopp(): Promise<void>;
}

/** Catendas team-API fra oppsettet. Medlemskapene er ferske, så synkroniseringen kalles ikke. */
export function catendaFra(teammedlemmer: Record<string, string[]>): Catenda {
  return {
    async synkroniser() {
      throw new Error('Synkronisering er ikke forventet i testene.');
    },
    async teammedlemmer(_prosjekt, teamId) {
      const funnet = Object.entries(teammedlemmer).find(([id]) => catendaId(id) === teamId);
      return new Set(funnet?.[1] ?? []);
    },
  };
}

/** TS-serveren i testprosessen, mot testbasen og som kjøretiden mot SQL Server. */
export async function startServer(
  o: Oppsett,
  avh: Partial<Avhengigheter> = {}
): Promise<KjorendeServer> {
  const server = createServer(
    lagServer({
      pool: o.pool,
      datalag: await datalag(o),
      catenda: catendaFra(o.teammedlemmer),
      ...avh,
    })
  );
  await new Promise<void>((ok) => server.listen(0, '127.0.0.1', ok));
  const { port } = server.address() as AddressInfo;
  return {
    url: `http://127.0.0.1:${port}`,
    stopp: () => new Promise((ok) => server.close(() => ok())),
  };
}
