/**
 * Regelsettet kjernen utleder med (2.7 i modellforslaget). Et regelsett er data
 * kjernen får inn, så samme journal kan leses med regelversjon n og n+1.
 */

import { erEndringMedVarslingsplikt } from './grunnlag.ts';
import { gjelderVarslingspliktenForVederlag } from './vederlag.ts';

/**
 * Versjonen av regelsettet. Økes ved enhver endring i `kjerne/regler/`
 * (B-13); regelversjonsvakten i CI krever det.
 */
export const REGELVERSJON = 16;

export interface Regelsett {
  versjon: number;
  /** Varslingsplikten i § 32.2 gjelder kategorien (GR-U11). */
  gjelderVarslingsplikten(hovedkategori: string | null, underkategori: string | null): boolean;
  /** Varslingsplikten i § 34.1.2 gjelder svikt og andre forhold byggherren har risikoen for. */
  gjelderVarslingspliktenForVederlag(hovedkategori: string | null): boolean;
}

export const GJELDENDE_REGLER: Regelsett = {
  versjon: REGELVERSJON,
  gjelderVarslingsplikten: erEndringMedVarslingsplikt,
  gjelderVarslingspliktenForVederlag,
};
