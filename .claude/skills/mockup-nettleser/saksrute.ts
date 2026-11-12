/**
 * Den ekte saksruta i Chromium, mot TS-serveren og testbasen i SQL Server (#1145).
 *
 *   node .claude/skills/mockup-nettleser/saksrute.ts [--utdata <mappe>] [--forlop <ID> [--til <kontrollpunkt>]] [--feil] [--behold]
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
 * Med `utgangspunkt.opprettes` i forløpet (BF-05, KT-U11) sender TE det første steget i
 * skjemaet på `/{prosjekt}/ny` i nettleseren, og saken og påberopelsen lagres i én handling.
 * Kontrollene før sendingen prøves mot opprettelsen alene, som i minnet, og kontrollene etter
 * den mot journalen serveren gir. Til slutt avbryter TE et nytt skjema og kommer til sakslisten.
 *
 * Med `--feil` framkalles feiltilstandene ved sendingen i Varden (#1676): TE godtar BHs svar,
 * og `page.route` svarer på kommandoruta med 409, 403, 500 og et avbrudd.
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
import { opprettelse } from '../../../kjerne/kommandoer/opprettelse.ts';
import type { Journalrad, Part, Sakskode } from '../../../kjerne/typer.ts';
import type { Bane } from '../../../kjerne/tester/bane.ts';
import { finn, kontrollpunkt, somForloep } from '../../../kjerne/tester/brukerforloep.ts';
import { kjoer } from '../../../kjerne/tester/kjoerer.ts';
import { veggklokke } from '../../../kjerne/tester/testmiljoe.ts';

const { values } = parseArgs({
  options: {
    utdata: { type: 'string', default: '/tmp/saksrute-skjermbilder' },
    behold: { type: 'boolean', default: false },
    forlop: { type: 'string' },
    til: { type: 'string' },
    feil: { type: 'boolean', default: false },
  },
});
const UT = values.utdata!;

/**
 * Brukerforløpet saken følger etter opprettelsen (#1330), til kontrollpunktet i `--til`
 * eller til siste steg. Stegene og kontrollene er de samme som i minnet og i demoruta.
 */
let FORLOEP: ReturnType<typeof finn> | null = null;
try {
  FORLOEP = values.forlop ? finn(values.forlop) : null;
  if (FORLOEP && !FORLOEP.visninger.includes('saksruta'))
    throw new Error(`${FORLOEP.id} kjøres ikke i saksruta (\`visninger\` i forløpsfila)`);
  if (values.til && !FORLOEP) throw new Error('--til trenger --forlop');
  if (FORLOEP && values.til) kontrollpunkt(FORLOEP, values.til);
  if (FORLOEP) somForloep(FORLOEP);
  if (values.feil && !(FORLOEP && values.til))
    throw new Error('--feil sender aksepten av BHs svar og trenger --forlop med --til, for eksempel BF-01 til te-har-mottatt-svaret.');
} catch (feil) {
  console.error((feil as Error).message);
  process.exit(1);
}
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
  bibliotek: randomUUID(),
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
  if (await levering(req, res, url)) return;
  console.error(`falsk Catenda: ukjent kall ${req.method} ${sti}`);
  ukjenteKall.push(`${req.method} ${sti}`);
  svarJson(res, { feil: 'ukjent' }, 404);
}

/** Dokumentene i biblioteket, med navnet som nøkkel, og dokumentreferansene per topic. */
const dokumenter = new Map<string, string>();
const referanser = new Map<string, { guid: string; document_guid: string }[]>();

/**
 * Kallene jobbkjøreren gjør når et brev leveres (#1221): biblioteket (`finnDokument`,
 * `lastOppDokument`) og dokumentreferansene på topicen. `true` når kallet er besvart.
 */
async function levering(req: IncomingMessage, res: ServerResponse, url: URL): Promise<boolean> {
  const sti = url.pathname;
  const bibliotek = /^\/v2\/projects\/([^/]+)\/libraries\/([^/]+)\/items$/.exec(sti);
  if (
    bibliotek &&
    hex(bibliotek[1]) === hex(katalog.catendaProsjekt) &&
    hex(bibliotek[2]) === hex(katalog.bibliotek)
  ) {
    if (req.method === 'GET') {
      const navn = url.searchParams.get('search') ?? '';
      const treff = [...dokumenter].filter(([n]) => n === navn).map(([name, id]) => ({ id, name }));
      svarJson(res, side(url, treff));
      return true;
    }
    if (req.method === 'POST') {
      await lesKropp(req);
      const { name } = JSON.parse(String(req.headers['bimsync-params'] ?? '{}'));
      if (dokumenter.has(name)) svarJson(res, { feil: 'finnes' }, 409);
      else {
        dokumenter.set(name, hex(randomUUID()));
        svarJson(res, [{ id: dokumenter.get(name), name }]);
      }
      return true;
    }
  }
  const topic = new RegExp(
    `^/opencde/bcf/3.0/projects/${katalog.board}/topics/([^/]+)/document_references$`
  ).exec(sti);
  if (!topic) return false;
  const liste = referanser.get(topic[1]) ?? referanser.set(topic[1], []).get(topic[1])!;
  if (req.method === 'GET') {
    svarJson(res, liste);
    return true;
  }
  if (req.method !== 'POST') return false;
  const guid = randomUUID();
  liste.push({ guid, document_guid: JSON.parse(await lesKropp(req)).document_guid });
  svarJson(res, { guid });
  return true;
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
  // Uten kontraktsforkortelsen merkes ikke brevet, og serveren sender det ikke (LV-U53).
  await settInn(r, 'kontraktsparter', {
    prosjekt_id: katalog.prosjekt,
    byggherre_navn: 'Byggherren',
    totalentreprenor_navn: 'Totalentreprenøren',
    kontraktsforkortelse: 'K201',
  });
  await settInn(r, 'catenda_project_configs', {
    internal_project_id: katalog.prosjekt,
    catenda_project_id: katalog.catendaProsjekt,
    library_id: katalog.bibliotek,
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

  /** Svaret fra `GET /api/kjerne/saker/{sak}`, med feltene skriptet leser. */
  interface Saken {
    journal: Journalrad[];
    versjon: number;
    part: Part | null;
    leveringsoppdrag: { levert: string | null }[];
  }

  /** Et kall fra siden, med sesjonen, CSRF-tokenet og prosjektet, som skjemaene gjør. */
  const kjerneKall = <T = unknown>(
    side: Awaited<ReturnType<typeof loggInn>>,
    metode: 'GET' | 'POST',
    sti: string,
    kropp?: unknown
  ): Promise<{ status: number; kropp: T }> =>
    side.evaluate(
      async ({
        prosjekt,
        metode,
        sti,
        kropp,
      }: {
        prosjekt: string;
        metode: string;
        sti: string;
        kropp: unknown;
      }) => {
        const hoder: Record<string, string> = { 'X-Project-ID': prosjekt };
        if (metode === 'POST') {
          hoder['Content-Type'] = 'application/json';
          hoder['X-CSRF-Token'] = (await (await fetch('/api/csrf-token')).json()).csrfToken;
        }
        const svar = await fetch(sti, {
          method: metode,
          headers: hoder,
          body: kropp === undefined ? undefined : JSON.stringify(kropp),
        });
        return { status: svar.status, kropp: await svar.json() };
      },
      { prosjekt: katalog.prosjekt, metode, sti, kropp }
    );

  /** Journalen fra `GET` som TE, slik kjernen leser den (`somJournal` i visningen). */
  async function lesJournal(sak: string): Promise<Journalrad[]> {
    const lest = await kjerneKall<Saken>(te, 'GET', `/api/kjerne/saker/${sak}`);
    if (lest.status !== 200) throw new Error(`GET /api/kjerne/saker/{sak} ga ${lest.status}`);
    return lest.kropp.journal.map((l) => ({
      ...l,
      sak_id: sak,
      aktor_id: '',
      aktor_team_id: null,
      refererer_til_event_id: null,
    }));
  }

  /**
   * Banen gjennom TS-serveren for brukerforløpet: kjøreren lager kommandoen med den låste
   * teksten mot journalen fra `GET`, som skjemaet gjør (LV-U2), og sender den fra siden til
   * parten som handler, med `expected_version`. Serveren vurderer den på nytt, stempler
   * aktøren, ID-ene og tidspunktet og skriver radene; kjøreren leser dem tilbake med `GET`.
   */
  const serverbane = (sak: string, sakskode: Sakskode): Bane => ({
    sakId: sak,
    sakskode,
    aktor: (part) => part.toLowerCase(),
    journal: () => lesJournal(sak),
    skriv: async () => {
      throw new Error('Saksruta skriver bare gjennom kommandoene til TS-serveren');
    },
    async kommando(kommando, part, forventet) {
      const side = part === 'TE' ? te : bh;
      const sendt = await kjerneKall(side, 'POST', `/api/kjerne/saker/${sak}/kommandoer`, {
        expected_version: forventet,
        kommando_id: randomUUID(),
        kommando,
      });
      const hva = `${kommando.type}${'spor' in kommando && kommando.spor ? ` ${kommando.spor}` : ''}`;
      const { event_id, versjon, error, message } = sendt.kropp as Record<string, unknown>;
      const svar = sendt.status === 201 ? { event_id, versjon } : { error, message };
      console.log(`${part}  POST /api/kjerne/saker/{sak}/kommandoer (${hva}): ${sendt.status} ${JSON.stringify(svar)}`);
      if (sendt.status !== 201) throw new Error(`Serveren lagret ikke ${hva}`);
      return (await lesJournal(sak)).filter((r) => r.versjon > forventet);
    },
  });

  /** Forholdene skjemaet for ny sak er kjørt med, med feltene i `NySak.svelte`. */
  const SKJEMAETS_FORHOLD: Record<string, { gruppe: string; forhold: RegExp; dato: string; beskrivelse: string }> = {
    irregulaer_endring: {
      gruppe: 'Endringer, jf. punkt 31 og 32',
      forhold: /^Irregulær endring/,
      dato: 'Dato du mottok pålegget',
      beskrivelse: 'Beskrivelse av pålegget',
    },
  };

  /**
   * Banen for et forløp der saken opprettes med det første steget (KT-U11): før sendingen er
   * journalen opprettelsen alene, som i minnet, og det første steget fylles ut og sendes i
   * skjemaet på `/{prosjekt}/ny`. Saks-ID-en er den skjemaet laget, lest av adressen etterpå.
   */
  const nySaksbane = (tittel: string) => {
    let sak: string | null = null;
    const opprettet = opprettelse({ type: 'opprett_sak', sakstittel: tittel }, 'TE');
    if (!opprettet.godtatt) throw new Error(`Opprettelsen ble avvist: ${opprettet.avvisning.melding}`);
    const foer: Journalrad[] = [
      {
        event_id: randomUUID(),
        sak_id: 'ny-sak',
        event_type: 'sak_opprettet',
        versjon: 1,
        tidsstempel: new Date().toISOString(),
        aktor_id: '',
        aktor_rolle: 'TE',
        aktor_team_id: null,
        refererer_til_event_id: null,
        format: opprettet.format,
        data: opprettet.data,
      },
    ];
    const bane: Bane = {
      sakId: 'ny-sak',
      aktor: (part) => part.toLowerCase(),
      journal: async () => (sak ? lesJournal(sak) : foer),
      skriv: async () => {
        throw new Error('Saksruta skriver bare gjennom skjemaet og kommandoene til TS-serveren');
      },
      async kommando(kommando, part, forventet) {
        if (sak) return serverbane(sak).kommando!(kommando, part, forventet);
        const k = kommando as { type: string; spor?: string; innhold: Record<string, unknown>; utdypning?: string };
        const felt = SKJEMAETS_FORHOLD[String(k.innhold?.underkategori)];
        if (part !== 'TE' || k.type !== 'krav' || k.spor !== 'forhold' || !felt)
          throw new Error(`Skjemaet for ny sak er ikke kjørt for ${JSON.stringify(kommando)}`);
        const dato = Object.values(k.innhold).find((v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v));
        await te.goto(`${FRONTEND}/${katalog.prosjekt}/ny`);
        await te.getByRole('heading', { name: 'Nytt krav om endringsordre', level: 1 }).waitFor({ timeout: 30_000 });
        await te.getByRole('button', { name: felt.gruppe }).click();
        await te.getByRole('radio', { name: felt.forhold }).click();
        await te.getByLabel('Tittel på saken').fill(tittel);
        if (dato) await te.getByLabel(felt.dato).fill(dato as string);
        await te.getByLabel(felt.beskrivelse).fill(k.utdypning ?? '');
        await te.screenshot({ path: join(UT, 'ny-sak-skjema.png'), fullPage: true });
        await te.getByRole('button', { name: 'Se brevet før sending', exact: true }).click();
        await te.getByRole('region', { name: 'Sending' }).waitFor();
        await te.screenshot({ path: join(UT, 'ny-sak-brev.png'), fullPage: true });
        await te.getByRole('checkbox', { name: 'Jeg har kontrollert brevet' }).check();
        const svar = te.waitForResponse(
          (r) => r.request().method() === 'POST' && new URL(r.url()).pathname === '/api/kjerne/saker'
        );
        await te.getByRole('button', { name: 'Send til byggherren', exact: true }).click();
        const sendt = await svar;
        console.log(`TE  POST /api/kjerne/saker fra /{p}/ny: ${sendt.status()} ${await sendt.text()}`);
        if (sendt.status() !== 201) throw new Error('Serveren lagret ikke saken fra skjemaet');
        // S1 i #1414: TE kommer til saken, med kvitteringen.
        await te.waitForURL(new RegExp(`/${katalog.prosjekt}/[0-9a-f-]{36}$`), { timeout: 30_000 });
        sak = new URL(te.url()).pathname.split('/').at(-1)!;
        await te.getByText('Brevet sendes til Catenda.').waitFor({ timeout: 30_000 });
        await te.getByRole('heading', { name: tittel, level: 1 }).waitFor();
        await te.screenshot({ path: join(UT, 'ny-sak-sendt.png'), fullPage: true });
        const nye = (await lesJournal(sak)).filter((r) => r.versjon > forventet);
        // Påberopelsen er kravet i dokumenthendelsen, med feltene TE fylte ut. Sakstittelen er
        // navnet på forholdet i brevteksten, ikke et felt i kravet (LV-U43).
        type Dokumentdata = { krav?: Record<string, unknown>[]; brevtekst?: { laast: string }[] };
        const dokument = nye
          .map((r) => r.data as Dokumentdata)
          .find((d) => d.krav?.some((x) => x.spor === 'forhold'));
        const krav = dokument?.krav?.find((x) => x.spor === 'forhold');
        if (
          !krav ||
          krav.underkategori !== k.innhold.underkategori ||
          (dato && !Object.values(krav).includes(dato)) ||
          !dokument?.brevtekst?.some((a) => a.laast.includes(`«${tittel.trim()}» i sak`))
        )
          throw new Error(`Journalen har ikke påberopelsen TE fylte ut: ${JSON.stringify(nye)}`);
        return nye;
      },
    };
    return { bane, sak: () => sak };
  };

  const OPPRETTES = !!FORLOEP?.utgangspunkt.opprettes;
  const te = await loggInn('te', `/${katalog.prosjekt}`);
  const tittel = FORLOEP?.tittel ?? 'Ny peling ved akse C';
  let sak = '';
  if (!OPPRETTES) {
    const opprettet = await opprettSak(te, tittel);
    console.log(`TE  POST /api/kjerne/saker: ${opprettet.status} ${JSON.stringify(opprettet.kropp)}`);
    if (opprettet.status !== 201) throw new Error('TE fikk ikke opprettet saken');
    sak = opprettet.kropp.sak_id as string;
  }

  const bh = await loggInn('bh', OPPRETTES ? `/${katalog.prosjekt}` : `/${katalog.prosjekt}/${sak}`);
  // Uten CSRF-token stopper autentiseringen kallet; med det slipper tilgangskontrollen
  // BH gjennom (kontraktsrolle `kreves`), og kjernen avviser kommandoen.
  const utenCsrf = await opprettSak(bh, 'Uten CSRF-token', false);
  console.log(`BH  POST /api/kjerne/saker uten CSRF: ${utenCsrf.status} ${JSON.stringify(utenCsrf.kropp)}`);
  if (utenCsrf.status !== 403) throw new Error('Kallet uten CSRF-token ble ikke avvist');
  const avvist = await opprettSak(bh, 'BH skal ikke kunne opprette');
  console.log(`BH  POST /api/kjerne/saker: ${avvist.status} ${JSON.stringify(avvist.kropp)}`);
  if (avvist.status !== 400 || avvist.kropp?.rule !== 'FEIL_PART') throw new Error('Kjernen avviste ikke BH ved opprettelsen');

  if (FORLOEP) {
    const forloep = somForloep(FORLOEP);
    const til = values.til ? kontrollpunkt(FORLOEP, values.til).etter : forloep.steg.length;
    // Kontrollene ved hvert kontrollpunkt leses av journalen serveren gir tilbake.
    const ny = OPPRETTES ? nySaksbane(tittel) : null;
    // Teksten lages med koden saken får av serveren, som skjemaet gjør (LV-U46).
    const kode = async () => {
      const lest = await kjerneKall<Sakskode>(te, 'GET', `/api/kjerne/saker/${sak}/sakskode`);
      if (lest.status !== 200) throw new Error(`GET sakskode ga ${lest.status}`);
      return { kode: lest.kropp.kode, loepenummer: lest.kropp.loepenummer };
    };
    await kjoer(forloep, ny ? ny.bane : serverbane(sak, await kode()), { til, valg: { klokke: veggklokke } });
    if (ny) {
      if (!ny.sak()) throw new Error(`${FORLOEP.id}: saken ble ikke opprettet i skjemaet (--til)`);
      sak = ny.sak()!;
    }
    console.log(`${FORLOEP.id}: ${til} steg sendt, og kontrollene ved kontrollpunktene holder`);
    // Jobbkjøreren leverer brevene til den falske Catenda; kjøringen venter til alle er levert.
    if (til > 0)
      for (let forsoek = 0; ; forsoek++) {
        const lest = await kjerneKall<Saken>(te, 'GET', `/api/kjerne/saker/${sak}`);
        if (lest.status !== 200) throw new Error(`GET under leveringen ga ${lest.status}`);
        const oppdrag = lest.kropp.leveringsoppdrag;
        if (oppdrag.length && oppdrag.every((o) => o.levert)) {
          console.log(`Levert til falsk Catenda: ${oppdrag.length} brev`);
          break;
        }
        if (forsoek === 60)
          throw new Error(
            `Brevene ble ikke levert: ${JSON.stringify(oppdrag)}. Ukjente kall: ${ukjenteKall.join(', ') || 'ingen'}`
          );
        await te.waitForTimeout(1000);
      }
  }

  if (!sak) throw new Error('Ingen sak å vise');
  const saksrute = `/${katalog.prosjekt}/${sak}`;
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
    await side.getByText(tittel).first().waitFor({ timeout: 30_000 });
    await side.waitForTimeout(500);
    await side.screenshot({ path: join(UT, `saksrute-${navn}.png`), fullPage: true });
  }
  if (values.feil) {
    // Feiltilstandene ved sendingen i Varden (#1676): TE godtar BHs svar på vederlagskravet i
    // brevkontrollen, og `page.route` svarer på kommandoruta i stedet for serveren. Kroppene har
    // formen serveren gir (`server/saker.ts`, `server/inngang.ts`); avbruddet er et svar som aldri
    // kom. `GET` går til serveren, så innlastingen etter 409 er ekte.
    const FEILTILSTANDER: { navn: string; svar: { status: number; kropp: unknown } | null; melding: RegExp }[] = [
      {
        navn: '409',
        svar: {
          status: 409,
          kropp: {
            success: false,
            error: 'VERSJONSKONFLIKT',
            expected_version: 1,
            current_version: 2,
            message: 'Saken er endret. Last den inn på nytt.',
          },
        },
        melding: /Saken er endret/,
      },
      {
        navn: '403',
        svar: { status: 403, kropp: { success: false, error: 'FORBIDDEN', message: 'Du har ikke tilgang.' } },
        melding: /Du har ikke tilgang/,
      },
      {
        navn: '500',
        svar: {
          status: 500,
          kropp: { success: false, error: 'INTERNAL_ERROR', message: 'Kommandoen ble ikke lagret på grunn av en feil.' },
        },
        melding: /ikke lagret på grunn av en feil/,
      },
      { navn: 'avbrutt', svar: null, melding: /usikkert om brevet ble lagret/ },
    ];
    const kommandoruta = `**/api/kjerne/saker/${sak}/kommandoer`;
    const godta = te.getByRole('button', { name: /^Godta svaret/ });
    for (const tilstand of FEILTILSTANDER) {
      await te.goto(`${FRONTEND}${saksrute}`);
      await te.getByText('Vederlagsjustering', { exact: true }).first().click({ timeout: 30_000 });
      await godta.first().waitFor({ timeout: 30_000 }).catch((feil: unknown) => {
        throw new Error('--feil trenger et kontrollpunkt der TE kan godta BHs svar (--til)', { cause: feil });
      });
      await godta.first().click();
      await te.getByRole('checkbox', { name: 'Jeg har kontrollert brevet' }).check();
      let traff = 0;
      await te.route(kommandoruta, (rute) => {
        if (rute.request().method() !== 'POST') return rute.continue();
        traff++;
        const { svar } = tilstand;
        return svar
          ? rute.fulfill({ status: svar.status, contentType: 'application/json', body: JSON.stringify(svar.kropp) })
          : rute.abort('failed');
      });
      await te.getByRole('button', { name: 'Send aksepten til byggherren', exact: true }).click();
      for (let i = 0; !traff && i < 50; i++) await te.waitForTimeout(200);
      if (!traff) throw new Error(`Feiltilstand ${tilstand.navn}: skjemaet sendte ikke til ${kommandoruta}`);
      const varsel = te.getByRole('alert').filter({ hasText: tilstand.melding }).first();
      await varsel.waitFor({ timeout: 10_000 }).catch((feil: unknown) => {
        throw new Error(`Feiltilstand ${tilstand.navn}: ingen role="alert" med ${tilstand.melding}`, { cause: feil });
      });
      await te.waitForLoadState('networkidle');
      await te.waitForTimeout(500);
      // Varden ruller i en egen beholder, så `fullPage` når ikke meldingen under sendeknappen.
      await varsel.scrollIntoViewIfNeeded();
      const varsler = await te.getByRole('alert').allInnerTexts();
      console.log(`TE  feiltilstand ${tilstand.navn}: ${varsler.filter(Boolean).join(' | ')}`);
      await te.screenshot({ path: join(UT, `feil-${tilstand.navn}.png`), fullPage: true });
      await te.unroute(kommandoruta);
    }
  }
  if (OPPRETTES) {
    // S2 i #1414: «Avbryt» fører til sakslisten uten melding, og ingen sak opprettes.
    await te.goto(`${FRONTEND}/${katalog.prosjekt}/ny`);
    await te.getByRole('heading', { name: 'Nytt krav om endringsordre', level: 1 }).waitFor({ timeout: 30_000 });
    await te.getByLabel('Tittel på saken').fill('Avbrytes');
    await te.getByRole('button', { name: 'Avbryt', exact: true }).click();
    await te.getByRole('button', { name: 'Ja, slett det du har skrevet', exact: true }).click();
    await te.waitForURL(new RegExp(`/${katalog.prosjekt}$`), { timeout: 30_000 });
    await te.waitForLoadState('networkidle');
    if (await te.getByText('Avbrytes').count()) throw new Error('Sakslisten viser saken som ble avbrutt');
    await te.screenshot({ path: join(UT, 'ny-sak-avbrutt.png'), fullPage: true });
    console.log('TE  «Avbryt» i /{p}/ny: til sakslisten');
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
