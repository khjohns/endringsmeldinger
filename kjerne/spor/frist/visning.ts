/**
 * Visningen i fristsporet: etiketten for varselet etter § 33.4. `utledning/visning.ts` slår opp
 * i sporet gjennom `VISNING` (#1783).
 */

import type { Sporsvisning } from '../../utledning/visning.ts';

export const VISNING_I_FRISTEN = {
  paaleggFrafalt: () => false,
  passivitetsetikett: () => null,
  // Oppdragsgiver 22.10 (#1126): bare før kravet, som er varselet når sporet ikke har noe.
  varseletikett: (u) =>
    !u.spor.frist.varsler['33.4'] && u.spor.frist.krav.length === 0
      ? 'varsel_ikke_registrert'
      : null,
} satisfies Sporsvisning;
