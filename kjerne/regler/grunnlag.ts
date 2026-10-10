/** Byggherrens svar på ansvarsgrunnlaget, NS 8407 § 32.2 og § 32.3. Port av `regler/grunnlag.py`. */

import type { Grunnlagsresultat } from './typer.ts';
import { UgyldigVurdering } from './feil.ts';

export function foersteUnderkategori(
  underkategori: string | string[] | null | undefined
): string | null {
  if (Array.isArray(underkategori)) return underkategori[0] ?? null;
  return underkategori ?? null;
}

export function erEndringMedVarslingsplikt(
  hovedkategori: string | null,
  underkategori: string | null
): boolean {
  return hovedkategori === 'endring' && underkategori !== 'endringsordre';
}

export function erPaalegg(hovedkategori: string | null, underkategori: string | null): boolean {
  return hovedkategori === 'endring' &&
    (underkategori === 'irregulaer_endring' || underkategori === 'valg_av_loesning');
}

export function erPrekludert(
  hovedkategori: string | null,
  underkategori: string | null,
  varsletITide: boolean | null
): boolean {
  return erEndringMedVarslingsplikt(hovedkategori, underkategori) && varsletITide === false;
}

/** Hele vederlaget og hele fristen er subsidiære: grunnlaget er avslått eller prekludert etter § 32.2. */
export function erGrunnlagSubsidiaert(
  resultat: Grunnlagsresultat | null,
  hovedkategori: string | null,
  underkategori: string | string[] | null,
  varsletITide: boolean | null
): boolean {
  return (
    resultat === 'avslaatt' ||
    erPrekludert(hovedkategori, foersteUnderkategori(underkategori), varsletITide)
  );
}

export function gyldigeResultater(
  hovedkategori: string | null,
  underkategori: string | null
): Grunnlagsresultat[] {
  const resultater: Grunnlagsresultat[] = ['godkjent', 'avslaatt'];
  return erPaalegg(hovedkategori, underkategori) ? [...resultater, 'paalegg_frafalt'] : resultater;
}

export function kontrollerGrunnlagssvar(
  hovedkategori: string | null,
  underkategori: string | null,
  resultat: Grunnlagsresultat | null,
  varsletITide: boolean | null
): void {
  const feil: Record<string, string> = {};
  if (resultat === null) {
    feil.resultat = 'mangler';
  } else if (!gyldigeResultater(hovedkategori, underkategori).includes(resultat)) {
    feil.resultat = `«${resultat}» kan ikke velges i denne kategorien (§ 32.3 c)`;
  }
  if (erEndringMedVarslingsplikt(hovedkategori, underkategori)) {
    if (varsletITide === null) feil.grunnlag_varslet_i_tide = 'mangler (§ 32.2)';
  } else if (varsletITide !== null) {
    feil.grunnlag_varslet_i_tide = 'gjelder bare § 32.2';
  }
  if (Object.keys(feil).length) throw new UgyldigVurdering(feil);
}

export type Subsidiaergrunn = 'avslaatt' | 'prekludert';

/** M1: standpunktet i et svar på vederlag eller frist, utledet av grunnlaget. */
export interface Standpunkt {
  subsidiaert: boolean;
  hovedgrunn: Subsidiaergrunn | null;
  aarsaker: Subsidiaergrunn[];
}

export interface GrunnlagForStandpunkt {
  resultat: Grunnlagsresultat | null;
  hovedkategori: string | null;
  underkategori: string | string[] | null;
  varsletITide: boolean | null;
}

/**
 * Preklusjonen er hovedgrunnen når begge gjelder (vedtaket 05.10 om avslag
 * sammen med § 32.2). Et svar som var subsidiært da grunnlagssvaret falt,
 * forblir det til sporet eller grunnlaget besvares igjen (`tilNyttSvar`).
 * Frafall er ikke avslag, men en § 32.2-preklusjon gjelder også ved frafall (#235).
 */
export function standpunkt(
  grunnlag: GrunnlagForStandpunkt,
  tilNyttSvar: Subsidiaergrunn | null
): Standpunkt {
  if (tilNyttSvar !== null)
    return { subsidiaert: true, hovedgrunn: tilNyttSvar, aarsaker: [tilNyttSvar] };
  const aarsaker: Subsidiaergrunn[] = [];
  if (
    erPrekludert(
      grunnlag.hovedkategori,
      foersteUnderkategori(grunnlag.underkategori),
      grunnlag.varsletITide
    )
  ) {
    aarsaker.push('prekludert');
  }
  if (grunnlag.resultat === 'avslaatt') aarsaker.push('avslaatt');
  return { subsidiaert: aarsaker.length > 0, hovedgrunn: aarsaker[0] ?? null, aarsaker };
}
