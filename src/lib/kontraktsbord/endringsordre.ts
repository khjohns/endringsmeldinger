/**
 * Om byggherrens svar på grunnlaget er en endringsordre etter § 32.3 første ledd a
 * (GR-U12). Kjernen avgjør det med samme standpunkter, beslutningsgrunnlag og
 * sammensetning som for et brev sendt i appen (#351). Skjemaet har katalogens
 * koder, og de oversettes til kjernens på grensen (#335). Skjemaet har ingen vei
 * for registrert korrespondanse, der § 31.3 må oppgis (GR-U13).
 */

import {
  GRUNNLAGSRESULTAT_FRA_KATALOGEN,
  fraKatalogen,
  kategoriFraKatalogen,
} from '$kjerne/format/koder';
import { GJELDENDE_REGLER } from '$kjerne/regler/regelsett';
import { svaretBlirEndringsordre } from '$kjerne/frosset/frysing';
import type { ApprovalPackage, ReviewItem } from '$lib/approval/types';

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

export function erEndringsordre(
  kategori: Grunnlagskategori | undefined,
  vurdering: Grunnlagsvurdering
): boolean {
  return svaretBlirEndringsordre(
    {
      resultat: fraKatalogen(GRUNNLAGSRESULTAT_FRA_KATALOGEN, vurdering.resultat),
      ...(typeof vurdering.varsletITide === 'boolean'
        ? { grunnlag_varslet_i_tide: vurdering.varsletITide }
        : {}),
    },
    kategoriFraKatalogen(kategori ?? {}),
    GJELDENDE_REGLER
  );
}

/**
 * Varselet i godkjenningsvisningen: brevet har et svar på grunnlaget som er en
 * endringsordre. Det vises for kladden (ingen pakke) og et brev til godkjenning,
 * ikke når kravet er endret siden pakken ble laget. Et besluttet brev regnes ikke
 * på nytt med dagens regler (MM-U9).
 */
export function brevetBlirEndringsordre(
  poster: Pick<ReviewItem, 'track' | 'basis' | 'data'>[],
  pakke: Pick<ApprovalPackage, 'status'> | undefined,
  utdatert: boolean
): boolean {
  if ((pakke && pakke.status !== 'til_godkjenning') || utdatert) return false;
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
