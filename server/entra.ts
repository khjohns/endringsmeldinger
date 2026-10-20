/**
 * Innloggingen med Entra ID (S-1c del 1, #831): OIDC med autorisasjonskode, PKCE
 * (S256) og nonce. ID-tokenet valideres mot nøklene fra JWKS: signaturen med RS256,
 * `aud` lik klient-ID-en, tidene, nonce og issueren i v2-formen for tenanten i
 * `tid`. Subjektet er `oid`, som er det samme for alle apper i tenanten; `sub` er
 * forskjellig per app. Om tenanten er godkjent, avgjør `koe_api.entra_identitet`.
 *
 * Påstandene i tokenet ut over identiteten, som roller og grupper, leses ikke:
 * Entra-sesjonen gir ingen prosjekttilgang (GFK-U5).
 *
 * Verifieren og nonce avledes av nettlesertokenet i innloggingskapselen, så basen
 * fortsatt bare har hashen av det. Et forsøk brukes én gang, så en nonce kan ikke
 * godtas to ganger.
 *
 * Kode, token og feil fra Entra når aldri loggen, svaret eller adressen.
 */

import { createHash } from 'node:crypto';

import { createRemoteJWKSet, jwtVerify, type JWTPayload, type JWTVerifyGetKey } from 'jose';

import { sql, utenKontekst, type Pool } from './datalag.ts';

export interface EntraOppsett {
  klientId: string;
  klienthemmelighet: string;
  tilbakekallsadresse: string;
  /** `https://login.microsoftonline.com/{tenant eller organizations}`, uten `/` til slutt. */
  autoritet: string;
  /** Nøklene ID-tokenet signeres med. Uten dem hentes JWKS fra autoriteten. */
  noekler?: JWTVerifyGetKey;
  tidsavbruddMs?: number;
}

/** Identiteten fra et gyldig ID-token, med issueren og subjektet i formen basen krever. */
export interface EntraBruker {
  issuer: string;
  subjekt: string;
  epost: string;
  navn: string;
}

/** Entra svarte ikke, eller med noe annet enn et ID-token. */
export class EntraUtilgjengelig extends Error {}

/** ID-tokenet er ugyldig, eller hører ikke til dette forsøket. */
export class UgyldigIdToken extends Error {}

const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const SLINGRINGSMONN = 60;

export const entraIssuer = (tenant: string) => `https://login.microsoftonline.com/${tenant}/v2.0`;

const avled = (formaal: string, nettleser: string) =>
  createHash('sha256').update(`${formaal}\0${nettleser}`).digest('base64url');

export const pkceVerifier = (nettleser: string) => avled('entra-pkce', nettleser);
export const entraNonce = (nettleser: string) => avled('entra-nonce', nettleser);

const tekst = (verdi: unknown) => (typeof verdi === 'string' ? verdi : '');

export class EntraOIDC {
  readonly #oppsett: EntraOppsett;
  readonly #noekler: JWTVerifyGetKey;

  constructor(oppsett: EntraOppsett) {
    this.#oppsett = oppsett;
    this.#noekler =
      oppsett.noekler ??
      createRemoteJWKSet(new URL(`${oppsett.autoritet}/discovery/v2.0/keys`), {
        timeoutDuration: oppsett.tidsavbruddMs ?? 15_000,
      });
  }

  /** Lenken til Entra for forsøket med `state`, bundet til nettlesertokenet. */
  autorisasjonsadresse(state: string, nettleser: string): string {
    const utfordring = createHash('sha256').update(pkceVerifier(nettleser)).digest('base64url');
    const parametre = new URLSearchParams({
      client_id: this.#oppsett.klientId,
      redirect_uri: this.#oppsett.tilbakekallsadresse,
      response_type: 'code',
      response_mode: 'query',
      scope: 'openid profile email',
      state,
      nonce: entraNonce(nettleser),
      code_challenge: utfordring,
      code_challenge_method: 'S256',
    });
    return `${this.#oppsett.autoritet}/oauth2/v2.0/authorize?${parametre}`;
  }

  /** Bytter koden mot ID-tokenet. Tilgangstokenet brukes ikke. */
  async byttKode(kode: string, nettleser: string): Promise<string> {
    let svar: Response;
    try {
      svar = await fetch(`${this.#oppsett.autoritet}/oauth2/v2.0/token`, {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body: new URLSearchParams({
          client_id: this.#oppsett.klientId,
          client_secret: this.#oppsett.klienthemmelighet,
          redirect_uri: this.#oppsett.tilbakekallsadresse,
          grant_type: 'authorization_code',
          code: kode,
          code_verifier: pkceVerifier(nettleser),
        }),
        redirect: 'manual',
        signal: AbortSignal.timeout(this.#oppsett.tidsavbruddMs ?? 15_000),
      });
    } catch {
      throw new EntraUtilgjengelig('Entra svarte ikke');
    }
    if (svar.status !== 200) {
      await svar.body?.cancel().catch(() => {});
      throw new EntraUtilgjengelig(`Entra svarte med status ${svar.status}`);
    }
    const data: unknown = await svar.json().catch(() => null);
    const idToken = (data as { id_token?: unknown } | null)?.id_token;
    if (typeof idToken !== 'string' || !idToken)
      throw new EntraUtilgjengelig('Entra svarte uten ID-token');
    return idToken;
  }

  /** Identiteten i ID-tokenet, når det er gyldig for forsøket med nettlesertokenet. */
  async valider(idToken: string, nettleser: string, naa: Date): Promise<EntraBruker> {
    let innhold: JWTPayload;
    try {
      ({ payload: innhold } = await jwtVerify(idToken, this.#noekler, {
        algorithms: ['RS256'],
        audience: this.#oppsett.klientId,
        currentDate: naa,
        clockTolerance: SLINGRINGSMONN,
        requiredClaims: ['iss', 'aud', 'exp', 'iat', 'nbf', 'nonce', 'tid', 'oid'],
      }));
    } catch (feil) {
      throw new UgyldigIdToken('ID-tokenet er ugyldig', { cause: feil });
    }
    const { tid, oid, nonce, aud, iss, ver } = innhold as Record<string, unknown>;
    if (typeof aud !== 'string') throw new UgyldigIdToken('ID-tokenet har flere mottakere');
    if (ver !== '2.0') throw new UgyldigIdToken('ID-tokenet er ikke i v2-formen');
    if (typeof tid !== 'string' || !GUID.test(tid) || iss !== entraIssuer(tid))
      throw new UgyldigIdToken('Issueren stemmer ikke med tenanten');
    if (typeof oid !== 'string' || !GUID.test(oid))
      throw new UgyldigIdToken('ID-tokenet har ingen oid');
    if (nonce !== entraNonce(nettleser)) throw new UgyldigIdToken('Nonce hører ikke til forsøket');
    return { issuer: iss, subjekt: oid, epost: tekst(innhold.email), navn: tekst(innhold.name) };
  }
}

/** `app_users.id` for Entra-identiteten. Basen avviser en tenant som ikke er godkjent. */
export async function entraIdentitet(pool: Pool, bruker: EntraBruker): Promise<string> {
  const svar = await utenKontekst(pool)
    .input('issuer', sql.NVarChar(400), bruker.issuer)
    .input('subjekt', sql.NVarChar(400), bruker.subjekt)
    .input('epost', sql.NVarChar(320), bruker.epost)
    .input('navn', sql.NVarChar(400), bruker.navn)
    .output('bruker', sql.UniqueIdentifier)
    .execute('koe_api.entra_identitet');
  const id = svar.output.bruker;
  if (typeof id !== 'string' || !id) throw new Error('Identiteten ble ikke avgjort');
  return id.toLowerCase();
}

/** Entra-innloggingen fra miljøet, eller `null` når den ikke er satt opp. */
export function entraFraMiljoe(miljoe: NodeJS.ProcessEnv): EntraOIDC | null {
  const {
    ENTRA_CLIENT_ID: klientId,
    ENTRA_CLIENT_SECRET: klienthemmelighet,
    ENTRA_REDIRECT_URI: tilbakekallsadresse,
    ENTRA_AUTHORITY: autoritet,
  } = miljoe;
  if (!klientId && !klienthemmelighet && !tilbakekallsadresse && !autoritet) return null;
  if (!klientId || !klienthemmelighet || !tilbakekallsadresse || !autoritet)
    throw new Error('Entra-innloggingen mangler oppsett');
  return new EntraOIDC({ klientId, klienthemmelighet, tilbakekallsadresse, autoritet });
}
