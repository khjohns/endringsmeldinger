/**
 * UI-only typer for mockup-appen.
 *
 * Domenetyper (SakState, SporStatus, etc.) importeres direkte
 * fra $lib/types/timeline. SporKey bor i scenarios.ts.
 */
export type SporKey = 'ansvar' | 'vederlag' | 'frist';
export const SPOR_KEYS: SporKey[] = ['ansvar', 'vederlag', 'frist'];

export interface SporUIState {
  draft: Draft | null;
  att: Attachment[];
  note: InternalNote | null;
}

export type Role = 'TE' | 'BH';
export type Mode = 'read' | 'form';
export type RightTab = 'bestemmelser' | 'historikk' | 'vedlegg' | 'begrunnelse' | 'filer';

export interface Attachment {
  n: string;
  p?: number;
}

export interface InternalNote {
  d: string;
  t: string;
}

export interface Draft {
  text: string;
  value?: number;
}
