import type { DraftState, Role, HistoryEvent } from './types.js';

export function fmt(n: number): string {
  return n.toLocaleString('nb-NO');
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
