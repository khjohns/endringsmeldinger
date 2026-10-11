/**
 * Oppsett mot den kastbare testbasen for TS-serveren. Radene er de
 * innloggingen og medlemssynkroniseringen ellers skriver: bruker, sesjon,
 * prosjektmedlemskap, registrert prosjekt, fersk synkronisering og
 * kontraktsteam. Alt får ID-er unike for kjøringen og slettes av `rydd`.
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
export const TESTBASE_URL = process.env.KOE_TESTBASE_URL ?? '';
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
  }
}

/**
 * En KOE-sak med `sak_opprettet` i kjernens format. Kjernen har ingen kommando
 * for opprettelsen ennå (#370); radene er de
 * `sprakprove/kjernelagring/bane.ts` skriver.
 */
export async function opprettKjernesak(o: Oppsett, prosjekt = o.prosjekt): Promise<string> {
  const sakId = randomUUID();
  await o.pool.query(
    "INSERT INTO sak_metadata (sak_id, prosjekt_id, created_by, sakstype, catenda_topic_id) VALUES ($1, $2, 'testmiljo', 'standard', $3)",
    [sakId, prosjekt.id, randomUUID()]
  );
  await o.pool.query(
    `INSERT INTO hendelse (event_id, source, type, subject, actorid, actorrole, data, prosjekt_id, sak_id, event_type, versjon, format)
     VALUES ($1, $2, 'no.oslo.koe.sak_opprettet', $3, $4, 'TE', $5::jsonb, $6, $3, 'sak_opprettet', 1, 1)`,
    [
      randomUUID(),
      `/projects/${prosjekt.id}/cases/${sakId}`,
      sakId,
      o.te.id,
      JSON.stringify({ sakstittel: 'Skiva', sakstype: 'standard' }),
      prosjekt.id,
    ]
  );
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

/** TS-serveren i testprosessen, mot testbasen. */
export async function startServer(
  o: Oppsett,
  avh: Partial<Avhengigheter> = {}
): Promise<KjorendeServer> {
  const server = createServer(
    lagServer({ pool: o.pool, catenda: catendaFra(o.teammedlemmer), ...avh })
  );
  await new Promise<void>((ok) => server.listen(0, '127.0.0.1', ok));
  const { port } = server.address() as AddressInfo;
  return {
    url: `http://127.0.0.1:${port}`,
    stopp: () => new Promise((ok) => server.close(() => ok())),
  };
}
