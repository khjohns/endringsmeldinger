/**
 * Projects API
 *
 * Leser prosjekter. Å opprette, endre og deaktivere prosjekt er fjernet (#1026).
 */

import { apiFetch } from './client';
import type { Project } from '../types/project';

/**
 * List all projects accessible to the current user.
 *
 * @returns List of projects
 */
export async function listProjects(): Promise<Project[]> {
  const data = await apiFetch<{ projects: Project[] }>('/api/projects');
  return data.projects;
}

/**
 * Get a single project by ID.
 *
 * @param projectId - The project to fetch
 * @returns The project
 */
export async function getProject(projectId: string): Promise<Project> {
  return apiFetch<Project>(`/api/projects/${encodeURIComponent(projectId)}`, {
    headers: { 'X-Project-ID': projectId },
  });
}
