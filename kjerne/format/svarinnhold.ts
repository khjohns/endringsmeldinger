/**
 * Tilgangen til utregningen i et svar på fristen (#1777). Utregningen i vederlaget leses gjennom
 * `spor/vederlag/format.ts` (#1783). Den lagrede formen er `Svar.utregning`, og leseren
 * kontrollerer den mot `UTREGNING` i `format.ts`. Lagene i et
 * svarutkast (`kommandoer/lag.ts`) og frysingen før skrivingen leser standpunktene med en
 * utregning som ikke er kontrollert, så et felt kan mangle der.
 */

import type { Fristutregning } from '../typer.ts';

/** Utregningen i et svar på fristen. */
export const utregningIFristen = (utregning: Record<string, unknown>): Fristutregning =>
  utregning as unknown as Fristutregning;
