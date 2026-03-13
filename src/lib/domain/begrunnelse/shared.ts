/**
 * Shared types and helpers for begrunnelse generation.
 *
 * Used by vederlag, frist, and forsering generators.
 */

import { lockedValueFormatters } from '../../utils/lockedValueTokens';

// ============================================================================
// TYPES
// ============================================================================

export type BelopVurdering = 'godkjent' | 'delvis' | 'avslatt';

export interface BegrunnelseGeneratorOptions {
  /**
   * When true, numeric values (amounts, days, percentages) are wrapped in
   * locked value tokens: {{type:value:display}}
   * These tokens render as non-editable badges in the BegrunnelseEditor.
   * @default false
   */
  useTokens?: boolean;
}

// ============================================================================
// FORMATTING HELPERS
// ============================================================================

export function formatCurrency(amount: number, useTokens = false): string {
  if (useTokens) {
    return lockedValueFormatters.belop(amount);
  }
  return `kr ${amount.toLocaleString('nb-NO')},-`;
}

export function formatDager(dager: number, useTokens = false): string {
  if (useTokens) {
    return lockedValueFormatters.dager(dager);
  }
  return `${dager} dager`;
}

export function formatProsent(prosent: number, useTokens = false): string {
  if (useTokens) {
    return lockedValueFormatters.prosent(prosent);
  }
  return `${prosent}%`;
}

// ============================================================================
// SHARED LOGIC
// ============================================================================

export function getVurderingVerb(vurdering: BelopVurdering): string {
  switch (vurdering) {
    case 'godkjent':
      return 'godkjennes';
    case 'delvis':
      return 'godkjennes delvis';
    case 'avslatt':
      return 'avvises';
  }
}

/**
 * Combine auto-generated begrunnelse with user's additional comments
 */
export function combineBegrunnelse(autoBegrunnelse: string, tilleggsBegrunnelse?: string): string {
  if (!tilleggsBegrunnelse?.trim()) {
    return autoBegrunnelse;
  }

  return `${autoBegrunnelse}\n\n---\n\nTilleggskommentar:\n${tilleggsBegrunnelse.trim()}`;
}
