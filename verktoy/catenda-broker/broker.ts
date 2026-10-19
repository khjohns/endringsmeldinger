/**
 * Token-broker for Catenda-integrasjonen fra skyøkta (#806). Brokeren holder
 * integrasjonens klient-ID og hemmelighet og henter Catenda-tokenet selv. Økta
 * får bare brokernøkkelen, og kall går videre bare når metode og sti står i
 * tillatelseslisten, avgrenset til ett Catenda-prosjekt og ett topic board.
 *
 * For appen ser brokeren ut som Catenda: tokenkallet med `client_credentials`
 * svarer med brokernøkkelen som `access_token`. Innloggingen med
 * `authorization_code` går ikke gjennom brokeren.
 *
 * Brokeren logger verken kropper eller hoder.
 */

export interface Miljoe {
  BROKERNOKKEL: string;
  CATENDA_CLIENT_ID: string;
  CATENDA_CLIENT_SECRET: string;
  CATENDA_PROSJEKT_ID: string;
  CATENDA_TOPIC_BOARD_ID: string;
  /** Biblioteket og mappen live-testene sletter i. Uten begge avvises sletting av items. */
  CATENDA_BIBLIOTEK_ID?: string;
  CATENDA_MAPPE_ID?: string;
}

const CATENDA = 'https://api.catenda.com';
const SIKKERHETSMARGIN_MS = 300_000;
const VIDERESENDTE_HODER = ['accept', 'content-type', 'bimsync-params'];

/**
 * En del er `=literal`, `prosjekt`, `board`, `bibliotek` eller `id`. En regel med `foersjekk`
 * slår opp ressursen i Catenda før kallet sendes, og sender det bare når `godkjent` sier ja.
 */
type Foersjekk = 'item' | 'topic' | 'dokumentreferanse';
type Regel = { metoder: string[]; deler: string[]; foersjekk: Foersjekk | null };

/** Live-testene navngir alt de oppretter med prefikset, og sletter bare det. */
export const LIVETESTPREFIKS = 'koe-livetest-';

const ID = /^[0-9A-Za-z-]{1,64}$/;
const KANONISK_ID = /^(?:[0-9a-f]{32}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;

/**
 * Kallene i `docs/datamodell/dataflyt.toml` og `server/catenda.ts` som integrasjonen gjør,
 * og slettingene live-testene rydder etter seg med. Appen sletter ingen av dem.
 */
const REGLER: [string, string, Foersjekk?][] = [
  ['GET', 'v2/projects/:prosjekt'],
  ['GET', 'v2/projects/:prosjekt/members'],
  ['GET', 'v2/projects/:prosjekt/teams'],
  ['GET', 'v2/projects/:prosjekt/teams/:id/members'],
  ['GET POST', 'v2/projects/:prosjekt/libraries/:id/items'],
  ['GET', 'v2/projects/:prosjekt/libraries/:id/items/:id'],
  ['DELETE', 'v2/projects/:prosjekt/libraries/:bibliotek/items/:id', 'item'],
  ['GET', 'v2/projects/:prosjekt/ifc/products/ifctypes'],
  ['GET', 'v2/projects/:prosjekt/ifc/products/:id/relations'],
  ['GET', 'opencde/bcf/3.0/projects/:board'],
  ['GET POST', 'opencde/bcf/3.0/projects/:board/topics'],
  ['GET PUT', 'opencde/bcf/3.0/projects/:board/topics/:id'],
  ['DELETE', 'opencde/bcf/3.0/projects/:board/topics/:id', 'topic'],
  ['POST', 'opencde/bcf/3.0/projects/:board/topics/:id/comments'],
  ['GET PUT', 'opencde/bcf/3.0/projects/:board/topics/:id/related_topics'],
  ['DELETE', 'opencde/bcf/3.0/projects/:board/topics/:id/related_topics/:id'],
  ['GET POST', 'opencde/bcf/3.0/projects/:board/topics/:id/document_references'],
  ['DELETE', 'opencde/bcf/3.0/projects/:board/topics/:id/document_references/:id', 'dokumentreferanse'],
];

const TILLATT: Regel[] = REGLER.map(([metoder, sti, krav]) => ({
  metoder: metoder.split(' '),
  deler: sti.split('/').map((d) => (d.startsWith(':') ? d.slice(1) : `=${d}`)),
  foersjekk: krav ?? null,
}));

/** Kopi av `catendaId` i `server/autorisasjon.ts`, som drar med seg datalaget ved import. */
function catendaId(verdi: string): string | null {
  const hex = verdi
    .trim()
    .toLowerCase()
    .replace(/^urn:uuid:/, '')
    .replace(/^\{(.*)\}$/, '$1')
    .replaceAll('-', '');
  return /^[0-9a-f]{32}$/.test(hex) ? hex : null;
}

/** Strengere enn `catendaId`: stien sendes uendret til Catenda, så bare kanonisk form godtas. */
function stiId(verdi: string): string | null {
  return KANONISK_ID.test(verdi) ? verdi.toLowerCase().replaceAll('-', '') : null;
}

function mappeId(miljoe: Miljoe): string | null {
  return catendaId(miljoe.CATENDA_MAPPE_ID ?? '');
}

export function regelFor(miljoe: Miljoe, metode: string, sti: string): Regel | undefined {
  // Hver del må treffe et literal eller en ID uten `%`, så en kodet skråstrek slipper ikke gjennom.
  const deler = sti.slice(1).split('/');
  const prosjekt = catendaId(miljoe.CATENDA_PROSJEKT_ID);
  const board = catendaId(miljoe.CATENDA_TOPIC_BOARD_ID);
  const bibliotek = catendaId(miljoe.CATENDA_BIBLIOTEK_ID ?? '');
  const mappe = mappeId(miljoe);
  if (!prosjekt || !board) return undefined;
  return TILLATT.find(
    (regel) =>
      regel.metoder.includes(metode) &&
      regel.deler.length === deler.length &&
      (regel.foersjekk !== 'item' || mappe !== null) &&
      regel.deler.every((del, i) => {
        const verdi = deler[i];
        if (del.startsWith('=')) return verdi === del.slice(1);
        if (del === 'prosjekt') return stiId(verdi) === prosjekt;
        if (del === 'board') return stiId(verdi) === board;
        if (del === 'bibliotek') return bibliotek !== null && stiId(verdi) === bibliotek;
        return ID.test(verdi);
      })
  );
}

/** Hvor foroppslaget går: ressursen selv, eller topicen en dokumentreferanse hører til. */
function oppslagssti(foersjekk: Foersjekk, sti: string): string {
  return foersjekk === 'dokumentreferanse' ? sti.split('/').slice(0, -2).join('/') : sti;
}

function godkjent(foersjekk: Foersjekk, ressurs: unknown, miljoe: Miljoe): boolean {
  const r = (typeof ressurs === 'object' && ressurs !== null ? ressurs : {}) as Record<string, unknown>;
  const harPrefiks = (v: unknown) => typeof v === 'string' && v.startsWith(LIVETESTPREFIKS);
  if (foersjekk !== 'item') return harPrefiks(r.title);
  const mappe = mappeId(miljoe);
  return (
    harPrefiks(r.name) && mappe !== null && typeof r.parentId === 'string' && catendaId(r.parentId) === mappe
  );
}

export function tillatt(miljoe: Miljoe, metode: string, sti: string): boolean {
  return regelFor(miljoe, metode, sti) !== undefined;
}

const koder = new TextEncoder();

/** Konstant tid uavhengig av hvor tidlig og om lengden avviker: begge sider hashes først. */
export async function sammeNokkel(oppgitt: string, nokkel: string): Promise<boolean> {
  if (!nokkel) return false;
  const [a, b] = await Promise.all(
    [oppgitt, nokkel].map(async (v) => new Uint8Array(await crypto.subtle.digest('SHA-256', koder.encode(v))))
  );
  let forskjell = 0;
  for (let i = 0; i < a.length; i++) forskjell |= a[i] ^ b[i];
  return forskjell === 0;
}

function svar(status: number, kropp: unknown): Response {
  return Response.json(kropp, { status, headers: { 'Cache-Control': 'no-store' } });
}

/** Tokenkallet til Catenda feilet. `status` er Catendas statuskode, 0 uten svar eller med ugyldig kropp. */
export class Tokenfeil extends Error {
  constructor(readonly status: number) {
    super(`Catenda svarte ${status} på tokenkallet`);
  }
}

/** Catenda-tokenet. Lever i isolatet og hentes på nytt ved utløp eller en 401. */
export class Tokenlager {
  #token: string | null = null;
  #utloeper = 0;
  #henter: Promise<string> | null = null;

  readonly #hent: typeof fetch;

  // Workers avviser den globale `fetch` kalt som metode på et annet objekt («Illegal invocation»).
  constructor(
    hent: typeof fetch,
    private readonly naa: () => number = Date.now
  ) {
    this.#hent = (...a) => hent(...a);
  }

  async token(miljoe: Miljoe): Promise<string> {
    if (this.#token && this.naa() < this.#utloeper) return this.#token;
    this.#henter ??= this.#hentNytt(miljoe).finally(() => {
      this.#henter = null;
    });
    return this.#henter;
  }

  forkast(token: string): void {
    if (this.#token === token) this.#token = null;
  }

  async #hentNytt(miljoe: Miljoe): Promise<string> {
    let s: Response;
    try {
      s = await this.#hent(`${CATENDA}/oauth2/token`, {
        method: 'POST',
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: miljoe.CATENDA_CLIENT_ID,
          client_secret: miljoe.CATENDA_CLIENT_SECRET,
        }),
        redirect: 'manual',
      });
    } catch {
      throw new Tokenfeil(0);
    }
    if (s.status !== 200) {
      await s.body?.cancel().catch(() => {});
      throw new Tokenfeil(s.status);
    }
    const data = (await s.json().catch(() => ({}))) as {
      access_token?: unknown;
      expires_in?: unknown;
    };
    if (typeof data.access_token !== 'string' || !data.access_token) throw new Tokenfeil(0);
    const varighet = typeof data.expires_in === 'number' ? data.expires_in : 3600;
    this.#token = data.access_token;
    this.#utloeper = this.naa() + varighet * 1000 - SIKKERHETSMARGIN_MS;
    return this.#token;
  }
}

async function tokenkall(foresp: Request, miljoe: Miljoe): Promise<Response> {
  let skjema: URLSearchParams;
  try {
    skjema = new URLSearchParams(await foresp.text());
  } catch {
    return svar(400, { error: 'invalid_request' });
  }
  if (!(await sammeNokkel(skjema.get('client_secret') ?? '', miljoe.BROKERNOKKEL)))
    return svar(401, { error: 'invalid_client' });
  if (skjema.get('grant_type') !== 'client_credentials')
    return svar(400, { error: 'unsupported_grant_type' });
  return svar(200, {
    access_token: miljoe.BROKERNOKKEL,
    token_type: 'Bearer',
    expires_in: 3600,
  });
}

export function lagBroker(hent: typeof fetch = fetch, tokenlager = new Tokenlager(hent)) {
  return async function behandle(foresp: Request, miljoe: Miljoe): Promise<Response> {
    const adresse = new URL(foresp.url);
    if (adresse.pathname === '/oauth2/token' && foresp.method === 'POST')
      return tokenkall(foresp, miljoe);

    const bearer = /^Bearer (.+)$/.exec(foresp.headers.get('Authorization') ?? '')?.[1] ?? '';
    // Kroppen skiller brokerens avvisning fra Catendas 401 og 403.
    if (!(await sammeNokkel(bearer, miljoe.BROKERNOKKEL))) return svar(401, { feil: 'brokernoekkel' });
    const regel = regelFor(miljoe, foresp.method, adresse.pathname);
    // Oppslaget kontrollerer bare stien, så en sletting med query slipper ikke gjennom.
    if (!regel || (regel.foersjekk && adresse.search)) return svar(403, { feil: 'broker_avviste' });

    let token: string;
    try {
      token = await tokenlager.token(miljoe);
    } catch (feil) {
      // Bare steget og Catendas statuskode, så en 502 kan feilsøkes fra økta (#806).
      return svar(502, { feil: 'tokenkall', status: feil instanceof Tokenfeil ? feil.status : 0 });
    }
    if (regel.foersjekk) {
      let oppslag: Response;
      try {
        oppslag = await hent(CATENDA + oppslagssti(regel.foersjekk, adresse.pathname), {
          method: 'GET',
          headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
          redirect: 'manual',
        });
      } catch {
        return svar(502, { feil: 'catenda_svarte_ikke' });
      }
      if (oppslag.status === 401) tokenlager.forkast(token);
      if (oppslag.status !== 200) return tilbake(oppslag);
      if (!godkjent(regel.foersjekk, await oppslag.json().catch(() => null), miljoe))
        return svar(403, { feil: 'broker_avviste' });
    }
    const hoder = new Headers({ Authorization: `Bearer ${token}` });
    for (const navn of VIDERESENDTE_HODER) {
      const verdi = foresp.headers.get(navn);
      if (verdi !== null) hoder.set(navn, verdi);
    }
    const harKropp = !['GET', 'HEAD'].includes(foresp.method);
    let ut: Response;
    try {
      ut = await hent(CATENDA + adresse.pathname + adresse.search, {
        method: foresp.method,
        headers: hoder,
        body: harKropp ? await foresp.arrayBuffer() : undefined,
        redirect: 'manual',
      });
    } catch {
      return svar(502, { feil: 'catenda_svarte_ikke' });
    }
    if (ut.status === 401) tokenlager.forkast(token);
    return tilbake(ut);
  };
}

function tilbake(ut: Response): Response {
  const svarhoder = new Headers(ut.headers);
  svarhoder.delete('set-cookie');
  return new Response(ut.body, { status: ut.status, headers: svarhoder });
}

const behandle = lagBroker();

export default {
  fetch: (foresp: Request, miljoe: Miljoe) => behandle(foresp, miljoe),
};
