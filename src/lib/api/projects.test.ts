import { afterEach, expect, it, vi } from 'vitest';
import { clearCsrfToken, setActiveProjectId } from './client';
import { getProject, updateProject, deactivateProject } from './projects';

afterEach(() => {
  vi.unstubAllGlobals();
  clearCsrfToken();
  setActiveProjectId('oslobygg');
});

it('binds project reads and mutations to their explicit target after navigation', async () => {
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
  await updateProject('original', { name: 'Updated' });
  await deactivateProject('original');
  expect(requests).toEqual([
    { url: '/api/projects/original', project: 'original' },
    { url: '/api/projects/original', project: 'original' },
    { url: '/api/projects/original/deactivate', project: 'original' },
  ]);
});
