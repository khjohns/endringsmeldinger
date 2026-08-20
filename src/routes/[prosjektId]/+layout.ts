import { setActiveProjectId } from '$lib/api/client';
import type { Project } from '$lib/types/project';

// Mock projects — no backend/Supabase calls
const mockProjects: Record<string, Project> = {
  oslobygg: { id: 'oslobygg', name: 'OsloBygg AS', description: 'Kontraktsoppfølging pilot' },
};

export async function load({ params }: { params: { prosjektId: string } }) {
  const { prosjektId } = params;

  // Sync URL prosjektId → API header for all downstream requests
  setActiveProjectId(prosjektId);

  const project: Project | null = mockProjects[prosjektId] ?? { id: prosjektId, name: prosjektId };

  return { project };
}
