import { render, fireEvent, waitFor, cleanup } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import EndringsordreForm from '../EndringsordreForm.svelte';
import { createEndringsordre, fetchEOCandidates, fetchNextEONumber } from '$lib/api/endringsordre';

vi.mock('$lib/api/endringsordre', () => ({
  createEndringsordre: vi.fn(),
  fetchEOCandidates: vi.fn(),
  fetchNextEONumber: vi.fn(),
}));
vi.mock('$app/environment', () => ({ browser: true }));
const props = {
  projectId: 'project',
  projectName: 'Skoleprosjekt',
  userId: 'user',
  oncreated: vi.fn(),
};
const key = 'koe-draft-endringsordre-project:user';

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  vi.mocked(fetchNextEONumber).mockResolvedValue({ neste_nummer: 'EO-001' });
  vi.mocked(fetchEOCandidates).mockResolvedValue({
    kandidat_saker: [
      {
        sak_id: 'KOE-1',
        tittel: 'Fundament',
        sum_godkjent: 120000,
        godkjent_dager: 7,
        overordnet_status: 'OMFORENT',
        har_vederlagskrav: true,
        har_fristkrav: true,
      },
      {
        sak_id: 'KOE-2',
        tittel: 'Fasade',
        sum_godkjent: 30000,
        godkjent_dager: 5,
        overordnet_status: 'OMFORENT',
        har_vederlagskrav: true,
        har_fristkrav: true,
      },
    ],
  });
  vi.mocked(createEndringsordre).mockResolvedValue({
    success: true,
    sak_id: 'EO-created',
    catenda_synced: false,
  });
});
afterEach(cleanup);

describe('utsted endringsordre', () => {
  it('uses only local demo operations and keeps navigation inside the mockup', async () => {
    const issue = vi.fn(() => ({ success: true, sak_id: 'demo-order', catenda_synced: false }));
    const screen = render(EndringsordreForm, {
      ...props,
      demo: { getCandidates: () => [], getNextNumber: () => 'EO-demo', issue },
    });
    await waitFor(() =>
      expect(screen.getByLabelText('Endringsordrenummer')).toHaveValue('EO-demo')
    );
    expect(screen.getByRole('link', { name: 'Til saksoversikten' })).toHaveAttribute(
      'href',
      '/mockup/oversikt'
    );
    await fireEvent.input(screen.getByLabelText('Beskriv endringen som pålegges'), {
      target: { value: 'Et lokalt eksempel.' },
    });
    await fireEvent.click(screen.getByRole('button', { name: 'Kontroller endringsordre' }));
    await fireEvent.click(screen.getByRole('checkbox'));
    await fireEvent.click(screen.getByRole('button', { name: 'Utsted endringsordre' }));
    await waitFor(() => expect(issue).toHaveBeenCalledOnce());
    expect(createEndringsordre).not.toHaveBeenCalled();
    expect(fetchEOCandidates).not.toHaveBeenCalled();
    expect(fetchNextEONumber).not.toHaveBeenCalled();
    expect(screen.getByRole('link', { name: 'Åpne utstedt endringsordre' })).toHaveAttribute(
      'href',
      '/mockup/endringsordre/demo-order'
    );
  });
  it('preserves direct consequences when switching creation mode', async () => {
    const screen = render(EndringsordreForm, props);
    await waitFor(() => expect(screen.getByLabelText('Endringsordrenummer')).toHaveValue('EO-001'));
    await fireEvent.click(screen.getByRole('button', { name: /Formaliser avtalte KOE-krav/ }));
    await fireEvent.click(screen.getByRole('button', { name: /Pålegg om endring/ }));
    expect(screen.getByLabelText('Vederlagskonsekvens')).toHaveValue('uavklart');
    expect(screen.getByLabelText('Fristkonsekvens')).toHaveValue('uavklart');
    await fireEvent.change(screen.getByLabelText('Vederlagskonsekvens'), {
      target: { value: 'avklart' },
    });
    await fireEvent.input(screen.getByLabelText('Tillegg (kr ekskl. mva.)'), {
      target: { value: '45000' },
    });
    await fireEvent.click(screen.getByRole('button', { name: /Formaliser avtalte KOE-krav/ }));
    await fireEvent.click(screen.getByRole('button', { name: /Pålegg om endring/ }));
    expect(screen.getByLabelText('Tillegg (kr ekskl. mva.)')).toHaveValue(45000);
  });
  it('places a negative KOE agreement in the deduction field', async () => {
    vi.mocked(fetchEOCandidates).mockResolvedValue({
      kandidat_saker: [
        {
          sak_id: 'KOE-1',
          tittel: 'Redusert omfang',
          sum_godkjent: -10000,
          godkjent_dager: null,
          overordnet_status: 'OMFORENT',
          har_vederlagskrav: true,
        },
      ],
    });
    const screen = render(EndringsordreForm, { ...props, initialKoe: 'KOE-1' });
    await screen.findByRole('checkbox', { name: /KOE-1/ });
    expect(screen.getByLabelText('Tillegg (kr ekskl. mva.)')).toHaveValue(0);
    expect(screen.getByLabelText('Fradrag (kr ekskl. mva.)')).toHaveValue(10000);
  });
  it('requires document review, submits unresolved direct order once, and clears its draft', async () => {
    const screen = render(EndringsordreForm, props);
    await waitFor(() => expect(screen.getByLabelText('Endringsordrenummer')).toHaveValue('EO-001'));
    await fireEvent.input(screen.getByLabelText('Beskriv endringen som pålegges'), {
      target: { value: 'Byggherren pålegger et større fundament.' },
    });
    await fireEvent.click(screen.getByRole('button', { name: 'Kontroller endringsordre' }));
    expect(screen.getAllByText('Uavklart')).toHaveLength(2);
    const issue = screen.getByRole('button', { name: 'Utsted endringsordre' });
    expect(issue).toBeDisabled();
    expect(createEndringsordre).not.toHaveBeenCalled();
    await fireEvent.click(screen.getByRole('checkbox'));
    await fireEvent.click(issue);
    await waitFor(() => expect(props.oncreated).toHaveBeenCalledWith('EO-created'));
    expect(createEndringsordre).toHaveBeenCalledOnce();
    expect(vi.mocked(createEndringsordre).mock.calls[0]).toMatchObject([
      'project',
      { koe_sak_ids: [], konsekvenser: { pris: true, fremdrift: true } },
    ]);
    expect(vi.mocked(createEndringsordre).mock.calls[0][1].kompensasjon_belop).toBeUndefined();
    expect(localStorage.getItem(key)).toBeNull();
  });
  it('prefills one KOE, adds another, and requires a separately entered combined deadline', async () => {
    const screen = render(EndringsordreForm, { ...props, initialKoe: 'KOE-1' });
    const second = await screen.findByRole('checkbox', { name: /KOE-2/ });
    expect(screen.getByRole('checkbox', { name: /KOE-1/ })).toBeChecked();
    await fireEvent.click(second);
    expect(screen.getByLabelText('Tillegg (kr ekskl. mva.)')).toHaveValue(150000);
    expect(screen.getByLabelText('Tillegg (kr ekskl. mva.)')).toHaveAttribute('readonly');
    expect(screen.getByLabelText('Samlet fristforlengelse (dager)')).toHaveValue(null);
    await fireEvent.input(screen.getByLabelText('Beskriv avtalen som formaliseres'), {
      target: { value: 'Enigheten om fundament og fasade formaliseres.' },
    });
    await fireEvent.change(screen.getByLabelText('Oppgjørsform'), {
      target: { value: 'FASTPRIS_TILBUD' },
    });
    expect(screen.getByRole('button', { name: 'Kontroller endringsordre' })).toBeDisabled();
    await fireEvent.input(screen.getByLabelText('Samlet fristforlengelse (dager)'), {
      target: { value: '8' },
    });
    await fireEvent.click(screen.getByRole('button', { name: 'Kontroller endringsordre' }));
    expect(screen.getByText('8 dager')).toBeInTheDocument();
    await fireEvent.click(screen.getByRole('checkbox'));
    await fireEvent.click(screen.getByRole('button', { name: 'Utsted endringsordre' }));
    await waitFor(() => expect(createEndringsordre).toHaveBeenCalledOnce());
    expect(vi.mocked(createEndringsordre).mock.calls[0][1]).toMatchObject({
      koe_sak_ids: ['KOE-1', 'KOE-2'],
      kompensasjon_belop: 150000,
      frist_dager: 8,
    });
  });
  it('retains text and source selection after a failure and restores them after remount', async () => {
    vi.mocked(createEndringsordre).mockRejectedValue(new Error('KOE-saken har blitt endret.'));
    const screen = render(EndringsordreForm, { ...props, initialKoe: 'KOE-1' });
    await screen.findByRole('checkbox', { name: /KOE-1/ });
    await fireEvent.input(screen.getByLabelText('Beskriv avtalen som formaliseres'), {
      target: { value: 'Avtalt fundament.' },
    });
    await fireEvent.change(screen.getByLabelText('Oppgjørsform'), {
      target: { value: 'ENHETSPRISER' },
    });
    await fireEvent.input(screen.getByLabelText('Samlet fristforlengelse (dager)'), {
      target: { value: '7' },
    });
    await fireEvent.click(screen.getByRole('button', { name: 'Kontroller endringsordre' }));
    await fireEvent.click(screen.getByRole('checkbox'));
    await fireEvent.click(screen.getByRole('button', { name: 'Utsted endringsordre' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('KOE-saken har blitt endret.');
    expect(props.oncreated).not.toHaveBeenCalled();
    screen.unmount();
    const restored = render(EndringsordreForm, props);
    await restored.findByRole('checkbox', { name: /KOE-1/ });
    expect(restored.getByRole('checkbox', { name: /KOE-1/ })).toBeChecked();
    expect(restored.getByLabelText('Beskriv avtalen som formaliseres')).toHaveValue(
      'Avtalt fundament.'
    );
    expect(restored.getByLabelText('Samlet fristforlengelse (dager)')).toHaveValue(7);
  });
});
