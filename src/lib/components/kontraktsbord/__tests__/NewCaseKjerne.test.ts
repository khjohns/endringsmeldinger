/**
 * Skjemaet for ny sak på TS-stien (#666): saken opprettes, brevkontrollen viser
 * den låste teksten kjernen lager, og grunnlagskravet sendes med den samme
 * teksten (LV-U2). Klienten mot TS-serveren er falsk; at serveren avgjør, prøves
 * i `sprakprove/skrivesti/`.
 */

import { render, fireEvent, waitFor, cleanup } from '@testing-library/svelte';
import { userEvent } from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import NewCaseForm from '../NewCaseForm.svelte';
import { KRAV_STRUKTUR_NS8407 } from '$lib/constants/categories';
import { ApiError } from '$lib/api/client';
import { hentKjernesak, opprettSak, sendKommando } from '$lib/api/kjerne';
import { setDraftOwner } from '$lib/utils/draftOwner';

vi.mock('$lib/kjernesak/bryter', () => ({ tsStienForNyeKoeSaker: () => true }));
vi.mock('$lib/api/kjerne', async (original) => ({
  ...(await original<typeof import('$lib/api/kjerne')>()),
  opprettSak: vi.fn(),
  hentKjernesak: vi.fn(),
  sendKommando: vi.fn(),
}));
vi.mock('$app/environment', () => ({ browser: true }));

const EIER = 'saksbehandler-1';
const UTKAST = `koe-draft-kontraktsbord-ny-kjerne-project::${EIER}`;
const SAK = 'sak-ny';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

function seed(endring: Record<string, unknown> = {}) {
  const endringen = KRAV_STRUKTUR_NS8407.find((k) => k.kode === 'ENDRING')!;
  localStorage.setItem(
    UTKAST,
    JSON.stringify({
      tittel: 'Endret fundament',
      datoer: { paalegg_mottatt: '2026-09-01' },
      valgtHjemmel: {
        kontraktsforhold: endringen,
        hjemmel: endringen.hjemler.find((h) => h.kode === 'IRREG'),
      },
      begrunnelseHtml: '<p>Byggherren har pålagt et større fundament.</p>',
      ...endring,
    })
  );
}

beforeEach(() => {
  localStorage.clear();
  setDraftOwner(EIER);
  vi.mocked(opprettSak).mockReset().mockResolvedValue({ sak_id: SAK, versjon: 1 });
  vi.mocked(hentKjernesak)
    .mockReset()
    .mockResolvedValue({
      versjon: 1,
      part: 'TE',
      visning: {} as never,
      leveringsoppdrag: [],
      journal: [
        {
          event_id: 'e-1',
          versjon: 1,
          event_type: 'sak_opprettet',
          tidsstempel: '2026-09-02T08:00:00.000Z',
          aktor_rolle: 'TE',
          format: 1,
          data: { sakstittel: 'Endret fundament', sakstype: 'standard' },
        },
      ],
    });
  vi.mocked(sendKommando)
    .mockReset()
    .mockResolvedValue({ event_id: 'e-2', leveringsoppdrag: 'l-1', versjon: 2 });
  seed();
});
afterEach(cleanup);

function vis() {
  let actions:
    | { canSend: boolean; send: () => void; reviewing: boolean; sendLabel: string }
    | undefined;
  const complete = vi.fn();
  const oncreated = vi.fn();
  const screen = render(NewCaseForm, {
    prosjektId: 'project',
    onsend: complete,
    oncreated,
    onactions: (a) => {
      actions = a;
    },
  });
  return { screen, complete, oncreated, actions: () => actions };
}

describe('skjemaet for ny sak på TS-stien', () => {
  it('viser ikke vedlegg og varsler, og spør etter datoen kategorien har (VS-U26, arbeidsvalg i #655)', async () => {
    const { screen } = vis();
    expect(await screen.findByLabelText('Når ble pålegget mottatt?')).toHaveValue('2026-09-01');
    expect(screen.queryByText('Vedlegg (valgfritt)')).toBeNull();
    expect(screen.queryByLabelText(/Velg filer/)).toBeNull();
    expect(screen.queryAllByRole('checkbox')).toEqual([]);
  });

  it('endringsordren spør etter dato eller nummer og ikke etter datoen (GR-U16)', async () => {
    const endringen = KRAV_STRUKTUR_NS8407.find((k) => k.kode === 'ENDRING')!;
    seed({
      valgtHjemmel: {
        kontraktsforhold: endringen,
        hjemmel: endringen.hjemler.find((h) => h.kode === 'EO'),
      },
    });
    const { screen, actions } = vis();
    expect(await screen.findByLabelText('Endringsordrens dato eller nummer')).toBeInTheDocument();
    expect(screen.queryByLabelText('Når ble pålegget mottatt?')).toBeNull();
    expect(actions()?.canSend).toBe(false);
    await fireEvent.input(screen.getByLabelText('Endringsordrens dato eller nummer'), {
      target: { value: 'EO-12' },
    });
    await waitFor(() => expect(actions()?.canSend).toBe(true));
  });

  it('oppretter saken, viser den låste teksten og sender kravet med samme tekst etter bekreftelsen (LV-U2)', async () => {
    const { screen, complete, oncreated, actions } = vis();
    await waitFor(() => expect(actions()?.canSend).toBe(true));
    actions()!.send();

    const brev = await screen.findByRole('region', { name: 'Brevkontroll' });
    expect(opprettSak).toHaveBeenCalledWith(
      expect.stringMatching(UUID),
      { type: 'opprett_sak', sakstittel: 'Endret fundament' },
      'project'
    );
    expect(hentKjernesak).toHaveBeenCalledWith(SAK, 'project');
    const vist = Array.from(
      brev.querySelectorAll('[data-testid="laast-tekst"] p'),
      (p) => p.textContent
    );
    expect(vist[0]).toContain(`for forholdet i sak ${SAK} («Endret fundament»)`);
    expect(vist.join(' ')).toContain('TE opplyser at pålegget ble mottatt 1. september 2026.');
    expect(screen.getByTestId('utdypning')).toHaveTextContent(
      'Byggherren har pålagt et større fundament.'
    );
    expect(actions()?.reviewing).toBe(true);
    expect(sendKommando).not.toHaveBeenCalled();

    await fireEvent.click(screen.getByRole('checkbox', { name: 'Jeg har kontrollert brevet.' }));
    await fireEvent.click(screen.getByRole('button', { name: 'Send til byggherren' }));
    await waitFor(() => expect(complete).toHaveBeenCalledOnce());
    expect(sendKommando).toHaveBeenCalledWith(
      SAK,
      1,
      expect.stringMatching(UUID),
      {
        type: 'krav',
        spor: 'grunnlag',
        innhold: {
          hovedkategori: 'endring',
          underkategori: 'irregulaer_endring',
          paalegg_mottatt: '2026-09-01',
        },
        utdypning: 'Byggherren har pålagt et større fundament.',
        brevtekst: vist,
      },
      'project'
    );
    expect(oncreated).toHaveBeenCalledWith(SAK);
    expect(localStorage.getItem(UTKAST)).toBeNull();
  });

  it('avbryter TE i brevkontrollen, står saken, og neste forsøk går til samme sak (oppdragsgiver 16.10, #666)', async () => {
    const { screen, complete, actions } = vis();
    await waitFor(() => expect(actions()?.canSend).toBe(true));
    actions()!.send();
    await screen.findByRole('region', { name: 'Brevkontroll' });
    await fireEvent.click(screen.getByRole('button', { name: /Tilbake til skjemaet/ }));
    await waitFor(() => expect(screen.queryByRole('region', { name: 'Brevkontroll' })).toBeNull());
    expect(sendKommando).not.toHaveBeenCalled();
    expect(screen.queryByRole('alert')).toBeNull();
    expect(JSON.parse(localStorage.getItem(UTKAST)!).createdCase.id).toBe(SAK);

    await waitFor(() => expect(actions()?.canSend).toBe(true));
    actions()!.send();
    await screen.findByRole('region', { name: 'Brevkontroll' });
    await fireEvent.click(screen.getByRole('checkbox', { name: 'Jeg har kontrollert brevet.' }));
    await fireEvent.click(screen.getByRole('button', { name: 'Send til byggherren' }));
    await waitFor(() => expect(complete).toHaveBeenCalledOnce());
    expect(opprettSak).toHaveBeenCalledOnce();
    expect(vi.mocked(sendKommando).mock.calls[0][0]).toBe(SAK);
  });

  // Kilde: invariant 4 i 2.3 i hovedplanen og #418: et nytt forsøk sender samme kommando-ID.
  it('når svaret på opprettelsen er usikkert, sender «Prøv igjen» samme kommando med samme ID, også etter at skjemaet er lastet på nytt (#418)', async () => {
    const usikkert = new ApiError(503, 'Usikkert.', { error: 'UTFALL_USIKKERT' });
    vi.mocked(opprettSak).mockRejectedValueOnce(usikkert).mockRejectedValueOnce(usikkert);
    const foerst = vis();
    await waitFor(() => expect(foerst.actions()?.canSend).toBe(true));
    foerst.actions()!.send();
    expect(await foerst.screen.findByRole('alert')).toHaveTextContent(
      'Det er usikkert om saken ble opprettet. Prøv igjen: den opprettes ikke to ganger.'
    );
    expect(foerst.actions()?.sendLabel).toBe('Prøv igjen');
    const [id, kommando] = vi.mocked(opprettSak).mock.calls[0];
    expect(id).toMatch(UUID);
    expect(JSON.parse(localStorage.getItem(UTKAST)!).ventendeOpprettelse.kommandoId).toBe(id);

    // Siden lastes på nytt, og ID-en kommer fra utkastet.
    cleanup();
    const igjen = vis();
    await waitFor(() => expect(igjen.actions()?.canSend).toBe(true));
    igjen.actions()!.send();
    expect(await igjen.screen.findByRole('alert')).toHaveTextContent('Det er usikkert');
    await waitFor(() => expect(igjen.actions()?.canSend).toBe(true));
    igjen.actions()!.send();
    await igjen.screen.findByRole('region', { name: 'Brevkontroll' });
    expect(vi.mocked(opprettSak).mock.calls.map(([i, k]) => [i, k])).toEqual([
      [id, kommando],
      [id, kommando],
      [id, kommando],
    ]);
    expect(JSON.parse(localStorage.getItem(UTKAST)!).ventendeOpprettelse).toBeNull();
  });

  it('når svaret på kravet går tapt, sender «Prøv igjen» det kontrollerte kravet uendret med samme ID, uten ny brevkontroll (#418)', async () => {
    vi.mocked(sendKommando).mockRejectedValueOnce(new ApiError(0, 'Network error'));
    const { screen, complete, actions } = vis();
    await waitFor(() => expect(actions()?.canSend).toBe(true));
    actions()!.send();
    await screen.findByRole('region', { name: 'Brevkontroll' });
    await fireEvent.click(screen.getByRole('checkbox', { name: 'Jeg har kontrollert brevet.' }));
    await fireEvent.click(screen.getByRole('button', { name: 'Send til byggherren' }));
    await waitFor(() => expect(actions()?.sendLabel).toBe('Prøv igjen'));

    actions()!.send();
    await waitFor(() => expect(complete).toHaveBeenCalledOnce());
    expect(screen.queryByRole('region', { name: 'Brevkontroll' })).toBeNull();
    const [foerste, andre] = vi.mocked(sendKommando).mock.calls;
    expect(foerste[2]).toMatch(UUID);
    expect(andre).toEqual(foerste);
    expect(opprettSak).toHaveBeenCalledOnce();
  });

  it('uten prosjekt, som i demoen i /mockup, opprettes ingen sak, og TE får vite hvorfor', async () => {
    let actions: { canSend: boolean; send: () => void } | undefined;
    const complete = vi.fn();
    const user = userEvent.setup();
    const screen = render(NewCaseForm, {
      onsend: complete,
      onactions: (a) => {
        actions = a;
      },
    });
    await user.type(screen.getByLabelText('Kort tittel på forholdet'), 'Endret fundament');
    await user.type(screen.getByPlaceholderText('Søk etter forhold eller paragraf'), 'irregulær');
    await user.click(screen.getByRole('button', { name: /Irregulær endring/ }));
    await fireEvent.input(await screen.findByLabelText('Når ble pålegget mottatt?'), {
      target: { value: '2026-09-01' },
    });
    (screen.container.querySelector('.tiptap') as HTMLElement).focus();
    await user.keyboard('Fundamentet ble større');
    await waitFor(() => expect(actions?.canSend).toBe(true));

    actions!.send();
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Saken kan ikke opprettes uten prosjekt.'
    );
    expect(complete).not.toHaveBeenCalled();
    expect(opprettSak).not.toHaveBeenCalled();
    expect(sendKommando).not.toHaveBeenCalled();
  });

  // Kilde: VS-U26 og #711 p1: reglene for kravet prøves før saken opprettes.
  it('avviser DATO_ETTER_BREVET før saken opprettes, uten brevkontroll, og beholder verdiene (VS-U26, #711)', async () => {
    const etter = '2999-01-01';
    seed({ datoer: { paalegg_mottatt: etter } });
    const { screen, complete, actions } = vis();
    await waitFor(() => expect(actions()?.canSend).toBe(true));
    actions()!.send();
    expect(await screen.findByRole('alert')).toHaveTextContent(
      /TE har oppgitt at pålegget ble mottatt 1\. januar 2999, etter brevets dato/
    );
    expect(screen.queryByRole('region', { name: 'Brevkontroll' })).toBeNull();
    expect(opprettSak).not.toHaveBeenCalled();
    expect(sendKommando).not.toHaveBeenCalled();
    expect(complete).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Når ble pålegget mottatt?')).toHaveValue(etter);
  });

  // Kilde: #816 p2. «Prøv igjen» sender det som ble sendt, så skjemaet kan ikke endres imens.
  it('låser feltene mens et forsøk med usikkert utfall venter, og låser dem opp etter et sikkert svar', async () => {
    vi.mocked(opprettSak)
      .mockRejectedValueOnce(new ApiError(503, 'Usikkert.', { error: 'UTFALL_USIKKERT' }))
      .mockRejectedValueOnce(new ApiError(400, 'Prosjektet tar ikke imot saker.'));
    const { screen, actions } = vis();
    await waitFor(() => expect(actions()?.canSend).toBe(true));
    const felt = () => screen.getByTestId('skjemafelt').inert;
    expect(felt()).toBe(false);
    actions()!.send();
    expect(await screen.findByRole('status')).toHaveTextContent('Skjemaet er låst');
    expect(felt()).toBe(true);

    actions()!.send();
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('Prosjektet tar ikke imot saker.')
    );
    await waitFor(() => expect(felt()).toBe(false));
  });

  // Kilde: #705 og #711 p3: siden er leserens side fra serveren, ikke fast TE.
  it('bruker leserens side fra serveren, og sender ikke kravet uten side', async () => {
    const lest = await vi.mocked(hentKjernesak).getMockImplementation()!(SAK, 'project');
    vi.mocked(hentKjernesak).mockResolvedValue({ ...lest, part: null });
    const { screen, complete, actions } = vis();
    await waitFor(() => expect(actions()?.canSend).toBe(true));
    actions()!.send();
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Du har ingen kontraktsside i saken og kan ikke sende brev i den.'
    );
    expect(screen.queryByRole('region', { name: 'Brevkontroll' })).toBeNull();
    expect(sendKommando).not.toHaveBeenCalled();
    expect(complete).not.toHaveBeenCalled();
  });
});
