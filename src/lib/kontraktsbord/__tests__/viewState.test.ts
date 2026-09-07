import { describe, expect, it } from 'vitest';
import { readWorkspaceView, workspaceViewUrl } from '../viewState';

describe('workspace URLs', () => {
  it('restores track, role and form from a shareable URL', () => {
    expect(readWorkspaceView(new URLSearchParams('spor=frist&rolle=TE&mode=form'))).toEqual({
      track: 'frist',
      role: 'TE',
      mode: 'form',
    });
  });

  it('uses safe defaults for missing and invalid values', () => {
    expect(
      readWorkspaceView(new URLSearchParams('spor=unknown&rolle=admin&mode=delete'), 'TE')
    ).toEqual({ track: 'ansvar', role: 'TE', mode: 'read' });
    expect(readWorkspaceView(new URLSearchParams()).role).toBe('BH');
  });

  it('round trips a view while retaining unrelated query parameters and anchors', () => {
    const original = new URL('https://example.test/project/case?filter=open&mode=form#history');
    const view = { track: 'vederlag', role: 'BH', mode: 'read' } as const;
    const relative = workspaceViewUrl(original, view);
    const updated = new URL(relative, original);
    expect(updated.pathname).toBe('/project/case');
    expect(updated.searchParams.get('filter')).toBe('open');
    expect(updated.searchParams.has('mode')).toBe(false);
    expect(updated.hash).toBe('#history');
    expect(readWorkspaceView(updated.searchParams)).toEqual(view);
    expect(original.searchParams.get('mode')).toBe('form');
  });
});
