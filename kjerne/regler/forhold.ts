/** Byggherrens svar på forholdet, NS 8407 § 32.2 og § 32.3. Port av `regler/forhold.py`. */

import type { Forholdsresultat, Hovedkategori, Underkategori } from './typer.ts';
import type { Regelsett } from './regelsett.ts';
import { UgyldigVurdering } from './feil.ts';

export function foersteUnderkategori(
  underkategori: string | string[] | null | undefined
): string | null {
  if (Array.isArray(underkategori)) return underkategori[0] ?? null;
  return underkategori ?? null;
}

const ENDRING: Hovedkategori = 'endring';
const ENDRINGSORDRE: Underkategori = 'endringsordre';

export function erEndringMedVarslingsplikt(
  hovedkategori: string | null,
  underkategori: string | null
): boolean {
  return hovedkategori === ENDRING && underkategori !== ENDRINGSORDRE;
}

const BYGGHERRENS_PAALEGG: readonly Underkategori[] = [
  'irregulaer_endring',
  'valg_av_loesning',
  'samordning',
  'svar_paa_varsel',
];

/**
 * GR-U18: frafall etter § 32.3 c gjelder et pålegg som er byggherrens eget,
 * ikke offentlig myndighet eller gebyr.
 */
export function erByggherrensPaalegg(
  hovedkategori: string | null,
  underkategori: string | null
): boolean {
  return hovedkategori === ENDRING && BYGGHERRENS_PAALEGG.some((u) => u === underkategori);
}

export function erPrekludert(
  hovedkategori: string | null,
  underkategori: string | null,
  varsletITide: boolean | null
): boolean {
  return erEndringMedVarslingsplikt(hovedkategori, underkategori) && varsletITide === false;
}

export function gyldigeResultater(
  hovedkategori: string | null,
  underkategori: string | null
): Forholdsresultat[] {
  const resultater: Forholdsresultat[] = ['godkjent', 'avslaatt'];
  return erByggherrensPaalegg(hovedkategori, underkategori)
    ? [...resultater, 'paalegg_frafalt']
    : resultater;
}

/** Svaret mot svarvalgene og varslingsplikten i regelsettet, som kjernen leser dem (#514). */
export function kontrollerSvarPaaPaaberopelsen(
  regler: Regelsett,
  hovedkategori: string | null,
  underkategori: string | null,
  resultat: Forholdsresultat | null,
  varsletITide: boolean | null
): void {
  const feil: Record<string, string> = {};
  if (resultat === null) {
    feil.resultat = 'mangler';
  } else if (!regler.gyldigeForholdsresultater(hovedkategori, underkategori).includes(resultat)) {
    feil.resultat = `«${resultat}» kan ikke velges i denne kategorien (punkt 32.3 første ledd bokstav c)`;
  }
  if (regler.gjelderVarslingsplikten(hovedkategori, underkategori)) {
    if (varsletITide === null) feil.grunnlag_varslet_i_tide = 'mangler (punkt 32.2)';
  } else if (varsletITide !== null) {
    feil.grunnlag_varslet_i_tide = 'gjelder bare punkt 32.2';
  }
  if (Object.keys(feil).length) throw new UgyldigVurdering(feil);
}

export type Subsidiaergrunn = 'avslaatt' | 'prekludert';

/** M1: standpunktet i et svar på vederlag eller frist, utledet av forholdet. */
export interface Standpunkt {
  subsidiaert: boolean;
  hovedgrunn: Subsidiaergrunn | null;
  aarsaker: Subsidiaergrunn[];
}

export interface ForholdForStandpunkt {
  resultat: Forholdsresultat | null;
  hovedkategori: string | null;
  underkategori: string | string[] | null;
  varsletITide: boolean | null;
}

/**
 * Preklusjonen er hovedgrunnen når begge gjelder (vedtaket 05.10 om avslag
 * sammen med § 32.2). Et svar som var subsidiært da svaret på påberopelsen falt,
 * forblir det til sporet eller forholdet besvares igjen (`tilNyttSvar`).
 * Frafall er ikke avslag, men en § 32.2-preklusjon gjelder også ved frafall (#235).
 */
export function standpunkt(
  forhold: ForholdForStandpunkt,
  tilNyttSvar: Subsidiaergrunn | null
): Standpunkt {
  if (tilNyttSvar !== null)
    return { subsidiaert: true, hovedgrunn: tilNyttSvar, aarsaker: [tilNyttSvar] };
  const aarsaker: Subsidiaergrunn[] = [];
  if (
    erPrekludert(
      forhold.hovedkategori,
      foersteUnderkategori(forhold.underkategori),
      forhold.varsletITide
    )
  ) {
    aarsaker.push('prekludert');
  }
  if (forhold.resultat === 'avslaatt') aarsaker.push('avslaatt');
  return { subsidiaert: aarsaker.length > 0, hovedgrunn: aarsaker[0] ?? null, aarsaker };
}
