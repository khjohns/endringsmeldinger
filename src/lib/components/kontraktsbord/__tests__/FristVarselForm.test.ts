/**
 * BH på et fristkrav uten dager (TFR-06, DRF-01). Kilden er vedtaket om
 * nøytralt fristvarsel i hovedplanen 3.1 (23.09): forespørselen er en egen
 * handling uten resultat, og den sendes per brev (NS 8407 § 33.6.2 første ledd).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/svelte';
import WorkspaceHarness from './WorkspaceHarness.svelte';
import { createCaseWorkspace } from '$lib/kontraktsbord/context.svelte';
import { createDemoStore } from '$lib/mockup/store.svelte';
import { apiFetch } from '$lib/api/client';
import { setDraftOwner } from '$lib/utils/draftOwner';
import type { CaseContextResponse } from '$lib/types/api';
import type { TimelineEvent } from '$lib/types/timeline';

vi.mock('$lib/api/client', async (original) => ({
  ...(await original<typeof import('$lib/api/client')>()),
  apiFetch: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  sessionStorage.clear();
  setDraftOwner('user');
  vi.mocked(apiFetch).mockResolvedValue({
    state: { version: 0, items: [], packages: [] },
    actor: 'handler@test',
    chain: [],
    canPrepare: true,
  } as never);
});
afterEach(cleanup);

function arbeidsflate(sendEvent: ReturnType<typeof vi.fn>) {
  const demo = createDemoStore();
  const response: CaseContextResponse = {
    state: JSON.parse(JSON.stringify(demo.sak)),
    timeline: JSON.parse(JSON.stringify(demo.timeline)),
    version: 4,
    historikk: { grunnlag: [], vederlag: [], frist: [] },
  };
  response.state.frist = {
    status: 'sendt',
    antall_versjoner: 1,
    varsel_type: 'varsel',
    krav_event_id: 'varsel-1',
    frist_varsel: { dato_sendt: '2026-09-02', metode: ['digital_oversendelse'] },
  } as CaseContextResponse['state']['frist'];
  response.timeline.push({
    specversion: '1.0',
    id: 'varsel-1',
    source: '/test',
    type: 'no.oslo.koe.frist_krav_sendt',
    time: '2099-01-01T00:00:00Z',
    actorrole: 'TE',
    spor: 'frist',
    data: { varsel_type: 'varsel' },
  } as unknown as TimelineEvent);
  return createCaseWorkspace(response, { projectId: 'p', sendEvent });
}

describe('BH på et fristvarsel uten dager', () => {
  it('sender forespørselen som egen hendelse med brev, uten resultat', async () => {
    const sendEvent = vi.fn().mockRejectedValue(new Error('Stopp etter kontrollert innsending'));
    const screen = render(WorkspaceHarness, {
      workspace: arbeidsflate(sendEvent),
      view: { track: 'frist', role: 'BH', mode: 'form' },
    });

    expect(screen.queryByText('Årsakssammenheng')).toBeNull();
    await fireEvent.click(await screen.findByRole('radio', { name: 'Be om spesifisert krav' }));
    const send = screen.getByRole('button', { name: /Se brev og send/ });
    await waitFor(() => expect(send).toBeEnabled());
    await fireEvent.click(send);

    await fireEvent.click(
      await screen.findByRole('checkbox', { name: 'Jeg har kontrollert brevet og vedleggene.' })
    );
    await fireEvent.click(screen.getByRole('button', { name: 'Send til entreprenøren' }));

    await waitFor(() => expect(sendEvent).toHaveBeenCalledOnce());
    const [, type, data] = sendEvent.mock.calls[0];
    expect(type).toBe('frist_foresporsel_sendt');
    expect(data.frist_krav_id).toBe('varsel-1');
    expect(data).not.toHaveProperty('beregnings_resultat');
    expect(data.brev.tittel).toContain('Forespørsel om spesifisert krav');
    expect(data.brev.avsender.rolle).toBe('BH');
    expect(data.brev.seksjoner.begrunnelse.redigertTekst).toContain(
      'tapes kravet på fristforlengelse'
    );
  });
});
