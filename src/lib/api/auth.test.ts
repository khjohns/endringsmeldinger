import { afterEach, describe, expect, it, vi } from 'vitest';
import { getSession, loginUrl, logout } from './auth';
import { apiFetch, clearCsrfToken } from './client';

afterEach(() => {
  vi.unstubAllGlobals();
  clearCsrfToken();
});

describe('cookie authentication', () => {
  it('loads the current session using credentials', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ user: { id: 'stable-user' } })));
    vi.stubGlobal('fetch', fetch);
    expect(await getSession()).toEqual({ id: 'stable-user' });
    expect(fetch.mock.calls[0][1].credentials).toBe('include');
  });

  it('preserves unauthorized status for the login redirect', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 401 })));
    await expect(getSession()).rejects.toMatchObject({ status: 401 });
  });

  it('sends a session-bound CSRF token and credentials on mutations', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ csrfToken: 'csrf-for-session' })))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ success: true }), {
          headers: { 'Content-Type': 'application/json' },
        })
      );
    vi.stubGlobal('fetch', fetch);
    await apiFetch('/api/auth/logout', { method: 'POST' });
    expect(fetch.mock.calls[0][1].credentials).toBe('include');
    expect(fetch.mock.calls[1][1].credentials).toBe('include');
    expect(new Headers(fetch.mock.calls[1][1].headers).get('X-CSRF-Token')).toBe(
      'csrf-for-session'
    );
    expect(new Headers(fetch.mock.calls[1][1].headers).has('Authorization')).toBe(false);
  });

  it('utloggingen tømmer fanens lagring, så neste bruker ikke får skjemaet for ny sak (#1678)', async () => {
    const lagret = new Map<string, string>();
    vi.stubGlobal('sessionStorage', {
      setItem: (k: string, v: string) => lagret.set(k, v),
      clear: () => lagret.clear(),
    });
    vi.stubGlobal('window', { location: { replace: vi.fn() } });
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(new Response(JSON.stringify({ csrfToken: 'csrf' })))
        .mockResolvedValueOnce(new Response(JSON.stringify({ success: true })))
    );
    sessionStorage.setItem('nysak:ventende:bruker-a:p1', '{"sakId":"sak-1"}');
    await logout();
    expect(lagret.size).toBe(0);
    expect(window.location.replace).toHaveBeenCalledWith('/login');
  });

  it('delegates OAuth state and callback construction to the backend', () => {
    expect(loginUrl('/p/c?tab=history')).toContain(
      '/api/auth/catenda/login?return_to=%2Fp%2Fc%3Ftab%3Dhistory'
    );
    expect(loginUrl()).not.toContain('client_secret');
  });
});
