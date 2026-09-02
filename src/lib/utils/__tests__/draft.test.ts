// @vitest-environment jsdom

import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { clearDraft, draftKey, loadDraft, saveDraft } from '$lib/utils/draft';

describe('draft persistence', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('stores and loads mutable form data locally', () => {
    const key = draftKey('send-vederlag', 'SAK-001');
    const draft = { belop: 125_000, begrunnelseHtml: '<p>Arbeid</p>' };

    saveDraft(key, draft);

    expect(localStorage.getItem(key)).toBe(JSON.stringify(draft));
    expect(loadDraft<typeof draft>(key)).toEqual(draft);
  });

  it('does not call the network while saving a draft', () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    saveDraft(draftKey('ny', 'prosjekt-a'), { tittel: 'Pågående arbeid' });

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('clears a draft without leaving persisted form data', () => {
    const key = draftKey('send-frist', 'SAK-002');
    saveDraft(key, { antallDager: 10 });

    clearDraft(key);

    expect(loadDraft(key)).toBeNull();
  });

  it('returns null for malformed persisted data', () => {
    const key = draftKey('ny', 'prosjekt-b');
    localStorage.setItem(key, '{not-json');

    expect(loadDraft(key)).toBeNull();
  });
});
