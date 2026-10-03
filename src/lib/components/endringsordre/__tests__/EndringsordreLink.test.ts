import { render, screen, cleanup, fireEvent } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import EndringsordreLink from '../EndringsordreLink.svelte';
import { apiFetch, ApiError } from '$lib/api/client';
import type { SakState } from '$lib/types/timeline';

vi.mock('$lib/api/client', async (importOriginal) => {
  const original = await importOriginal<typeof import('$lib/api/client')>();
  return { ...original, apiFetch: vi.fn() };
});

// Oppdragsgivers beslutning 03.10 i #72: feiler hentingen, sier panelet det,
// i stedet for å vise saken som om den ikke hadde koblinger.
const sak = {
  sak_id: 'KOE-1',
  sakstype: 'standard',
  kan_utstede_eo: true,
  vederlag: { metode: 'ENHETSPRISER', status: 'godkjent' },
  frist: { krevd_dager: null, status: 'utkast' },
} as unknown as SakState;

beforeEach(() => vi.mocked(apiFetch).mockReset());
afterEach(cleanup);

describe('EndringsordreLink', () => {
  it('viser feil, ikke tom liste, når serveren svarer 503', async () => {
    vi.mocked(apiFetch).mockRejectedValueOnce(
      new ApiError(503, 'Kunne ikke hente relaterte saker. Prøv igjen senere.')
    );
    render(EndringsordreLink, { state: sak, projectId: 'p', role: 'BH' });

    expect(await screen.findByRole('alert')).toHaveTextContent('Kunne ikke hente relaterte saker');
    expect(screen.queryByText('Kravene er avklart')).not.toBeInTheDocument();
    expect(screen.queryByText(/Inngår i endringsordre/)).not.toBeInTheDocument();
  });

  it('henter på nytt når brukeren prøver igjen', async () => {
    vi.mocked(apiFetch)
      .mockRejectedValueOnce(new ApiError(503, 'nede'))
      .mockResolvedValueOnce({
        success: true,
        endringsordrer: [{ eo_sak_id: 'EO-1', eo_nummer: 'EO-001', status: 'utstedt' }],
      });
    render(EndringsordreLink, { state: sak, projectId: 'p', role: 'BH' });

    await fireEvent.click(await screen.findByRole('button', { name: /Prøv igjen/ }));

    expect(await screen.findByText('EO-001')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('viser tilbudet om endringsordre når saken ikke har koblinger', async () => {
    vi.mocked(apiFetch).mockResolvedValue({ success: true, endringsordrer: [] });
    render(EndringsordreLink, { state: sak, projectId: 'p', role: 'BH' });

    expect(await screen.findByText('Kravene er avklart')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
