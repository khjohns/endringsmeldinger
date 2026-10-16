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
vi.mock('$lib/api/kjerne', () => ({
  opprettSak: vi.fn(),
  hentKjernesak: vi.fn(),
  sendKommando: vi.fn(),
}));
vi.mock('$app/environment', () => ({ browser: true }));

const EIER = 'saksbehandler-1';
const UTKAST = `koe-draft-kontraktsbord-ny-kjerne-project::${EIER}`;
const SAK = 'sak-ny';

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
  let actions: { canSend: boolean; send: () => void; reviewing: boolean } | undefined;
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
    expect(opprettSak).toHaveBeenCalledWith({
      type: 'opprett_sak',
      sakstittel: 'Endret fundament',
    });
    expect(hentKjernesak).toHaveBeenCalledWith(SAK);
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
    expect(sendKommando).toHaveBeenCalledWith(SAK, 1, {
      type: 'krav',
      spor: 'grunnlag',
      innhold: {
        hovedkategori: 'endring',
        underkategori: 'irregulaer_endring',
        paalegg_mottatt: '2026-09-01',
      },
      utdypning: 'Byggherren har pålagt et større fundament.',
      brevtekst: vist,
    });
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

  it('viser avvisningen DATO_ETTER_BREVET med meldingen fra serveren og beholder verdiene (VS-U26)', async () => {
    const etter = '2999-01-01';
    seed({ datoer: { paalegg_mottatt: etter } });
    const melding =
      'TE har oppgitt at pålegget ble mottatt 1. januar 2999, etter brevets dato 16. oktober 2026.';
    vi.mocked(sendKommando).mockRejectedValue(
      new ApiError(400, melding, { error: 'REGELBRUDD', rule: 'DATO_ETTER_BREVET' })
    );
    const { screen, complete, actions } = vis();
    await waitFor(() => expect(actions()?.canSend).toBe(true));
    actions()!.send();
    expect(await screen.findByRole('alert')).toHaveTextContent(melding);
    // Kjernen lager ingen tekst for et krav den avviser, så TE får ingen brevkontroll.
    expect(screen.queryByRole('region', { name: 'Brevkontroll' })).toBeNull();
    const kommando = vi.mocked(sendKommando).mock.calls[0][2] as Record<string, unknown>;
    expect(kommando).not.toHaveProperty('brevtekst');
    expect(complete).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Når ble pålegget mottatt?')).toHaveValue(etter);
  });
});
