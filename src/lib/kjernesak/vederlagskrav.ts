/**
 * Vederlagskravet saksbildet sender på TS-stien (#667, B-17). I prøven gjelder bare
 * tilbud (fast beløp): formatet har ingen annen metode ennå, så regningsarbeid og
 * enhetspriser avvises og tilbys ikke (OV-U1). Det samme gjelder rigg og drift,
 * produktivitet og varslene etter § 34.1.2 og § 34.1.3. TEs begrunnelse er
 * utdypningen under kravet og er valgfri (oppdragsgiver 17.10, #667).
 */

import { METODE_FRA_KATALOGEN } from '$kjerne/format/koder';
import type { Saksbilde } from './saksbilde';

export interface Vederlagsvalg {
  /** Katalogens kode, som `FASTPRIS_TILBUD`. */
  metode: string;
  beloep: number;
  /** TEs begrunnelse som ren tekst. */
  utdypning: string;
}

export type Vederlagskrav = {
  type: 'krav';
  spor: 'vederlag';
  innhold: { metode: 'tilbud'; beloep: number };
  utdypning?: string;
};

/**
 * Saksbildet tilbyr skjemaet når kjernen tilbyr leseren et vederlagskrav og sporet
 * ennå ikke har et krav. Kjernen tilbyr også en ny versjon av kravet, men skjemaet
 * for den kommer senere (arbeidsvalg i #667, #655).
 */
export const tilbyrFoersteVederlagskrav = (handlinger: string[], bilde: Saksbilde) =>
  handlinger.includes('krav:vederlag') &&
  !bilde.spor.some((s) => s.spor === 'vederlag' && s.poster.some((p) => p.art === 'krav'));

/** Katalogens metode kan sendes til kjernen. Bare tilbud kan det i prøven. */
export const metodeKanSendesTilKjernen = (metode: string) =>
  METODE_FRA_KATALOGEN[metode] === 'tilbud';

/** Vederlagskravet. En metode kjernen ikke kan ta imot, avvises her og sendes ikke. */
export function vederlagskrav(valg: Vederlagsvalg): Vederlagskrav {
  if (!metodeKanSendesTilKjernen(valg.metode))
    throw new Error(`Metoden ${valg.metode} kan ikke sendes i TS-stien ennå. Bare tilbud kan det.`);
  const utdypning = valg.utdypning.trim();
  return {
    type: 'krav',
    spor: 'vederlag',
    innhold: { metode: 'tilbud', beloep: valg.beloep },
    ...(utdypning ? { utdypning } : {}),
  };
}
