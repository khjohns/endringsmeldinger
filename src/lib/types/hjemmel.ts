/**
 * Shared type for hjemmel selection in case creation UI.
 */

import type { Kontraktsforhold, Kontraktshjemmel } from '$lib/constants/categories';

/** Valgt hjemmel med tilhørende kontraktsforhold (utledet fra valget) */
export interface ValgtHjemmel {
  kontraktsforhold: Kontraktsforhold;
  /** null for standalone-hjemler (Force Majeure) */
  hjemmel: Kontraktshjemmel | null;
}
