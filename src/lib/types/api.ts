/**
 * API Client Types
 *
 * Type definitions for API requests and responses.
 * These types define the contract between frontend and backend.
 */

import type { Sakslinje } from '#kjerne/utledning/visning.ts';

/** Sakslisten fra `GET /api/projects/<p>/saker` (#1022, #1029), med linjene fra kjernen (#2263). */
export interface CaseListResponse {
  success: boolean;
  /** Leserens kontraktsside fra serveren. Rollevalget i klienten gjelder bare visningen. */
  part: 'TE' | 'BH' | null;
  saker: Sakslinje[];
}
