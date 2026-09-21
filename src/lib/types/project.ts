/**
 * Project Types
 *
 * Type definitions for project management.
 * These types define the contract between frontend and backend
 * for creating, updating, and displaying projects.
 */

export interface ContractSettings {
  byggherre_navn: string;
  byggherre_org_nr?: string;
  totalentreprenor_navn: string;
  totalentreprenor_org_nr?: string;
  kontraktssum: number;
  dagmulkt_sats: number;
  kontraktstart: string;
  kontraktsfrist: string;
}

export interface ProjectSettings {
  contract?: ContractSettings;
  image_url?: string;
  image_alt?: string;
  [key: string]: unknown;
}

export interface Project {
  id: string;
  /** Virksomheten prosjektet tilhører. Egen identitet fra prosjekt-ID-en (MS-10). */
  organisasjon_id: string;
  name: string;
  description?: string | null;
  settings: ProjectSettings;
  created_at: string;
  created_by?: string | null;
  is_active: boolean;
}

export interface CreateProjectPayload {
  name: string;
  organisasjon_id: string;
  description?: string;
}

export interface UpdateProjectPayload {
  name?: string;
  description?: string | null;
  settings?: ProjectSettings;
}
