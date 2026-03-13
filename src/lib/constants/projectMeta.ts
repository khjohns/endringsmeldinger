/**
 * Mock project metadata — will come from API later.
 * Single source of truth for all route files.
 */

export interface ProjectMeta {
  name: string;
  entreprise: string;
  te: string;
  bh: string;
}

export const PROJECT_META: Record<string, ProjectMeta> = {
  P001: {
    name: 'Operatunnelen',
    entreprise: 'Entreprise NS 8407',
    te: 'Vestlandsentreprisen AS',
    bh: 'Oslobygg',
  },
};
