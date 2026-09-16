import { render, fireEvent, waitFor, cleanup } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import NewCaseForm from '../NewCaseForm.svelte';
import { KRAV_STRUKTUR_NS8407 } from '$lib/constants/categories';
import { VARSEL_LABELS } from '$lib/domain/konsekvensVarsler';
import { submitEvent } from '$lib/api/events';
import { lastOppVedlegg } from '$lib/api/vedlegg';
import { setDraftOwner } from '$lib/utils/draftOwner';

vi.mock('$lib/api/events', () => ({ submitEvent: vi.fn() }));
vi.mock('$lib/api/vedlegg', async (original) => ({
  ...(await original<typeof import('$lib/api/vedlegg')>()),
  lastOppVedlegg: vi.fn(),
}));
vi.mock('$app/environment', () => ({ browser: true }));

// Lokale utkast er bundet til den innloggede. I appen setter rot-layouten
// eieren via getSession() før noen side rendres; her rendres komponenten
// direkte, så eieren må settes for hånd.
const EIER = 'saksbehandler-1';

beforeEach(() => {
  localStorage.clear();
  setDraftOwner(EIER);
  vi.mocked(submitEvent).mockReset();
  vi.mocked(lastOppVedlegg).mockReset();
  const kontraktsforhold = KRAV_STRUKTUR_NS8407.find((k) => k.kode === 'ENDRING')!;
  localStorage.setItem(
    `koe-draft-kontraktsbord-ny-project::${EIER}`,
    JSON.stringify({
      tittel: 'Endret fundament',
      datoOppdaget: '2026-09-01',
      valgtHjemmel: { kontraktsforhold, hjemmel: kontraktsforhold.hjemler[0] },
      begrunnelseHtml: '<p>Byggherren har pålagt et større fundament.</p>',
    })
  );
});
afterEach(cleanup);

describe('basis submission with optional notices', () => {
  it('submits all selected notices with the basis, without a separate write or amounts', async () => {
    vi.mocked(submitEvent).mockResolvedValue({
      success: true,
      new_version: 1,
      event_id: 'event',
      tidsstempel: '2026-09-06',
    });
    let actions: { canSend: boolean; send: () => void } | undefined;
    const complete = vi.fn();
    const screen = render(NewCaseForm, {
      prosjektId: 'project',
      onsend: complete,
      onactions: (a) => {
        actions = a;
      },
    });
    await waitFor(() => expect(actions?.canSend).toBe(true));
    for (const label of Object.values(VARSEL_LABELS)) {
      const checkbox = screen.getByRole('checkbox', { name: label });
      expect(checkbox).not.toBeChecked();
      await fireEvent.click(checkbox);
    }
    actions!.send();
    await fireEvent.click(await screen.findByRole('button', { name: 'Send til byggherren' }));
    await waitFor(() => expect(complete).toHaveBeenCalledOnce());
    expect(submitEvent).toHaveBeenCalledTimes(2);
    const [, eventType, data] = vi.mocked(submitEvent).mock.calls[1];
    expect(eventType).toBe('grunnlag_opprettet');
    expect(Object.keys(data.varsler as object)).toEqual([
      'vederlag',
      'rigg_drift',
      'produktivitet',
      'frist',
    ]);
    expect(data).not.toHaveProperty('belop_direkte');
    expect(data).not.toHaveProperty('antall_dager');
    expect(data.vedlegg_ids).toEqual([]);
    expect(lastOppVedlegg).not.toHaveBeenCalled();
    expect(localStorage.getItem(`koe-draft-kontraktsbord-ny-project::${EIER}`)).toBeNull();
  });

  it('preserves notices and the created case when basis submission fails, then retries that case', async () => {
    vi.mocked(submitEvent)
      .mockResolvedValueOnce({
        success: true,
        new_version: 1,
        event_id: 'created',
        tidsstempel: '',
      })
      .mockRejectedValueOnce(new Error('Kunne ikke sende grunnlaget'))
      .mockResolvedValueOnce({ success: true, new_version: 2, event_id: 'basis', tidsstempel: '' });
    let actions: { canSend: boolean; send: () => void } | undefined;
    const complete = vi.fn();
    const screen = render(NewCaseForm, {
      prosjektId: 'project',
      onsend: complete,
      onactions: (a) => {
        actions = a;
      },
    });
    await waitFor(() => expect(actions?.canSend).toBe(true));
    await fireEvent.click(screen.getByRole('checkbox', { name: VARSEL_LABELS.frist }));
    actions!.send();
    await fireEvent.click(await screen.findByRole('button', { name: 'Send til byggherren' }));
    await screen.findByRole('alert');
    expect(complete).not.toHaveBeenCalled();
    expect(screen.getByRole('checkbox', { name: VARSEL_LABELS.frist })).toBeChecked();
    actions!.send();
    await fireEvent.click(await screen.findByRole('button', { name: 'Send til byggherren' }));
    await waitFor(() => expect(complete).toHaveBeenCalledOnce());
    expect(submitEvent).toHaveBeenCalledTimes(3);
    const calls = vi.mocked(submitEvent).mock.calls;
    expect(calls[2][0]).toBe(calls[0][0]);
    expect(calls[2][2].varsler).toEqual(calls[1][2].varsler);
  });

  it('uploads after creation, freezes the selection, and reuses receipts after send failure', async () => {
    vi.mocked(submitEvent)
      .mockResolvedValueOnce({
        success: true,
        new_version: 1,
        event_id: 'created',
        tidsstempel: '',
      })
      .mockRejectedValueOnce(new Error('Sending feilet'))
      .mockResolvedValueOnce({ success: true, new_version: 2, event_id: 'sent', tidsstempel: '' });
    vi.mocked(lastOppVedlegg).mockImplementation(async (sakId) => {
      expect(submitEvent).toHaveBeenCalledTimes(1);
      expect(sakId).toBe(vi.mocked(submitEvent).mock.calls[0][0]);
      return {
        id: 'attachment',
        navn: 'rapport.pdf',
        storrelse: 8,
        lastet_opp_av: 'TE',
        lastet_opp_rolle: 'TE',
        tidspunkt: '',
        status: 'staged',
      };
    });
    let actions: { canSend: boolean; send: () => void } | undefined;
    const complete = vi.fn();
    const screen = render(NewCaseForm, {
      prosjektId: 'project',
      onsend: complete,
      onactions: (a) => (actions = a),
    });
    await waitFor(() => expect(actions?.canSend).toBe(true));
    await fireEvent.change(screen.getByLabelText(/Velg filer som skal følge/), {
      target: { files: [new File(['%PDF-abc'], 'rapport.pdf')] },
    });
    actions!.send();
    const confirm = await screen.findByRole('button', { name: 'Send til byggherren' });
    expect(screen.getByRole('dialog')).toHaveTextContent('rapport.pdf');
    expect(lastOppVedlegg).not.toHaveBeenCalled();
    await fireEvent.click(confirm);
    await screen.findByRole('alert');
    expect(vi.mocked(submitEvent).mock.calls[1][2].vedlegg_ids).toEqual(['attachment']);
    actions!.send();
    await fireEvent.click(await screen.findByRole('button', { name: 'Send til byggherren' }));
    await waitFor(() => expect(complete).toHaveBeenCalledOnce());
    expect(lastOppVedlegg).toHaveBeenCalledOnce();
    expect(vi.mocked(submitEvent).mock.calls[2][2].vedlegg_ids).toEqual(['attachment']);
  });

  it('does not send the basis after an upload failure and lets the user retry', async () => {
    vi.mocked(submitEvent).mockResolvedValue({
      success: true,
      new_version: 1,
      event_id: 'event',
      tidsstempel: '',
    });
    vi.mocked(lastOppVedlegg).mockRejectedValue(new Error('Opplasting feilet'));
    let actions: { canSend: boolean; send: () => void } | undefined;
    const screen = render(NewCaseForm, {
      prosjektId: 'project',
      onsend: vi.fn(),
      onactions: (a) => (actions = a),
    });
    await waitFor(() => expect(actions?.canSend).toBe(true));
    await fireEvent.change(screen.getByLabelText(/Velg filer som skal følge/), {
      target: { files: [new File(['%PDF-abc'], 'rapport.pdf')] },
    });
    actions!.send();
    await fireEvent.click(await screen.findByRole('button', { name: 'Send til byggherren' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Opplasting feilet');
    expect(submitEvent).toHaveBeenCalledTimes(1);
    expect(vi.mocked(submitEvent).mock.calls[0][1]).toBe('sak_opprettet');
    expect(actions?.canSend).toBe(true);
  });
});
