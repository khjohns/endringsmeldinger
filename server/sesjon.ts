/**
 * Sesjonen og innloggingsforsøket i SQL Server (B-19, #656), gjennom prosedyrene
 * i `koe_api` fra `database/migrasjoner/20261016190000_sesjon.sql`. `les_sesjon`,
 * `slett_sesjon` og `bruk_innloggingsforsoek` er sist definert i
 * `20261016233000_hashparametre.sql` (#700). Tokenene lages
 * her, som `secrets.token_urlsafe(32)` i Python, og basen får bare SHA-256 av
 * sesjonstokenet, staten og nettlesertokenet. Levetidene og klokka er basens.
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
}

export async function opprettSesjon(pool: Pool, bruker: string): Promise<NySesjon> {
  const ny = { token: token(), csrfToken: token() };
  const svar = await kall(() =>
    utenKontekst(pool)
      .input('token_hash', sql.NVarChar(4000), sha256(ny.token))
      .input('bruker', sql.UniqueIdentifier, bruker)
      .input('csrf_token', sql.NVarChar(4000), ny.csrfToken)
      .output('utloeper', sql.DateTime2(3))
      .execute('koe_api.opprett_sesjon')
  );
  return { ...ny, utloeper: svar.output.utloeper as Date };
}

/** Sesjonen for kapselverdien, eller `null` når den ikke finnes eller er utløpt. */
export async function lesSesjon(pool: Pool, sesjonstoken: string): Promise<Sesjon | null> {
  const svar = await kall(() =>
    utenKontekst(pool).input('token_hash', sql.NVarChar(4000), sha256(sesjonstoken)).execute<{
      bruker: string;
      email: string;
      name: string;
      csrf_token: string;
      utloeper: Date;
    }>('koe_api.les_sesjon')
  );
  const rad = svar.recordset[0];
  if (!rad) return null;
  return {
    bruker: { id: rad.bruker.toLowerCase(), email: rad.email, name: rad.name },
    csrfToken: rad.csrf_token,
    utloeper: rad.utloeper,
  };
}

export async function slettSesjon(pool: Pool, sesjonstoken: string): Promise<void> {
  await kall(() =>
    utenKontekst(pool)
      .input('token_hash', sql.NVarChar(4000), sha256(sesjonstoken))
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
