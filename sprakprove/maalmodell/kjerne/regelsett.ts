/**
 * Regelsettet kjernen utleder med, og versjonene en kjerne har (2.7 i
 * modellforslaget). Et regelsett er data kjernen får inn, så samme journal kan
 * leses med regelversjon n og n+1.
 */

import { REGELVERSJON } from '../../kjerne/regelversjon.ts';
import { erEndringMed32_2 } from '../../kjerne/regler/grunnlag.ts';

export interface Regelsett {
  versjon: number;
  /** § 32.2 gjelder kategorien. */
  gjelder32_2(hovedkategori: string | null, underkategori: string | null): boolean;
}

export const GJELDENDE_REGLER: Regelsett = { versjon: REGELVERSJON, gjelder32_2: erEndringMed32_2 };

export interface Kjerne {
  regler: Regelsett;
  /** Økes ved enhver endring i utledningen som kan gi et annet resultat, også en feilretting. */
  projeksjonsversjon: number;
  /** Høyeste hendelsesformat kjernen leser. Hendelser den skriver, får dette formatet. */
  format: number;
}

export const KJERNE: Kjerne = { regler: GJELDENDE_REGLER, projeksjonsversjon: 2, format: 1 };
