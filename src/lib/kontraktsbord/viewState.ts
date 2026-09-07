import type { Mode, Role, SporKey } from '$lib/components/kontraktsbord/types';

export interface WorkspaceView {
  track: SporKey;
  mode: Mode;
  role: Role;
}

export function readWorkspaceView(
  params: URLSearchParams,
  defaultRole: Role = 'BH'
): WorkspaceView {
  const track = params.get('spor');
  const role = params.get('rolle');
  return {
    track: track === 'frist' || track === 'vederlag' ? track : 'ansvar',
    mode: params.get('mode') === 'form' ? 'form' : 'read',
    role: role === 'TE' || role === 'BH' ? role : defaultRole,
  };
}

export function workspaceViewUrl(url: URL, view: WorkspaceView): string {
  const next = new URL(url);
  next.searchParams.set('spor', view.track);
  next.searchParams.set('rolle', view.role);
  if (view.mode === 'form') next.searchParams.set('mode', 'form');
  else next.searchParams.delete('mode');
  return next.pathname + next.search + next.hash;
}
