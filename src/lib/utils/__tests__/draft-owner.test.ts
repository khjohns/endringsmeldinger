// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearDraft, draftKey, loadDraft, saveDraft } from '../draft';
import { getSession, logout } from '$lib/api/auth';
import { setDraftOwner } from '../draftOwner';

beforeEach(() => {
  localStorage.clear();
  setDraftOwner(null);
});
afterEach(() => vi.unstubAllGlobals());

async function login(id: string) {
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockImplementation(
        async () =>
          new Response(JSON.stringify({ user: { id, name: id, email: `${id}@example.test` } }))
      )
  );
  await getSession();
}

const NY_SAK = draftKey('kontraktsbord-ny', 'project');

describe('lokale utkast følger den innloggede', () => {
  it('gjenoppretter ikke et utkast for neste bruker i samme nettleser', async () => {
    await login('alice');
    saveDraft(NY_SAK, { tittel: 'Private draft' });

    await login('bob');

    expect(loadDraft(NY_SAK)).toBeNull();
  });

  it('gir utkastet tilbake til den som skrev det', async () => {
    await login('alice');
    saveDraft(NY_SAK, { tittel: 'Private draft' });

    await login('bob');
    await login('alice');

    expect(loadDraft(NY_SAK)).toEqual({ tittel: 'Private draft' });
  });

  it('lar Bobs eget utkast stå urørt av Alices', async () => {
    await login('alice');
    saveDraft(NY_SAK, { tittel: 'Alices tekst' });

    await login('bob');
    saveDraft(NY_SAK, { tittel: 'Bobs tekst' });
    await login('alice');

    expect(loadDraft(NY_SAK)).toEqual({ tittel: 'Alices tekst' });
  });

  it('rører ikke utkast fra før eierstempelet, og gjenoppretter dem ikke', async () => {
    // Nøkkelen uten eier er formatet fra før denne endringen.
    localStorage.setItem(NY_SAK, JSON.stringify({ tittel: 'Gammelt utkast' }));

    await login('alice');

    expect(loadDraft(NY_SAK)).toBeNull();
    saveDraft(NY_SAK, { tittel: 'Ny tekst' });
    clearDraft(NY_SAK);
    expect(localStorage.getItem(NY_SAK)).toBe(JSON.stringify({ tittel: 'Gammelt utkast' }));
  });

  it('skriver ingenting når ingen er innlogget', () => {
    saveDraft(NY_SAK, { tittel: 'Uten eier' });

    expect(loadDraft(NY_SAK)).toBeNull();
    expect(localStorage.length).toBe(0);
  });

  it('slutter å gjenopprette utkastet etter utlogging', async () => {
    await login('alice');
    saveDraft(NY_SAK, { tittel: 'Private draft' });

    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(
        async () =>
          new Response(JSON.stringify({ csrfToken: 'token' }), {
            headers: { 'content-type': 'application/json' },
          })
      )
    );
    vi.stubGlobal('location', { replace: vi.fn() });
    await logout();

    expect(loadDraft(NY_SAK)).toBeNull();
  });
});
