/**
 * Den ekte saksruta i Chromium, mot TS-serveren og testbasen i SQL Server (#1145).
 *
 *   node .claude/skills/mockup-nettleser/saksrute.ts [--utdata <mappe>] [--behold]
 *
 * Trenger `KOE_SQLSERVER_TILKOBLING` (sa), som oppstartshooken setter. Skriptet
 *
 * 1. lager en migrert testbase og registrerer ett prosjekt med kontraktsteam for TE og BH,
 *    som `lagOppsett` i `server/tester/testbase.ts`. Registreringen er driftens
 *    (`server/registrering.ts`); sesjoner, brukere og medlemskap lages ikke her;
 * 2. starter en falsk Catenda på 127.0.0.1 med to brukere, som innloggingen, medlemslistene
 *    og kontraktsteamene leses fra (OAuth, `/v2/user`, `/v2/projects`, `/members`, teamene);
 * 3. starter TS-serveren (`server/start.ts`) som kjøretiden, med ekte innlogging og uten
 *    `DISABLE_AUTH`, og `vite dev` på 5173, som proxyen til serveren forutsetter;
 * 4. logger inn TE og BH i hver sin nettleserkontekst gjennom `/api/auth/catenda/login`,
 *    oppretter saken som TE med `POST /api/kjerne/saker`, prøver at et kall uten CSRF-token
 *    og BH-ens kall avvises der, leser saken med `GET` som begge, og tar skjermbilder av
 *    saksruta `/{prosjekt}/{sak}` for begge.
 *
 * Med `--behold` står alt og kjører til Ctrl+C, med innlogging per side i nettleseren:
 * `http://localhost:5173/api/auth/catenda/login?return_to=/<prosjekt>/<sak>` med cookien
 * `bruker=te|bh` på den falske Catenda-adressen.
 */

import { spawn, execFileSync, type ChildProcess } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdirSync, realpathSync } from 'node:fs';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { createRequire } from 'node:module';
import type { AddressInfo } from 'node:net';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { kopierMigrertTestbase, settInn } from '../../../server/tester/sqlserver_migrert.ts';
import { opprettKjoeretid, slettAlle } from '../../../server/tester/sqlserver.ts';

const { values } = parseArgs({
  options: {
    utdata: { type: 'string', default: '/tmp/saksrute-skjermbilder' },
    behold: { type: 'boolean', default: false },
  },
});
const UT = values.utdata!;
mkdirSync(UT, { recursive: true });

const FRONTEND = 'http://localhost:5173';
const SERVERPORT = 8090;
const hex = (id: string) => id.replaceAll('-', '');

const katalog = {
  prosjekt: `p-saksrute-${randomUUID().slice(0, 8)}`,
  catendaProsjekt: randomUUID(),
  teTeam: randomUUID(),
  bhTeam: randomUUID(),
  board: randomUUID(),
};
const BRUKERE = {
  te: { id: randomUUID(), type: 'user', email: 'te@saksrute.example', name: 'TE Testbruker' },
  bh: { id: randomUUID(), type: 'user', email: 'bh@saksrute.example', name: 'BH Testbruker' },
};
type Brukernavn = keyof typeof BRUKERE;
const INTEGRASJONEN = 'integrasjon-saksrute';

// --- Den falske Catenda ----------------------------------------------------------

function svarJson(res: ServerResponse, kropp: unknown, status = 200) {
  res.writeHead(status, { 'Content-Type': 'application/json' }).end(JSON.stringify(kropp));
}

async function lesKropp(req: IncomingMessage): Promise<string> {
  let tekst = '';
  for await (const del of req) tekst += del;
  return tekst;
}

/** Brukeren bak tokenet, eller integrasjonen. */
function tokenFra(req: IncomingMessage): Brukernavn | 'integrasjon' | undefined {
  const token = req.headers.authorization?.replace(/^Bearer /, '');
  if (token === INTEGRASJONEN) return 'integrasjon';
  const navn = token?.replace(/^bruker-/, '');
  return navn === 'te' || navn === 'bh' ? navn : undefined;
}

/** Én side med alle radene: første side har dem, de neste er tomme. */
const side = (url: URL, rader: unknown[]) => (url.searchParams.get('page') === '1' ? rader : []);

async function catenda(req: IncomingMessage, res: ServerResponse) {
  const url = new URL(req.url ?? '/', 'http://catenda');
  const sti = url.pathname;
  if (req.method === 'GET' && sti === '/oauth2/authorize') {
    const valgt = /(?:^|;\s*)bruker=(te|bh)/.exec(req.headers.cookie ?? '')?.[1];
    if (!valgt) return svarJson(res, { feil: 'Sett cookien bruker=te|bh' }, 400);
    const tilbake = new URL(url.searchParams.get('redirect_uri') ?? '');
    tilbake.searchParams.set('code', `kode-${valgt}`);
    tilbake.searchParams.set('state', url.searchParams.get('state') ?? '');
    return res.writeHead(302, { Location: tilbake.toString() }).end();
  }
  if (req.method === 'POST' && sti === '/oauth2/token') {
    const skjema = new URLSearchParams(await lesKropp(req));
    if (skjema.get('grant_type') === 'client_credentials')
      return svarJson(res, { access_token: INTEGRASJONEN, expires_in: 3600 });
    const navn = skjema.get('code')?.replace(/^kode-/, '');
    if (navn !== 'te' && navn !== 'bh') return svarJson(res, { error: 'invalid_grant' }, 400);
    return svarJson(res, { access_token: `bruker-${navn}` });
  }
  const hvem = tokenFra(req);
  if (!hvem) return svarJson(res, { feil: 'ukjent token' }, 401);
  if (req.method === 'GET' && sti === '/v2/user' && hvem !== 'integrasjon')
    return svarJson(res, BRUKERE[hvem]);
  if (req.method === 'GET' && sti === '/v2/projects')
    return svarJson(res, side(url, [{ id: katalog.catendaProsjekt }]));
  const prosjektsti = `/v2/projects/${hex(katalog.catendaProsjekt)}`;
  if (req.method === 'GET' && sti === `${prosjektsti}/members`)
    return svarJson(
      res,
      side(
        url,
        Object.values(BRUKERE).map((user) => ({ user, role: 'member' }))
      )
    );
  for (const [team, navn] of [
    [katalog.teTeam, 'te'],
    [katalog.bhTeam, 'bh'],
  ] as const)
    if (req.method === 'GET' && sti === `${prosjektsti}/teams/${hex(team)}/members`)
      return svarJson(res, side(url, [{ user: BRUKERE[navn] }]));
  if (req.method === 'POST' && sti === `/opencde/bcf/3.0/projects/${katalog.board}/topics`) {
    await lesKropp(req);
    return svarJson(res, { guid: randomUUID() });
  }
  console.error(`falsk Catenda: ukjent kall ${req.method} ${sti}`);
  ukjenteKall.push(`${req.method} ${sti}`);
  svarJson(res, { feil: 'ukjent' }, 404);
}

// --- Prosessene ------------------------------------------------------------------

const prosesser: ChildProcess[] = [];
const ukjenteKall: string[] = [];

/** Starter `kommando` og venter til utdataene inneholder `klar`. */
function startProsess(navn: string, kommando: string[], env: NodeJS.ProcessEnv, klar: RegExp) {
  if (avbrutt) throw new Error('Avbrutt');
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
      if (values.behold || !klar.test(logg)) process.stderr.write(`[${navn}] ${d}`);
      if (klar.test(logg)) ok();
    };
    p.stdout!.on('data', les);
    p.stderr!.on('data', les);
    p.on('exit', (kode) => feil(new Error(`${navn} stoppet (${kode}):\n${logg}`)));
    setTimeout(() => feil(new Error(`${navn} ble ikke klar:\n${logg}`)), 120_000);
  });
}

async function svarer(url: string) {
  try {
    await fetch(url);
    return true;
  } catch {
    return false;
  }
}

/** Miljøet uten de ekte Catenda- og Entra-variablene i skyøkta. */
function rentMiljoe(): NodeJS.ProcessEnv {
  return Object.fromEntries(
    Object.entries(process.env).filter(
      ([k]) => !/^(CATENDA_|ENTRA_|AUTH_|KOE_DATALAG|DISABLE_AUTH)/.test(k)
    )
  );
}

function globalPlaywright() {
  const rot = execFileSync('npm', ['root', '-g']).toString().trim();
  const krev = createRequire(join(realpathSync(join(rot, 'playwright')), 'package.json'));
  return krev('playwright');
}

// --- Kjøringen -------------------------------------------------------------------

const base = await kopierMigrertTestbase('saksrute');
let kjoeretid: Awaited<ReturnType<typeof opprettKjoeretid>> | undefined;
const falsk = createServer((req, res) => {
  catenda(req, res).catch((f) => {
    console.error(f);
    svarJson(res, { feil: 'intern' }, 500);
  });
});
let nettleser: { close(): Promise<void> } | undefined;

function stoppProsessene() {
  // Hele prosessgruppen, så `vite` under `npx` også stopper.
  for (const p of prosesser)
    try {
      if (p.pid) process.kill(-p.pid, 'SIGTERM');
    } catch {
      // Gruppen har alt stoppet.
    }
}

async function rydd() {
  await nettleser?.close().catch(() => undefined);
  stoppProsessene();
  falsk.close();
  await slettAlle(kjoeretid, base);
}

// Barneprosessene har egne prosessgrupper og får ikke Ctrl+C. Signalet stopper dem og
// uten handleSIGINT, som ellers avslutter med 130 før oppryddingen. Et andre signal
// avslutter straks.
// uten handleSIGINT, som ellers avslutter med 130 før oppryddingen.
let avbrutt = false;
let avbryt!: () => void;
const avbrudd = new Promise<void>((ok) => (avbryt = ok));
for (const signal of ['SIGINT', 'SIGTERM'] as const)
  process.on(signal, () => {
    if (avbrutt) process.exit(130);
    avbrutt = true;
    process.exitCode = 130;
    avbryt();
    void nettleser?.close().catch(() => undefined);
    stoppProsessene();
  });

try {
  const r = () => base.pool.request();
  await settInn(r, 'projects', {
    id: katalog.prosjekt,
    name: 'Saksruta i nettleseren',
    organisasjon_id: 'org-saksrute',
    is_active: true,
  });
  await settInn(r, 'catenda_project_configs', {
    internal_project_id: katalog.prosjekt,
    catenda_project_id: katalog.catendaProsjekt,
    library_id: randomUUID(),
    topic_board_id: katalog.board,
    is_active: true,
  });
  for (const [team, side] of [
    [katalog.teTeam, 'TE'],
    [katalog.bhTeam, 'BH'],
  ])
    await settInn(r, 'catenda_contract_teams', {
      internal_project_id: katalog.prosjekt,
      team_id: hex(team),
      contract_role: side,
    });
  kjoeretid = await opprettKjoeretid(base);

  await new Promise<void>((ok) => falsk.listen(0, '127.0.0.1', ok));
  const catendaUrl = `http://127.0.0.1:${(falsk.address() as AddressInfo).port}`;

  await startProsess(
    'server',
    ['node', 'server/start.ts', String(SERVERPORT)],
    {
      ...rentMiljoe(),
      KOE_DATALAG_TILKOBLING: kjoeretid.tilkobling,
      APP_ENV: 'development',
      AUTH_FRONTEND_URL: FRONTEND,
      CATENDA_CLIENT_ID: 'saksrute',
      CATENDA_CLIENT_SECRET: 'saksrute',
      CATENDA_LOGIN_REDIRECT_URI: `${FRONTEND}/api/auth/catenda/callback`,
      CATENDA_GRUNNADRESSE: catendaUrl,
      CATENDA_ACCESS_TOKEN: INTEGRASJONEN,
    },
    /lytter på/
  );
  if (await svarer(FRONTEND)) throw new Error(`${FRONTEND} svarer alt; stopp den vite-serveren først.`);
  await startProsess(
    'vite',
    ['npx', 'vite', 'dev', '--port', '5173', '--strictPort'],
    { ...rentMiljoe(), NO_COLOR: '1' },
    /Local:/
  );

  const { chromium } = globalPlaywright();
  const b = await chromium.launch({ handleSIGINT: false, handleSIGTERM: false });
  nettleser = b;
  const jsFeil: string[] = [];

  async function loggInn(navn: Brukernavn, returTil: string) {
    const kontekst = await b.newContext({ viewport: { width: 1440, height: 900 } });
    await kontekst.addCookies([{ name: 'bruker', value: navn, url: catendaUrl }]);
    const side = await kontekst.newPage();
    side.on('pageerror', (f: Error) => jsFeil.push(`${navn}: ${f.message}`));
    await side.goto(
      `${FRONTEND}/api/auth/catenda/login?return_to=${encodeURIComponent(returTil)}`
    );
    const sesjon = await side.evaluate(async () => (await fetch('/api/auth/session')).json());
    if (sesjon?.user?.email !== BRUKERE[navn].email)
      throw new Error(`Innloggingen for ${navn} ga ikke sesjon: ${JSON.stringify(sesjon)}`);
    return side;
  }

  /** `POST /api/kjerne/saker` fra siden, med sesjonen, CSRF-tokenet og prosjektet. */
  const opprettSak = (side: Awaited<ReturnType<typeof loggInn>>, tittel: string, medCsrf = true) =>
    side.evaluate(
      async ({ prosjekt, tittel, medCsrf }: { prosjekt: string; tittel: string; medCsrf: boolean }) => {
        const { csrfToken } = medCsrf
          ? await (await fetch('/api/csrf-token')).json()
          : { csrfToken: '' };
        const svar = await fetch('/api/kjerne/saker', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Project-ID': prosjekt,
            'X-CSRF-Token': csrfToken,
          },
          body: JSON.stringify({
            kommando_id: crypto.randomUUID(),
            kommando: { type: 'opprett_sak', sakstittel: tittel },
          }),
        });
        return { status: svar.status, kropp: await svar.json() };
      },
      { prosjekt: katalog.prosjekt, tittel, medCsrf }
    );

  const te = await loggInn('te', `/${katalog.prosjekt}`);
  const opprettet = await opprettSak(te, 'Ny peling ved akse C');
  console.log(`TE  POST /api/kjerne/saker: ${opprettet.status} ${JSON.stringify(opprettet.kropp)}`);
  if (opprettet.status !== 201) throw new Error('TE fikk ikke opprettet saken');
  const sak = opprettet.kropp.sak_id as string;
  const saksrute = `/${katalog.prosjekt}/${sak}`;

  const bh = await loggInn('bh', saksrute);
  // Uten CSRF-token stopper autentiseringen kallet; med det slipper tilgangskontrollen
  // BH gjennom (kontraktsrolle `kreves`), og kjernen avviser kommandoen.
  const utenCsrf = await opprettSak(bh, 'Uten CSRF-token', false);
  console.log(`BH  POST /api/kjerne/saker uten CSRF: ${utenCsrf.status} ${JSON.stringify(utenCsrf.kropp)}`);
  if (utenCsrf.status !== 403) throw new Error('Kallet uten CSRF-token ble ikke avvist');
  const avvist = await opprettSak(bh, 'BH skal ikke kunne opprette');
  console.log(`BH  POST /api/kjerne/saker: ${avvist.status} ${JSON.stringify(avvist.kropp)}`);
  if (avvist.status !== 400 || avvist.kropp?.rule !== 'FEIL_PART') throw new Error('Kjernen avviste ikke BH ved opprettelsen');

  for (const [navn, side] of [
    ['te', te],
    ['bh', bh],
  ] as const) {
    const lest = await side.evaluate(
      async ({ sak, prosjekt }: { sak: string; prosjekt: string }) => {
        const svar = await fetch(`/api/kjerne/saker/${sak}`, {
          headers: { 'X-Project-ID': prosjekt },
        });
        return { status: svar.status, kropp: await svar.json() };
      },
      { sak, prosjekt: katalog.prosjekt }
    );
    console.log(
      `${navn.toUpperCase()}  GET /api/kjerne/saker/{sak}: ${lest.status}, part ${lest.kropp?.part}`
    );
    if (lest.status !== 200 || lest.kropp?.part !== navn.toUpperCase())
      throw new Error(`${navn.toUpperCase()} leste ikke saken med sin egen part`);
    await side.goto(`${FRONTEND}${saksrute}`);
    await side.getByText('Ny peling ved akse C').first().waitFor({ timeout: 30_000 });
    await side.waitForTimeout(500);
    await side.screenshot({ path: join(UT, `saksrute-${navn}.png`), fullPage: true });
  }
  console.log(`Skjermbilder i ${UT}. Saksruta: ${FRONTEND}${saksrute}`);
  if (ukjenteKall.length) throw new Error(`Ukjente kall til falsk Catenda:\n${ukjenteKall.join('\n')}`);
  if (jsFeil.length) throw new Error(`JavaScript-feil i siden:\n${jsFeil.join('\n')}`);

  if (values.behold) {
    console.log(`Står og kjører. Falsk Catenda: ${catendaUrl}. Ctrl+C stopper og rydder.`);
    await avbrudd;
    process.exitCode = 0;
  }
} catch (feil) {
  if (!avbrutt) {
    console.error(feil);
    process.exitCode = 1;
  }
} finally {
  await rydd();
}
process.exit();
