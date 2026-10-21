import { afterEach, expect, it, vi } from 'vitest';
import { clearCsrfToken, setActiveProjectId } from './client';
import { getProject } from './projects';

afterEach(() => {
  vi.unstubAllGlobals();
  clearCsrfToken();
  setActiveProjectId('oslobygg');
});

it('binder prosjektlesingen til prosjektet den gjelder, også etter navigering', async () => {
  const requests: { url: string; project: string | null }[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, options: RequestInit) => {
      if (url.endsWith('/api/csrf-token'))
        return new Response(JSON.stringify({ csrfToken: 'csrf' }));
      requests.push({ url, project: new Headers(options.headers).get('X-Project-ID') });
      return new Response(JSON.stringify({ project: { id: 'original' } }), {
        headers: { 'Content-Type': 'application/json' },
      });
    })
  );
  setActiveProjectId('new-project');
  await getProject('original');
  expect(requests).toEqual([{ url: '/api/projects/original', project: 'original' }]);
});
