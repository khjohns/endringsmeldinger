import { setActiveProjectId } from '$lib/api/client';
import { getProject } from '$lib/api/projects';
import type { LayoutLoad } from './$types';

export const load: LayoutLoad = async ({ params, parent }) => {
  await parent();
  const { prosjektId } = params;
  // Keep mutation requests scoped to the project in the URL.
  setActiveProjectId(prosjektId);
  const project = await getProject(prosjektId);
  return { project };
};
