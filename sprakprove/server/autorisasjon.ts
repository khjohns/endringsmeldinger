/**
 * Tilgangskontrollen i samme rekkefølge og med samme svar som Flask:
 * - `require_auth` (`lib/auth/session.py`): sesjonen i `app_sessions`, og CSRF
 *   inne i autentiseringen;
 * - `require_project_access` (`lib/auth/project_access.py`): ferskt medlemskap
 *   i `app_project_memberships`, `prosjekt_id` i nyttelasten og hver sak det
 *   vises til i `sak_metadata`;
 * - `require_contract_role` (`lib/auth/contract_role.py`) og
 *   `AuthService.contract_membership`: kontraktssiden fra
 *   `catenda_contract_teams` og teammedlemskapet i Catenda.
 *
 * Catenda er utenfor prøven og står bak grensesnittet `Catenda`. Et medlemskap
 * som ikke er ferskt, krever synkronisering mot Catenda; uten den nektes
 * tilgangen med 503, som når Catenda er nede.
 */

import { createHash, timingSafeEqual } from 'node:crypto';
import type { IncomingMessage } from 'node:http';
import type { ClientBase, Pool } from 'pg';

type Klient = Pool | ClientBase;
import type { Rolle } from '../kjerne/typer.ts';

export interface Bruker {
  id: string;
  email: string;
  name: string;
}

export interface Catenda {
  /** `AuthService.sync`: medlemmene i prosjektet hentes på nytt. */
  synkroniser(prosjektId: string): Promise<void>;
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

export function sha256(tekst: string): string {
  return createHash('sha256').update(tekst).digest('hex');
}

function informasjonskapsel(foresporsel: IncomingMessage, navn: string): string {
  for (const del of (foresporsel.headers.cookie ?? '').split(';')) {
    const [nokkel, ...verdi] = del.trim().split('=');
    if (nokkel === navn) return decodeURIComponent(verdi.join('='));
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

/** `require_auth`. */
export async function krevInnlogging(db: Klient, foresporsel: IncomingMessage): Promise<Bruker> {
  const token = informasjonskapsel(foresporsel, sesjonsnavn());
  let sesjon: { csrf_token: string; id: string; email: string; name: string } | undefined;
  try {
    if (token) {
      const svar = await db.query<{ csrf_token: string; id: string; email: string; name: string }>(
        `SELECT s.csrf_token, u.id::text AS id, u.email, u.name
           FROM app_sessions s JOIN app_users u ON u.id = s.user_id
          WHERE s.token_hash = $1 AND s.expires_at > now() LIMIT 1`,
        [sha256(token)]
      );
      sesjon = svar.rows[0];
    }
  } catch {
    throw new Nektet(503, 'AUTH_UNAVAILABLE', 'Innlogging er midlertidig utilgjengelig.');
  }
  if (!sesjon) throw new Nektet(401, 'UNAUTHORIZED', 'Du må logge inn.');
  // Inne i autentiseringen, som i Flask: en utlogget bruker skal få 401, ikke 403.
  const metode = foresporsel.method ?? 'GET';
  const csrf = foresporsel.headers['x-csrf-token'];
  if (
    !['GET', 'HEAD', 'OPTIONS'].includes(metode) &&
    !(typeof csrf === 'string' && csrf && like(csrf, sesjon.csrf_token))
  ) {
    throw new Nektet(403, 'CSRF validation failed', 'Prøv igjen.');
  }
  return { id: sesjon.id, email: sesjon.email, name: sesjon.name };
}

interface Medlemskap {
  role: string;
  viewer_override: boolean;
  active: boolean;
  catenda_subject: string;
}

interface Prosjektoppsett {
  catenda_project_id: string;
}

export interface Prosjekttilgang {
  prosjektId: string;
  rolle: string;
  oppsett: Prosjektoppsett;
  medlemskap: Medlemskap;
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
  if (Array.isArray(verdi)) {
    for (const del of verdi) for (const s of sakerDetVisesTil(del)) saker.add(s);
  } else if (typeof verdi === 'object' && verdi !== null) {
    for (const [nokkel, del] of Object.entries(verdi)) {
      if (ENKELTREFERANSER.has(nokkel) && del !== null && del !== undefined) {
        if (typeof del !== 'string') throw new Error('Ugyldig saksreferanse');
        saker.add(del);
      } else if (FLERREFERANSER.has(nokkel)) {
        if (!Array.isArray(del) || del.some((s) => typeof s !== 'string'))
          throw new Error('Ugyldige saksreferanser');
        for (const s of del) saker.add(s);
      } else if (typeof del === 'object' && del !== null) {
        for (const s of sakerDetVisesTil(del)) saker.add(s);
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

async function prosjektoppsett(db: Klient, prosjektId: string): Promise<Prosjektoppsett | null> {
  const svar = await db.query<Prosjektoppsett>(
    `SELECT catenda_project_id::text AS catenda_project_id FROM catenda_project_configs
      WHERE internal_project_id = $1 AND is_active LIMIT 1`,
    [prosjektId]
  );
  return svar.rows[0] ?? null;
}

/** `AuthService.ensure_fresh` for et registrert prosjekt: synkroniser når medlemskapet er for gammelt. */
async function ferskeMedlemmer(
  db: Klient,
  catenda: Catenda,
  prosjektId: string,
  oppsett: Prosjektoppsett
): Promise<void> {
  const svar = await db.query<{ catenda_project_id: string; alder: number }>(
    `SELECT catenda_project_id::text AS catenda_project_id,
            extract(epoch FROM now() - synced_at)::float8 AS alder
       FROM app_membership_sync WHERE project_id = $1 LIMIT 1`,
    [prosjektId]
  );
  const sist = svar.rows[0];
  const fersk =
    sist !== undefined &&
    catendaId(sist.catenda_project_id) === catendaId(oppsett.catenda_project_id) &&
    sist.alder >= 0 &&
    sist.alder < medlemskapsalder();
  if (!fersk) await catenda.synkroniser(prosjektId);
}

/**
 * `require_project_access(min_role)`. `sakIdFraSti` er saken i URL-en;
 * `nyttelast` er JSON-kroppen, eller `{}` uten kropp.
 */
export async function krevProsjekttilgang(
  db: Klient,
  catenda: Catenda,
  foresporsel: IncomingMessage,
  bruker: Bruker,
  minsteRolle: 'viewer' | 'member' | 'admin',
  nyttelast: unknown,
  sakIdFraSti: string | null = null
): Promise<Prosjekttilgang> {
  const nekt = () => new Nektet(403, 'FORBIDDEN', 'Du har ikke tilgang.');
  const hode = foresporsel.headers['x-project-id'];
  const prosjektId = typeof hode === 'string' && hode ? hode : null;
  if (!prosjektId) throw nekt();
  try {
    const oppsett = await prosjektoppsett(db, prosjektId);
    if (!oppsett) throw nekt();
    await ferskeMedlemmer(db, catenda, prosjektId, oppsett);
    const svar = await db.query<Medlemskap>(
      `SELECT role, viewer_override, active, catenda_subject FROM app_project_memberships
        WHERE project_id = $1 AND user_id = $2 AND active LIMIT 1`,
      [prosjektId, bruker.id]
    );
    const medlemskap = svar.rows[0];
    const rolle = medlemskap ? (medlemskap.viewer_override ? 'viewer' : medlemskap.role) : null;
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
    const hovedsak = sakIdFraSti ?? kropp.sak_id ?? kropp.sakId;
    if (typeof hovedsak === 'string' && hovedsak) saker.add(hovedsak);
    // Prosjektgrensen gjelder hver sak det vises til, også klientoppgitte relasjoner (RV-07).
    for (const sakId of saker) {
      const sak = await db.query<{ prosjekt_id: string }>(
        'SELECT prosjekt_id FROM sak_metadata WHERE sak_id = $1',
        [sakId]
      );
      if (sak.rows[0]?.prosjekt_id !== prosjektId) throw nekt();
    }
    return { prosjektId, rolle, oppsett, medlemskap: medlemskap! };
  } catch (feil) {
    if (feil instanceof Nektet) throw feil;
    throw new Nektet(503, 'ACCESS_UNAVAILABLE', 'Tilgang kunne ikke bekreftes. Prøv igjen senere.');
  }
}

export interface Kontraktstilgang {
  rolle: Rolle;
  teamId: string | null;
}

/** `require_contract_role()` med `contract_membership`. Uten entydig side: 403. */
export async function krevKontraktsrolle(
  db: Klient,
  catenda: Catenda,
  tilgang: Prosjekttilgang
): Promise<Kontraktstilgang> {
  let funnet: [Rolle | null, string | null];
  try {
    funnet = await kontraktsside(db, catenda, tilgang);
  } catch {
    throw new Nektet(503, 'CONTRACT_ACCESS_UNAVAILABLE', 'Teamtilknytning kunne ikke bekreftes.');
  }
  const [rolle, teamId] = funnet;
  if (rolle !== 'TE' && rolle !== 'BH') {
    throw new Nektet(403, 'CONTRACT_ROLE_REQUIRED', 'Du har ikke nødvendig TE/BH-teamtilknytning.');
  }
  return { rolle, teamId };
}

async function kontraktsside(
  db: Klient,
  catenda: Catenda,
  { prosjektId, oppsett, medlemskap }: Prosjekttilgang
): Promise<[Rolle | null, string | null]> {
  if (!medlemskap.active || medlemskap.viewer_override) return [null, null];
  const subjekt = catendaId(medlemskap.catenda_subject);
  if (!subjekt) return [null, null];
  const svar = await db.query<{ team_id: string; contract_role: Rolle }>(
    `SELECT team_id::text AS team_id, contract_role FROM catenda_contract_teams
      WHERE internal_project_id = $1`,
    [prosjektId]
  );
  const team: Record<Rolle, Set<string>> = { TE: new Set(), BH: new Set() };
  for (const rad of svar.rows) {
    const id = catendaId(rad.team_id);
    if (id && rad.contract_role in team) team[rad.contract_role].add(id);
  }
  if (!team.TE.size || !team.BH.size || [...team.TE].some((t) => team.BH.has(t)))
    return [null, null];
  const treff: [Rolle, string][] = [];
  for (const rolle of ['TE', 'BH'] as const) {
    for (const teamId of team[rolle]) {
      const medlemmer = await catenda.teammedlemmer(oppsett.catenda_project_id, teamId);
      if ([...medlemmer].map(catendaId).includes(subjekt)) treff.push([rolle, teamId]);
    }
  }
  const roller = new Set(treff.map(([r]) => r));
  if (roller.size !== 1) return [null, null];
  const lag = new Set(treff.map(([, t]) => t));
  return [[...roller][0], lag.size === 1 ? [...lag][0] : null];
}
