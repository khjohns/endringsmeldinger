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

  it('keeps concurrent project list requests separately scoped', async () => {
    await Promise.all([
      fetchCaseList(undefined, 'project-a'),
      fetchCaseList('endring', 'project-b'),
    ]);

    expect(apiFetch).toHaveBeenNthCalledWith(1, '/api/cases', {
      headers: { 'X-Project-ID': 'project-a' },
    });
    expect(apiFetch).toHaveBeenNthCalledWith(2, '/api/cases?sakstype=endring', {
      headers: { 'X-Project-ID': 'project-b' },
    });
  });

  it('surfaces backend errors instead of falling back to example cases', async () => {
    const failure = new Error('Sak finnes ikke');
    vi.mocked(apiFetch).mockRejectedValue(failure);
    await expect(fetchCaseContext('missing', 'project-a')).rejects.toBe(failure);
  });
});
