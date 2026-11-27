import { korrelasjonsId } from './logg.ts';
import type { Innloggingshendelse } from './tilgangslogg.ts';
/**
 * Sesjonen og innloggingsforsøket i SQL Server (B-19, #656), gjennom prosedyrene
 * i `koe_api` fra `database/migrasjoner/20261016190000_sesjon.sql`.
 * `bruk_innloggingsforsoek` er sist definert i `20261016233000_hashparametre.sql`
 * (#700), `slett_sesjon` i `20261119210000_tilgangslogg.sql` (#1804), og
 * `opprett_sesjon` og `les_sesjon` i `20261127100000_sesjonens_varighet.sql` (#1806).
 * Tokenene lages
 * her, som `secrets.token_urlsafe(32)` i Python, og basen får bare SHA-256 av
 * sesjonstokenet, staten og nettlesertokenet. Sesjonens levetid og tidsavbrudd er
 * konfigurasjon her (`sesjonsvarighet`); forsøkets levetid og klokka er basens.
 * Kallene er systemkall uten aktør og prosjektkontekst, så de går utenom
 * `transaksjon()`. Innloggingsinngangene i `innlogging.ts` oppretter og sletter
 * sesjonen (#659), og `autorisasjon.ts` leser den for hver inngang som krever den.
 */

import { randomBytes } from 'node:crypto';

import { sha256, type Bruker } from './bruker.ts';
import { feilnummer, sql, utenKontekst, type Pool } from './datalag.ts';

/** Basen avviste en hash, et CSRF-token eller en returadresse med feil form. */
export class UgyldigSesjonsdata extends Error {}

/** Brukeren sesjonen skulle opprettes for, finnes ikke i `koe.app_users`. */
export class UkjentBruker extends Error {}

const UGYLDIG_HASH = 52050;
const UKJENT_BRUKER = 52051;
const UGYLDIG_RETURSTI = 52052;
const UGYLDIG_CSRF = 52053;

function oversett(feil: unknown): unknown {
  const melding = (feil as Error)?.message ?? '';
  switch (feilnummer(feil)) {
    case UKJENT_BRUKER:
      return new UkjentBruker(melding, { cause: feil });
    case UGYLDIG_HASH:
    case UGYLDIG_RETURSTI:
    case UGYLDIG_CSRF:
      return new UgyldigSesjonsdata(melding, { cause: feil });
    default:
      return feil;
  }
}

async function kall<T>(arbeid: () => Promise<T>): Promise<T> {
  try {
    return await arbeid();
  } catch (feil) {
    throw oversett(feil);
  }
}

const token = () => randomBytes(32).toString('base64url');

/** Sesjonens levetid og tidsavbruddet ved inaktivitet, i sekunder (#1806). */
export interface Sesjonsvarighet {
  levetid: number;
  inaktivitet: number;
}

const STANDARD_LEVETID_MINUTTER = 8 * 60;
const STANDARD_INAKTIVITET_MINUTTER = 60;
const STOERSTE_LEVETID_MINUTTER = 24 * 60;

type Sesjonsvariabel = 'KOE_SESJON_LEVETID_MINUTTER' | 'KOE_SESJON_INAKTIVITET_MINUTTER';

/** Variabelen som har en ugyldig verdi, for oppstarten. */
export class UgyldigSesjonsvarighet extends Error {
  readonly variabel: Sesjonsvariabel;
  constructor(variabel: Sesjonsvariabel, melding: string) {
    super(`${variabel} ${melding}`);
    this.variabel = variabel;
  }
}

function minutter(miljoe: NodeJS.ProcessEnv, variabel: Sesjonsvariabel, standard: number): number {
  const verdi = miljoe[variabel] || String(standard);
  const tall = /^\d+$/.test(verdi) ? Number(verdi) : NaN;
  if (!(Number.isSafeInteger(tall) && tall >= 1 && tall <= STOERSTE_LEVETID_MINUTTER))
    throw new UgyldigSesjonsvarighet(
      variabel,
      `må være et heltall fra 1 til ${STOERSTE_LEVETID_MINUTTER} minutter`
    );
  return tall;
}

/**
 * `KOE_SESJON_LEVETID_MINUTTER` og `KOE_SESJON_INAKTIVITET_MINUTTER`, med 8 timer og 60
 * minutter, eller levetiden når den er kortere, når de mangler. Tidsavbruddet kan ikke være
 * lengre enn levetiden.
 */
export function sesjonsvarighet(miljoe: NodeJS.ProcessEnv = process.env): Sesjonsvarighet {
  const levetid = minutter(miljoe, 'KOE_SESJON_LEVETID_MINUTTER', STANDARD_LEVETID_MINUTTER);
  const inaktivitet = minutter(
    miljoe,
    'KOE_SESJON_INAKTIVITET_MINUTTER',
    Math.min(STANDARD_INAKTIVITET_MINUTTER, levetid)
  );
  if (inaktivitet > levetid)
    throw new UgyldigSesjonsvarighet(
      'KOE_SESJON_INAKTIVITET_MINUTTER',
      'kan ikke være lengre enn levetiden'
    );
  return { levetid: levetid * 60, inaktivitet: inaktivitet * 60 };
}

export interface NySesjon {
  /** Verdien i sesjonskapselen. Lagres ikke. */
  token: string;
  csrfToken: string;
  utloeper: Date;
}

export interface Sesjon {
  bruker: Bruker;
  csrfToken: string;
  utloeper: Date;
  /** Sekundene til `utloeper` etter basens klokke. */
  sekunderIgjen: number;
}

export async function opprettSesjon(
  pool: Pool,
  bruker: string,
  innlogging?: { hendelse: Innloggingshendelse; gammel: string }
): Promise<NySesjon> {
  const varighet = sesjonsvarighet();
  const ny = { token: token(), csrfToken: token() };
  const svar = await kall(() =>
    utenKontekst(pool)
      .input('token_hash', sql.NVarChar(4000), sha256(ny.token))
      .input('bruker', sql.UniqueIdentifier, bruker)
      .input('csrf_token', sql.NVarChar(4000), ny.csrfToken)
      .input('levetid', sql.Int, varighet.levetid)
      .input('inaktivitet', sql.Int, varighet.inaktivitet)
      .input('innlogging', sql.VarChar(40), innlogging?.hendelse ?? null)
      .input('gammel_hash', sql.NVarChar(64), innlogging?.gammel ? sha256(innlogging.gammel) : null)
      .input('korrelasjon', sql.UniqueIdentifier, korrelasjonsId() ?? null)
      .output('utloeper', sql.DateTime2(3))
      .execute('koe_api.opprett_sesjon')
  );
  return { ...ny, utloeper: svar.output.utloeper as Date };
}

/**
 * Sesjonen for kapselverdien, eller `null` når den ikke finnes, er utløpt eller har vært
 * ubrukt lenger enn tidsavbruddet. Lesingen er bruk og flytter `utloeper` fram.
 */
export async function lesSesjon(pool: Pool, sesjonstoken: string): Promise<Sesjon | null> {
  const varighet = sesjonsvarighet();
  const svar = await kall(() =>
    utenKontekst(pool)
      .input('token_hash', sql.NVarChar(4000), sha256(sesjonstoken))
      .input('levetid', sql.Int, varighet.levetid)
      .input('inaktivitet', sql.Int, varighet.inaktivitet)
      .execute<{
        bruker: string;
        email: string;
        name: string;
        csrf_token: string;
        utloeper: Date;
        sekunder_igjen: string | number;
      }>('koe_api.les_sesjon')
  );
  const rad = svar.recordset[0];
  if (!rad) return null;
  return {
    bruker: { id: rad.bruker.toLowerCase(), email: rad.email, name: rad.name },
    csrfToken: rad.csrf_token,
    utloeper: rad.utloeper,
    sekunderIgjen: Number(rad.sekunder_igjen),
  };
}

export async function slettSesjon(pool: Pool, sesjonstoken: string): Promise<void> {
  await kall(() =>
    utenKontekst(pool)
      .input('token_hash', sql.NVarChar(4000), sha256(sesjonstoken))
      .input('utlogging', sql.Bit, 1)
      .input('korrelasjon', sql.UniqueIdentifier, korrelasjonsId() ?? null)
      .execute('koe_api.slett_sesjon')
  );
}

export interface NyttInnloggingsforsoek {
  /** `state` i lenken til Catenda. Lagres ikke. */
  state: string;
  /** Verdien i innloggingskapselen. Lagres ikke. */
  nettleser: string;
  utloeper: Date;
}

/** `retursti` skal alt være kontrollert som lokal sti av innloggingsinngangen. */
export async function opprettInnloggingsforsoek(
  pool: Pool,
  retursti: string
): Promise<NyttInnloggingsforsoek> {
  const ny = { state: token(), nettleser: token() };
  const svar = await kall(() =>
    utenKontekst(pool)
      .input('state_hash', sql.NVarChar(4000), sha256(ny.state))
      .input('nettleser_hash', sql.NVarChar(4000), sha256(ny.nettleser))
      // `MAX`, så en for lang sti når basens kontroll i stedet for å feile i driveren.
      .input('retursti', sql.NVarChar(sql.MAX), retursti)
      .output('utloeper', sql.DateTime2(3))
      .execute('koe_api.opprett_innloggingsforsoek')
  );
  return { ...ny, utloeper: svar.output.utloeper as Date };
}

/**
 * Bruker forsøket og gir returstien, eller `null` når staten er ukjent, alt brukt,
 * utløpt eller hører til en annen nettleser. Bare ett kall får returstien.
 */
export async function brukInnloggingsforsoek(
  pool: Pool,
  state: string,
  nettleser: string
): Promise<string | null> {
  const svar = await kall(() =>
    utenKontekst(pool)
      .input('state_hash', sql.NVarChar(4000), sha256(state))
      .input('nettleser_hash', sql.NVarChar(4000), sha256(nettleser))
      .execute<{ retursti: string }>('koe_api.bruk_innloggingsforsoek')
  );
  return svar.recordset[0]?.retursti ?? null;
}

/** Sletter utløpte sesjoner og innloggingsforsøk og gir antallet av hver. */
export async function ryddUtloepte(pool: Pool): Promise<{ sesjoner: number; forsoek: number }> {
  const svar = await kall(() =>
    utenKontekst(pool)
      .output('sesjoner', sql.Int)
      .output('forsoek', sql.Int)
      .execute('koe_api.rydd_utloepte')
  );
  return { sesjoner: svar.output.sesjoner as number, forsoek: svar.output.forsoek as number };
}
