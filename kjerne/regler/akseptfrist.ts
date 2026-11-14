/**
 * Akseptfristen i byggherrens svar, etter samlevedtaket for akseptfristen (HF-U23): hvilke svar
 * som kan ha en (punkt 1), hvilke datoer som kan settes (punkt 2), og om en aksept er sendt
 * etter fristen (punkt 7). Løsningen knytter ingen virkning til fristen (punkt 5).
 */

import { erKalenderdato } from '../format/skjema.ts';
import { erHverdag, erLoerdag } from './hverdager.ts';
import type { Spor } from '../typer.ts';

/** Det i svaret som avgjør om det kan ha en akseptfrist (HF-U23 punkt 1). */
export interface Svaretsomfang {
  spor: Spor;
  /** Svaret godkjenner et beløp eller dager, prinsipalt eller subsidiært. */
  godkjennerNoe: boolean;
  /** Svaret godkjenner hele kravet (GR-U7). */
  sammenfall: boolean;
}

/**
 * Hvorfor svaret ikke kan ha en akseptfrist (HF-U23 punkt 1), eller `null` når det kan: et svar
 * på forholdet, et helt avslag og et svar som godkjenner hele kravet, har ingen.
 */
export function utenAkseptfrist(s: Svaretsomfang): 'forholdet' | 'avslag' | 'hele_kravet' | null {
  if (s.spor === 'forhold') return 'forholdet';
  if (!s.godkjennerNoe) return 'avslag';
  return s.sammenfall ? 'hele_kravet' : null;
}

/**
 * Hvorfor byggherren ikke kan sette akseptfristen `frist` i et svar datert `svardato`, eller
 * `null` når den kan (HF-U23 punkt 2): datoen finnes ikke, ligger før datoen for svaret, eller
 * faller på en lørdag, helligdag eller høytidsdag. Begge er på formen ÅÅÅÅ-MM-DD.
 */
export function ugyldigAkseptfrist(
  frist: string,
  svardato: string
): 'finnes_ikke' | 'foer_svaret' | 'loerdag' | 'helligdag' | null {
  if (!erKalenderdato(frist)) return 'finnes_ikke';
  if (frist < svardato) return 'foer_svaret';
  if (erLoerdag(frist)) return 'loerdag';
  return erHverdag(frist) ? null : 'helligdag';
}

/**
 * Aksepten registrert dagen `dag` er sendt etter akseptfristen `frist` (HF-U23 punkt 2 og 7):
 * fristen er ute ved utgangen av datoen i norsk tid. Begge er kalenderdager i norsk tid. Usann
 * uten frist.
 */
export const etterAkseptfristen = (frist: string | null, dag: string): boolean =>
  frist !== null && dag > frist;
