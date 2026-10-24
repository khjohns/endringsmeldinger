/**
 * Typer og hjelpere for generatoren av begrunnelsen ved forsering.
 */

import { lockedValueFormatters } from '../../utils/lockedValueTokens';

export type BelopVurdering = 'godkjent' | 'delvis' | 'avslatt';

export function formatCurrency(amount: number, useTokens = false): string {
  if (useTokens) {
    return lockedValueFormatters.belop(amount);
  }
  return `kr ${amount.toLocaleString('nb-NO')},-`;
}

/** Avrundet andel som aldri viser 0 % eller 100 % for en delvis godkjenning (#177). */
export function andelProsent(godkjent: number, krevd: number): number {
  if (krevd <= 0) return 0;
  const prosent = Math.round((godkjent / krevd) * 100);
  if (godkjent > 0 && godkjent < krevd) return Math.min(99, Math.max(1, prosent));
  return prosent;
}
