import type { GrunnlagResponsResultat } from '$lib/types/timeline';

/** Short UI labels for grunnlag response results */
export const GRUNNLAG_RESULTAT_LABELS: Record<GrunnlagResponsResultat, string> = {
  godkjent: 'Godkjent',
  avslatt: 'Avslått',
  frafalt: 'Frafalt',
};
