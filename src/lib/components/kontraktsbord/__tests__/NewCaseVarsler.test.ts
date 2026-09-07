import { render, fireEvent, waitFor, cleanup } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import NewCaseForm from '../NewCaseForm.svelte';
import { KRAV_STRUKTUR_NS8407 } from '$lib/constants/categories';
import { VARSEL_LABELS } from '$lib/domain/konsekvensVarsler';
import { submitEvent } from '$lib/api/events';

vi.mock('$lib/api/events', () => ({ submitEvent: vi.fn() }));
vi.mock('$app/environment', () => ({ browser: true }));

beforeEach(() => {
  localStorage.clear();
  vi.mocked(submitEvent).mockReset();
  const kontraktsforhold = KRAV_STRUKTUR_NS8407.find((k) => k.kode === 'ENDRING')!;
  localStorage.setItem(
    'koe-draft-kontraktsbord-ny-project',
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
    expect(localStorage.getItem('koe-draft-kontraktsbord-ny-project')).toBeNull();
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
    await screen.findByRole('alert');
    expect(complete).not.toHaveBeenCalled();
    expect(screen.getByRole('checkbox', { name: VARSEL_LABELS.frist })).toBeChecked();
    actions!.send();
    await waitFor(() => expect(complete).toHaveBeenCalledOnce());
    expect(submitEvent).toHaveBeenCalledTimes(3);
    const calls = vi.mocked(submitEvent).mock.calls;
    expect(calls[2][0]).toBe(calls[0][0]);
    expect(calls[2][2].varsler).toEqual(calls[1][2].varsler);
  });
});
