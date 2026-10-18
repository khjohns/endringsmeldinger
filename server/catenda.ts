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
import { UUID } from './datalag.ts';

export const CATENDA = 'https://api.catenda.com';

const SIDESTOERRELSE = 100;
const MAKS_SIDER = 1000;
const SIKKERHETSMARGIN_MS = 300_000;

/** Catenda svarte ikke, svarte med feil, eller svaret hadde ikke forventet form. */
export class CatendaUtilgjengelig extends Error {}

/**
 * En endring i Catenda kan ha skjedd: svaret uteble etter at forespørselen kan ha
 * nådd fram, svaret var ingen avvisning (`avvistUtenEndring`), eller et vellykket
 * svar hadde ikke forventet form (invariant 7).
 */
export class UsikkertCatendautfall extends CatendaUtilgjengelig {}

/**
 * Catenda avviste forespørselen, og samme forespørsel blir avvist igjen: en 4xx utenom
 * 401 (tokenet fornyes), 408, 429 og 499 (#778). Jobben parkeres i stedet for å prøves
 * hver time uten ende. En avvisning fra tokenkallet til integrasjonen gjelder oppsettet,
 * ikke jobben, og gir `CatendaUtilgjengelig` (`Integrasjonsnokkel`).
 */
export class CatendaAvvisning extends CatendaUtilgjengelig {
  readonly status: number;
  constructor(status: number) {
    super(`Catenda avviste forespørselen med status ${status}`);
    this.status = status;
  }
}

/** Catenda godtok ikke tokenet (401). Integrasjonsnøkkelen forkaster det (#783 punkt 5). */
export class CatendaUautorisert extends CatendaUtilgjengelig {}

/**
 * Catenda avviste tokenkallet til integrasjonen: oppsettet er feil, for eksempel
 * hemmeligheten eller Boost-lisensen. Jobben prøves igjen, men driften må rette
 * oppsettet (#783 punkt 5).
 */
export class CatendaOppsettfeil extends CatendaUtilgjengelig {}

/**
 * Statusene vi regner som en avvisning uten endring: en 4xx utenom tidsavbruddene 408
 * og 499. En annen status, også 503, kan komme fra en mellomtjener etter at Catenda
 * fikk forespørselen, og gir et usikkert utfall (arbeidsvalg i PR #772).
 */
const avvistUtenEndring = (status: number) =>
  status >= 400 && status < 500 && status !== 408 && status !== 499;

const varigAvvist = (status: number) =>
  avvistUtenEndring(status) && status !== 401 && status !== 429;

/**
 * Feilkodene der forespørselen ikke er sendt: forbindelsen ble aldri åpnet, eller
 * TLS-forhandlingen feilet før noe ble sendt (#778).
 */
const IKKE_SENDT = new Set([
  'ECONNREFUSED',
  'ENOTFOUND',
  'EAI_AGAIN',
  'UND_ERR_CONNECT_TIMEOUT',
  'CERT_HAS_EXPIRED',
  'CERT_NOT_YET_VALID',
  'DEPTH_ZERO_SELF_SIGNED_CERT',
  'SELF_SIGNED_CERT_IN_CHAIN',
  'UNABLE_TO_GET_ISSUER_CERT_LOCALLY',
  'UNABLE_TO_VERIFY_LEAF_SIGNATURE',
  'ERR_TLS_CERT_ALTNAME_INVALID',
]);

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
    /** En fil som endring, med hodene Catenda krever for den. */
    fil?: { innhold: Uint8Array; hoder: Record<string, string> };
    parametre?: Record<string, string>;
  } = {}
): Promise<unknown> {
  const adresse = new URL((oppsett.grunnadresse ?? CATENDA) + sti);
  for (const [navn, verdi] of Object.entries(valg.parametre ?? {})) {
    adresse.searchParams.set(navn, verdi);
  }
  const hoder: Record<string, string> = { Accept: 'application/json' };
  if (valg.token) hoder.Authorization = `Bearer ${valg.token}`;
  let kropp: BodyInit | undefined;
  if (valg.fil) {
    kropp = Buffer.from(valg.fil.innhold);
    Object.assign(hoder, valg.fil.hoder, { 'Content-Type': 'application/octet-stream' });
  } else if (valg.json !== undefined) {
    kropp = JSON.stringify(valg.json);
    hoder['Content-Type'] = 'application/json';
  } else if (valg.skjema) {
    kropp = new URLSearchParams(valg.skjema);
  }
  const endring = valg.json !== undefined || valg.fil !== undefined;
  let svar: Response;
  try {
    svar = await fetch(adresse, {
      method: metode,
      headers: hoder,
      body: kropp,
      redirect: 'manual',
      signal: AbortSignal.timeout(oppsett.tidsavbruddMs ?? 15_000),
    });
  } catch (feil) {
    const kode = ((feil as Error)?.cause as { code?: unknown } | undefined)?.code;
    if (endring && !IKKE_SENDT.has(String(kode)))
      throw new UsikkertCatendautfall('Catenda svarte ikke');
    throw new CatendaUtilgjengelig('Catenda svarte ikke');
  }
  if (svar.status !== 200 && !(endring && svar.status === 201)) {
    await svar.body?.cancel().catch(() => {});
    const melding = `Catenda svarte med status ${svar.status}`;
    if (endring && !avvistUtenEndring(svar.status)) throw new UsikkertCatendautfall(melding);
    if (varigAvvist(svar.status)) throw new CatendaAvvisning(svar.status);
    if (svar.status === 401) throw new CatendaUautorisert(melding);
    throw new CatendaUtilgjengelig(melding);
  }
  try {
    return await svar.json();
  } catch {
    if (endring) throw new UsikkertCatendautfall('Catenda svarte med et ugyldig svar');
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
   * @throws UsikkertCatendautfall når topicen kan være laget; ellers CatendaUtilgjengelig
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
    return idFraSvar(svar, 'guid', 'Catenda svarte uten topic');
  }

  /** Dokumentet med navnet i mappen (eller roten av biblioteket), eller `null`. */
  async finnDokument(maal: Dokumentmaal, navn: string, token: string): Promise<string | null> {
    const rader = await this.samling(dokumentsti(maal), token, {
      scope: 'all',
      parentId: maal.folder_id ?? 'root',
    });
    const treff = rader.filter((rad) => rad.name === navn);
    if (treff.length > 1) throw new CatendaUtilgjengelig('Flere dokumenter har samme navn');
    return treff.length ? lestId(treff[0].id) : null;
  }

  /**
   * Laster opp dokumentet med `failOnDocumentExists` (B-03) og gir ID-en. `null` når
   * et dokument med navnet alt finnes.
   *
   * @throws UsikkertCatendautfall når dokumentet kan være lastet opp
   */
  async lastOppDokument(
    maal: Dokumentmaal,
    dokument: Brevdokument,
    token: string
  ): Promise<string | null> {
    const parametre = {
      name: dokument.navn,
      document: { type: 'file', filename: dokument.navn },
      failOnDocumentExists: true,
      ...(maal.folder_id ? { parentId: maal.folder_id } : {}),
    };
    let svar: unknown;
    try {
      svar = await forespoersel(this.#oppsett, 'POST', dokumentsti(maal), {
        token,
        fil: { innhold: dokument.innhold, hoder: { 'Bimsync-Params': JSON.stringify(parametre) } },
      });
    } catch (feil) {
      if (feil instanceof CatendaAvvisning && feil.status === 409) return null;
      throw feil;
    }
    const rad = Array.isArray(svar) && svar.length === 1 ? svar[0] : svar;
    return idFraSvar(rad, 'id', 'Catenda svarte uten dokument');
  }

  /** Dokumentene topicen viser til, med `document_guid` normalisert som `catendaId`. */
  async dokumentreferanser(boardId: string, topicId: string, token: string): Promise<Referanse[]> {
    const svar = await forespoersel(this.#oppsett, 'GET', referansesti(boardId, topicId), {
      token,
    });
    if (!Array.isArray(svar)) throw new CatendaUtilgjengelig('Ugyldige dokumentreferanser');
    return svar.map((rad) => {
      const dokumentId = erObjekt(rad) ? catendaId(rad.document_guid) : null;
      if (!erObjekt(rad) || !dokumentId)
        throw new CatendaUtilgjengelig('Ugyldig dokumentreferanse fra Catenda');
      return { id: lestId(rad.guid), dokumentId };
    });
  }

  /**
   * Setter referansen til dokumentet på topicen og gir referansens GUID.
   *
   * @throws UsikkertCatendautfall når referansen kan være laget
   */
  async opprettDokumentreferanse(
    boardId: string,
    topicId: string,
    dokumentId: string,
    token: string
  ): Promise<string> {
    const svar = await forespoersel(this.#oppsett, 'POST', referansesti(boardId, topicId), {
      token,
      json: { document_guid: dokumentId },
    });
    return idFraSvar(svar, 'guid', 'Catenda svarte uten dokumentreferanse');
  }
}

/** ID-en i svaret fra Catenda, høyst 100 tegn som kolonnene den kvitteres i. */
function idFraSvar(svar: unknown, felt: 'guid' | 'id', melding: string): string {
  const id = erObjekt(svar) ? svar[felt] : undefined;
  if (typeof id !== 'string' || !id || id.length > 100) throw new UsikkertCatendautfall(melding);
  return id;
}

/**
 * En ID som er lest fra Catenda og funnet igjen, med samme form som `idFraSvar` krever
 * av en ny, så kvitteringen ikke blir avvist (#783 punkt 3).
 */
function lestId(id: unknown): string {
  if (typeof id !== 'string' || !id || id.length > 100 || id.trim() !== id)
    throw new CatendaUtilgjengelig('Ugyldig ID fra Catenda');
  return id;
}

/** Biblioteket og mappen i det frosne leveringsmålet (LV-U1). */
export interface Dokumentmaal {
  catenda_project_id: string;
  library_id: string;
  folder_id: string | null;
}

export interface Brevdokument {
  navn: string;
  innhold: Uint8Array;
}

export interface Referanse {
  id: string;
  dokumentId: string;
}

function dokumentsti(maal: Dokumentmaal): string {
  if (!UUID.test(maal.catenda_project_id) || !UUID.test(maal.library_id))
    throw new RangeError('Ugyldig leveringsmål');
  if (maal.folder_id !== null && !UUID.test(maal.folder_id)) throw new RangeError('Ugyldig mappe');
  return `/v2/projects/${maal.catenda_project_id}/libraries/${maal.library_id}/items`;
}

function referansesti(boardId: string, topicId: string): string {
  if (!UUID.test(boardId)) throw new RangeError('Ugyldig board-ID');
  if (!/^[0-9a-zA-Z-]{1,100}$/.test(topicId)) throw new RangeError('Ugyldig topic-ID');
  return `/opencde/bcf/3.0/projects/${boardId}/topics/${topicId}/document_references`;
}

/** Typen topicen for en sak fra appen får (#741 punkt 15). */
export const TOPICTYPE = 'Krav om endringsordre';

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

  /** Forkaster tokenet når Catenda ikke godtok det, så neste kall henter et nytt. */
  forkast(token: string): void {
    if (this.#token === token) this.#token = null;
  }

  async token(): Promise<string> {
    if (this.#token && this.#naa() < this.#utloeper) return this.#token;
    this.#henter ??= this.#hent().finally(() => {
      this.#henter = null;
    });
    return this.#henter;
  }

  async #hent(): Promise<string> {
    let data: unknown;
    try {
      data = await forespoersel(this.#oppsett, 'POST', '/oauth2/token', {
        skjema: {
          grant_type: 'client_credentials',
          client_id: this.#oppsett.klientId,
          client_secret: this.#oppsett.klienthemmelighet,
        },
      });
    } catch (feil) {
      // Et avvist tokenkall gjelder oppsettet, ikke jobben som ba om tokenet (#778).
      if (feil instanceof CatendaAvvisning || feil instanceof CatendaUautorisert)
        throw new CatendaOppsettfeil('Catenda avviste tokenkallet til integrasjonen');
      throw feil;
    }
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

/** Integrasjonsnøkkelen og klienten, slik leverandørene under tar dem imot. */
interface Integrasjon {
  oauth: CatendaOAuth;
  integrasjonsnokkel: Integrasjonsnokkel;
}

/** Kallet med integrasjonens token. Et token Catenda ikke godtar, forkastes (#783 punkt 5). */
async function medToken<T>(catenda: Integrasjon, kall: (token: string) => Promise<T>): Promise<T> {
  const token = await catenda.integrasjonsnokkel.token();
  try {
    return await kall(token);
  } catch (feil) {
    if (feil instanceof CatendaUautorisert) catenda.integrasjonsnokkel.forkast(token);
    throw feil;
  }
}

/** Topicene for sakene fra appen lages av integrasjonen, med dens eget token (#741 punkt 16). */
export function topicoppretter(catenda: Integrasjon): Topicoppretter {
  return {
    opprettTopic: (boardId, topic) =>
      medToken(catenda, (t) => catenda.oauth.opprettTopic(boardId, topic, t)),
  };
}

export interface Topicoppretter {
  opprettTopic(boardId: string, topic: NyTopic): Promise<string>;
}

/** Brevet og vedleggene som dokumenter i biblioteket, med referansene på topicen (B-03, #371, #790). */
export interface Dokumentleverandoer {
  finnDokument(maal: Dokumentmaal, navn: string): Promise<string | null>;
  lastOppDokument(maal: Dokumentmaal, dokument: Brevdokument): Promise<string | null>;
  dokumentreferanser(boardId: string, topicId: string): Promise<Referanse[]>;
  opprettDokumentreferanse(boardId: string, topicId: string, dokumentId: string): Promise<string>;
}

/** Leveringen gjøres av integrasjonen, med dens eget token, som topicen. */
export function dokumentleverandoer(catenda: Integrasjon): Dokumentleverandoer {
  return {
    finnDokument: (maal, navn) =>
      medToken(catenda, (t) => catenda.oauth.finnDokument(maal, navn, t)),
    lastOppDokument: (maal, dokument) =>
      medToken(catenda, (t) => catenda.oauth.lastOppDokument(maal, dokument, t)),
    dokumentreferanser: (board, topic) =>
      medToken(catenda, (t) => catenda.oauth.dokumentreferanser(board, topic, t)),
    opprettDokumentreferanse: (board, topic, dokument) =>
      medToken(catenda, (t) => catenda.oauth.opprettDokumentreferanse(board, topic, dokument, t)),
  };
}

/** Medlemmene og teamene for tilgangskontrollen, med integrasjonens eget token. */
export function integrasjonen(catenda: Integrasjon): Catenda {
  return {
    medlemmer: (catendaProsjektId) =>
      medToken(catenda, (t) => catenda.oauth.medlemmer(catendaProsjektId, t)),
    teammedlemmer: (catendaProsjektId, teamId) =>
      medToken(catenda, (t) => catenda.oauth.teammedlemmer(catendaProsjektId, teamId, t)),
  };
}
