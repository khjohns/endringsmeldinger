/**
 * Vederlagsskjemaet `TeVederlagForm` i Kontrollrommet på TS-stien (#667, #718). Konteksten er
 * den ekte, med falske `hent` og `send`. Skjemaet sender varselet og registreringen, men ikke
 * vederlagskravet, til skjemaet etter BF-14 er bygget (arbeidsvalg til økt 3 i #1663). Kildene er
 * avgjørelsene 17.10 i #718, LV-U2 og leserens side fra serveren (#705).
 */

import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/svelte';
import Kjernesakrom from '../Kjernesakrom.svelte';
import type { Journallinje, Kjernesak, LastetKjernesak } from '$lib/api/kjerne';
import { ApiError } from '$lib/api/client';
import { lagKjernesak, PROGRAMFEIL, type Kjernesakkontekst } from '$lib/kjernesak/kontekst.svelte';
import { lagKravkontroll } from '$lib/kjernesak/kravkontroll.svelte';
import { forhaandsvis } from '$kjerne/kommandoer/skriving';
import { KJERNE } from '$kjerne/versjon';
import type { Journalrad, Part } from '$kjerne/typer';
import { MERKING } from '$lib/kjernesak/__tests__/provejournal';

const SAK = 'sak-1';

const opprettet: Journalrad = {
  event_id: 'e-1',
  sak_id: SAK,
  event_type: 'sak_opprettet',
  versjon: 1,
  tidsstempel: '2026-10-16T08:00:00.000Z',
  aktor_id: 'te',
  aktor_rolle: 'TE',
  aktor_team_id: null,
  refererer_til_event_id: null,
  format: 1,
  data: { sakstittel: 'Ny peling', sakstype: 'standard' },
};

function medKrav(foer: Journalrad[], kommando: Record<string, unknown>): Journalrad[] {
  const utfall = forhaandsvis(
    kommando,
    {
      sakId: SAK,
      aktoerId: 'te',
      part: 'TE',
      teamId: null,
      tidspunkt: () => new Date('2026-10-16T09:00:00.000Z'),
      nyId: () => crypto.randomUUID(),
      ...MERKING,
    },
    foer,
    KJERNE
  );
  if (!utfall.godtatt) throw new Error(utfall.avvisning.melding);
  return [...foer, { ...utfall.hendelser[0], versjon: foer.length + 1 }];
}

const journal = medKrav([opprettet], {
  type: 'krav',
  spor: 'forhold',
  innhold: {
    hovedkategori: 'endring',
    underkategori: 'irregulaer_endring',
    paalegg_mottatt: '2026-10-01',
  },
});
const svar = (part: Part | null, rader = journal): LastetKjernesak => ({
  versjon: rader.length,
  part,
  visning: {} as Kjernesak['visning'],
  journal: rader.map(
    ({ event_id, versjon, event_type, tidsstempel, aktor_rolle, format, data }): Journallinje => ({
      event_id,
      versjon,
      event_type,
      tidsstempel,
      aktor_rolle,
      format,
      data,
    })
  ),
  leveringsoppdrag: [],
  merking: MERKING,
});

const VIEW = { track: 'vederlag', mode: 'read', role: 'BH' } as const;

const visRom = (kjernesak: ReturnType<typeof lagKjernesak>) =>
  render(Kjernesakrom, {
    kjernesak,
    projectId: 'p-1',
    view: VIEW,
    onviewchange: () => {},
    onnewcase: () => {},
  });

async function vis(part: Part | null) {
  const send = vi.fn().mockResolvedValue({ event_id: 'e-3', leveringsoppdrag: 'l-1', versjon: 3 });
  const kjernesak = lagKjernesak({
    sakId: SAK,
    prosjektId: 'p-1',
    hent: async () => svar(part),
    send,
  });
  await kjernesak.last();
  visRom(kjernesak);
  return { send };
}

const leseflate = () => document.querySelector('.read-content');

/** Knappene som åpner TEs vederlagsskjema før kravet er sendt (#1096). */
const TE_SKJEMAKNAPP =
  /^(Send varsel eller krav|Send krav om vederlagsjustering|Send varsel|Registrer varsel)$/;

// Det gamle skjemaet tilbyr ikke vederlagskravet til skjemaet etter BF-14 er bygget
// (arbeidsvalg til økt 3 i #1663), så flyten prøves med varselet etter § 34.1.2.
describe('varselet om vederlag fra Kontrollrommet', () => {
  const kravposter = [{ beskrivelse: 'Kravposten', oppgjoersform: 'tilbud', beloep: 1000 }];

  async function tilBrevet() {
    await fireEvent.click(screen.getByRole('button', { name: 'Send varsel' }));
    await fireEvent.click(screen.getByRole('button', { name: 'Se brev og send' }));
    const kontroll = within(await screen.findByRole('region', { name: 'Brevkontroll' }));
    await fireEvent.click(kontroll.getByRole('checkbox', { name: 'Jeg har kontrollert brevet.' }));
    return kontroll;
  }

  it('skjemaet tilbyr varselet og registreringen, men ikke kravet (arbeidsvalg til økt 3 i #1663)', async () => {
    await vis('TE');
    expect(screen.queryByRole('button', { name: 'Send varsel eller krav' })).toBeNull();
    await fireEvent.click(screen.getByRole('button', { name: 'Send varsel' }));
    const skjema = within(document.querySelector('.form-content') as HTMLElement);
    expect(skjema.getByRole('radio', { name: 'Varsel' })).toBeChecked();
    expect(skjema.getByRole('radio', { name: 'Varsel sendt utenfor appen' })).toBeInTheDocument();
    expect(skjema.queryByRole('radio', { name: 'Spesifisert krav' })).toBeNull();
    expect(skjema.queryByText('Fast sum')).toBeNull();
    expect(skjema.queryByLabelText('Produktivitetstap')).toBeNull();
  });

  it('når sporet har et vederlagskrav, tilbys ikke en ny versjon fra skjemaet (arbeidsvalg til økt 3 i #1663)', async () => {
    const rader = medKrav(journal, { type: 'krav', spor: 'vederlag', innhold: { kravposter } });
    const kjernesak = lagKjernesak({
      sakId: SAK,
      prosjektId: 'p-1',
      hent: async () => svar('TE', rader),
    });
    await kjernesak.last();
    expect(kjernesak.handlinger).toContain('krav:vederlag');
    visRom(kjernesak);
    expect(screen.queryByRole('button', { name: 'Send ny versjon av kravet' })).toBeNull();
    expect(screen.queryByRole('button', { name: TE_SKJEMAKNAPP })).not.toBeNull();
  });

  it('når saken ikke kan lastes på nytt etter sendingen, sier Kontrollrommet at brevet er lagret, og hvorfor saken ikke er oppdatert', async () => {
    const send = vi
      .fn()
      .mockResolvedValue({ event_id: 'e-3', leveringsoppdrag: 'l-1', versjon: 3 });
    const hent = vi
      .fn()
      .mockResolvedValueOnce(svar('TE'))
      .mockRejectedValueOnce(new ApiError(503, 'Catenda svarte ikke.'));
    const kjernesak = lagKjernesak({ sakId: SAK, prosjektId: 'p-1', hent, send });
    await kjernesak.last();
    visRom(kjernesak);
    const kontroll = await tilBrevet();
    await fireEvent.click(kontroll.getByRole('button', { name: 'Send til byggherren' }));

    await waitFor(() => expect(leseflate()).not.toBeNull());
    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0][3]).toMatchObject({ type: 'send_varsel', spor: 'vederlag' });
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Brevet er lagret, men saken kunne ikke lastes på nytt. Catenda svarte ikke.'
    );
    // Etter sendingen viser mobilen matrisen, så varselet står utenfor panelet som skjules der (#719 p10).
    expect(screen.getByRole('alert').closest('.mobile-hidden')).toBeNull();
  });

  it('skjemaet står til sendingen er fullført, selv om kjernen ikke lenger tilbyr varselet (#737 p4)', async () => {
    const etterSending = medKrav(journal, {
      type: 'send_varsel',
      spor: 'vederlag',
      hjemmel: '34.1.2',
    });
    const send = vi
      .fn()
      .mockResolvedValue({ event_id: 'e-3', leveringsoppdrag: 'l-1', versjon: 3 });
    const hent = vi
      .fn()
      .mockResolvedValueOnce(svar('TE'))
      .mockResolvedValueOnce(svar('TE', etterSending));
    const kjernesak = lagKjernesak({ sakId: SAK, prosjektId: 'p-1', hent, send });
    await kjernesak.last();
    visRom(kjernesak);
    const uten: string[] = [];
    const vakt = new MutationObserver(() => {
      if (document.body.textContent?.includes('Dette skjemaet finnes ikke')) uten.push('vist');
    });
    vakt.observe(document.body, { childList: true, subtree: true, characterData: true });
    const kontroll = await tilBrevet();
    await fireEvent.click(kontroll.getByRole('button', { name: 'Send til byggherren' }));

    await waitFor(() => expect(leseflate()).not.toBeNull());
    vakt.disconnect();
    expect(hent).toHaveBeenCalledTimes(2);
    expect(kjernesak.handlinger).not.toContain('sende_varsel:vederlag');
    expect(uten).toEqual([]);
  });

  it('skjemaet for vederlag lukkes når visningen bytter til et annet spor i skjemamodus (#737 p4)', async () => {
    const kjernesak = lagKjernesak({
      sakId: SAK,
      prosjektId: 'p-1',
      hent: async () => svar('TE'),
      send: vi.fn(),
    });
    await kjernesak.last();
    const { rerender } = visRom(kjernesak);
    await fireEvent.click(screen.getByRole('button', { name: 'Send varsel' }));
    const tittel = { name: 'Krav om vederlagsjustering' };
    expect(screen.getByRole('heading', tittel)).toBeInTheDocument();

    await rerender({ view: { track: 'frist', mode: 'form', role: 'TE' } });
    expect(screen.queryByRole('heading', tittel)).toBeNull();
  });

  it.each([['BH'], [null]] as const)(
    'en leser med siden %s fra serveren får ikke tilbud om vederlagsskjemaet (#705)',
    async (part) => {
      await vis(part);
      expect(screen.queryByRole('button', { name: TE_SKJEMAKNAPP })).toBeNull();
      expect(screen.queryByRole('button', { name: 'Send ny versjon av kravet' })).toBeNull();
    }
  );

  it.each([
    ['TE', 'Entreprenør TE'],
    ['BH', 'Byggherre BH'],
  ] as const)('hodet viser siden %s leseren har fra serveren', async (part, tekst) => {
    await vis(part);
    expect(screen.getByText(tekst)).toBeInTheDocument();
  });

  it('uten side fra serveren viser hodet ingen rolle, heller ikke den lagrede (#732 p6)', async () => {
    await vis(null);
    expect(screen.queryByText('Byggherre BH')).toBeNull();
    expect(screen.queryByText('Entreprenør TE')).toBeNull();
  });

  async function sendMedAvvisning(feil: Error) {
    const kjernesak = lagKjernesak({
      sakId: SAK,
      prosjektId: 'p-1',
      hent: async () => svar('TE'),
      send: vi.fn().mockRejectedValue(feil),
    });
    await kjernesak.last();
    const rom = visRom(kjernesak);
    const kontroll = await tilBrevet();
    return { rom, kjernesak, send: kontroll.getByRole('button', { name: 'Send til byggherren' }) };
  }

  it('når serveren avviser varselet, står skjemaet med serverens begrunnelse', async () => {
    const { send } = await sendMedAvvisning(new ApiError(400, 'Varselet er ikke gyldig.'));
    await fireEvent.click(send);

    expect(await screen.findByRole('alert')).toHaveTextContent('Varselet er ikke gyldig.');
    expect(document.querySelector('.form-content')).not.toBeNull();
    expect(leseflate()).toBeNull();
  });

  // Kilde: #719 p9. Avbryt fjerner feilen; den står ikke i saksbildet etterpå.
  it('etter Avbryt står ikke feilen fra en avvist sending (#719 p9)', async () => {
    const { send, kjernesak } = await sendMedAvvisning(
      new ApiError(400, 'Varselet er ikke gyldig.')
    );
    await fireEvent.click(send);
    expect(await screen.findByRole('alert')).toHaveTextContent('Varselet er ikke gyldig.');

    await fireEvent.click(screen.getByRole('button', { name: 'Avbryt' }));
    expect(leseflate()).not.toBeNull();
    expect(screen.queryByRole('alert')).toBeNull();
    expect(kjernesak.feil).toBeNull();
  });

  // Kilde: #719 p9 og #418. Kommandoen kan være lagret, så meldingen står til den er avklart.
  it('etter Avbryt står meldingen om et usikkert utfall (#719 p9)', async () => {
    const { send } = await sendMedAvvisning(new ApiError(503, 'Tjenesten svarte ikke.'));
    await fireEvent.click(send);
    const usikkert = 'Det er usikkert om brevet ble lagret. Prøv igjen: det lagres ikke to ganger.';
    expect(await screen.findByRole('alert')).toHaveTextContent(usikkert);

    await fireEvent.click(screen.getByRole('button', { name: 'Avbryt' }));
    expect(leseflate()).not.toBeNull();
    const varsler = screen.getAllByRole('alert').map((a) => a.textContent?.trim());
    expect(varsler).toContain(usikkert);
  });

  // Kilde: #872 p4. Skjemaet avmonteres ikke før sendingen er ferdig, og feilen vises.
  it('bytter visningen spor mens brevet kontrolleres, står skjemaet til sendingen er ferdig (#872 p4)', async () => {
    const { rom, send } = await sendMedAvvisning(new ApiError(400, 'Varselet er ikke gyldig.'));
    await rom.rerender({ view: { track: 'frist', mode: 'read', role: 'TE' } });
    expect(document.querySelector('.form-content')).not.toBeNull();

    await fireEvent.click(send);
    expect(await screen.findByRole('alert')).toHaveTextContent('Varselet er ikke gyldig.');
    await waitFor(() => expect(document.querySelector('.form-content')).toBeNull());
    expect(screen.getByRole('alert')).toHaveTextContent('Varselet er ikke gyldig.');
  });

  it('tilbake fra brevkontrollen går til skjemaet uten å sende, og avkrysningen gjelder ikke neste brev (#729)', async () => {
    const { send } = await vis('TE');
    let kontroll = await tilBrevet();
    await fireEvent.click(kontroll.getByRole('button', { name: 'Tilbake til skjemaet' }));
    expect(screen.queryByRole('region', { name: 'Brevkontroll' })).toBeNull();
    expect(screen.getByRole('radio', { name: 'Varsel' })).toBeChecked();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Se brev og send' })).toBeEnabled()
    );

    await fireEvent.click(screen.getByRole('button', { name: 'Se brev og send' }));
    kontroll = within(await screen.findByRole('region', { name: 'Brevkontroll' }));
    expect(
      kontroll.getByRole('checkbox', { name: 'Jeg har kontrollert brevet.' })
    ).not.toBeChecked();
    expect(send).not.toHaveBeenCalled();
  });
});

// Det gamle skjemaet sender bare varselet til skjemaet etter BF-14 er bygget (økt 3 i #1663),
// så kontrollen prøves med varselet etter § 34.1.2.
describe('kontrollen før en TS-sak sender brevet om vederlag', () => {
  const kravdata = {
    grunnlag_event_id: 'e-2',
    metode: 'FASTPRIS_TILBUD' as const,
    belop_direkte: 1000,
    kostnads_overslag: undefined,
    begrunnelse: '<p>Ny peling</p>',
    krever_justert_ep: undefined,
    varslet_for_oppstart: undefined,
    saerskilt_krav: null,
    vedlegg_ids: [],
  };
  const data = { ...kravdata, begrunnelse: '', varsel_type: 'varsel' };

  it('uten låst tekst sendes ikke varselet, og TE får vite hvorfor (#719)', async () => {
    const send = vi.fn();
    const kjernesak = { brev: () => null, send } as unknown as Kjernesakkontekst;
    const kontroll = lagKravkontroll(kjernesak);
    await expect(kontroll.submit('vederlag', 'vederlag_krav_sendt', data)).rejects.toThrow(
      'Brevet er ikke sendt.'
    );
    expect(kontroll.letter).toBeNull();
    expect(send).not.toHaveBeenCalled();
  });

  // Kilde: #865 p2. TE ser hvorfor kjernen avviste kravet, ikke en gjetning om beløpet.
  // Avvisningen kommer før brevet er vist, så brevet kan ikke sendes ennå (#1264).
  it.each([
    [
      'en avvisning gir meldingen fra kjernen',
      { avvisning: { regel: 'X', melding: 'Kravet er allerede sendt.' } },
      'Brevet kan ikke sendes ennå. Kravet er allerede sendt.',
    ],
    ['en programfeil sier at feilen er i appen', { programfeil: PROGRAMFEIL }, PROGRAMFEIL],
  ])('%s, og varselet sendes ikke', async (_navn, brev, melding) => {
    const send = vi.fn();
    const kjernesak = { brev: () => brev, send } as unknown as Kjernesakkontekst;
    const kontroll = lagKravkontroll(kjernesak);
    await expect(kontroll.submit('vederlag', 'vederlag_krav_sendt', data)).rejects.toThrow(melding);
    expect(kontroll.letter).toBeNull();
    expect(send).not.toHaveBeenCalled();
  });

  const kommando = {
    type: 'krav',
    spor: 'vederlag',
    innhold: { kravposter: [{ beskrivelse: 'Kravposten', oppgjoersform: 'tilbud', beloep: 1000 }] },
  };

  it('kravet sendes med teksten TE kontrollerte, ikke en tekst laget på nytt ved sendingen (LV-U2)', async () => {
    const send = vi
      .fn()
      .mockResolvedValue({ event_id: 'e-3', leveringsoppdrag: 'l-1', versjon: 3 });
    const kjernesak = lagKjernesak({
      sakId: SAK,
      prosjektId: 'p-1',
      hent: async () => svar('TE'),
      send,
    });
    await kjernesak.last();
    expect(await kjernesak.send(kommando, ['brevet TE så'])).toBe(true);
    expect(send.mock.calls[0][3]).toMatchObject({ brevtekst: ['brevet TE så'] });
  });

  it('kontrollen sender varselet med teksten TE bekreftet', async () => {
    const send = vi.fn().mockResolvedValue(true);
    const kjernesak = {
      brev: () => ({ tekst: ['brevet TE ser'] }),
      send,
    } as unknown as Kjernesakkontekst;
    const kontroll = lagKravkontroll(kjernesak);
    const sending = kontroll.submit('vederlag', 'vederlag_krav_sendt', data);
    await vi.waitFor(() => expect(kontroll.letter).not.toBeNull());
    kontroll.confirm();
    await sending;
    expect(send).toHaveBeenCalledWith(expect.objectContaining({ type: 'send_varsel' }), [
      'brevet TE ser',
    ]);
  });

  it.each([
    [
      'vederlagskravet fra det gamle skjemaet (økt 3 i #1663)',
      'vederlag',
      'vederlag_krav_sendt',
      kravdata,
    ],
    ['et annet spor', 'frist', 'vederlag_krav_sendt', data],
    [
      'særskilte krav',
      'vederlag',
      'vederlag_krav_sendt',
      { ...kravdata, saerskilt_krav: { rigg_drift: { belop: 1 } } },
    ],
    ['vedlegg', 'vederlag', 'vederlag_krav_sendt', { ...data, vedlegg_ids: ['v-1'] }],
  ] as const)('%s avvises før brevet vises (OV-U1)', async (_navn, spor, type, d) => {
    const send = vi.fn();
    const kjernesak = { brev: () => ({ tekst: ['tekst'] }), send } as unknown as Kjernesakkontekst;
    const kontroll = lagKravkontroll(kjernesak);
    await expect(kontroll.submit(spor, type, d)).rejects.toThrow('ennå');
    expect(kontroll.letter).toBeNull();
    expect(send).not.toHaveBeenCalled();
  });
});
