import { render, fireEvent, waitFor, cleanup } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import EndringsordreForm from '../EndringsordreForm.svelte';
import {
  createEndringsordre,
  fetchEOApprovals,
  fetchEOCandidates,
  fetchNextEONumber,
  type EOApprovalPackage,
} from '$lib/api/endringsordre';
import { newEODraft } from '$lib/domain/endringsordre';
import { setDraftOwner } from '$lib/utils/draftOwner';

vi.mock('$lib/api/endringsordre', async () => {
  const { ApiError } = await import('$lib/api/client');
  return {
    createEndringsordre: vi.fn(),
    fetchEOCandidates: vi.fn(),
    fetchNextEONumber: vi.fn(),
    // Prosjektet har ingen godkjenningspolicy: ordren utstedes direkte.
    fetchEOApprovals: vi.fn(() =>
      Promise.reject(new ApiError(403, 'Intern godkjenning er ikke konfigurert for prosjektet.'))
    ),
    sendEOApprovalCommand: vi.fn(),
  };
});
vi.mock('$app/environment', () => ({ browser: true }));
const props = {
  projectId: 'project',
  projectName: 'Skoleprosjekt',
  userId: 'user',
  oncreated: vi.fn(),
};
// Lokale utkast er bundet til den innloggede. I appen setter rot-layouten
// eieren via getSession() før noen side rendres; her rendres komponenten
// direkte, så eieren må settes for hånd.
const key = `koe-draft-endringsordre-project:user::${props.userId}`;

beforeEach(() => {
  localStorage.clear();
  setDraftOwner(props.userId);
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

// Arbeidsvalg på #445 (oppdragsgiver 12.10): et lagret utkast med nummeret til en
// endringsordre som allerede er utstedt, forkastes ved åpning, og skjemaet starter
// et tomt utkast med neste ledige nummer og forhåndsvalget fra lenken.
describe('lagret utkast med nummer fra en utstedt endringsordre (#445)', () => {
  function storeDraft() {
    localStorage.setItem(
      key,
      JSON.stringify({
        version: 1,
        draft: { ...newEODraft(), number: 'EO-001', description: 'Ordren som ble utstedt.' },
      })
    );
  }
  function approvalsWith(status: EOApprovalPackage['status']) {
    vi.mocked(fetchEOApprovals).mockResolvedValueOnce({
      state: {
        version: 3,
        packages: [
          {
            id: 'pakke-1',
            status,
            owner: 'user',
            createdAt: '2026-10-01T08:00:00Z',
            request: {
              eo_nummer: 'EO-001',
              beskrivelse: 'Ordren som ble utstedt.',
              koe_sak_ids: [],
              er_estimat: false,
              konsekvenser: {
                sha: false,
                kvalitet: false,
                fremdrift: false,
                pris: false,
                annet: false,
              },
            },
            steps: [],
            ...(status === 'utstedt' ? { sakId: 'EO-sak-1' } : {}),
          },
        ],
      },
      actor: 'user',
      sender: null,
      chain: [],
      canPrepare: true,
      dailyRate: null,
    });
  }

  it('forkaster utkastet og starter et tomt utkast med neste nummer og KOE-en fra lenken', async () => {
    storeDraft();
    approvalsWith('utstedt');
    vi.mocked(fetchNextEONumber).mockResolvedValue({ neste_nummer: 'EO-002' });
    const screen = render(EndringsordreForm, { ...props, initialKoe: 'KOE-1' });
    await waitFor(() => expect(screen.getByLabelText('Endringsordrenummer')).toHaveValue('EO-002'));
    expect(await screen.findByRole('checkbox', { name: /KOE-1/ })).toBeChecked();
    expect(screen.getByLabelText('Beskriv avtalen som formaliseres')).toHaveValue('');
    await waitFor(() => expect(JSON.parse(localStorage.getItem(key)!).draft.number).toBe('EO-002'));
    expect(screen.queryByText(/Endringsordren er utstedt/)).toBeNull();
  });

  it('beholder utkastet når ordren med nummeret fortsatt er til godkjenning', async () => {
    storeDraft();
    approvalsWith('til_godkjenning');
    vi.mocked(fetchNextEONumber).mockResolvedValue({ neste_nummer: 'EO-002' });
    const screen = render(EndringsordreForm, props);
    await waitFor(() => expect(fetchNextEONumber).toHaveBeenCalled());
    expect(screen.getByLabelText('Endringsordrenummer')).toHaveValue('EO-001');
    expect(screen.getByLabelText('Beskriv endringen som pålegges')).toHaveValue(
      'Ordren som ble utstedt.'
    );
  });
});
