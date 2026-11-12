/**
 * Tilgangen til kravinnholdet, lest av den lagrede kravversjonen: dagene i fristkravet.
 * Påberopelsen leses gjennom `spor/forhold/format.ts` og vederlagskravet gjennom
 * `spor/vederlag/format.ts`. Utregningen, kontrollene og brevet leser kravet herfra (#508, #1695,
 * #1783).
 */

import type { Krav } from '../typer.ts';

/** Fristkravet, etter `KRAVINNHOLD.frist`. */
export interface Fristinnhold {
  dager: number;
}

/** Fristkravet i kravet. */
export const innholdIFristen = (krav: Pick<Krav, 'innhold'>): Fristinnhold => ({
  dager: krav.innhold.dager as number,
});
