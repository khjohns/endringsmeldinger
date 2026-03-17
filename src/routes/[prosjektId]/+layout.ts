import { setActiveProjectId } from '$lib/api/client';
import { getProject } from '$lib/api/projects';
import type { Project } from '$lib/types/project';

export async function load({ params }: { params: { prosjektId: string } }) {
  const { prosjektId } = params;

  // Sync URL prosjektId → API header for all downstream requests
  setActiveProjectId(prosjektId);

  let project: Project | null = null;
  try {
    project = await getProject(prosjektId);
  } catch {
    // Backend not available or project not found — pages fall back to prosjektId
  }

  return { project };
}
