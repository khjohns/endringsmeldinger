// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it } from 'vitest';
import { draftKey, saveDraft, loadDraft } from '../draft';
import { getSession } from '$lib/api/auth';
import { vi } from 'vitest';

beforeEach(() => localStorage.clear());
afterEach(() => vi.unstubAllGlobals());
async function login(id: string) {
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ user: { id, name: id, email: `${id}@example.test` } }))
      )
  );
  await getSession();
}

// Known legacy-storage defect. The replacement is team-scoped server drafts, not personal drafts.
it.fails(
  'does not automatically restore an ownerless legacy draft after a user change',
  async () => {
    await login('alice');
    saveDraft(draftKey('kontraktsbord-ny', 'project'), { tittel: 'Private draft' });
    await login('bob');
    expect(loadDraft(draftKey('kontraktsbord-ny', 'project'))).toBeNull();
  }
);
