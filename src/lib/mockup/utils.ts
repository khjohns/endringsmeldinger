import type { Provision, SporKey } from './types.js';
import { getParagrafTittel } from '$lib/constants/paragrafTitler.js';
import { getKontraktsregel } from '$lib/constants/kontraktsregler.js';

/** Bare tallformatering (nb-NO). Produksjon bruker formatCurrency/formatDays med andre suffiks. */
export function fmt(n: number): string {
  return n.toLocaleString('nb-NO');
}

/**
 * Bygg en Provision fra produksjonens KONTRAKTSREGLER + PARAGRAF_TITLER.
 * Krever at §-nøkkelen finnes i begge oppslagstabellene.
 */
function regel(key: string): Provision | null {
  const tittel = getParagrafTittel(key);
  const kr = getKontraktsregel(key);
  if (!tittel || !kr) return null;
  return { ref: `§ ${key}`, title: tittel, text: kr.regel, note: kr.konsekvens };
}

/** Relevante bestemmelser per spor, bygget fra produksjonens kontraktsregler. */
const SPOR_PARAGRAFER: Record<SporKey, string[]> = {
  ansvar: ['23.1', '32.2', '25.1.2'],
  vederlag: ['34.1', '34.2', '34.4'],
  frist: ['33.1', '33.4', '33.5'],
};

/** Hent bestemmelser for et spor fra produksjonens KONTRAKTSREGLER. */
export function sporBestemmelser(spor: SporKey): Provision[] {
  return SPOR_PARAGRAFER[spor].map(regel).filter((p): p is Provision => p !== null);
}

/** Toggle boolean | undefined: same value → undefined, different → value */
export function toggleChoice(current: boolean | undefined, value: boolean): boolean | undefined {
  return current === value ? undefined : value;
}
