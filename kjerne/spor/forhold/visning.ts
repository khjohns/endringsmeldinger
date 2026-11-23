/**
 * Visningen i forholdssporet: frafallet av pålegget, etikettene for svaret og enigheten, og
 * passiviteten. `utledning/visning.ts` slår opp i sporet gjennom `VISNING` (#1783).
 */

import type { Forholdsresultat } from '../../regler/typer.ts';
import type { Utledning } from '../../utledning/utled.ts';
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
  kravetErEtterspurt: () => false,
} satisfies Sporsvisning;

/** Byggherrens gjeldende svar på forholdet i sakslisten (#1022). */
export interface ForholdetISakslisten {
  svar: { resultat: Forholdsresultat } | null;
}

export function forholdetISakslisten(u: Utledning): ForholdetISakslisten {
  const g = u.spor.forhold.gjeldendeSvar?.standpunkter.find((p) => p.art === 'forhold');
  return { svar: g?.art === 'forhold' ? { resultat: g.resultat } : null };
}
