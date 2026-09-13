import { expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/svelte';
import { userEvent } from '@testing-library/user-event';
import ProjectOverview from '../ProjectOverview.svelte';
import WorkspaceHarness from '$lib/components/kontraktsbord/__tests__/WorkspaceHarness.svelte';
import { createDemoStore } from '$lib/mockup/store.svelte';
import { mockSaksoversikt } from '$lib/mocks/saksoversikt';

it('searches the table and links directly to the matching demo case despite a saved timeline preference', async () => {
  localStorage.setItem('koe-saksoversikt-visning', 'tidslinje');
  localStorage.setItem('koe-user-role', 'BH');
  const user = userEvent.setup();
  render(ProjectOverview, {
    cases: mockSaksoversikt,
    prosjektId: 'P001',
    prosjektNavn: 'Operatunnelen',
    demo: true,
    demoScenarios: { 'KOE-2024-047': 'scenario1' },
  });
  expect(screen.getByRole('heading', { name: 'Krav og endringer' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Ny endringsordre' })).toHaveAttribute(
    'href',
    '/mockup/endringsordre/ny'
  );
  expect(screen.getByRole('link', { name: 'Åpne eksempelsak' })).toBeInTheDocument();
  await user.type(screen.getByRole('searchbox', { name: 'Søk i saker' }), 'KOE-2024-047');
  expect(screen.getByText(`1 av ${mockSaksoversikt.length} saker`)).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Åpne sak KOE-2024-047' })).toHaveAttribute(
    'href',
    '/mockup?spor=ansvar&rolle=BH&scenario=scenario1'
  );
  expect(screen.queryByRole('button', { name: 'Tidslinje' })).not.toBeInTheDocument();
  expect(screen.queryByRole('complementary', { name: 'Saksdetalj' })).not.toBeInTheDocument();
  await user.clear(screen.getByRole('searchbox'));
  await user.type(screen.getByRole('searchbox'), 'finnes ikke');
  expect(screen.getByText('Ingen saker passer søket og utvalget.')).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Vis alle saker' }));
  expect(screen.getByRole('searchbox')).toHaveValue('');
});

it('carries the selected role from the overview into a case and back', async () => {
  localStorage.setItem('koe-user-role', 'BH');
  const user = userEvent.setup();
  const props = { cases: mockSaksoversikt, prosjektId: 'P001', prosjektNavn: 'Operatunnelen' };
  const overview = render(ProjectOverview, props);
  expect(screen.queryByRole('link', { name: 'Ny sak' })).not.toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Ny endringsordre' })).toHaveAttribute(
    'href',
    '/P001/endringsordre/ny'
  );
  await user.click(screen.getByRole('button', { name: 'Entreprenør TE' }));
  expect(screen.getByRole('link', { name: 'Ny sak' })).toHaveAttribute('href', '/P001/ny');
  expect(screen.queryByRole('link', { name: 'Ny endringsordre' })).not.toBeInTheDocument();
  expect(localStorage.getItem('koe-user-role')).toBe('TE');
  expect(screen.getByRole('link', { name: 'Åpne sak KOE-2024-047' })).toHaveAttribute(
    'href',
    '/P001/KOE-2024-047?spor=ansvar&rolle=TE'
  );
  overview.unmount();

  const workspace = createDemoStore();
  const caseView = render(WorkspaceHarness, { workspace });
  expect(screen.getByRole('button', { name: 'Entreprenør TE' })).toHaveAttribute(
    'aria-pressed',
    'true'
  );
  expect(screen.getByLabelText('Scenario')).not.toBeVisible();
  await user.click(screen.getByLabelText('Demoverktøy'));
  expect(screen.getByRole('combobox', { name: 'Scenario' })).toBeVisible();
  const original = workspace.sak.vederlag.godkjent_belop;
  workspace.sendVederlagSvar(123);
  await user.click(screen.getByRole('button', { name: 'Nullstill eksempelsaken' }));
  expect(workspace.sak.vederlag.godkjent_belop).toBe(original);
  await user.keyboard('{Escape}');
  expect(screen.getByLabelText('Scenario')).not.toBeVisible();
  await user.click(screen.getByRole('button', { name: 'Byggherre BH' }));
  caseView.unmount();

  render(ProjectOverview, props);
  expect(screen.getByRole('button', { name: 'Byggherre BH' })).toHaveAttribute(
    'aria-pressed',
    'true'
  );
  expect(screen.queryByRole('link', { name: 'Ny sak' })).not.toBeInTheDocument();
});

it('filters endringsordrer in the shared register and preserves the viewer role', async () => {
  localStorage.setItem('koe-user-role', 'BH');
  const user = userEvent.setup();
  render(ProjectOverview, {
    cases: [
      mockSaksoversikt[0],
      {
        ...mockSaksoversikt[0],
        sak_id: 'EO-1',
        sakstype: 'endringsordre',
        cached_title: 'Ekstra belysning',
        cached_status: 'utstedt',
        endringsordre_data: {
          status: 'utstedt',
          eo_nummer: 'EO-001',
          relaterte_koe_saker: [],
          netto_belop: 25000,
          frist_dager: null,
          er_estimat: true,
        },
      },
    ],
    prosjektId: 'P001',
    prosjektNavn: 'Testprosjekt',
  });
  await user.selectOptions(screen.getByRole('combobox', { name: 'Sakstype' }), 'endringsordre');
  expect(screen.getByText('1 av 2 saker')).toBeInTheDocument();
  expect(screen.queryByRole('link', { name: 'Åpne sak KOE-2024-047' })).not.toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Åpne sak EO-1' })).toHaveAttribute(
    'href',
    '/P001/EO-1?rolle=BH'
  );
  expect(screen.getByText('Utstedt')).toBeInTheDocument();
  expect(screen.getByText('Estimat i EO')).toBeInTheDocument();
});

it('filters the register by time claims and clears it', async () => {
  localStorage.setItem('koe-saksoversikt-visning', 'tabell');
  const scroll = vi.fn();
  HTMLElement.prototype.scrollIntoView = scroll;
  const user = userEvent.setup();
  const cases = [
    {
      ...mockSaksoversikt[0],
      sak_id: 'FRIST-1',
      cached_status: 'SENDT',
      cached_dager_krevd: 45,
      cached_dager_godkjent: null,
    },
    {
      ...mockSaksoversikt[0],
      sak_id: 'VEDERLAG-1',
      cached_status: 'SENDT',
      cached_dager_krevd: null,
    },
  ];
  render(ProjectOverview, { cases, prosjektId: 'P001', prosjektNavn: 'Testprosjekt', demo: true });
  const projectMenu = within(screen.getByRole('complementary', { name: 'Prosjektmeny' }));
  expect(
    projectMenu.getByRole('complementary', { name: 'Prosjektet i korte trekk' })
  ).toHaveTextContent('Kontraktsfrist Ikke oppgitt');
  expect(projectMenu.getByRole('link', { name: 'Bytt prosjekt' })).toHaveAttribute('href', '/');
  await user.click(screen.getByRole('button', { name: /Fristkrav.*1 ikke vurdert/ }));
  expect(screen.getByText('1 av 2 saker')).toBeInTheDocument();
  expect(screen.queryByText('VEDERLAG-1')).not.toBeInTheDocument();
  expect(scroll).toHaveBeenCalledOnce();
  await user.click(screen.getByRole('button', { name: 'Fjern fristfilter' }));
  expect(screen.getByText('2 av 2 saker')).toBeInTheDocument();
});
