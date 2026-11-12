/**
 * Visningen i forholdssporet: frafallet av pålegget, etikettene for svaret og enigheten, og
 * passiviteten. `utledning/visning.ts` slår opp i sporet gjennom `VISNING` (#1783).
 */

import type { Sporsvisning } from '../../utledning/visning.ts';

export const VISNING_I_FORHOLDET = {
  varseletikett: () => null,
  paaleggFrafalt: (u) => u.frafalt,
  svaretsEtiketter: (u, virkning) => {
    const ut: string[] = [];
    if (u.frafalt) ut.push('paalegg_frafalt');
    if (u.forholdAvvist) ut.push('avslaatt');
    if (virkning && !u.spor.forhold.trukket) ut.push('enige');
    return ut;
  },
  passivitetsetikett: (u) => (u.passivitet.length ? 'passivitet_paaberopt' : null),
} satisfies Sporsvisning;
