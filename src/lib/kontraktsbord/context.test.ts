import { describe, expect, it, vi } from 'vitest';
import { createCaseWorkspace } from './context.svelte';
import { createDemoStore } from '$lib/mockup/store.svelte';
import { scenario1_3AktiveSpor } from '$lib/mocks/caseState';
import type { CaseContextResponse } from '$lib/types/api';

function initial(version = 4): CaseContextResponse {
  return {
    version,
    state: structuredClone(scenario1_3AktiveSpor),
    timeline: [],
    historikk: { grunnlag: [], vederlag: [], frist: [] },
  };
}

function sender() {
  return vi.fn().mockResolvedValue({ success: true, event_id: 'new', tidsstempel: 'now' });
}

describe('case workspace', () => {
  it('isolates demo edits and drafts between mounted workspaces', () => {
    const first = createDemoStore();
    const second = createDemoStore();
    const previousResult = second.sak.grunnlag.bh_resultat;
    const previousDraft = second.getUI('frist').draft;
    first.sendGrunnlagSvar(previousResult === 'avslatt' ? 'godkjent' : 'avslatt');
    first.setDraft('frist', { text: 'draft' });
    expect(second.sak.grunnlag.bh_resultat).toBe(previousResult);
    expect(second.getUI('frist').draft).toBe(previousDraft);
  });

  it('scopes a write to the project and version, then replaces state with the server response', async () => {
    const sendEvent = sender();
    const next = initial(5);
    next.state.grunnlag.bh_resultat = 'avslatt';
    const workspace = createCaseWorkspace(initial(), {
      projectId: 'project-a',
      sendEvent,
      refetch: async () => next,
    });
    await workspace.submit('respons_grunnlag', { resultat: 'avslatt' });
    expect(sendEvent).toHaveBeenCalledWith(
      workspace.sak.sak_id,
      'respons_grunnlag',
      { resultat: 'avslatt' },
      { expectedVersion: 4, projectId: 'project-a' }
    );
    expect(workspace.version).toBe(5);
    expect(workspace.sak.grunnlag.bh_resultat).toBe('avslatt');
    expect(workspace.submitting).toBe(false);
  });

  it('keeps state and drafts on rejected submission', async () => {
    const sendEvent = vi.fn().mockRejectedValue(new Error('Versjonskonflikt'));
    const refetch = vi.fn();
    const workspace = createCaseWorkspace(initial(), { projectId: 'a', sendEvent, refetch });
    workspace.setDraft('ansvar', { text: 'Behold dette' });
    await expect(workspace.submit('respons_grunnlag', {})).rejects.toThrow('Versjonskonflikt');
    expect(workspace.version).toBe(4);
    expect(workspace.getUI('ansvar').draft?.text).toBe('Behold dette');
    expect(refetch).not.toHaveBeenCalled();
  });

  it('blocks duplicate writes after a successful save whose refresh failed', async () => {
    const sendEvent = sender();
    const refetch = vi
      .fn()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(initial(5))
      .mockResolvedValue(initial(6));
    const workspace = createCaseWorkspace(initial(), { projectId: 'a', sendEvent, refetch });
    await expect(workspace.submit('respons_grunnlag', {})).rejects.toThrow('Endringen er lagret');
    await expect(workspace.submit('respons_grunnlag', {})).rejects.toThrow('Svaret er lagret');
    expect(sendEvent).toHaveBeenCalledTimes(1);
    await workspace.refresh();
    await workspace.submit('respons_grunnlag', {});
    expect(sendEvent).toHaveBeenCalledTimes(2);
  });

  it('rejects replacement with another case', () => {
    const workspace = createCaseWorkspace(initial(), { projectId: 'a' });
    const other = initial();
    other.state.sak_id = 'other';
    expect(() => workspace.replace(other)).toThrow('Kan ikke bytte sak');
  });

  it('pins the version of an open form despite background refreshes', async () => {
    const sendEvent = sender();
    const refetch = vi.fn().mockResolvedValueOnce(initial(6)).mockResolvedValue(initial(7));
    const workspace = createCaseWorkspace(initial(), { projectId: 'a', sendEvent, refetch });
    workspace.beginEdit('BH:ansvar');
    workspace.replace(initial(5));
    workspace.beginEdit('BH:ansvar');
    await workspace.submit('respons_grunnlag', {});
    expect(sendEvent.mock.calls[0][3].expectedVersion).toBe(4);
    workspace.endEdit();
    workspace.beginEdit('BH:frist');
    await workspace.submit('respons_frist', {});
    expect(sendEvent.mock.calls[1][3].expectedVersion).toBe(6);
  });

  it('ignores old background results', () => {
    const workspace = createCaseWorkspace(initial(5), { projectId: 'a' });
    workspace.replace(initial(4));
    expect(workspace.version).toBe(5);
  });

  it('does not unlock another write when refresh has not caught up with the saved event', async () => {
    const sendEvent = sender();
    const workspace = createCaseWorkspace(initial(), {
      projectId: 'a',
      sendEvent,
      refetch: async () => initial(),
    });
    await expect(workspace.submit('respons_grunnlag', {})).rejects.toThrow('Endringen er lagret');
    workspace.replace(initial());
    await expect(workspace.submit('respons_grunnlag', {})).rejects.toThrow('Svaret er lagret');
    expect(sendEvent).toHaveBeenCalledTimes(1);
  });
});
