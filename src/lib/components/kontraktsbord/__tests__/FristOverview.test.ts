/**
 * Byggherrens vurderinger i fristsvaret (KA-U4 i hovedplanen 3.1): en vurdering
 * som ikke er gjort, er utelatt i hendelsen og `null` i tilstanden, og vises
 * ikke. Før #272 ble `null` vist som «For sent» (DT-03).
 */
import { afterEach, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/svelte';
import WorkspaceHarness from './WorkspaceHarness.svelte';
import { createCaseWorkspace } from '$lib/kontraktsbord/context.svelte';
import { createDemoStore } from '$lib/mockup/store.svelte';
import type { CaseContextResponse } from '$lib/types/api';
import type { TimelineEvent } from '$lib/types/timeline';

afterEach(cleanup);

function arbeidsflate(vurderinger: Record<string, boolean | null>) {
  const demo = createDemoStore();
  const response: CaseContextResponse = {
    state: JSON.parse(JSON.stringify(demo.sak)),
    timeline: JSON.parse(JSON.stringify(demo.timeline)),
    version: 4,
    historikk: { grunnlag: [], vederlag: [], frist: [] },
  };
  response.state.frist = {
    ...response.state.frist,
    status: 'godkjent',
    antall_versjoner: 1,
    varsel_type: 'spesifisert',
    krevd_dager: 20,
    godkjent_dager: 20,
    bh_resultat: 'godkjent',
    bh_respondert_versjon: 0,
    ...vurderinger,
  } as CaseContextResponse['state']['frist'];
  const lagret = Object.fromEntries(Object.entries(vurderinger).filter(([, v]) => v !== null));
  response.timeline = response.timeline.filter((event) => event.spor !== 'frist');
  response.timeline.push({
    specversion: '1.0',
    id: 'fristsvar-1',
    source: '/test',
    type: 'no.oslo.koe.respons_frist',
    time: '2026-10-08T10:00:00Z',
    actorrole: 'BH',
    spor: 'frist',
    data: { beregnings_resultat: 'godkjent', godkjent_dager: 20, ...lagret },
  } as unknown as TimelineEvent);
  return createCaseWorkspace(response, { projectId: 'p' });
}

function vis(vurderinger: Record<string, boolean | null>) {
  return render(WorkspaceHarness, {
    workspace: arbeidsflate(vurderinger),
    view: { track: 'frist', role: 'TE', mode: 'read' },
  });
}

it('viser ikke en vurdering som ikke er gjort', () => {
  const screen = vis({ frist_varsel_ok: true, spesifisert_krav_ok: null, vilkar_oppfylt: true });
  expect(screen.getByText('Varslet i tide')).toBeInTheDocument();
  expect(screen.queryByText('Spesifisert krav')).toBeNull();
  expect(screen.queryByText('For sent — kravet begrenses')).toBeNull();
});

it('viser en vurdering av spesifiseringen som for sent', () => {
  const screen = vis({ frist_varsel_ok: true, spesifisert_krav_ok: false, vilkar_oppfylt: true });
  expect(screen.getByText('For sent — kravet begrenses')).toBeInTheDocument();
});
