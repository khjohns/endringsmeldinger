/** Catenda membership cache; local roles can only restrict access to viewer. */
import { apiFetch } from './client';
import type { ProjectMembership } from '../types/membership';

export async function listMembers(projectId: string): Promise<ProjectMembership[]> {
  const data = await apiFetch<{ members: ProjectMembership[] }>(
    `/api/projects/${encodeURIComponent(projectId)}/members`
  );
  return data.members;
}

export async function syncMembers(projectId: string): Promise<void> {
  await apiFetch(`/api/projects/${encodeURIComponent(projectId)}/members/sync`, { method: 'POST' });
}

export async function setViewerLimit(
  projectId: string,
  memberId: string,
  limited: boolean
): Promise<void> {
  await apiFetch(
    `/api/projects/${encodeURIComponent(projectId)}/members/${encodeURIComponent(memberId)}`,
    {
      method: 'PATCH',
      body: JSON.stringify({ viewer_override: limited }),
    }
  );
}
