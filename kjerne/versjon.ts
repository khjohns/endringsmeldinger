/** Versjonene en kjerne har (2.7 i modellforslaget). */

import { GJELDENDE_REGLER, type Regelsett } from './regler/regelsett.ts';

/**
 * Økes ved enhver endring i kjernen utenom `regler/` og testene som kan gi et
 * annet resultat, også en feilretting. Regelversjonsvakten i CI krever det.
 */
export const PROJEKSJONSVERSJON = 2;

export interface Kjerne {
  regler: Regelsett;
  projeksjonsversjon: number;
  /** Høyeste hendelsesformat kjernen leser. Hendelser den skriver, får dette formatet. */
  format: number;
}

export const KJERNE: Kjerne = {
  regler: GJELDENDE_REGLER,
  projeksjonsversjon: PROJEKSJONSVERSJON,
  format: 1,
};
