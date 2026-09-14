import { afterEach, expect, it, vi } from 'vitest';
import { apiFetch, clearCsrfToken, setActiveProjectId } from './client';

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
  clearCsrfToken();
  setActiveProjectId('oslobygg');
});

it('reports the actual retry error instead of the obsolete CSRF error', async () => {
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(json({ csrfToken: 'old' }))
    .mockResolvedValueOnce(json({ error: 'CSRF validation failed' }, 403))
    .mockResolvedValueOnce(json({ csrfToken: 'new' }))
    .mockResolvedValueOnce(json({ message: 'Kravet er endret' }, 409));
  vi.stubGlobal('fetch', fetch);
  await expect(apiFetch('/api/events', { method: 'POST' })).rejects.toMatchObject({
    status: 409,
    message: 'Kravet er endret',
  });
  expect(fetch).toHaveBeenCalledTimes(4);
});

it('redirects when the session expires during the CSRF retry', async () => {
  const replace = vi.fn();
  vi.stubGlobal('window', { location: { pathname: '/p/c', search: '?view=read', replace } });
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockResolvedValueOnce(json({ csrfToken: 'old' }))
      .mockResolvedValueOnce(json({ error: 'CSRF validation failed' }, 403))
      .mockResolvedValueOnce(json({ csrfToken: 'new' }))
      .mockResolvedValueOnce(json({ message: 'Sesjonen er utløpt' }, 401))
  );
  await expect(apiFetch('/api/events', { method: 'POST' })).rejects.toMatchObject({ status: 401 });
  expect(replace).toHaveBeenCalledWith('/login?return_to=%2Fp%2Fc%3Fview%3Dread');
});

it.each([
  new Headers({ 'X-Project-ID': 'explicit' }),
  [['X-Project-ID', 'explicit']] as [string, string][],
])('preserves explicit project headers in every RequestInit form', async (headers) => {
  const fetch = vi.fn().mockResolvedValue(json({}));
  vi.stubGlobal('fetch', fetch);
  setActiveProjectId('other');
  await apiFetch('/api/cases/c/state', { headers });
  expect(new Headers(fetch.mock.calls[0][1].headers).get('X-Project-ID')).toBe('explicit');
});

it('keeps the original project while waiting for CSRF and never retries a network failure', async () => {
  let resolve!: (response: Response) => void;
  const fetch = vi
    .fn()
    .mockReturnValueOnce(
      new Promise<Response>((r) => {
        resolve = r;
      })
    )
    .mockRejectedValueOnce(new TypeError('offline'));
  vi.stubGlobal('fetch', fetch);
  setActiveProjectId('original');
  const request = apiFetch('/api/events', { method: 'POST' });
  setActiveProjectId('next');
  resolve(json({ csrfToken: 'token' }));
  await expect(request).rejects.toMatchObject({ status: 0 });
  expect(new Headers(fetch.mock.calls[1][1].headers).get('X-Project-ID')).toBe('original');
  expect(fetch).toHaveBeenCalledTimes(2);
});

it('uses a fresh CSRF token without letting caller headers override it', async () => {
  const tokens: (string | null)[] = [];
  let requests = 0;
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, options: RequestInit) => {
      if (url.endsWith('/api/csrf-token'))
        return json({ csrfToken: requests ? 'fresh' : 'initial' });
      tokens.push(new Headers(options.headers).get('X-CSRF-Token'));
      requests++;
      return requests === 1
        ? json({ error: 'CSRF validation failed' }, 403)
        : json({ success: true });
    })
  );
  await expect(
    apiFetch('/api/events', { method: 'POST', headers: { 'X-CSRF-Token': 'stale' } })
  ).resolves.toEqual({ success: true });
  expect(tokens).toEqual(['initial', 'fresh']);
});

it('does not keep retrying repeated CSRF rejections', async () => {
  const fetch = vi.fn(async (url: string) =>
    url.endsWith('/api/csrf-token')
      ? json({ csrfToken: 'token' })
      : json({ error: 'CSRF validation failed' }, 403)
  );
  vi.stubGlobal('fetch', fetch);
  await expect(apiFetch('/api/events', { method: 'POST' })).rejects.toMatchObject({ status: 403 });
  expect(fetch).toHaveBeenCalledTimes(4);
});

it('redirects if fetching the CSRF token reveals an expired session', async () => {
  const replace = vi.fn();
  vi.stubGlobal('window', { location: { pathname: '/p/c', search: '', replace } });
  const fetch = vi.fn().mockResolvedValue(json({}, 401));
  vi.stubGlobal('fetch', fetch);
  await expect(apiFetch('/api/events', { method: 'POST' })).rejects.toMatchObject({ status: 401 });
  expect(replace).toHaveBeenCalledWith('/login?return_to=%2Fp%2Fc');
  expect(fetch).toHaveBeenCalledTimes(1);
});

it('does not let a delayed token response repopulate the cache after it was cleared', async () => {
  let resolveOld!: (response: Response) => void;
  const tokens: (string | null)[] = [];
  let tokenRequests = 0;
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, options: RequestInit) => {
      if (url.endsWith('/api/csrf-token')) {
        tokenRequests++;
        if (tokenRequests === 1)
          return new Promise<Response>((resolve) => {
            resolveOld = resolve;
          });
        return json({ csrfToken: 'current-session' });
      }
      tokens.push(new Headers(options.headers).get('X-CSRF-Token'));
      return json({ success: true });
    })
  );
  const oldRequest = apiFetch('/api/events', { method: 'POST' });
  clearCsrfToken();
  await apiFetch('/api/events', { method: 'POST' });
  resolveOld(json({ csrfToken: 'expired-session' }));
  await oldRequest;
  await apiFetch('/api/events', { method: 'POST' });
  expect(tokens.at(-1)).toBe('current-session');
  expect(tokenRequests).toBe(2);
});
