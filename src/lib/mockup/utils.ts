import type { DraftState, Role, HistoryEvent, Provision } from './types.js';
import { getParagrafTittel } from '$lib/constants/paragrafTitler.js';

/** Bare tallformatering (nb-NO). Produksjon bruker formatCurrency/formatDays med andre suffiks. */
export function fmt(n: number): string {
  return n.toLocaleString('nb-NO');
}

/**
 * Bygg en Provision med tittel fra produksjonens PARAGRAF_TITLER der tilgjengelig.
 * ref-formatet er "§ 23.1" — strippes til "23.1" for oppslag.
 */
export function provision(
  ref: string,
  fallbackTitle: string,
  text: string,
  note: string | null = null
): Provision {
  const key = ref.replace(/^§\s*/, '');
  return { ref, title: getParagrafTittel(key) ?? fallbackTitle, text, note };
}

export function act(draftState: DraftState, role: Role): string {
  if (draftState === 'empty') return role === 'TE' ? 'Revider' : 'Besvar';
  if (draftState === 'draft') return 'Fortsett';
  return 'Revider svar';
}

export function groupByDate(events: HistoryEvent[]): Record<string, HistoryEvent[]> {
  const grouped: Record<string, HistoryEvent[]> = {};
  for (const e of events) {
    if (!grouped[e.d]) grouped[e.d] = [];
    grouped[e.d].push(e);
  }
  return grouped;
}
