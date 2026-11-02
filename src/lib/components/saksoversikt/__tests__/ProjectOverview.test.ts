import { expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/svelte';
import { userEvent } from '@testing-library/user-event';
import ProjectOverview from '../ProjectOverview.svelte';
import WorkspaceHarness from '$lib/components/kontraktsbord/__tests__/WorkspaceHarness.svelte';
import { createDemoStore } from '$lib/mockup/store.svelte';
import { demoNoekkeltall, lagSakslinje } from '$lib/mocks/sakslinje';

const ingenting = {
  betegnelse: null,
  venter_paa_svar: false,
  svar_ikke_godtatt: false,
  kravet_staar: false,
};
const fristkrav = lagSakslinje({
  sak_id: 'KOE-2024-047',
  sakstittel: 'Endrede grunnforhold ved akse C5–C8',
  frist: {
    ...ingenting,
    venter_paa_svar: true,
    kravet_staar: true,
    krav: { dager: 45 },
    svar: null,
    enighet: null,
  },
});
const svart = lagSakslinje({
  sak_id: 'VEDERLAG-1',
  sakstittel: 'Fasade',
  vederlag: {
    ...ingenting,
    svar_ikke_godtatt: true,
    kravet_staar: true,
    krav: { beloep: 1_000_000, metode: 'tilbud' },
    svar: { resultat: 'delvis_godkjent', beloep: 600_000, subsidiaert: true },
    enighet: null,
  },
});
const saker = [fristkrav, svart];

it('searches the table and links directly to the matching demo case despite a saved timeline preference', async () => {
  localStorage.setItem('koe-saksoversikt-visning', 'tidslinje');
  localStorage.setItem('koe-user-role', 'BH');
  const user = userEvent.setup();
  render(ProjectOverview, {
    saker,
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
  expect(screen.getByText(`1 av ${saker.length} saker`)).toBeInTheDocument();
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
  const props = { saker, prosjektId: 'P001', prosjektNavn: 'Operatunnelen' };
  const overview = render(ProjectOverview, props);
  expect(
    screen.queryByRole('link', { name: 'Nytt krav om endringsordre' })
  ).not.toBeInTheDocument();
  // Endringsordre hører ikke til første versjon (OV-U1); bare demoen har knappene.
  expect(screen.queryByRole('link', { name: 'Ny endringsordre' })).not.toBeInTheDocument();
  expect(screen.queryByRole('link', { name: 'Til godkjenning' })).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Entreprenør TE' }));
  // KT-U10, #1450 forventning 2: rollevalget i topplinja er en visning og gir ikke knappen.
  expect(
    screen.queryByRole('link', { name: 'Nytt krav om endringsordre' })
  ).not.toBeInTheDocument();
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
  workspace.sendVederlagSvar('delvis_godkjent', 123);
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
  expect(
    screen.queryByRole('link', { name: 'Nytt krav om endringsordre' })
  ).not.toBeInTheDocument();
});

it('rollevalget starter på leserens side fra serveren og kan byttes som visning (arbeidsvalg 4.2)', async () => {
  localStorage.setItem('koe-user-role', 'BH');
  const user = userEvent.setup();
  render(ProjectOverview, { saker, part: 'TE', prosjektId: 'P001', prosjektNavn: 'Testprosjekt' });
  expect(screen.getByRole('button', { name: 'Entreprenør TE' })).toHaveAttribute(
    'aria-pressed',
    'true'
  );
  expect(screen.getByText('Byggherrens svar er ikke godtatt')).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Byggherre BH' }));
  expect(screen.getByText('Kravet venter på byggherrens svar')).toBeInTheDocument();
});

it('utvalgene viser betydningen og velger sakene etter det som foreligger (MM-U29)', async () => {
  const user = userEvent.setup();
  render(ProjectOverview, { saker, prosjektId: 'P001', prosjektNavn: 'Testprosjekt' });
  expect(screen.queryByRole('button', { name: /Kladder/ })).not.toBeInTheDocument();
  expect(screen.queryByRole('combobox', { name: 'Sakstype' })).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: /Svar ikke godtatt/ }));
  expect(screen.getByText('1 av 2 saker')).toBeInTheDocument();
  expect(
    screen.getByText('Byggherren har svart på minst ett krav uten at partene er enige.')
  ).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Åpne sak VEDERLAG-1' })).toBeInTheDocument();
  expect(screen.queryByRole('link', { name: 'Åpne sak KOE-2024-047' })).not.toBeInTheDocument();
});

const tallFraServeren = {
  ...demoNoekkeltall(saker),
  ikke_forstaatt: 1,
  vederlag: {
    krav_antall: 3,
    krav_sum: 1_500_000,
    venter_paa_svar: 1,
    svar_subsidiaert_sum: 600_000,
    enighet_virksom_sum: 200_000,
    enighet_betinget_sum: 50_000,
    enighet_uten_beloep: 2,
  },
};

it('nøkkeltallene er serverens: krav og virksom enighet hver for seg, betinget, uten beløp og subsidiært særskilt (OV-U61)', () => {
  render(ProjectOverview, {
    saker,
    noekkeltall: tallFraServeren,
    prosjektId: 'P001',
    prosjektNavn: 'Testprosjekt',
  });
  const tall = within(screen.getByLabelText('Nøkkeltall for hele prosjektet'));
  expect(tall.getByText('1 ikke forstått · telles ikke i tallene')).toBeInTheDocument();
  expect(tall.getByText('3 krav · 1 venter på svar')).toBeInTheDocument();
  expect(tall.getByText(/1\s500\s000/)).toBeInTheDocument();
  expect(tall.getByText(/^200\s000/)).toBeInTheDocument();
  const del = (navn: string) => tall.getByText(navn).nextElementSibling?.textContent;
  expect(del('Betinget enighet')).toMatch(/^50\s000 kr$/);
  expect(del('Enighet uten beløp')).toBe('2 saker');
  expect(del('Subsidiært svar fra BH, ikke godtatt av TE')).toMatch(/^600\s000 kr$/);
});

it('nøkkeltallene sier hva summene bygger på, og at det subsidiære svaret ikke er enighet (OV-U61)', () => {
  render(ProjectOverview, {
    saker,
    noekkeltall: tallFraServeren,
    prosjektId: 'P001',
    prosjektNavn: 'Testprosjekt',
  });
  const tall = within(screen.getByLabelText('Nøkkeltall for hele prosjektet'));
  expect(
    tall.getByText(/^TEs gjeldende krav, også krav BH har svart på eller partene er enige om\./)
  ).toHaveTextContent(
    /Trukne krav og saker avsluttet ved et godtatt avslag på grunnlaget eller et trukket grunnlag er ikke med\./
  );
  expect(tall.getByText(/^Virksom enighet slik oversikten leser svarene/)).toHaveTextContent(
    /TE har godtatt svaret, eller svaret stemmer med kravet\./
  );
  expect(
    tall.getByText(/^Hele beløpet i svarene, også poster som er godkjent prinsipalt\./)
  ).toHaveTextContent(/Beløpet er ikke enighet\./);
  const merknad = screen.getByText(/som oversikten ikke forstår/);
  expect(merknad).toHaveTextContent(/^1 sak som oversikten ikke forstår, er ikke med i summene\./);
  expect(merknad).toHaveTextContent(
    /Krav i flere saker kan gjelde samme kostnad, og oversikten kontrollerer det ikke\./
  );
  expect(merknad).toHaveTextContent(
    /Kompensasjonen for rigg og drift i uendret byggetid er ikke med\./
  );
});

it('uten saker løsningen ikke forstår, nevner merknaden ingen slike saker (OV-U61)', () => {
  render(ProjectOverview, {
    saker,
    noekkeltall: { ...tallFraServeren, ikke_forstaatt: 0 },
    prosjektId: 'P001',
    prosjektNavn: 'Testprosjekt',
  });
  const merknad = screen.getByText(/Krav i flere saker kan gjelde samme kostnad/);
  expect(merknad.textContent?.trim()).toMatch(/^Krav i flere saker/);
  expect(screen.queryByText(/ikke forstår/)).toBeNull();
});

it('uten aktiviteten fra serveren er fanen skjult, og aktivitetssiden sier at den ikke finnes ennå (#1041)', () => {
  const props = { saker, prosjektId: 'P001', prosjektNavn: 'Testprosjekt' };
  const oversikt = render(ProjectOverview, props);
  expect(screen.queryByRole('link', { name: /Aktivitetslogg/ })).not.toBeInTheDocument();
  oversikt.unmount();
  render(ProjectOverview, { ...props, activePage: 'activity' });
  expect(
    screen.getByText('Aktiviteten i prosjektet er ikke tilgjengelig ennå.')
  ).toBeInTheDocument();
});

it('filters the register by time claims and clears it', async () => {
  localStorage.setItem('koe-saksoversikt-visning', 'tabell');
  const scroll = vi.fn();
  HTMLElement.prototype.scrollIntoView = scroll;
  const user = userEvent.setup();
  render(ProjectOverview, {
    saker,
    noekkeltall: demoNoekkeltall(saker),
    prosjektId: 'P001',
    prosjektNavn: 'Testprosjekt',
    demo: true,
  });
  const projectMenu = within(screen.getByRole('complementary', { name: 'Prosjektmeny' }));
  expect(
    projectMenu.getByRole('complementary', { name: 'Prosjektet i korte trekk' })
  ).toHaveTextContent('Kontraktsfrist Ikke oppgitt');
  expect(projectMenu.getByRole('link', { name: 'Bytt prosjekt' })).toHaveAttribute('href', '/');
  await user.click(screen.getByRole('button', { name: /Fristkrav.*1 venter på svar/ }));
  expect(screen.getByText('1 av 2 saker')).toBeInTheDocument();
  expect(screen.queryByText('VEDERLAG-1')).not.toBeInTheDocument();
  expect(scroll).toHaveBeenCalledOnce();
  await user.click(screen.getByRole('button', { name: 'Fjern fristfilter' }));
  expect(screen.getByText('2 av 2 saker')).toBeInTheDocument();
});

it('viser BH uten saker ingen henvisning til «Ny endringsordre» utenfor demoen (OV-U1)', () => {
  localStorage.setItem('koe-user-role', 'BH');
  const props = { saker: [], prosjektId: 'P001', prosjektNavn: 'Testprosjekt' };
  const ekte = render(ProjectOverview, props);
  expect(screen.getByText(/Ingen krav om endringsordre ennå/)).toHaveTextContent(
    /^\s*Ingen krav om endringsordre ennå\.\s*$/
  );
  expect(screen.queryByText(/Ny endringsordre/)).not.toBeInTheDocument();
  ekte.unmount();
  // TE fra serveren får henvisningen til knappen (KT-U10, #1450).
  render(ProjectOverview, { ...props, part: 'TE' });
  expect(screen.getByText(/Ingen krav om endringsordre ennå/)).toHaveTextContent(
    'Opprett det første med «Nytt krav om endringsordre».'
  );
});

it('TE fra serveren ser «Nytt krav om endringsordre», BH ser den ikke, og ingen ser «Ny endringsordre» (KT-U10, #1450)', async () => {
  localStorage.setItem('koe-user-role', 'TE');
  const user = userEvent.setup();
  const props = { saker, prosjektId: 'P001', prosjektNavn: 'Operatunnelen' };
  const te = render(ProjectOverview, { ...props, part: 'TE' });
  expect(screen.getByRole('link', { name: 'Nytt krav om endringsordre' })).toHaveAttribute(
    'href',
    '/P001/ny'
  );
  // Rollevalget er en visning: TE som ser saken som BH, er fortsatt TE (KT-U10).
  await user.click(screen.getByRole('button', { name: 'Byggherre BH' }));
  expect(screen.getByRole('link', { name: 'Nytt krav om endringsordre' })).toBeInTheDocument();
  expect(screen.queryByRole('link', { name: 'Ny endringsordre' })).not.toBeInTheDocument();
  te.unmount();

  render(ProjectOverview, { ...props, part: 'BH' });
  await user.click(screen.getByRole('button', { name: 'Entreprenør TE' }));
  expect(
    screen.queryByRole('link', { name: 'Nytt krav om endringsordre' })
  ).not.toBeInTheDocument();
  // «Ny endringsordre» finnes først når EO-saken er bygget (KT-U10, OV-U1, #1423).
  expect(screen.queryByRole('link', { name: 'Ny endringsordre' })).not.toBeInTheDocument();
});

it('panelet viser de tre sakstypene med antall, og valget avgrenser listen (KT-U9, #1450)', async () => {
  const user = userEvent.setup();
  const ukjent = lagSakslinje({ sak_id: 'UKJENT-1', sakstittel: 'Ukjent', sakstype: 'ukjent' });
  render(ProjectOverview, {
    saker: [...saker, ukjent],
    prosjektId: 'P001',
    prosjektNavn: 'Operatunnelen',
    part: 'TE',
  });
  // Panelet står to ganger: til venstre og over listen på smal skjerm.
  const panel = screen.getAllByRole('group', { name: 'Saker', hidden: true })[0]!;
  const typer = within(panel).getAllByRole('button', { hidden: true });
  expect(typer.map((t) => t.textContent)).toEqual([
    'Krav om endringsordre2 saker',
    'Endringsordrer0 saker',
    'Forsering0 saker',
  ]);
  expect(typer[0]).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByRole('heading', { name: 'Krav om endringsordre' })).toBeInTheDocument();
  expect(screen.getByText('2 av 2 saker')).toBeInTheDocument();
  expect(screen.queryByText('UKJENT-1')).not.toBeInTheDocument();

  await user.click(typer[1]!);
  expect(typer[1]).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByRole('heading', { name: 'Endringsordrer' })).toBeInTheDocument();
  expect(screen.getByText('Ingen endringsordrer ennå.')).toBeInTheDocument();
  expect(screen.queryByText('KOE-2024-047')).not.toBeInTheDocument();
});

it('merket «Inngår i EO-012» står på saken endringsordren omfatter, og bare der (EO-U13, EO-U14)', () => {
  render(ProjectOverview, {
    saker,
    prosjektId: 'P001',
    prosjektNavn: 'Operatunnelen',
    eoMerker: { 'KOE-2024-047': 'EO-012' },
  });
  const rader = screen.getAllByRole('row').slice(1);
  const medMerke = rader.filter((rad) => within(rad).queryByText('Inngår i EO-012'));
  expect(medMerke).toHaveLength(1);
  expect(within(medMerke[0]!).getByText('KOE-2024-047')).toBeInTheDocument();
});
