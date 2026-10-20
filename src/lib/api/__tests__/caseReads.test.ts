import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiFetch } from '../client';
import { fetchCaseList } from '../cases';
import { fetchCaseContext } from '../state';

vi.mock('../client', () => ({ apiFetch: vi.fn() }));

describe('project-scoped case reads', () => {
  beforeEach(() => {
    vi.mocked(apiFetch).mockReset();
  });

  it('returns backend context and scopes a case ID to its project', async () => {
    const context = { version: 7, state: { sak_id: 'sak/1' } };
    vi.mocked(apiFetch).mockResolvedValue(context);

    expect(await fetchCaseContext('sak/1', 'project-a')).toBe(context);
    expect(apiFetch).toHaveBeenCalledWith('/api/cases/sak%2F1/context', {
      headers: { 'X-Project-ID': 'project-a' },
    });
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

  it('surfaces backend errors instead of falling back to example cases', async () => {
    const failure = new Error('Sak finnes ikke');
    vi.mocked(apiFetch).mockRejectedValue(failure);
    await expect(fetchCaseContext('missing', 'project-a')).rejects.toBe(failure);
  });
});
