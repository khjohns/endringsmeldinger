/**
 * Type Definitions
 *
 * Central export point for all TypeScript types used in the application.
 * These types mirror the backend models and define the API contract.
 */

// Timeline types (state models)
export type {
  SporType,
  SporStatus,
  OverordnetStatus,
  GrunnlagTilstand,
  VederlagTilstand,
  FristTilstand,
  SakState,
  EventType,
  VarselInfo,
  SaerskiltKravItem,
  GrunnlagEventData,
  VederlagEventData,
  FristEventData,
  GrunnlagResponsResultat,
  VederlagBeregningResultat,
  FristBeregningResultat,
  VederlagsMetode,
  FristVarselType,
  TimelineEntry,
} from './timeline';

// API types (requests and responses)
export type {
  StateResponse,
  EventSubmitResponse,
  TimelineResponse,
  EventSubmitRequest,
  ApiClientConfig,
} from './api';

// Bestemmelser (contract provisions for context panel)
export interface Bestemmelse {
  /** §-referanse, f.eks. "§ 34.1" */
  ref: string;
  /** Paragraftittel, f.eks. "Vederlagsjustering" */
  title: string;
  /** Regeltekst: trigger, handling og frist */
  text: string;
  /** Konsekvens ved brudd (kan være null) */
  note: string | null;
}

// Begrunnelse types (shared across BegrunnelseThread, FormWithRightPanel, etc.)
export interface BegrunnelseEntry {
  rolle: 'TE' | 'BH';
  versjon: number;
  html: string;
  dato?: string;
  resultat?: string;
}

// File attachment types
export interface AttachmentFile {
  /** Unique identifier for the file */
  id: string;
  /** Original File object */
  file: File;
  /** File name */
  name: string;
  /** File size in bytes */
  size: number;
  /** MIME type */
  type: string;
  /** Base64-encoded content (without data URI prefix) */
  base64?: string;
  /** Preview URL for images (object URL) */
  previewUrl?: string;
  /** Processing status */
  status: 'pending' | 'encoding' | 'ready' | 'error';
  /** Error message if status is 'error' */
  error?: string;
}
