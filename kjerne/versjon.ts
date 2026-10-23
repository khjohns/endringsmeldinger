/** Versjonene en kjerne har (2.7 i modellforslaget). */

import { FORMAT, LESERFORMAT } from './format/format.ts';
import { GJELDENDE_REGLER, type Regelsett } from './regler/regelsett.ts';

/**
 * Økes ved enhver endring i kjernen utenom `regler/` og testene som kan gi et
 * annet resultat, også en feilretting. Regelversjonsvakten i CI krever det.
 */
export const PROJEKSJONSVERSJON = 51;

export interface Kjerne {
  regler: Regelsett;
  projeksjonsversjon: number;
  /** Hendelsesformatet kjernen skriver. */
  format: number;
  /** Høyeste hendelsesformat kjernen leser. Aldri lavere enn `format`. */
  leserformat: number;
}

export const KJERNE: Kjerne = {
  regler: GJELDENDE_REGLER,
  projeksjonsversjon: PROJEKSJONSVERSJON,
  format: FORMAT,
  leserformat: LESERFORMAT,
};
