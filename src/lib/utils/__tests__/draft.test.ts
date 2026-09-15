// @vitest-environment jsdom

import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { clearDraft, draftKey, loadDraft, saveDraft } from '$lib/utils/draft';
import { setDraftOwner } from '$lib/utils/draftOwner';

describe('draft persistence', () => {
  beforeEach(() => {
    localStorage.clear();
    // Utkast lagres bare for en bekreftet innlogget bruker; uten eier gjør
    // save/load ingenting, og testene under ville blitt innholdsløse.
    setDraftOwner('saksbehandler-1');
  });

  afterEach(() => {
    setDraftOwner(null);
    vi.restoreAllMocks();
  });

  it('stores and loads mutable form data locally', () => {
    const key = draftKey('send-vederlag', 'SAK-001');
    const draft = { belop: 125_000, begrunnelseHtml: '<p>Arbeid</p>' };

    saveDraft(key, draft);

    expect(loadDraft<typeof draft>(key)).toEqual(draft);
    // Utkastet ligger under en nøkkel som bærer eieren, ikke under den nakne.
    expect(localStorage.getItem(key)).toBeNull();
    expect(localStorage.getItem(`${key}::saksbehandler-1`)).toBe(JSON.stringify(draft));
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
    expect(localStorage.length).toBe(0);
  });

  it('returns null for malformed persisted data', () => {
    const key = draftKey('ny', 'prosjekt-b');
    localStorage.setItem(`${key}::saksbehandler-1`, '{not-json');

    expect(loadDraft(key)).toBeNull();
  });
});
