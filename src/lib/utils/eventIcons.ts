/**
 * Delt event-ikon-mapping for tidslinjer og logger.
 *
 * Brukes av HendelsesLogg, Forhandsvisning og KronologiskTidslinje.
 */

import type { EventType } from '$lib/types/timeline';

export interface EventIcon {
  symbol: string;
  color: string;
  cssClass: string;
}

interface MatchRule {
  test: (et: EventType) => boolean;
  icon: EventIcon;
}

const RULES: MatchRule[] = [
  {
    test: (et) => et.includes('sendt') || et === 'frist_krav_sendt' || et === 'vederlag_krav_sendt',
    icon: { symbol: '\u2192', color: 'var(--color-ink-muted)', cssClass: 'sendt' },
  },
  {
    test: (et) => et.includes('opprettet') && !et.includes('oppdatert'),
    icon: { symbol: '\u2691', color: 'var(--color-ink-muted)', cssClass: 'varslet' },
  },
  {
    test: (et) => et.includes('oppdatert') || et.includes('spesifisert'),
    icon: { symbol: '\u21BB', color: 'var(--color-vekt-dim)', cssClass: 'revisjon' },
  },
  {
    test: (et) => et.startsWith('respons_') && !et.includes('oppdatert'),
    icon: { symbol: '\u25C7', color: 'var(--color-score-high)', cssClass: 'respons' },
  },
  {
    test: (et) => et.includes('aksept'),
    icon: { symbol: '\u2713', color: 'var(--color-score-high)', cssClass: 'godkjent' },
  },
  {
    test: (et) => et.includes('trukket') || et.includes('avslatt'),
    icon: { symbol: '\u2715', color: 'var(--color-score-low)', cssClass: 'avslatt' },
  },
  {
    test: (et) => et === 'internt_notat',
    icon: { symbol: '\u270E', color: 'var(--color-vekt)', cssClass: 'notat' },
  },
];

const DEFAULT_ICON: EventIcon = {
  symbol: '\u00B7',
  color: 'var(--color-ink-muted)',
  cssClass: '',
};

export function getEventIcon(eventType: EventType | null): EventIcon {
  if (!eventType) return DEFAULT_ICON;
  for (const rule of RULES) {
    if (rule.test(eventType)) return rule.icon;
  }
  return DEFAULT_ICON;
}
