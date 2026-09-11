import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/svelte';
import { userEvent } from '@testing-library/user-event';
import WorkspaceHarness from './WorkspaceHarness.svelte';
import PositionExplanation from '../PositionExplanation.svelte';
import { scenario1_3AktiveSpor } from '$lib/mocks/caseState';
import { createDemoStore } from '$lib/mockup/store.svelte';
import { createCaseWorkspace } from '$lib/kontraktsbord/context.svelte';
import type { CaseContextResponse } from '$lib/types/api';

import { apiFetch } from '$lib/api/client';
vi.mock('$lib/api/client', () => ({ apiFetch: vi.fn() }));
beforeEach(() => {
  vi.mocked(apiFetch).mockImplementation(async (_url, options) => {
    if (options?.method === 'POST') throw new Error('Saken er endret av en annen bruker');
    return {
      state: { version: 0, items: [], packages: [] },
      actor: 'handler@test',
      chain: [],
      canPrepare: true,
    } as never;
  });
});
describe('shared case workspace UI', () => {
  it('uses case identity and keeps scenario selection exclusive to the demo', async () => {
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

  it('keeps a failed response open and reports the error', async () => {
    const demo = createDemoStore();
    const response: CaseContextResponse = {
      state: JSON.parse(JSON.stringify(demo.sak)),
      timeline: JSON.parse(JSON.stringify(demo.timeline)),
      version: 4,
      historikk: { grunnlag: [], vederlag: [], frist: [] },
    };
    const sendEvent = vi.fn().mockRejectedValue(new Error('Saken er endret av en annen bruker'));
    const live = createCaseWorkspace(response, { projectId: 'p', sendEvent });
    const user = userEvent.setup();
    render(WorkspaceHarness, {
      workspace: live,
      view: { track: 'ansvar', mode: 'form', role: 'BH' },
    });
    const verdict = await screen.findByRole('radio', { name: 'Anerkjent' });
    const yes = screen.queryByRole('radio', { name: 'Ja, i tide' });
    if (yes) await user.click(yes);
    await user.click(verdict);
    const send = screen.getByRole('button', { name: 'Ferdigstill vurdering' });
    await waitFor(() => expect(send).toBeEnabled());
    await user.click(send);
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Saken er endret av en annen bruker'
    );
    expect(screen.getByRole('radio', { name: 'Anerkjent' })).toHaveAttribute(
      'aria-checked',
      'true'
    );
    expect(sendEvent).not.toHaveBeenCalled();
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
  expect(
    screen.getByText(/bestridt ansvarsgrunnlag, for sen varsling av fristkravet/)
  ).toHaveTextContent('Prinsipalt avslag bygger på');
});
