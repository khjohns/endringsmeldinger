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

/** Varselet i skjemaet og godkjenningsvisningen (GR-U10, GR-U12). Det forutsetter at brevet oppfyller § 31.3 (GR-U13). */
export const ENDRINGSORDREVARSEL =
  'Svaret blir en endringsordre etter § 32.3 første ledd a, fordi byggherren godkjenner grunnlaget uten å påberope at varselet kom for sent (§ 32.2). Totalentreprenøren blir forpliktet til å utføre endringsarbeidet (§ 31.3 annet ledd). Byggherren kan ikke endre godkjenningen av grunnlaget etterpå.';

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

/** En post i godkjenningspakken: sporet, kategorien da pakken ble laget, og svaret. */
export interface Brevpost {
  track: string;
  basis?: Grunnlagskategori;
  data: Record<string, unknown>;
}

/**
 * Varselet i godkjenningsvisningen: brevet har et svar på grunnlaget som er en
 * endringsordre. Det vises for en kladd og et brev til godkjenning, ikke når
 * kravet er endret siden pakken ble laget. Et besluttet brev regnes ikke på nytt
 * med dagens regler (MM-U9).
 */
export function brevetBlirEndringsordre(
  poster: Brevpost[],
  brev: { kladd: boolean; status?: string; utdatert: boolean }
): boolean {
  if ((!brev.kladd && brev.status !== 'til_godkjenning') || brev.utdatert) return false;
  return poster.some(
    (i) =>
      i.track === 'grunnlag' &&
      erEndringsordre(i.basis, {
        resultat: i.data.resultat,
        varsletITide:
          typeof i.data.grunnlag_varslet_i_tide === 'boolean'
            ? i.data.grunnlag_varslet_i_tide
            : undefined,
      })
  );
}
