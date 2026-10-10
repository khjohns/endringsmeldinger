/**
 * Om byggherrens svar på grunnlaget er en endringsordre etter § 32.3 første ledd a
 * (GR-U12). Kjernen avgjør det: svaret godkjenner hele kravet uten påberopt
 * preklusjon (sammenfall, GR-U10), og § 32.2 gjelder kategorien (GR-U11). Det er
 * samme sammensetning som utledningen bruker for et brev sendt i appen. Skjemaet
 * har ingen vei for registrert korrespondanse, der § 31.3 må oppgis (GR-U13).
 */

import { HJEMMEL } from '$kjerne/format';
import { GJELDENDE_REGLER } from '$kjerne/regler/regelsett';
import { GRUNNLAGSRESULTATER, type Grunnlagsresultat } from '$kjerne/regler/typer';
import { beslutningsgrunnlag } from '$kjerne/standpunkt';
import type { Krav, Standpunkt } from '$kjerne/typer';

export interface Grunnlagskategori {
  hovedkategori?: string | null;
  underkategori?: string | null;
}

export interface Grunnlagsvurdering {
  resultat?: unknown;
  /** Byggherrens svar om varselet etter § 32.2; `undefined` når det ikke er gitt. */
  varsletITide?: boolean;
}

/** Varselet i skjemaet og godkjenningsvisningen (GR-U10, GR-U12). Brevet etter § 31.3 lages med skrivestien (GR-U13). */
export const ENDRINGSORDREVARSEL =
  'Svaret blir en endringsordre etter § 32.3 første ledd a, fordi byggherren godkjenner grunnlaget uten å påberope at varselet kom for sent (§ 32.2). Totalentreprenøren blir forpliktet til å utføre endringsarbeidet (§ 31.3 annet ledd). Du kan ikke endre godkjenningen etterpå.';

const erGrunnlagsresultat = (v: unknown): v is Grunnlagsresultat =>
  (GRUNNLAGSRESULTATER as readonly unknown[]).includes(v);

export function erEndringsordre(
  kategori: Grunnlagskategori | undefined,
  vurdering: Grunnlagsvurdering
): boolean {
  if (!erGrunnlagsresultat(vurdering.resultat)) return false;
  const krav: Krav = {
    id: 'krav',
    spor: 'grunnlag',
    dokument: 'krav',
    erstatter: null,
    innhold: {
      hovedkategori: kategori?.hovedkategori ?? null,
      underkategori: kategori?.underkategori ?? null,
    },
  };
  const standpunkter: Standpunkt[] = [];
  if (typeof vurdering.varsletITide === 'boolean')
    standpunkter.push({
      id: 'rettidighet',
      art: 'rettidighet',
      gjelder: krav.id,
      hjemmel: HJEMMEL.grunnlag!,
      iTide: vurdering.varsletITide,
    });
  standpunkter.push({ id: 'grunnlag', art: 'grunnlag', resultat: vurdering.resultat });
  const b = beslutningsgrunnlag(
    { spor: 'grunnlag', standpunkter, utregning: {} },
    krav,
    GJELDENDE_REGLER
  );
  return b.sammenfall && b.varslingsplikt === true;
}
