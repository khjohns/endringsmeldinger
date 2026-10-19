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
 * sender kallet bare når hvert oppslag fra `oppslagene` gir 200 og oppfyller sitt `krav`.
 */
type Foersjekk = 'item' | 'topic' | 'dokumentreferanse' | 'topicendring';
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
  ['GET', 'opencde/bcf/3.0/projects/:board/topics/:id'],
  ['PUT', 'opencde/bcf/3.0/projects/:board/topics/:id', 'topicendring'],
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

type Oppslag = { sti: string; krav: (ressurs: Record<string, unknown>) => boolean };

const harPrefiks = (v: unknown) => typeof v === 'string' && v.startsWith(LIVETESTPREFIKS);
const sammeId = (a: unknown, b: string) =>
  typeof a === 'string' && (a.toLowerCase() === b.toLowerCase() || (catendaId(a) ?? 0) === catendaId(b));

/**
 * En PUT på en topic sendes i kanonisk form: kroppen tolkes strengt som et JSON-objekt i UTF-8
 * og sendes som `JSON.stringify` av resultatet. Da ser Catenda det samme som kontrollen, uten
 * dupliserte nøkler eller annet tegnsett. Kan kroppen ikke tolkes slik, gir det `null`.
 */
function tolketKropp(kropp: ArrayBuffer | undefined): { verdi: object; tekst: string } | null {
  try {
    const verdi: unknown = JSON.parse(new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(kropp));
    if (typeof verdi !== 'object' || verdi === null || Array.isArray(verdi)) return null;
    return { verdi, tekst: JSON.stringify(verdi) };
  } catch {
    return null;
  }
}

/** Kjernen av prefikset, slik `kanGiPrefiks` sammenligner. */
const PREFIKSKJERNE = 'livetest';

/** Prosentkoding og tallentiteter (`%6B`, `&#107;`, `&#x6b;`), dekodet til tegnet. */
function dekodet(tekst: string): string {
  const tegn = (kode: number) => (kode <= 0x10ffff ? String.fromCodePoint(kode) : '');
  return tekst
    .replace(/%([0-9a-f]{2})/gi, (_t, hex: string) => tegn(parseInt(hex, 16)))
    .replace(/&#x([0-9a-f]+);?/gi, (_t, hex: string) => tegn(parseInt(hex, 16)))
    .replace(/&#([0-9]+);?/g, (_t, des: string) => tegn(parseInt(des, 10)));
}

/**
 * Om en nøkkel eller streng i verdien kan bli prefikset når Catenda lagrer den. Strengen
 * sammenlignes bare på bokstaver og sifre, etter dekoding, NFKC og små bokstaver, så ingen
 * tegn mellom bokstavene, ingen bokstavform og ingen koding (`%6B`, `&#107;`) skjuler `livetest`.
 */
function kanGiPrefiks(verdi: unknown): boolean {
  const stabel: unknown[] = [verdi];
  while (stabel.length > 0) {
    const v = stabel.pop();
    if (typeof v === 'string') {
      const bokstaver = dekodet(v).normalize('NFKC').toLowerCase().normalize('NFKC').replace(/[^a-z0-9]/g, '');
      if (bokstaver.includes(PREFIKSKJERNE)) return true;
    } else if (typeof v === 'object' && v !== null) {
      for (const [nokkel, barn] of Object.entries(v)) stabel.push(nokkel, barn);
    }
  }
  return false;
}

/**
 * Oppslagene i Catenda som alle må gi 200 og oppfylle kravet før kallet sendes. En PUT som
 * gir en topic prefikset, krever at den har det fra før, så prefikssperren ikke kan omgås.
 */
function oppslagene(foersjekk: Foersjekk, sti: string, miljoe: Miljoe, kropp: object | undefined): Oppslag[] {
  const mappe = mappeId(miljoe);
  switch (foersjekk) {
    case 'item':
      return [
        {
          sti,
          krav: (r) => harPrefiks(r.name) && mappe !== null && typeof r.parentId === 'string' && catendaId(r.parentId) === mappe,
        },
      ];
    case 'topic':
      return [{ sti, krav: (r) => harPrefiks(r.title) }];
    case 'dokumentreferanse': {
      const deler = sti.split('/');
      const referanse = deler.at(-1)!;
      const topic = deler.slice(0, -2).join('/');
      return [
        { sti: topic, krav: (r) => harPrefiks(r.title) },
        {
          sti: `${topic}/document_references`,
          krav: (r) => Array.isArray(r.liste) && r.liste.some((d) => sammeId((d as { guid?: unknown })?.guid, referanse)),
        },
      ];
    }
    case 'topicendring':
      return kanGiPrefiks(kropp) ? [{ sti, krav: (r) => harPrefiks(r.title) }] : [];
  }
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
    // Oppslaget kontrollerer bare stien, så et kall med query eller Bimsync-Params slipper ikke gjennom.
    if (!regel || (regel.foersjekk && (adresse.search || foresp.headers.has('bimsync-params'))))
      return svar(403, { feil: 'broker_avviste' });

    const harKropp = !['GET', 'HEAD'].includes(foresp.method);
    const raa = harKropp ? await foresp.arrayBuffer() : undefined;
    const kanonisk = regel.foersjekk === 'topicendring' ? tolketKropp(raa) : undefined;
    if (kanonisk === null) return svar(403, { feil: 'broker_avviste' });
    const kropp = kanonisk?.tekst ?? raa;

    let token: string;
    try {
      token = await tokenlager.token(miljoe);
    } catch (feil) {
      // Bare steget og Catendas statuskode, så en 502 kan feilsøkes fra økta (#806).
      return svar(502, { feil: 'tokenkall', status: feil instanceof Tokenfeil ? feil.status : 0 });
    }
    for (const { sti, krav } of regel.foersjekk ? oppslagene(regel.foersjekk, adresse.pathname, miljoe, kanonisk?.verdi) : []) {
      let oppslag: Response;
      try {
        oppslag = await hent(CATENDA + sti, {
          method: 'GET',
          headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
          redirect: 'manual',
        });
      } catch {
        return svar(502, { feil: 'catenda_svarte_ikke' });
      }
      if (oppslag.status === 401) tokenlager.forkast(token);
      if (oppslag.status !== 200) return tilbake(oppslag);
      const ressurs: unknown = await oppslag.json().catch(() => null);
      const r = Array.isArray(ressurs) ? { liste: ressurs } : typeof ressurs === 'object' && ressurs ? ressurs : {};
      if (!krav(r as Record<string, unknown>)) return svar(403, { feil: 'broker_avviste' });
    }
    const hoder = new Headers({ Authorization: `Bearer ${token}` });
    for (const navn of VIDERESENDTE_HODER) {
      const verdi = foresp.headers.get(navn);
      if (verdi !== null) hoder.set(navn, verdi);
    }
    if (kanonisk !== undefined) hoder.set('content-type', 'application/json');
    let ut: Response;
    try {
      ut = await hent(CATENDA + adresse.pathname + adresse.search, {
        method: foresp.method,
        headers: hoder,
        body: kropp,
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
