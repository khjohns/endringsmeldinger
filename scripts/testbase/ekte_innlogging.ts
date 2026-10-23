/**
 * Lokal prøve av den ekte innloggingen gjennom Catenda mot TS-serveren (#715).
 *
 *   eval "$(scripts/testbase/docker_sqlserver.sh start)"
 *   node scripts/testbase/ekte_innlogging.ts [--bh <team> …] [--te <team> …] [--board <id>]
 *
 * Skriptet lager en migrert testbase, registrerer prosjektet `lokal-prove` mot det ekte
 * Catenda-prosjektet i `backend/.env` (`CATENDA_PROJECT_ID`, `CATENDA_LIBRARY_ID`), lager en
 * kjøretidsinnlogging og starter TS-serveren på 8090 og `vite dev` på 5173 med
 * `APP_ENV=development`. Innloggingen gjøres i din egen nettleser. Alt står til Ctrl+C,
 * som sletter basen og innloggingen.
 *
 * Uten `--bh` og `--te` skrives teamene i Catenda-prosjektet ut, og prosjektet registreres
 * uten kontraktsteam. Med dem kontrolleres teamene med `kontraktsteamFra` i
 * `server/registrering.ts` og mot Catenda-prosjektet; kravet om én totalentreprenør
 * (DL-U14) kontrolleres ikke. Uten `--board` har prosjektet ikke noe board, så jobbkjøreren lager
 * ingen topic i det ekte prosjektet når en sak opprettes.
 *
 * Bare variablene for Catenda-applikasjonen og innloggingen leses fra `backend/.env`, og en
 * variabel med samme navn i skallet går foran, som `CATENDA_CLIENT_SECRET`;
 * `CATENDA_ACCESS_TOKEN` brukes ikke, så integrasjonen henter sitt eget token. Ingen verdi
 * fra oppsettet skrives ut.
 *
 * Kjøres bare fra egen maskin: innloggingen trenger den ekte klienthemmeligheten, som
 * brokeren ikke gir fra seg. Ansvarlig: repoeieren (khjohns).
 */

import { spawn, type ChildProcess } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { catendaId, uuidMedBindestreker } from '../../server/autorisasjon.ts';
import { catendaFraMiljoe } from '../../server/catenda.ts';
import { kontraktsteamFra } from '../../server/registrering.ts';
import { kopierMigrertTestbase, settInn } from '../../server/tester/sqlserver_migrert.ts';
import { opprettKjoeretid, slettAlle } from '../../server/tester/sqlserver.ts';

const { values } = parseArgs({
  options: {
    bh: { type: 'string', multiple: true, default: [] },
    te: { type: 'string', multiple: true, default: [] },
    board: { type: 'string' },
    prosjekt: { type: 'string', default: 'lokal-prove' },
  },
});

const FRONTEND = 'http://localhost:5173';
const SERVERPORT = 8090;

function lesEnv(fil: string): Record<string, string> {
  const ut: Record<string, string> = {};
  for (const linje of readFileSync(fil, 'utf8').split('\n')) {
    const m = linje.match(/^\s*(?:export\s+)?([A-Z_][A-Z0-9_]*)\s*=(.*)$/);
    if (m) ut[m[1]] = m[2].trim().replace(/^(['"])(.*)\1$/, '$2');
  }
  return ut;
}

const NOEDVENDIG = [
  'CATENDA_CLIENT_ID',
  'CATENDA_CLIENT_SECRET',
  'CATENDA_PROJECT_ID',
  'CATENDA_LIBRARY_ID',
] as const;
// En variabel i skallet går foran fila, så hemmeligheten ikke trenger å stå på disk.
const fil = lesEnv('backend/.env');
for (const k of NOEDVENDIG) if (process.env[k]) fil[k] = process.env[k]!;
const mangler = NOEDVENDIG.filter((k) => !fil[k]);
if (mangler.length) throw new Error(`backend/.env mangler ${mangler.join(', ')}`);

const catendaMiljoe = {
  APP_ENV: 'development',
  AUTH_FRONTEND_URL: FRONTEND,
  CATENDA_CLIENT_ID: fil.CATENDA_CLIENT_ID,
  CATENDA_CLIENT_SECRET: fil.CATENDA_CLIENT_SECRET,
  CATENDA_LOGIN_REDIRECT_URI: `${FRONTEND}/api/auth/catenda/callback`,
};

/**
 * Miljøet uten Catenda-, Entra- og innloggingsvariabler fra skallet, og uten
 * `KOE_LYTTEADRESSE` og `VITE_*`, så serveren med hemmeligheten bare lytter på 127.0.0.1.
 * Vite leser fortsatt `VITE_*` fra `.env`-filene i roten.
 */
function rentMiljoe(): NodeJS.ProcessEnv {
  return Object.fromEntries(
    Object.entries(process.env).filter(
      ([k]) =>
        !/^(CATENDA_|ENTRA_|AUTH_|KOE_DATALAG|KOE_LYTTEADRESSE|VITE_|DISABLE_AUTH|APP_ENV)/.test(k)
    )
  );
}

function uuid(verdi: string, navn: string): string {
  const id = uuidMedBindestreker(verdi);
  if (!id) throw new Error(`${navn} er ikke en UUID`);
  return id;
}
const catendaProsjekt = uuid(fil.CATENDA_PROJECT_ID, 'CATENDA_PROJECT_ID');

const utenTeam = !values.bh!.length && !values.te!.length;
const kontraktsteam = utenTeam ? [] : kontraktsteamFra(values.bh!, values.te!);
{
  const { oauth, integrasjonsnokkel } = catendaFraMiljoe({ ...catendaMiljoe });
  const token = await integrasjonsnokkel.token();
  // Formen `catendaTeam` i `server/registrering.ts` leser.
  const rader = await oauth.samling(`/v2/projects/${catendaId(catendaProsjekt)}/teams`, token);
  const iCatenda = new Map<string, string>();
  for (const rad of rader) {
    const t = rad.user as { id?: unknown; type?: unknown; name?: unknown } | undefined;
    const id = t?.type === 'team' ? catendaId(t.id) : null;
    if (id) iCatenda.set(id, typeof t?.name === 'string' ? t.name : '');
  }
  const ukjente = kontraktsteam.filter((t) => !iCatenda.has(t.team_id));
  if (ukjente.length)
    throw new Error(`Ikke i Catenda-prosjektet: ${ukjente.map((t) => t.team_id).join(', ')}`);
  if (utenTeam) {
    console.log('Teamene i Catenda-prosjektet (bruk ID-en med --bh og --te):');
    for (const [id, navn] of iCatenda) console.log(`  ${id}  ${navn}`);
    console.log('Registrerer prosjektet uten kontraktsteam.\n');
  }
}

const prosesser: ChildProcess[] = [];

function startProsess(navn: string, kommando: string[], env: NodeJS.ProcessEnv, klar: RegExp) {
  const p = spawn(kommando[0], kommando.slice(1), {
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: true,
  });
  prosesser.push(p);
  return new Promise<void>((ok, feil) => {
    let logg = '';
    const les = (d: Buffer) => {
      logg += d.toString();
      process.stderr.write(`[${navn}] ${d}`);
      if (klar.test(logg)) ok();
    };
    p.stdout!.on('data', les);
    p.stderr!.on('data', les);
    p.on('exit', (kode) => {
      feil(new Error(`${navn} stoppet (${kode})`));
      // Stopper en prosess etter at alt er klart, stopper resten også.
      if (!rydder) {
        console.error(`${navn} stoppet (${kode}); stopper og rydder.`);
        void rydd(1);
      }
    });
    setTimeout(() => feil(new Error(`${navn} ble ikke klar`)), 120_000);
  });
}

let base: Awaited<ReturnType<typeof kopierMigrertTestbase>> | undefined;
let kjoeretid: Awaited<ReturnType<typeof opprettKjoeretid>> | undefined;

let rydder = false;
/** Rydder én gang; et nytt kall mens ryddingen pågår, venter på den. */
let rydding: Promise<never> | undefined;
function rydd(kode: number): Promise<never> {
  rydder = true;
  return (rydding ??= ryddEn(kode));
}
async function ryddEn(kode: number): Promise<never> {
  for (const p of prosesser)
    try {
      if (p.pid) process.kill(-p.pid, 'SIGTERM');
    } catch {
      // Gruppen har alt stoppet.
    }
  try {
    if (base) await slettAlle(kjoeretid, base);
  } catch (feil) {
    console.error(feil);
    kode ||= 1;
  }
  process.exit(kode);
}
// Et avbrudd før basen eller innloggingen er laget, kan etterlate dem på serveren.
// Et andre signal avslutter straks.
for (const signal of ['SIGINT', 'SIGTERM'] as const)
  process.on(signal, () => (rydding ? process.exit(130) : void rydd(0)));

try {
  base = await kopierMigrertTestbase('lokal');
  const pool = base.pool;
  const r = () => pool.request();
  await settInn(r, 'projects', {
    id: values.prosjekt!,
    name: 'Lokal prøve av innloggingen',
    organisasjon_id: 'org-lokal',
    is_active: true,
  });
  await settInn(r, 'catenda_project_configs', {
    internal_project_id: values.prosjekt!,
    catenda_project_id: catendaProsjekt,
    library_id: uuid(fil.CATENDA_LIBRARY_ID, 'CATENDA_LIBRARY_ID'),
    topic_board_id: values.board ? uuid(values.board, '--board') : null,
    is_active: true,
  });
  for (const t of kontraktsteam)
    await settInn(r, 'catenda_contract_teams', {
      internal_project_id: values.prosjekt!,
      ...t,
    });
  kjoeretid = await opprettKjoeretid(base);

  await startProsess(
    'server',
    ['node', 'server/start.ts', String(SERVERPORT)],
    { ...rentMiljoe(), ...catendaMiljoe, KOE_DATALAG_TILKOBLING: kjoeretid.tilkobling },
    /lytter på/
  );
  await startProsess(
    'vite',
    ['npx', 'vite', 'dev', '--port', '5173', '--strictPort'],
    { ...rentMiljoe(), NO_COLOR: '1' },
    /Local:/
  );
  console.log(`
Klar. Logg inn i nettleseren:
  ${FRONTEND}/api/auth/catenda/login?return_to=/${values.prosjekt}
Sesjonen:   ${FRONTEND}/api/auth/session
Prosjektet: ${values.prosjekt}
Ctrl+C stopper og rydder.`);
} catch (feil) {
  console.error(feil);
  await rydd(1);
}
