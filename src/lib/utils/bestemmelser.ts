/**
 * Bestemmelser (kontraktsbestemmelser) per spor.
 *
 * Bygger Bestemmelse-objekter fra produksjonens KONTRAKTSREGLER + PARAGRAF_TITLER.
 * Brukes i KontekstPanel (høyrepanelet i skjemavisning).
 */

import type { Bestemmelse } from '$lib/types';
import type { SporType } from '$lib/types/timeline';
import { getParagrafTittel } from '$lib/constants/paragrafTitler';
import { getKontraktsregel } from '$lib/constants/kontraktsregler';

function byggBestemmelse(key: string): Bestemmelse | null {
  const tittel = getParagrafTittel(key);
  const kr = getKontraktsregel(key);
  if (!tittel || !kr) return null;
  return { ref: `§ ${key}`, title: tittel, text: kr.regel, note: kr.konsekvens };
}

/** Relevante §-referanser per spor */
const SPOR_PARAGRAFER: Record<SporType, string[]> = {
  grunnlag: ['23.1', '32.2', '25.1.2'],
  vederlag: ['34.1', '34.2', '34.4'],
  frist: ['33.1', '33.5', '33.3'],
};

/** Hent bestemmelser for et spor fra produksjonens KONTRAKTSREGLER. */
export function sporBestemmelser(spor: SporType): Bestemmelse[] {
  const keys = SPOR_PARAGRAFER[spor];
  if (!keys) return [];
  return keys.map(byggBestemmelse).filter((b): b is Bestemmelse => b !== null);
}
