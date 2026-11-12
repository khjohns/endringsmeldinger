/**
 * Det brevet setter foran BHs svar på vederlaget, lest av saken før svaret (#1047 C2 del 2).
 */

import { grunnerFraForholdet } from '$kjerne/spor/forhold/frysing';
import type { Subsidiaergrunn } from '$kjerne/regler/forhold';
import type { Utledning } from '$kjerne/utledning/utled';

/**
 * Grunnene i gjeldende svar på grunnlaget, som hver er ett lag foran sporet (A2, OV-U32,
 * OV-U33), og forbeholdet når grunnlaget er ubesvart og ikke avklart ved frafall (GR-U26,
 * GR-U23). Et frafall gir ingen grunn (GR-U7). Brevteksten leser de samme feltene.
 */
export function grunnlagetForSvaret(u: Utledning): {
  grunner: Subsidiaergrunn[];
  forbehold: boolean;
} {
  const g = u.spor.forhold.gjeldendeSvar;
  return {
    grunner: g ? grunnerFraForholdet(g, g.beslutningsgrunnlag.virkninger) : [],
    forbehold: !g && !u.frafalt,
  };
}
