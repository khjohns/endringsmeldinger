import { afterEach, expect, it, vi } from 'vitest';
import { apiFetch } from '../client';
import { hentUtkast, lagreUtkast, slettUtkast } from '../utkast';

vi.mock('../client', async (original) => ({
  ...(await original<typeof import('../client')>()),
  apiFetch: vi.fn(),
}));
afterEach(() => vi.resetAllMocks());

it('krever bekreftet team fra serveren også for tomme utkast', async () => {
  vi.mocked(apiFetch).mockResolvedValueOnce({ utkast: null });
  await expect(hentUtkast('S1', 'grunnlag', 1, 'p')).rejects.toThrow('teamtilgangen');
  vi.mocked(apiFetch).mockResolvedValueOnce({ utkast: null, team_id: 'team-bh', user_id: 'alice' });
  expect(await hentUtkast('S1', 'grunnlag', 1, 'p')).toEqual({
    utkast: null,
    team_id: 'team-bh',
    user_id: 'alice',
  });
});

it('binder lesing, lagring og sletting til eksplisitt prosjekt', async () => {
  vi.mocked(apiFetch).mockResolvedValue({ utkast: null, team_id: 'team-bh', user_id: 'alice' });
  await hentUtkast('S/1', 'grunnlag', 1, 'p');
  await lagreUtkast('S/1', 'grunnlag', 1, { tekst: 'tekst' }, null, 'p');
  await slettUtkast('S/1', 'grunnlag', 1, 'p');
  for (const [url, options] of vi.mocked(apiFetch).mock.calls) {
    expect(url).toContain('/S%2F1/utkast/');
    expect(options?.headers).toEqual({ 'X-Project-ID': 'p' });
  }
});
