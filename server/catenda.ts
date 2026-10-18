/**
 * Catenda-klienten i TS (B-19, #657): OAuth-innloggingen med brukerens token og
 * integrasjonsnøkkelen. Port av `CatendaOAuth` i `backend/lib/auth/catenda_oauth.py`
 * og token-håndteringen i `backend/integrations/catenda/base.py`.
 *
 * Brukertokenet lever bare i forespørselen: kalleren gir det til hvert kall, og
 * klienten holder ingen tilstand. Integrasjonsnøkkelen er et eget objekt med sitt
 * eget token og tar aldri imot et brukertoken. Innloggingsinngangene i `innlogging.ts`
 * bruker OAuth-innloggingen (#659), og tilgangskontrollen bruker integrasjonsnøkkelen
 * gjennom `integrasjonen()` (F0b-5b).
 *
 * Feilmeldingene har aldri med svarkropp, kode eller token fra Catenda.
 */

import { catendaId, type Catenda } from './autorisasjon.ts';
import type { Medlem } from './medlemskap.ts';

export const CATENDA = 'https://api.catenda.com';

const SIDESTOERRELSE = 100;
const MAKS_SIDER = 1000;
const SIKKERHETSMARGIN_MS = 300_000;

/** Catenda svarte ikke, svarte med feil, eller svaret hadde ikke forventet form. */
export class CatendaUtilgjengelig extends Error {}

/**
 * En endring i Catenda kan ha skjedd: svaret uteble etter at forespørselen kan ha
 * nådd fram, eller et vellykket svar hadde ikke forventet form (invariant 7).
 */
export class UsikkertUtfall extends CatendaUtilgjengelig {}

/** Feilkodene der forbindelsen aldri ble åpnet, så forespørselen ikke er sendt. */
const IKKE_SENDT = new Set(['ECONNREFUSED', 'ENOTFOUND', 'EAI_AGAIN']);

export interface CatendaOppsett {
  klientId: string;
  klienthemmelighet: string;
  tilbakekallsadresse: string;
  /** Standard `https://api.catenda.com`; testene bruker en lokal server. */
  grunnadresse?: string;
  /** Standard 15 000 ms, som i Python. */
  tidsavbruddMs?: number;
}

export interface CatendaBruker {
  subjekt: string;
  epost: string;
  navn: string;
}

type Rad = Record<string, unknown>;

function erObjekt(verdi: unknown): verdi is Rad {
  return typeof verdi === 'object' && verdi !== null && !Array.isArray(verdi);
}

function kravId(verdi: string): string {
  const id = catendaId(verdi);
  if (!id) throw new RangeError('Ugyldig Catenda-ID');
  return id;
}

async function forespoersel(
  oppsett: CatendaOppsett,
  metode: 'GET' | 'POST',
  sti: string,
  valg: {
    token?: string;
    skjema?: Record<string, string>;
    /** Kroppen til en endring. Svaret kan da gjøre utfallet usikkert. */
    json?: Record<string, unknown>;
    parametre?: Record<string, string>;
  } = {}
): Promise<unknown> {
  const adresse = new URL((oppsett.grunnadresse ?? CATENDA) + sti);
  for (const [navn, verdi] of Object.entries(valg.parametre ?? {})) {
    adresse.searchParams.set(navn, verdi);
  }
  const hoder: Record<string, string> = { Accept: 'application/json' };
  if (valg.token) hoder.Authorization = `Bearer ${valg.token}`;
  if (valg.json) hoder['Content-Type'] = 'application/json';
  const endring = valg.json !== undefined;
  let svar: Response;
  try {
    svar = await fetch(adresse, {
      method: metode,
      headers: hoder,
      body: valg.json
        ? JSON.stringify(valg.json)
        : valg.skjema
          ? new URLSearchParams(valg.skjema)
          : undefined,
      redirect: 'manual',
      signal: AbortSignal.timeout(oppsett.tidsavbruddMs ?? 15_000),
    });
  } catch (feil) {
    const kode = ((feil as Error)?.cause as { code?: unknown } | undefined)?.code;
    if (endring && !IKKE_SENDT.has(String(kode))) throw new UsikkertUtfall('Catenda svarte ikke');
    throw new CatendaUtilgjengelig('Catenda svarte ikke');
  }
  if (svar.status !== 200 && !(endring && svar.status === 201)) {
    await svar.body?.cancel().catch(() => {});
    throw new CatendaUtilgjengelig('Catenda svarte med feil');
  }
  try {
    return await svar.json();
  } catch {
    if (endring) throw new UsikkertUtfall('Catenda svarte med et ugyldig svar');
    throw new CatendaUtilgjengelig('Catenda svarte med feil');
  }
}

/** OAuth med brukerens token. Tokenet sendes med hvert kall og lagres ikke. */
export class CatendaOAuth {
  readonly #oppsett: CatendaOppsett;

  constructor(oppsett: CatendaOppsett) {
    this.#oppsett = oppsett;
  }

  autorisasjonsadresse(tilstand: string): string {
    const parametre = new URLSearchParams({
      client_id: this.#oppsett.klientId,
      redirect_uri: this.#oppsett.tilbakekallsadresse,
      response_type: 'code',
      response_mode: 'query',
      state: tilstand,
    });
    return `${this.#oppsett.grunnadresse ?? CATENDA}/oauth2/authorize?${parametre}`;
  }

  /** Bytter koden fra tilbakekallet mot brukerens token. PKCE er ikke slått på hos Catenda. */
  async byttKode(kode: string): Promise<string> {
    const data = await forespoersel(this.#oppsett, 'POST', '/oauth2/token', {
      skjema: {
        client_id: this.#oppsett.klientId,
        client_secret: this.#oppsett.klienthemmelighet,
        redirect_uri: this.#oppsett.tilbakekallsadresse,
        grant_type: 'authorization_code',
        code: kode,
      },
    });
    if (!erObjekt(data) || typeof data.access_token !== 'string' || !data.access_token) {
      throw new CatendaUtilgjengelig('Ugyldig tokensvar');
    }
    return data.access_token;
  }

  async bruker(token: string): Promise<CatendaBruker> {
    const bruker = await forespoersel(this.#oppsett, 'GET', '/v2/user', { token });
    const subjekt = erObjekt(bruker) && bruker.type === 'user' ? catendaId(bruker.id) : null;
    if (!erObjekt(bruker) || !subjekt) {
      throw new CatendaUtilgjengelig('Forventet en brukeridentitet');
    }
    return { subjekt, epost: tekst(bruker.email), navn: tekst(bruker.name) };
  }

  /**
   * Hele samlingen, side for side. Et tak på antall sider og kravet om unike ID-er
   * gjør at en ignorert sideparameter gir feil, aldri en avkortet liste.
   */
  async samling(
    sti: string,
    token: string,
    parametre: Record<string, string> = {}
  ): Promise<Rad[]> {
    const resultat: Rad[] = [];
    const sett = new Set<string>();
    for (let side = 1; side <= MAKS_SIDER; side++) {
      const rader = await forespoersel(this.#oppsett, 'GET', sti, {
        token,
        parametre: { ...parametre, page: String(side), pageSize: String(SIDESTOERRELSE) },
      });
      if (!Array.isArray(rader)) throw new CatendaUtilgjengelig('Ugyldig samling');
      for (const rad of rader) {
        const noekkel = erObjekt(rad)
          ? rad.id || (erObjekt(rad.user) ? rad.user.id : undefined)
          : undefined;
        if (typeof noekkel !== 'string' || !noekkel || sett.has(noekkel)) {
          throw new CatendaUtilgjengelig('Ufullstendig samling');
        }
        sett.add(noekkel);
        resultat.push(rad as Rad);
      }
      if (rader.length < SIDESTOERRELSE) return resultat;
    }
    throw new CatendaUtilgjengelig('Samlingen har flere sider enn taket');
  }

  async prosjekter(token: string): Promise<Set<string>> {
    const rader = await this.samling('/v2/projects', token);
    return new Set(
      rader.map((rad) => {
        const id = catendaId(rad.id);
        if (!id) throw new CatendaUtilgjengelig('Ugyldig prosjekt-ID');
        return id;
      })
    );
  }

  /** Medlemmene i prosjektet, normalisert som `normalize_members` i `lib/auth/domain.py`. */
  async medlemmer(catendaProsjektId: string, token: string): Promise<Medlem[]> {
    const sti = `/v2/projects/${kravId(catendaProsjektId)}/members`;
    return normaliserMedlemmer(await this.samling(sti, token, { userType: 'user' }));
  }

  async teammedlemmer(
    catendaProsjektId: string,
    teamId: string,
    token: string
  ): Promise<Set<string>> {
    const sti = `/v2/projects/${kravId(catendaProsjektId)}/teams/${kravId(teamId)}/members`;
    const subjekter = new Set<string>();
    for (const rad of await this.samling(sti, token)) {
      const bruker = rad.user;
      const subjekt = erObjekt(bruker) && bruker.type === 'user' ? catendaId(bruker.id) : null;
      if (!subjekt) throw new CatendaUtilgjengelig('Forventet individuelle teammedlemmer');
      subjekter.add(subjekt);
    }
    return subjekter;
  }

  /**
   * Lager topicen på boardet og gir topicens GUID. Statusen er boardets standard
   * (#741 punkt 15).
   *
   * @throws UsikkertUtfall når topicen kan være laget; ellers CatendaUtilgjengelig
   */
  async opprettTopic(boardId: string, topic: NyTopic, token: string): Promise<string> {
    if (!UUID.test(boardId)) throw new RangeError('Ugyldig board-ID');
    const svar = await forespoersel(
      this.#oppsett,
      'POST',
      `/opencde/bcf/3.0/projects/${boardId}/topics`,
      {
        token,
        json: { title: topic.tittel, description: topic.beskrivelse, topic_type: TOPICTYPE },
      }
    );
    const guid = erObjekt(svar) ? svar.guid : undefined;
    if (typeof guid !== 'string' || !guid || guid.length > 100)
      throw new UsikkertUtfall('Catenda svarte uten topic');
    return guid;
  }
}

/** Typen topicen for en sak fra appen får (#741 punkt 15). */
export const TOPICTYPE = 'Krav om endringsordre';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export interface NyTopic {
  tittel: string;
  beskrivelse: string;
}

function tekst(verdi: unknown): string {
  return typeof verdi === 'string' ? verdi : '';
}

const ROLLER: Record<string, Medlem['rolle']> = {
  owner: 'admin',
  administrator: 'admin',
  member: 'member',
};

/** Hele listen valideres før noe skrives. */
export function normaliserMedlemmer(rader: Rad[]): Medlem[] {
  const resultat = new Map<string, Medlem>();
  for (const rad of rader) {
    const bruker = rad.user;
    if (!erObjekt(bruker) || bruker.type !== 'user') {
      throw new CatendaUtilgjengelig('Forventet individuelle prosjektmedlemmer');
    }
    const subjekt = catendaId(bruker.id);
    if (!subjekt) throw new CatendaUtilgjengelig('Ugyldig bruker-ID');
    if (resultat.has(subjekt)) throw new CatendaUtilgjengelig('Medlemmet står to ganger');
    const rolle =
      typeof rad.role === 'string' && Object.hasOwn(ROLLER, rad.role)
        ? ROLLER[rad.role]
        : undefined;
    if (!rolle) throw new CatendaUtilgjengelig('Ukjent rolle i Catenda');
    resultat.set(subjekt, {
      subjekt,
      epost: tekst(bruker.email).trim().toLowerCase(),
      navn: tekst(bruker.name),
      rolle,
    });
  }
  return [...resultat.values()];
}

/** `exp` i en JWT, i millisekunder, uten å kontrollere signaturen. */
function jwtUtloep(token: string): number | null {
  try {
    const nyttelast: unknown = JSON.parse(
      Buffer.from(token.split('.')[1] ?? '', 'base64url').toString()
    );
    return erObjekt(nyttelast) && typeof nyttelast.exp === 'number' ? nyttelast.exp * 1000 : null;
  } catch {
    return null;
  }
}

/**
 * Integrasjonens eget token, for synkroniseringen og teamoppslagene. Et statisk
 * token (`CATENDA_ACCESS_TOKEN`) brukes til det utløper; deretter hentes et nytt
 * med `client_credentials`, som Catenda bare tilbyr Boost-kunder.
 */
export class Integrasjonsnokkel {
  readonly #oppsett: CatendaOppsett;
  readonly #naa: () => number;
  #token: string | null = null;
  #utloeper = 0;
  #henter: Promise<string> | null = null;

  constructor(oppsett: CatendaOppsett, statiskToken?: string, naa: () => number = Date.now) {
    this.#oppsett = oppsett;
    this.#naa = naa;
    if (statiskToken) {
      this.#token = statiskToken;
      this.#utloeper = (jwtUtloep(statiskToken) ?? naa() + 3_600_000) - SIKKERHETSMARGIN_MS;
    }
  }

  async token(): Promise<string> {
    if (this.#token && this.#naa() < this.#utloeper) return this.#token;
    this.#henter ??= this.#hent().finally(() => {
      this.#henter = null;
    });
    return this.#henter;
  }

  async #hent(): Promise<string> {
    const data = await forespoersel(this.#oppsett, 'POST', '/oauth2/token', {
      skjema: {
        grant_type: 'client_credentials',
        client_id: this.#oppsett.klientId,
        client_secret: this.#oppsett.klienthemmelighet,
      },
    });
    if (!erObjekt(data) || typeof data.access_token !== 'string' || !data.access_token) {
      throw new CatendaUtilgjengelig('Ugyldig tokensvar');
    }
    const varighet = typeof data.expires_in === 'number' ? data.expires_in : 3600;
    this.#token = data.access_token;
    this.#utloeper = this.#naa() + varighet * 1000 - SIKKERHETSMARGIN_MS;
    return this.#token;
  }
}

/**
 * Klienten og integrasjonsnøkkelen fra miljøet. Mangler klient-ID, hemmelighet
 * eller tilbakekallsadresse, kastes feil. Kontrollen av adressene gjør inngangen.
 * `CATENDA_GRUNNADRESSE` godtas bare i utvikling og bare mot localhost, for en
 * testleverandør (F0b-8).
 */
export function catendaFraMiljoe(miljoe: NodeJS.ProcessEnv = process.env): {
  oauth: CatendaOAuth;
  integrasjonsnokkel: Integrasjonsnokkel;
} {
  const oppsett: CatendaOppsett = {
    klientId: miljoe.CATENDA_CLIENT_ID ?? '',
    klienthemmelighet: miljoe.CATENDA_CLIENT_SECRET ?? '',
    tilbakekallsadresse: miljoe.CATENDA_LOGIN_REDIRECT_URI ?? '',
  };
  if (miljoe.CATENDA_GRUNNADRESSE) {
    const adresse = URL.parse(miljoe.CATENDA_GRUNNADRESSE);
    if (
      miljoe.APP_ENV !== 'development' ||
      adresse?.protocol !== 'http:' ||
      !['localhost', '127.0.0.1'].includes(adresse.hostname) ||
      adresse.pathname !== '/' ||
      adresse.search ||
      adresse.username
    )
      throw new Error('CATENDA_GRUNNADRESSE godtas bare mot localhost i utvikling');
    oppsett.grunnadresse = adresse.origin;
  }
  if (!oppsett.klientId || !oppsett.klienthemmelighet || !oppsett.tilbakekallsadresse) {
    throw new Error(
      'Catenda-applikasjonen mangler klient-ID, hemmelighet eller tilbakekallsadresse'
    );
  }
  return {
    oauth: new CatendaOAuth(oppsett),
    integrasjonsnokkel: new Integrasjonsnokkel(oppsett, miljoe.CATENDA_ACCESS_TOKEN || undefined),
  };
}

/** Topicene for sakene fra appen lages av integrasjonen, med dens eget token (#741 punkt 16). */
export function topicoppretter(catenda: {
  oauth: CatendaOAuth;
  integrasjonsnokkel: Integrasjonsnokkel;
}): Topicoppretter {
  return {
    async opprettTopic(boardId, topic) {
      return catenda.oauth.opprettTopic(boardId, topic, await catenda.integrasjonsnokkel.token());
    },
  };
}

export interface Topicoppretter {
  opprettTopic(boardId: string, topic: NyTopic): Promise<string>;
}

/** Medlemmene og teamene for tilgangskontrollen, med integrasjonens eget token. */
export function integrasjonen(catenda: {
  oauth: CatendaOAuth;
  integrasjonsnokkel: Integrasjonsnokkel;
}): Catenda {
  return {
    async medlemmer(catendaProsjektId) {
      return catenda.oauth.medlemmer(catendaProsjektId, await catenda.integrasjonsnokkel.token());
    },
    async teammedlemmer(catendaProsjektId, teamId) {
      const token = await catenda.integrasjonsnokkel.token();
      return catenda.oauth.teammedlemmer(catendaProsjektId, teamId, token);
    },
  };
}
