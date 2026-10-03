import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/svelte';
import SkjemaStatus from '../SkjemaStatus.svelte';
import { hentVedlegg } from '$lib/api/vedlegg';

vi.mock('$lib/api/vedlegg', async (original) => ({
  ...(await original<typeof import('$lib/api/vedlegg')>()),
  hentVedlegg: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(hentVedlegg).mockResolvedValue({ vedlegg: [], minRolle: 'TE' });
});
afterEach(cleanup);

function props(overstyr: Record<string, unknown> = {}) {
  return {
    sender: false,
    feil: null,
    utkastStatus: 'uendret' as const,
    konflikt: null,
    sistEndretAv: null,
    behold: vi.fn(),
    hentInn: vi.fn(),
    sakId: 'sak-1',
    visVedlegg: true,
    vedleggIds: [],
    vedleggOpptatt: false,
    ...overstyr,
  };
}

it('annonserer innsending som status og feilen som varsel', () => {
  render(SkjemaStatus, props({ sender: true, feil: 'Saken er endret av en annen bruker' }));
  expect(screen.getByText('Sender …')).toHaveAttribute('role', 'status');
  expect(screen.getByRole('alert')).toHaveTextContent('Saken er endret av en annen bruker');
});

it('viser verken status eller feil når ingenting skjer', () => {
  render(SkjemaStatus, props());
  expect(screen.queryByRole('status')).toBeNull();
  expect(screen.queryByRole('alert')).toBeNull();
});

it('sender valget ved utkastkonflikt videre til skjemaets utkast', async () => {
  const behold = vi.fn();
  const hentInn = vi.fn();
  render(
    SkjemaStatus,
    props({ utkastStatus: 'konflikt', konflikt: { oppdatert_av: 'Kollega' }, behold, hentInn })
  );
  expect(screen.getByRole('alert')).toHaveTextContent('Kollega har endret utkastet');
  await fireEvent.click(screen.getByRole('button', { name: 'Behold min tekst' }));
  expect(behold).toHaveBeenCalledOnce();
  await fireEvent.click(screen.getByRole('button', { name: 'Hent inn deres' }));
  expect(hentInn).toHaveBeenCalledOnce();
});

it('skjuler vedleggsvelgeren i demo', () => {
  render(SkjemaStatus, props({ visVedlegg: false }));
  expect(screen.queryByText('Vedlegg (valgfritt)')).toBeNull();
  expect(hentVedlegg).not.toHaveBeenCalled();
});

it('viser antall valgte vedlegg og deaktiverer opplasting under innsending', async () => {
  render(SkjemaStatus, props({ sender: true, vedleggIds: ['a', 'b'] }));
  expect(screen.getByText('Vedlegg (valgfritt) · 2 valgt')).toBeInTheDocument();
  expect(await screen.findByLabelText('Last opp nytt vedlegg')).toBeDisabled();
});
