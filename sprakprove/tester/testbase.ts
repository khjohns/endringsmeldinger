/**
 * Språkprøvens server mot den kastbare testbasen (#274, port 2). Brukerne,
 * prosjektene og oppryddingen står i `server/tester/testbase.ts`.
 */

import { spawn, type ChildProcess } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import type pg from 'pg';
import type { OffentligTilstand } from '../kjerne/offentlig.ts';
import type { Hendelse } from '../kjerne/typer.ts';

export {
  lagOppsett,
  rydd,
  TESTBASE_URL,
  type Oppsett,
  type Testbruker,
  type Testprosjekt,
} from '../../server/tester/testbase.ts';
import { TESTBASE_URL, type Testbruker } from '../../server/tester/testbase.ts';

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
