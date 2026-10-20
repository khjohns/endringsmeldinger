import type { Role, SporKey } from '$lib/components/kontraktsbord/types';

export interface FollowUpTask {
  id: string;
  caseId: string;
  caseTitle: string;
  track: SporKey;
  role: Role;
  title: string;
  detail: string;
  mode: 'read' | 'form';
}

export function taskHref(task: FollowUpTask, projectId: string, scenario?: string): string {
  const params = new URLSearchParams({ spor: task.track, rolle: task.role });
  if (task.mode === 'form') params.set('mode', 'form');
  if (scenario) params.set('scenario', scenario);
  return `${scenario ? '/mockup' : `/${encodeURIComponent(projectId)}/${encodeURIComponent(task.caseId)}`}?${params}`;
}
