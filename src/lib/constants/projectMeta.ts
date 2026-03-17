import type { Project } from '$lib/types/project';

export interface ProjectMeta {
  name: string;
  entreprise: string;
  te: string;
  bh: string;
}

/** Derive ProjectMeta from API Project data */
export function projectToMeta(
  project: Project | null | undefined,
  fallbackId?: string
): ProjectMeta {
  if (!project) {
    return {
      name: fallbackId ?? '',
      entreprise: 'Entreprise NS 8407',
      te: '',
      bh: '',
    };
  }
  return {
    name: project.name,
    entreprise: 'Entreprise NS 8407',
    te: project.settings?.contract?.totalentreprenor_navn ?? '',
    bh: project.settings?.contract?.byggherre_navn ?? '',
  };
}
