import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import WorkspaceHarness from './WorkspaceHarness.svelte';
import PositionExplanation from '../PositionExplanation.svelte';
import { scenario1_3AktiveSpor } from '$lib/mocks/caseState';
import { createDemoStore } from '$lib/mockup/store.svelte';
import { createCaseWorkspace } from '$lib/kontraktsbord/context.svelte';
import type { CaseContextResponse } from '$lib/types/api';

describe('shared case workspace UI', () => {
  it('uses case identity and keeps scenario selection exclusive to the demo', () => {
    const demo = createDemoStore();
    const response: CaseContextResponse = {
      state: JSON.parse(JSON.stringify(demo.sak)),
      timeline: JSON.parse(JSON.stringify(demo.timeline)),
      version: 4,
      historikk: { grunnlag: [], vederlag: [], frist: [] },
    };
    response.state.sakstittel = 'En annen sak fra API';
    const live = createCaseWorkspace(response, { projectId: 'p' });
    render(WorkspaceHarness, { workspace: live });
    expect(screen.getByText('En annen sak fra API')).toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: 'Scenario' })).not.toBeInTheDocument();
    expect(screen.queryByTitle('Nullstill mockup')).not.toBeInTheDocument();
  });
});

it('viser ubesvart frist som uavklart selv om det finnes en BH-kladd', () => {
  const state = structuredClone(scenario1_3AktiveSpor);
  state.frist.bh_resultat = undefined;
  state.frist.godkjent_dager = undefined;
  state.frist.subsidiaer_godkjent_dager = undefined;
  const workspace = createCaseWorkspace(
    {
      state,
      timeline: [],
      version: 1,
      historikk: { grunnlag: [], vederlag: [], frist: [] },
    },
    { projectId: 'p' }
  );
  workspace.setDraft('frist', { text: 'Foreløpig vurdering', value: 0 });
  const { container } = render(WorkspaceHarness, {
    workspace,
    view: { track: 'frist', mode: 'read', role: 'BH' },
  });
  const row = container.querySelector('.m-row.on')!;
  expect(row).toHaveTextContent('Ikke vurdert');
  expect(row).toHaveTextContent('BH-kladd');
  expect(row.querySelector('.gap-box')).toBeNull();
  expect(container.querySelector('.exposure-box')).toHaveTextContent('Uavklart');
});

it('viser subsidiær vurdering og flere grunner til prinsipalt avslag sammen', () => {
  render(PositionExplanation, {
    subsidiary: true,
    value: 'fristforlengelsen til 30 kalenderdager',
    rejected: true,
    triggers: ['grunnlag_avslatt', 'preklusjon_varsel'],
  });
  expect(
    screen.getByText(/Subsidiært vurderes fristforlengelsen til 30 kalenderdager/)
  ).toHaveTextContent('dersom innsigelsene ikke fører frem');
  expect(screen.getByText(/bestridt grunnlag, for sen varsling av fristkravet/)).toHaveTextContent(
    'Prinsipalt avslag bygger på'
  );
});

it('leser bh_respondert_versjon = null fra API-et som ubesvart', () => {
  const state = structuredClone(scenario1_3AktiveSpor);
  for (const spor of [state.grunnlag, state.vederlag, state.frist]) {
    spor.bh_respondert_versjon = null;
    spor.antall_versjoner = 3;
    spor.bh_resultat = undefined;
  }
  const workspace = createCaseWorkspace(
    { state, timeline: [], version: 1, historikk: { grunnlag: [], vederlag: [], frist: [] } },
    { projectId: 'p' }
  );
  const { container } = render(WorkspaceHarness, {
    workspace,
    view: { track: 'ansvar', mode: 'read', role: 'BH' },
  });
  expect(container.querySelector('.new-revision')).toBeNull();
  expect(container).not.toHaveTextContent(/Svar på (tidligere )?versjon/);
});
