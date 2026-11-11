/**
 * Tilgangen til utregningen i et lagret svar, med typen for sporet (#1777). Leseren har
 * kontrollert utregningen mot `UTREGNING` i `format.ts` før den leses her, og den lagrede
 * formen er `Svar.utregning`.
 */

import type { Fristutregning, Vederlagsutregning } from '../typer.ts';

/** Utregningen i et svar på vederlaget. */
export const utregningIVederlaget = (utregning: Record<string, unknown>): Vederlagsutregning =>
  utregning as unknown as Vederlagsutregning;

/** Utregningen i et svar på fristen. */
export const utregningIFristen = (utregning: Record<string, unknown>): Fristutregning =>
  utregning as unknown as Fristutregning;
