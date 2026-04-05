import type { Bestemmelse } from '$lib/types';
import type { SporKey } from './scenarios.js';
import { getParagrafTittel } from '$lib/constants/paragrafTitler.js';
import { getKontraktsregel } from '$lib/constants/kontraktsregler.js';

/** Bare tallformatering (nb-NO). Produksjon bruker formatCurrency/formatDays med andre suffiks. */
export function fmt(n: number): string {
  return n.toLocaleString('nb-NO');
}

function byggBestemmelse(key: string): Bestemmelse | null {
  const tittel = getParagrafTittel(key);
  const kr = getKontraktsregel(key);
  if (!tittel || !kr) return null;
  return { ref: `§ ${key}`, title: tittel, text: kr.regel, note: kr.konsekvens };
}

/** Relevante bestemmelser per spor — tilpasset mockup-skjemavisningen. */
const SPOR_PARAGRAFER: Record<SporKey, string[]> = {
  ansvar: ['23.1', '32.2', '25.1.2'],
  vederlag: ['34.1', '34.2', '34.4'],
  frist: ['33.1', '33.4', '33.5'],
};

export function sporBestemmelser(spor: SporKey): Bestemmelse[] {
  return SPOR_PARAGRAFER[spor].map(byggBestemmelse).filter((b): b is Bestemmelse => b !== null);
}

/** Toggle boolean | undefined: same value → undefined, different → value */
export function toggleChoice(current: boolean | undefined, value: boolean): boolean | undefined {
  return current === value ? undefined : value;
}
