import type { Bestemmelse } from '$lib/types';
import type { SporKey } from './types.js';
import { getParagrafTittel } from '$lib/constants/paragrafTitler.js';
import { getKontraktsregel } from '$lib/constants/kontraktsregler.js';
import { getHjemmelObj } from '$lib/constants/categories.js';
import { visKroner } from '$lib/utils/belop';

/** Bare tallformatering (nb-NO), med to desimaler når beløpet har øre (#1315). */
export function fmt(n: number): string {
  return visKroner(n);
}

export const BESTRIDT_LABEL = 'Bestridt';

function byggBestemmelse(key: string): Bestemmelse | null {
  const tittel = getParagrafTittel(key);
  const kr = getKontraktsregel(key);
  if (!tittel || !kr) return null;
  return { ref: `§ ${key}`, title: tittel, text: kr.regel, note: kr.konsekvens };
}

/** Faste bestemmelser for vederlag og frist. Ansvar følger sakens underkategori. */
const SPOR_PARAGRAFER: Record<Exclude<SporKey, 'ansvar'>, string[]> = {
  vederlag: ['34.1', '34.1.2', '34.1.3', '34.2', '34.4'],
  frist: ['33.1', '33.4', '33.6.1', '33.5'],
};

function byggBestemmelser(keys: string[]): Bestemmelse[] {
  return keys.map(byggBestemmelse).filter((b): b is Bestemmelse => b !== null);
}

const SPOR_BESTEMMELSER: Record<Exclude<SporKey, 'ansvar'>, Bestemmelse[]> = {
  vederlag: byggBestemmelser(SPOR_PARAGRAFER.vederlag),
  frist: byggBestemmelser(SPOR_PARAGRAFER.frist),
};

/** Under ansvar: bestemmelsen kravet bygger på (`hjemmel_basis`), tom for en kategori uten hjemmel. */
export function sporBestemmelser(
  spor: SporKey,
  underkategori?: string | string[] | null
): Bestemmelse[] {
  if (spor !== 'ansvar') return SPOR_BESTEMMELSER[spor];
  const hjemmel = getHjemmelObj(underkategori);
  return hjemmel ? byggBestemmelser([hjemmel.hjemmel_basis]) : [];
}

/** Toggle boolean | undefined: same value → undefined, different → value */
export function toggleChoice(current: boolean | undefined, value: boolean): boolean | undefined {
  return current === value ? undefined : value;
}
