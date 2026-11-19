import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, apiFetch } from '../client';
import { hentKjernesakMedMerking } from '../kjerne';

vi.mock('../client', async (original) => ({
  ...(await original<typeof import('../client')>()),
  apiFetch: vi.fn(),
}));

const SAKEN = {
  sak_id: 's-1',
  journal: [],
  leveringsoppdrag: [],
  catenda_lenke: null,
  part: 'TE',
  sakskode: null,
  kan_foreslaa_sakskode: true,
};

describe('saken med merkingen (review av #2202)', () => {
  beforeEach(() => vi.mocked(apiFetch).mockReset());

  it.each(['TE', null])('tildelt sakskode lastes via saken for %s (#2210)', async (part) => {
    const sakskode = { kode: 'koe', loepenummer: 17 };
    vi.mocked(apiFetch)
      .mockResolvedValueOnce({ ...SAKEN, part, sakskode, kontraktsforkortelse: null })
      .mockResolvedValueOnce({ frister: [], saker_ikke_forstaatt: [] });
    const sak = await hentKjernesakMedMerking('s-1', 'p-1');
    expect(sak.merking?.sakskode).toEqual(sakskode);
    expect(vi.mocked(apiFetch).mock.calls.map(([sti]) => sti)).toEqual([
      '/api/kjerne/saker/s-1',
      '/api/projects/p-1/kontraktsfrister',
    ]);
  });

  it('en 403 fra merkingen etter at saken er lest, sier ikke at saken mangler tilgang', async () => {
    vi.mocked(apiFetch).mockImplementation(async (...a: unknown[]) => {
      const sti = String(a[0]);
      if (sti.endsWith('/sakskode')) throw new ApiError(403, 'Mangler rolle.');
      if (sti.includes('kontraktsfrister')) return { frister: [] };
      return SAKEN;
    });
    const feil = await hentKjernesakMedMerking('s-1', 'p-1').catch((e: unknown) => e);
    expect(feil).toBeInstanceOf(ApiError);
    expect((feil as ApiError).status).not.toBe(403);
  });

  it('kontrollsak: en 403 på saken selv står', async () => {
    vi.mocked(apiFetch).mockRejectedValueOnce(new ApiError(403, 'Ingen tilgang.'));
    const feil = await hentKjernesakMedMerking('s-1', 'p-1').catch((e: unknown) => e);
    expect((feil as ApiError).status).toBe(403);
  });
});
