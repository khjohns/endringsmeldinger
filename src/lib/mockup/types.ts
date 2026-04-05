/**
 * UI-only typer for mockup-appen.
 *
 * Domenetyper (SakState, SporStatus, etc.) importeres direkte
 * fra $lib/types/timeline. SporKey bor i scenarios.ts.
 */
export type { SporKey } from './scenarios.js';

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
