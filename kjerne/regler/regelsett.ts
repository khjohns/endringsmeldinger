/**
 * Regelsettet kjernen utleder med (2.7 i modellforslaget). Et regelsett er data
 * kjernen får inn, så samme journal kan leses med regelversjon n og n+1.
 */

import { erEndringMedVarslingsplikt, gyldigeResultater } from './grunnlag.ts';
import type { Grunnlagsresultat } from './typer.ts';
import { gjelderVarslingspliktenForVederlag } from './vederlag.ts';

/**
 * Versjonen av regelsettet. Økes ved enhver endring i `kjerne/regler/`
 * (B-13); regelversjonsvakten i CI krever det.
 */
export const REGELVERSJON = 27;

export interface Regelsett {
  versjon: number;
  /** Varslingsplikten i § 32.2 gjelder kategorien (GR-U11). */
  gjelderVarslingsplikten(hovedkategori: string | null, underkategori: string | null): boolean;
  /**
   * Svarene byggherren kan gi på grunnlaget i kategorien, med frafall etter § 32.3 c der
   * pålegget er byggherrens eget (GR-U18). Står ved siden av § 32.2, ikke av den (#514).
   */
  gyldigeGrunnlagsresultater(
    hovedkategori: string | null,
    underkategori: string | null
  ): Grunnlagsresultat[];
  /** Varslingsplikten i § 34.1.2 gjelder svikt og andre forhold byggherren har risikoen for. */
  gjelderVarslingspliktenForVederlag(hovedkategori: string | null): boolean;
}

export const GJELDENDE_REGLER: Regelsett = {
  versjon: REGELVERSJON,
  gjelderVarslingsplikten: erEndringMedVarslingsplikt,
  gyldigeGrunnlagsresultater: gyldigeResultater,
  gjelderVarslingspliktenForVederlag,
};
