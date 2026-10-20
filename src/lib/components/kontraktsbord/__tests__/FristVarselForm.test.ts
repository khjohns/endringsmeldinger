/**
 * BH på et fristkrav uten dager (TFR-06, DRF-01). Kilden er vedtaket om
 * nøytralt fristvarsel i hovedplanen 3.1 (23.09): forespørselen er en egen
 * handling uten resultat, og den sendes per brev (NS 8407 § 33.6.2 første ledd).
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/svelte';
import WorkspaceHarness from './WorkspaceHarness.svelte';
import { createCaseWorkspace } from '$lib/kontraktsbord/context.svelte';
import { createDemoStore } from '$lib/mockup/store.svelte';
import { DEFAULT_SCENARIO } from '$lib/mockup/scenarios';
import { setDraftOwner } from '$lib/utils/draftOwner';
import type { CaseContextResponse } from '$lib/types/api';
import type { TimelineEvent } from '$lib/types/timeline';
import type { BrevInnhold } from '../letterTypes';

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  setDraftOwner('user');
});
afterEach(cleanup);

function arbeidsflate() {
  const scenario = structuredClone(DEFAULT_SCENARIO);
  scenario.sak.frist = {
    status: 'sendt',
    antall_versjoner: 1,
    varsel_type: 'varsel',
    krav_event_id: 'varsel-1',
    frist_varsel: { dato_sendt: '2026-09-02', metode: ['digital_oversendelse'] },
  } as typeof scenario.sak.frist;
  scenario.timeline.push({
    specversion: '1.0',
    id: 'varsel-1',
    source: '/test',
    type: 'no.oslo.koe.frist_krav_sendt',
    time: '2099-01-01T00:00:00Z',
    actorrole: 'TE',
    spor: 'frist',
    data: { varsel_type: 'varsel' },
  } as unknown as TimelineEvent);
  return createDemoStore(scenario);
}

describe('BH på et fristvarsel uten dager', () => {
  it('sender forespørselen som egen hendelse med brev, uten resultat', async () => {
    const workspace = arbeidsflate();
    const screen = render(WorkspaceHarness, {
      workspace,
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

    await waitFor(() =>
      expect(workspace.timeline.some((e) => e.type === 'no.oslo.koe.frist_foresporsel_sendt')).toBe(
        true
      )
    );
    const sendt = workspace.timeline.find((e) => e.type === 'no.oslo.koe.frist_foresporsel_sendt')!;
    const data = sendt.data as unknown as Record<string, unknown> & { brev: BrevInnhold };
    expect(data.frist_krav_id).toBe('varsel-1');
    expect(data).not.toHaveProperty('beregnings_resultat');
    expect(data.brev.tittel).toContain('Forespørsel om spesifisert krav');
    expect(data.brev.avsender.rolle).toBe('BH');
    expect(data.brev.seksjoner.begrunnelse.redigertTekst).toContain(
      'tapes kravet på fristforlengelse'
    );
  });

  it('vises uten godkjenningsrett, fordi handlingene går utenom godkjenningen', async () => {
    // Oppdragsgiver 2026-10-04: innsigelse og forespørsel sendes uten intern godkjenning.
    // Utenfor demoen har godkjenningen ingen som kan ferdigstille (#818).
    const demo = arbeidsflate();
    const response: CaseContextResponse = {
      state: JSON.parse(JSON.stringify(demo.sak)),
      timeline: JSON.parse(JSON.stringify(demo.timeline)),
      version: 4,
      historikk: { grunnlag: [], vederlag: [], frist: [] },
    };
    const screen = render(WorkspaceHarness, {
      workspace: createCaseWorkspace(response, { projectId: 'p' }),
      view: { track: 'frist', role: 'BH', mode: 'form' },
    });

    expect(await screen.findByRole('radio', { name: 'Be om spesifisert krav' })).toBeTruthy();
    expect(screen.queryByText('Åpne brev for å behandle godkjenningspakken.')).toBeNull();
  });
});
