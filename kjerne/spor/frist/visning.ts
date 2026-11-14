/**
 * Visningen i fristsporet: etiketten for varselet etter § 33.4 og forespørselen etter § 33.6.2.
 * `utledning/visning.ts` slår opp i sporet gjennom `VISNING` (#1783).
 */

import type { Sporsvisning } from '../../utledning/visning.ts';
import { utregningIFristen } from './format.ts';

export const VISNING_I_FRISTEN = {
  paaleggFrafalt: () => false,
  passivitetsetikett: () => null,
  // § 33.6.2: til forespørselen er besvart.
  kravetErEtterspurt: (u) => u.spor.frist.foresporsler.some((f) => f.svar === null),
  // Oppdragsgiver 22.10 (#1126): bare før kravet, som er varselet når sporet ikke har noe.
  varseletikett: (u) =>
    !u.spor.frist.varsler['33.4'] && u.spor.frist.krav.length === 0
      ? 'varsel_ikke_registrert'
      : null,
  // HF-U29 punkt 8, med svar 2 A og 3 A 14.11 i #502: dagene for hver frist, og punkt 33.7 annet ledd.
  senkning: {
    godkjentILagene: (svar) =>
      new Map(
        utregningIFristen(svar.utregning).frister.map((f) => [f.gjelder, f.lag.map((l) => l.dager)])
      ),
    justeringIkkeGodtatt: () => [],
    bestemmelse: () => '33.7',
  },
} satisfies Sporsvisning;
