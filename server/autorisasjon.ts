/**
 * Tilgangskontrollen i samme rekkefølge og med samme svar som Flask, mot
 * SQL Server (#658):
 * - `require_auth` (`lib/auth/session.py`): sesjonen med `koe_api.les_sesjon`,
 *   og CSRF inne i autentiseringen;
 * - `require_project_access` (`lib/auth/project_access.py`): koblingen med
 *   `koe_api.prosjektkobling`, alderen på medlemslisten, ferskt medlemskap med
 *   `koe_api.prosjektmedlemskap`, `prosjekt_id` i nyttelasten og hver sak det
 *   vises til i `koe.sak_metadata`, lest under radsikkerheten;
 * - `require_contract_role` (`lib/auth/contract_role.py`) og
 *   `AuthService.contract_membership`: kontraktssiden fra
 *   `koe_api.kontraktsteam` og teammedlemskapet i Catenda.
 *
 * Catenda står bak grensesnittet `Catenda`. Er medlemslisten ikke fersk, hentes
 * den på nytt fra Catenda-prosjektet i koblingen kontrollen alt har lest
 * (`synkroniserKobling()`); feiler det, nektes tilgangen med 503, som i Python.
 */

import { timingSafeEqual } from 'node:crypto';
import type { IncomingMessage } from 'node:http';
import type { Part as Rolle } from '../kjerne/typer.ts';
import type { Bruker } from './bruker.ts';
import { sql, transaksjon, utenKontekst, type Pool } from './datalag.ts';
import { loggFeil } from './inngang.ts';
import {
  oversett,
  prosjektkobling,
  synkroniserKobling,
  type Medlem,
  type Synkronisering,
} from './medlemskap.ts';
import { lesSesjon, type Sesjon } from './sesjon.ts';

export { sha256, type Bruker } from './bruker.ts';

export interface Catenda {
  /** Medlemmene i Catenda-prosjektet, hentet med integrasjonens eget token (`AuthService.sync`). */
  medlemmer(catendaProsjektId: string): Promise<Medlem[]>;
  /** Subjektene i et Catenda-team. */
  teammedlemmer(catendaProsjektId: string, teamId: string): Promise<Set<string>>;
}

/** Et svar som avslutter forespørselen før ruta. */
export class Nektet extends Error {
  readonly status: number;
  readonly kropp: Record<string, unknown>;

  constructor(status: number, error: string, message: string) {
    super(message);
    this.status = status;
    this.kropp = { success: false, error, message };
  }
}

const PROSJEKTROLLER: Record<string, number> = { viewer: 0, member: 1, admin: 2 };

/** `catenda_id` i `lib/auth/domain.py`: UUID-en som 32 små heksadesimaler, ellers `null`. */
export function catendaId(verdi: unknown): string | null {
  if (typeof verdi !== 'string') return null;
  const hex = verdi
    .trim()
    .toLowerCase()
    .replace(/^urn:uuid:/, '')
    .replace(/^\{(.*)\}$/, '$1')
    .replaceAll('-', '');
  return /^[0-9a-f]{32}$/.test(hex) ? hex : null;
}

export function informasjonskapsel(foresporsel: IncomingMessage, navn: string): string {
  for (const del of (foresporsel.headers.cookie ?? '').split(';')) {
    const [nokkel, ...verdi] = del.trim().split('=');
    if (nokkel !== navn) continue;
    try {
      return decodeURIComponent(verdi.join('='));
    } catch {
      return '';
    }
  }
  return '';
}

export const sesjonsnavn = () =>
  process.env.APP_ENV === 'development' ? 'koe_session' : '__Host-koe_session';

function like(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/** `require_auth`, med sesjonen og kapselverdien for inngangene som trenger dem. */
export async function krevSesjon(
  db: Pool,
  foresporsel: IncomingMessage
): Promise<{ sesjon: Sesjon; token: string }> {
  const token = informasjonskapsel(foresporsel, sesjonsnavn());
  let sesjon: Sesjon | null = null;
  try {
    if (token) sesjon = await lesSesjon(db, token);
  } catch {
    throw new Nektet(503, 'AUTH_UNAVAILABLE', 'Innlogging er midlertidig utilgjengelig.');
  }
  if (!sesjon) throw new Nektet(401, 'UNAUTHORIZED', 'Du må logge inn.');
  // Inne i autentiseringen, som i Flask: en utlogget bruker skal få 401, ikke 403.
  const metode = foresporsel.method ?? 'GET';
  const csrf = foresporsel.headers['x-csrf-token'];
  if (
    !['GET', 'HEAD', 'OPTIONS'].includes(metode) &&
    !(typeof csrf === 'string' && csrf && like(csrf, sesjon.csrfToken))
  ) {
    throw new Nektet(403, 'CSRF validation failed', 'Prøv igjen.');
  }
  return { sesjon, token };
}

/** `require_auth`. */
export async function krevInnlogging(db: Pool, foresporsel: IncomingMessage): Promise<Bruker> {
  return (await krevSesjon(db, foresporsel)).sesjon.bruker;
}

interface Medlemskap {
  rolle: string;
  leserolle: boolean;
  /** I `catendaId()`-formen. */
  subjekt: string;
}

interface Prosjektoppsett {
  catendaProsjekt: string;
}

/** Synkroniseringen uten tidspunktet for hentingen, som blir her (#638 punkt 2). */
export type Synkroniseringsutfall = Omit<Synkronisering, 'hentet'>;

export interface Prosjekttilgang {
  prosjektId: string;
  /** `app_users.id` for brukeren tilgangen er avgjort for. */
  aktor: string;
  rolle: string;
  oppsett: Prosjektoppsett;
  medlemskap: Medlemskap;
  /**
   * Synkroniseringen denne forespørselen gjorde fordi listen var for gammel, så
   * en inngang som selv synkroniserer, ikke henter på nytt (#825 punkt 7).
   * Fraværende når listen var fersk, eller når forespørselen ventet på en
   * henting en annen hadde startet.
   */
  synkronisert?: Synkroniseringsutfall;
}

const ENKELTREFERANSER = new Set(['sak_id', 'sakId', 'koe_sak_id', 'relatert_sak_id']);
const FLERREFERANSER = new Set([
  'koe_sak_ids',
  'avslatte_sak_ids',
  'avslatte_fristkrav',
  'relaterte_koe_saker',
]);

/** `referenced_case_ids`: sakene en nyttelast viser til, på alle nivåer. */
export function sakerDetVisesTil(verdi: unknown): Set<string> {
  const saker = new Set<string>();
  // Uten rekursjon, så en dypt nestet nyttelast ikke sprenger stakken.
  const igjen = [verdi];
  while (igjen.length) {
    const v = igjen.pop();
    if (Array.isArray(v)) {
      igjen.push(...v);
    } else if (typeof v === 'object' && v !== null) {
      for (const [nokkel, del] of Object.entries(v)) {
        if (ENKELTREFERANSER.has(nokkel) && del !== null && del !== undefined) {
          if (typeof del !== 'string') throw new Error('Ugyldig saksreferanse');
          saker.add(del);
        } else if (FLERREFERANSER.has(nokkel)) {
          if (!Array.isArray(del) || del.some((s) => typeof s !== 'string'))
            throw new Error('Ugyldige saksreferanser');
          for (const s of del) saker.add(s);
        } else if (typeof del === 'object' && del !== null) {
          igjen.push(del);
        }
      }
    }
  }
  return saker;
}

function medlemskapsalder(): number {
  const sekunder = Number(process.env.AUTH_MEMBERSHIP_MAX_AGE_SECONDS ?? '900');
  if (!(sekunder >= 60 && sekunder <= 3600))
    throw new Error('Membership cache lifetime must be 60–3600 seconds');
  return sekunder;
}

async function prosjektoppsett(db: Pool, prosjektId: string): Promise<Prosjektoppsett | null> {
  const catendaProsjekt = await prosjektkobling(db, prosjektId);
  return catendaProsjekt ? { catendaProsjekt } : null;
}

/**
 * Når listen for prosjektet ble hentet, og alderen i sekunder etter basens klokke,
 * minst 0 (B-04 punkt 4). `null` når ingen liste fra det koblede Catenda-prosjektet
 * er skrevet. Bare tilgangskontrollen leser den, etter at koblingen er
 * kontrollert (#638 punkt 2); eksportert for testene.
 *
 * @throws UgyldigProsjekt
 */
export async function medlemslistensAlder(
  pool: Pool,
  prosjekt: string
): Promise<{ hentet: Date; alderSekunder: number } | null> {
  try {
    const svar = await utenKontekst(pool)
      .input('prosjekt', sql.NVarChar(4000), prosjekt)
      .execute<{ hentet: Date; alder_sekunder: string | number }>('koe_api.medlemsliste_alder');
    const rad = svar.recordset[0];
    return rad ? { hentet: rad.hentet, alderSekunder: Number(rad.alder_sekunder) } : null;
  } catch (feil) {
    throw oversett(feil);
  }
}

/** Hentingene fra Catenda som pågår, per base og kobling, så samtidige forespørsler deler én (#726 punkt 3). */
const hentinger = new WeakMap<Pool, Map<string, Promise<Synkronisering>>>();

/**
 * `AuthService.ensure_fresh` for et registrert prosjekt: synkroniser når listen
 * fra det koblede Catenda-prosjektet mangler eller er for gammel. Alderen røper
 * om prosjektet er koblet og når listen ble hentet, så den leses bare her, før
 * medlemskapet er avgjort, og gis aldri videre (#638 punkt 2).
 *
 * `catendaProsjekt` er koblingen tilgangskontrollen alt har lest, så listen og
 * teamene kommer fra samme Catenda-prosjekt (#726 punkt 2). Etter
 * synkroniseringen godtas listen når den er hentet samtidig med eller etter
 * hentingen det ble ventet på, uansett hvor lenge hentingen og låsen tok
 * (#858 punkt 1). Er det ingen slik liste, kaster den, også når en annen skrev
 * først (#707, kommentar a).
 *
 * Returnerer synkroniseringen, uten `hentet`, når denne forespørselen startet
 * den, ellers `null`.
 */
async function oppdaterMedlemslisten(
  db: Pool,
  catenda: Catenda,
  prosjekt: string,
  catendaProsjekt: string
): Promise<Synkroniseringsutfall | null> {
  const sist = await medlemslistensAlder(db, prosjekt);
  if (sist !== null && sist.alderSekunder < medlemskapsalder()) return null;
  let iBasen = hentinger.get(db);
  if (!iBasen) hentinger.set(db, (iBasen = new Map()));
  const noekkel = JSON.stringify([prosjekt, catendaProsjekt]);
  let henting = iBasen.get(noekkel);
  const egen = !henting;
  if (!henting) {
    const paagaar = iBasen;
    henting = synkroniserKobling(db, { prosjekt, catendaProsjekt }, (c) =>
      catenda.medlemmer(c)
    ).finally(() => paagaar.delete(noekkel));
    iBasen.set(noekkel, henting);
  }
  const synkronisering = await henting;
  const etter = await medlemslistensAlder(db, prosjekt);
  if (etter === null || etter.hentet.getTime() < synkronisering.hentet.getTime())
    throw new Error('Medlemslisten er ikke fersk etter synkroniseringen');
  if (!egen) return null;
  const { skrevet, medlemmer, deaktivert } = synkronisering;
  return { skrevet, medlemmer, deaktivert };
}

/** Som `oppdaterMedlemslisten()`, med koblingen lest her. */
async function ferskeMedlemmer(db: Pool, catenda: Catenda, prosjektId: string): Promise<void> {
  const oppsett = await prosjektoppsett(db, prosjektId);
  if (!oppsett) throw new Error('Prosjektet har ingen aktiv kobling');
  await oppdaterMedlemslisten(db, catenda, prosjektId, oppsett.catendaProsjekt);
}

/**
 * `ferskeMedlemmer()` for hvert av prosjektene, samtidig. For lista over brukerens
 * prosjekter (#724 punkt 3 og 5).
 */
export async function ferskeProsjekter(
  db: Pool,
  catenda: Catenda,
  prosjekter: string[]
): Promise<void> {
  await Promise.all(prosjekter.map((p) => ferskeMedlemmer(db, catenda, p)));
}

/** Prosjekt-ID-en slik basen har den: SQL Server ser bort fra mellomrom til slutt. */
const gyldigProsjektId = (id: string) => id.trim() === id && id.length <= 100;

/** Sakene blant `saker` som er i prosjektet, lest under radsikkerheten med aktøren og prosjektet i konteksten. */
async function sakerIProsjektet(
  db: Pool,
  bruker: Bruker,
  prosjektId: string,
  saker: Set<string>
): Promise<Set<string>> {
  if (!saker.size) return new Set();
  const rader = await transaksjon(db, { aktor: bruker.id, prosjekt: prosjektId }, (foresp) =>
    foresp()
      .input('saker', sql.NVarChar(sql.MAX), JSON.stringify([...saker]))
      .query<{ sak_id: string; prosjekt_id: string }>(
        `SELECT s.sak_id, s.prosjekt_id FROM koe.sak_metadata s
          WHERE s.sak_id IN (SELECT [value] FROM OPENJSON(@saker))`
      )
  );
  return new Set(
    rader.recordset
      .filter((r) => r.prosjekt_id === prosjektId && saker.has(r.sak_id))
      .map((r) => r.sak_id)
  );
}

/** Stien har verken sak eller prosjekt, som opprettelsen av en sak. */
export const UTEN_STI = Object.freeze({ utenSti: true } as const);

/**
 * Saken eller prosjektet i URL-en, eller `UTEN_STI`. Et objekt med navngitte felt,
 * så kompilatoren fanger en ombytting (#763 punkt 4), og ingen tom verdi, så en
 * rute ikke slipper kontrollen av stien ved å utelate den (#763, 17.10).
 */
export type FraSti = { sakId: string } | { prosjektId: string } | typeof UTEN_STI;

/**
 * `require_project_access(min_role)`. `fraSti` er saken eller prosjektet i URL-en;
 * prosjektet må være prosjektet i `X-Project-ID`. `nyttelast` er JSON-kroppen,
 * eller `{}` uten kropp.
 */
export async function krevProsjekttilgang(
  db: Pool,
  catenda: Catenda,
  foresporsel: IncomingMessage,
  bruker: Bruker,
  minsteRolle: 'viewer' | 'member' | 'admin',
  nyttelast: unknown,
  fraSti: FraSti
): Promise<Prosjekttilgang> {
  const nekt = () => new Nektet(403, 'FORBIDDEN', 'Du har ikke tilgang.');
  const hode = foresporsel.headers['x-project-id'];
  const prosjektId = typeof hode === 'string' && hode ? hode : null;
  if (!prosjektId || !gyldigProsjektId(prosjektId)) throw nekt();
  // Ellers kunne stien vise et annet prosjekt enn det tilgangen er avgjort for (#724 punkt 1).
  if ('prosjektId' in fraSti && fraSti.prosjektId !== prosjektId) throw nekt();
  try {
    const oppsett = await prosjektoppsett(db, prosjektId);
    if (!oppsett) throw nekt();
    const synkronisert = await oppdaterMedlemslisten(
      db,
      catenda,
      prosjektId,
      oppsett.catendaProsjekt
    );
    const svar = await utenKontekst(db)
      .input('aktor', sql.UniqueIdentifier, bruker.id)
      .input('prosjekt', sql.NVarChar(4000), prosjektId)
      .execute<Medlemskap>('koe_api.prosjektmedlemskap');
    const medlemskap = svar.recordset[0];
    const rolle = medlemskap ? (medlemskap.leserolle ? 'viewer' : medlemskap.rolle) : null;
    if (rolle === null || !(rolle in PROSJEKTROLLER)) throw nekt();
    if (PROSJEKTROLLER[rolle] < PROSJEKTROLLER[minsteRolle]) throw nekt();
    if (typeof nyttelast !== 'object' || nyttelast === null || Array.isArray(nyttelast))
      throw nekt();
    const kropp = nyttelast as Record<string, unknown>;
    if (
      kropp.prosjekt_id !== undefined &&
      kropp.prosjekt_id !== null &&
      kropp.prosjekt_id !== prosjektId
    )
      throw nekt();
    const saker = sakerDetVisesTil(kropp);
    const hovedsak = ('sakId' in fraSti ? fraSti.sakId : null) ?? kropp.sak_id ?? kropp.sakId;
    if (typeof hovedsak === 'string' && hovedsak) saker.add(hovedsak);
    // Prosjektgrensen gjelder hver sak det vises til, også klientoppgitte relasjoner (RV-07).
    const iProsjektet = await sakerIProsjektet(db, bruker, prosjektId, saker);
    for (const sakId of saker) if (!iProsjektet.has(sakId)) throw nekt();
    return {
      prosjektId,
      aktor: bruker.id,
      rolle,
      oppsett,
      medlemskap: medlemskap!,
      ...(synkronisert ? { synkronisert } : {}),
    };
  } catch (feil) {
    if (feil instanceof Nektet) throw feil;
    // Som ruteren i `app.ts`: årsaken logges, svaret sier bare at tilgangen ikke kunne bekreftes (#867 punkt 1).
    loggFeil('Prosjekttilgangen kunne ikke avgjøres', feil);
    throw new Nektet(503, 'ACCESS_UNAVAILABLE', 'Tilgang kunne ikke bekreftes. Prøv igjen senere.');
  }
}

export interface Kontraktstilgang {
  rolle: Rolle;
  teamId: string | null;
}

/**
 * Siden og teamet med samme oppslag som `krevKontraktsrolle`, eller `null` uten
 * entydig side. For lesing, som ikke krever kontraktsrolle (#705).
 */
export async function lesKontraktsside(
  db: Pool,
  catenda: Catenda,
  tilgang: Prosjekttilgang
): Promise<Kontraktstilgang | null> {
  let funnet: [Rolle | null, string | null];
  try {
    funnet = await kontraktsside(db, catenda, tilgang);
  } catch {
    throw new Nektet(503, 'CONTRACT_ACCESS_UNAVAILABLE', 'Teamtilknytning kunne ikke bekreftes.');
  }
  const [rolle, teamId] = funnet;
  return rolle === 'TE' || rolle === 'BH' ? { rolle, teamId } : null;
}

/** `require_contract_role()` med `contract_membership`. Uten entydig side: 403. */
export async function krevKontraktsrolle(
  db: Pool,
  catenda: Catenda,
  tilgang: Prosjekttilgang
): Promise<Kontraktstilgang> {
  const side = await lesKontraktsside(db, catenda, tilgang);
  if (!side) {
    throw new Nektet(403, 'CONTRACT_ROLE_REQUIRED', 'Du har ikke nødvendig TE/BH-teamtilknytning.');
  }
  return side;
}

/**
 * Siden og teamet. Teamet er ett av prosjektets kontraktsteam på den siden
 * aktøren er på, og `null` når aktøren er med i flere av dem, så det kan
 * settes som `koe_team` (#53, DL-U4).
 */
async function kontraktsside(
  db: Pool,
  catenda: Catenda,
  { prosjektId, aktor, oppsett, medlemskap }: Prosjekttilgang
): Promise<[Rolle | null, string | null]> {
  if (medlemskap.leserolle) return [null, null];
  const subjekt = catendaId(medlemskap.subjekt);
  if (!subjekt) return [null, null];
  const svar = await utenKontekst(db)
    .input('aktor', sql.UniqueIdentifier, aktor)
    .input('prosjekt', sql.NVarChar(4000), prosjektId)
    .execute<{ team: string; side: Rolle }>('koe_api.kontraktsteam');
  const team: Record<Rolle, Set<string>> = { TE: new Set(), BH: new Set() };
  for (const rad of svar.recordset) {
    const id = catendaId(rad.team);
    if (id && rad.side in team) team[rad.side].add(id);
  }
  if (!team.TE.size || !team.BH.size || [...team.TE].some((t) => team.BH.has(t)))
    return [null, null];
  // Teamene slås opp samtidig (#716 punkt 5).
  const oppslag = (['TE', 'BH'] as const).flatMap((rolle) =>
    [...team[rolle]].map(async (teamId): Promise<[Rolle, string] | null> => {
      const medlemmer = await catenda.teammedlemmer(oppsett.catendaProsjekt, teamId);
      return [...medlemmer].map(catendaId).includes(subjekt) ? [rolle, teamId] : null;
    })
  );
  const treff = (await Promise.all(oppslag)).filter((t) => t !== null);
  const roller = new Set(treff.map(([r]) => r));
  if (roller.size !== 1) return [null, null];
  const lag = new Set(treff.map(([, t]) => t));
  return [[...roller][0], lag.size === 1 ? [...lag][0] : null];
}
