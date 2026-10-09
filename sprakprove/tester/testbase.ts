/**
 * Oppsett mot den kastbare testbasen for TS-serveren (#274, port 2). Radene er
 * de innloggingen og medlemssynkroniseringen ellers skriver: bruker, sesjon,
 * prosjektmedlemskap, registrert prosjekt, fersk synkronisering og
 * kontraktsteam. Alt får ID-er unike for kjøringen og slettes av `rydd`.
 *
 * Kjør ikke samtidig med pytest mot samme base: oppryddingen der setter alle
 * tabeller tilbake til frødataene og sletter radene herfra.
 */

import { spawn, type ChildProcess } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import type { OffentligTilstand } from '../kjerne/offentlig.ts';
import type { Hendelse } from '../kjerne/typer.ts';
import { sha256 } from '../server/autorisasjon.ts';
import { kobleTilKastbarTestbase } from '../server/kastbar.ts';

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
  /** Catendas team-API, slik serveren får det i `SPRAKPROVE_TEAMMEDLEMMER`. */
  teammedlemmer: Record<string, string[]>;
}

async function prosjekt(pool: pg.Pool, navn: string): Promise<Testprosjekt> {
  const p: Testprosjekt = {
    id: `p-sprakprove-${navn}-${randomUUID().slice(0, 8)}`,
    catendaProsjekt: randomUUID(),
    teTeam: randomUUID(),
    bhTeam: randomUUID(),
  };
  await pool.query(
    "INSERT INTO projects (id, name, organisasjon_id) VALUES ($1, 'Språkprøven', 'org-sprakprove')",
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
    `${navn}@sprakprove.example`,
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

/** En sak med `sak_opprettet` som første hendelse, som når Python oppretter den. */
export async function opprettSak(
  pool: pg.Pool,
  prosjektId: string,
  av: Testbruker
): Promise<string> {
  const sakId = randomUUID();
  await pool.query(
    "INSERT INTO sak_metadata (sak_id, prosjekt_id, created_by, sakstype) VALUES ($1, $2, 'sprakprove', 'standard')",
    [sakId, prosjektId]
  );
  await pool.query(
    `INSERT INTO hendelse (event_id, source, type, subject, actorid, actorrole, data, prosjekt_id, sak_id, event_type, versjon)
     VALUES ($1, $2, 'no.oslo.koe.sak_opprettet', $3, $4, 'TE', $5::jsonb, $6, $3, 'sak_opprettet', 1)`,
    [
      randomUUID(),
      `/projects/${prosjektId}/cases/${sakId}`,
      sakId,
      av.id,
      JSON.stringify({ sakstittel: 'Språkprøven', sakstype: 'standard' }),
      prosjektId,
    ]
  );
  return sakId;
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

export interface KjorendeServer {
  url: string;
  stopp(): Promise<void>;
}

const START = fileURLToPath(new URL('../server/start.ts', import.meta.url));

/** TS-serveren i egen prosess, med Catendas team fra oppsettet. */
export function startServer(teammedlemmer: Record<string, string[]>): Promise<KjorendeServer> {
  const prosess: ChildProcess = spawn(process.execPath, [START, '0'], {
    env: {
      ...process.env,
      KOE_TESTBASE_URL: TESTBASE_URL,
      SPRAKPROVE_TEAMMEDLEMMER: JSON.stringify(teammedlemmer),
      APP_ENV: 'test',
      BH_APPROVAL_POLICIES: '',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let feil = '';
  prosess.stderr!.on('data', (d) => (feil += d));
  return new Promise((ok, nei) => {
    prosess.on('exit', (kode) => nei(new Error(`Serveren stoppet (${kode}): ${feil}`)));
    prosess.stdout!.on('data', (d: Buffer) => {
      const treff = d.toString().match(/lytter på (http:\/\/\S+)/);
      if (!treff) return;
      prosess.removeAllListeners('exit');
      ok({
        url: treff[1],
        stopp: () =>
          new Promise((ferdig) => {
            prosess.on('exit', () => ferdig());
            prosess.kill('SIGTERM');
          }),
      });
    });
  });
}

/** Feltene testene leser i svarene fra TS-serveren. */
export interface Svarkropp {
  success?: boolean;
  error?: string;
  message?: string;
  rule?: string;
  failed_event_type?: string;
  failed_track?: string;
  event_id?: string;
  expected_version?: number;
  current_version?: number;
  version?: number;
  state?: OffentligTilstand;
  events?: Hendelse[];
}

export interface Svar {
  status: number;
  kropp: Svarkropp;
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
    prosjektId: string;
    kropp?: unknown;
    metode?: string;
    csrf?: string | null;
  }
): Promise<Svar> {
  const hoder: Record<string, string> = { 'X-Project-ID': prosjektId };
  if (bruker) hoder.Cookie = `__Host-koe_session=${bruker.token}`;
  if (csrf) hoder['X-CSRF-Token'] = csrf;
  if (kropp !== undefined) hoder['Content-Type'] = 'application/json';
  const svar = await fetch(`${url}${sti}`, {
    method: metode,
    headers: hoder,
    body: kropp === undefined ? undefined : JSON.stringify(kropp),
  });
  return { status: svar.status, kropp: (await svar.json()) as Svarkropp };
}
