import type { ComponentType } from 'svelte';

export type TrackKey = 'ansvar' | 'vederlag' | 'frist';
export type TrackType = 'binary' | 'numeric';
export type TrackStatus = 'disputed' | 'subsidiary' | 'empty' | 'draft';
export type DraftState = 'draft' | 'empty';
export type Role = 'TE' | 'BH';
export type Mode = 'read' | 'form';
export type RightTab = 'bestemmelser' | 'historikk' | 'vedlegg' | 'begrunnelse' | 'filer';

export interface Provision {
  ref: string;
  title: string;
  text: string;
  note: string | null;
}

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

export interface TrackTE {
  position?: string;
  ref?: string;
  value?: number;
  unit?: string;
}

export interface TrackBH {
  position?: string;
  ref?: string;
  prinsipal?: number;
  subsidiaer?: number;
  value?: number;
  unit?: string;
}

export interface Track {
  label: string;
  num: string;
  icon: ComponentType;
  type: TrackType;
  status: TrackStatus;
  te: TrackTE;
  bh: TrackBH;
  best: Provision[];
  teT: string;
  bhT: string;
  bhL: string;
  att: Attachment[];
  note: InternalNote | null;
  draft: Draft | null;
  draftState: DraftState;
}

export interface HistoryEvent {
  d: string;
  t: string;
  a: Role;
  n: string;
  s: string;
  x: string;
}
