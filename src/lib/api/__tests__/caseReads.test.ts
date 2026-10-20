import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiFetch } from '../client';
import { fetchCaseList } from '../cases';

vi.mock('../client', () => ({ apiFetch: vi.fn() }));

describe('project-scoped case reads', () => {
  beforeEach(() => {
    vi.mocked(apiFetch).mockReset();
  });

  it('sakslisten leses fra prosjektinngangen i TS, med prosjektet i stien og headeren (#1022)', async () => {
    await Promise.all([fetchCaseList('project-a'), fetchCaseList('prosjekt/b')]);

    expect(apiFetch).toHaveBeenNthCalledWith(1, '/api/projects/project-a/saker', {
      headers: { 'X-Project-ID': 'project-a' },
    });
    expect(apiFetch).toHaveBeenNthCalledWith(2, '/api/projects/prosjekt%2Fb/saker', {
      headers: { 'X-Project-ID': 'prosjekt/b' },
    });
  });
});
