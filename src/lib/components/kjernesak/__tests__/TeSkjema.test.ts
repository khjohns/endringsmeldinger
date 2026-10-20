/**
 * TEs skjemaer i TS-saken (S-2a.1, #909): foreløpig varsel, fristkrav, ny versjon og
 * trekk, med den ekte sakskonteksten og falske `hent` og `send`. Kildene er VS-U15
 * (varselet uten dager og fritekst), KA-U33 (fristkravet må begrunnes), GR-U22 og
 * VS-U26 (ny grunnlagsversjon med samme hjemmel og dato), KA-U22 (trekk uten
 * fritekst), LV-U2 (den låste teksten) og #881 (feltet ligger i skallet).
 *
 * S-2a.2: aksept (KA-U10), TEs innsigelse etter § 5 tredje ledd (VS-U1, VS-U9, VS-U14,
 * uten protest og påberopt passivitet etter OV-U7) og registrering av et varsel etter
 * § 33.4 sendt utenfor appen (MM-U1, OV-U4, MM-U17).
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/svelte';
import type { Journallinje, Kjernesak } from '$lib/api/kjerne';
import { lagKjernesak, type Kjernesakkontekst } from '$lib/kjernesak/kontekst.svelte';
import { fristkommandoFraSkjema } from '$lib/kjernesak/fristkrav';
import { nyGrunnlagsversjon } from '$lib/kjernesak/grunnlagskrav';
import { lagKravkontroll } from '$lib/kjernesak/kravkontroll.svelte';
import { forhaandsvis, utledJournal } from '$kjerne/kommandoer/skriving';
import { KJERNE } from '$kjerne/versjon';
import { avvisning } from '$kjerne/kommandoer/avvisning';
import type { Kommando } from '$kjerne/kommandoer/kommando';
import type { Journalrad, Part } from '$kjerne/typer';
import Kjernesakrom from '../Kjernesakrom.svelte';
import type { SporKey } from '$lib/components/kontraktsbord/types';
import { SAK, medGrunnlag, medVederlag, skrevet } from '$lib/kjernesak/__tests__/provejournal';

const svar = (journal: Journalrad[], part: Part | null): Kjernesak => ({
  versjon: journal.length,
  part,
  visning: {} as Kjernesak['visning'],
  journal: journal.map(
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
});

const medHandlinger = (k: Kjernesakkontekst, handlinger: string[]): Kjernesakkontekst =>
  new Proxy(k, { get: (t, p) => (p === 'handlinger' ? handlinger : Reflect.get(t, p)) });

async function vis(
  journal: Journalrad[],
  track: SporKey,
  handlinger?: string[],
  lastOppVedlegg?: (fil: File) => Promise<unknown>
) {
  const send = vi.fn().mockResolvedValue({ event_id: 'e-9', leveringsoppdrag: 'l-9', versjon: 9 });
  const ekte = lagKjernesak({
    sakId: SAK,
    prosjektId: 'p-1',
    hent: async () => svar(journal, 'TE'),
    send,
  });
  await ekte.last();
  const medHandlingene = handlinger ? medHandlinger(ekte, handlinger) : ekte;
  const kjernesak = lastOppVedlegg
    ? new Proxy(medHandlingene, {
        get: (t, p) => (p === 'lastOppVedlegg' ? lastOppVedlegg : Reflect.get(t, p)),
      })
    : medHandlingene;
  render(Kjernesakrom, {
    kjernesak,
    projectId: 'p-1',
    view: { track, mode: 'read', role: 'TE' },
    onviewchange: () => {},
    onnewcase: () => {},
  });
  return { send, kjernesak };
}

/** Bekrefter brevet i brevkontrollen og gir den låste teksten TE så. */
async function bekreftBrevet() {
  const kontroll = within(await screen.findByRole('region', { name: 'Brevkontroll' }));
  const tekst = kontroll.getByTestId('laast-tekst').textContent ?? '';
  await fireEvent.click(kontroll.getByRole('checkbox', { name: 'Jeg har kontrollert brevet.' }));
  await fireEvent.click(kontroll.getByRole('button', { name: 'Send til byggherren' }));
  return tekst;
}

const sendt = (send: ReturnType<typeof vi.fn>) => send.mock.calls[0][3];

const fristdata = (varsel_type: string, begrunnelse = '', antall_dager?: number) =>
  ({ varsel_type, begrunnelse, antall_dager }) as Parameters<typeof fristkommandoFraSkjema>[0];

beforeEach(() => vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Ingen nettverk.'))));
afterEach(() => vi.unstubAllGlobals());

describe('fristsporet fra TE-skjemaet', () => {
  it('TE sender et foreløpig varsel etter § 33.4 uten dager og uten fritekst (VS-U15)', async () => {
    const { send } = await vis(medGrunnlag, 'frist');
    await fireEvent.click(screen.getByRole('button', { name: 'Send varsel eller krav' }));
    await fireEvent.click(screen.getByRole('radio', { name: 'Foreløpig varsel' }));
    expect(screen.queryByRole('textbox', { name: /Begrunnelse/ })).toBeNull();
    await fireEvent.click(screen.getByRole('button', { name: 'Se brev og send' }));
    const tekst = await bekreftBrevet();

    await vi.waitFor(() => expect(send).toHaveBeenCalledOnce());
    expect(sendt(send)).toEqual({
      type: 'send_varsel',
      spor: 'frist',
      hjemmel: '33.4',
      brevtekst: expect.any(Array),
    });
    expect(tekst).toContain('TE varsler etter NS 8407 § 33.4 at TE vil kreve fristforlengelse');
  });

  // Fastholder atferden i Python-skjemaet (scenario `new`) og i `main` før #982: TE velger selv
  // mellom varsel og krav. Ingen vedtak sier noe om startvalget.
  it('uten standardvalg og med flere valg fra kjernen åpner skjemaet uten valgt kravstype (#968 p7)', async () => {
    await vis(medGrunnlag, 'frist');
    await fireEvent.click(screen.getByRole('button', { name: 'Send varsel eller krav' }));
    const valg = screen.getAllByRole('radio');
    expect(valg.length, 'kjernen tilbyr flere valg').toBeGreaterThan(1);
    for (const v of valg) expect(v).not.toBeChecked();
  });

  it('når varselet er sendt, tilbys bare det spesifiserte kravet, ikke et nytt varsel (VS-U15)', async () => {
    const varslet = skrevet(medGrunnlag, 'TE', {
      type: 'send_varsel',
      spor: 'frist',
      hjemmel: '33.4',
    });
    await vis(varslet, 'frist');
    await fireEvent.click(screen.getByRole('button', { name: 'Send krav om fristforlengelse' }));
    expect(screen.queryByRole('radio', { name: 'Foreløpig varsel' })).toBeNull();
    expect(screen.queryByRole('radio', { name: 'Utsatt beregning' })).toBeNull();
    expect(screen.getByRole('radio', { name: 'Spesifisert krav' })).toBeInTheDocument();
  });

  it('et spesifisert krav med dager og uten begrunnelse stoppes i skjemaet (KA-U33)', async () => {
    const { send } = await vis(medGrunnlag, 'frist');
    await fireEvent.click(screen.getByRole('button', { name: 'Send varsel eller krav' }));
    await fireEvent.click(screen.getByRole('radio', { name: 'Spesifisert krav' }));
    await fireEvent.input(screen.getByLabelText('Antall dager'), { target: { value: '12' } });

    expect(screen.getByText('Begrunnelsen for antallet dager mangler.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Se brev og send' })).toBeDisabled();
    expect(send).not.toHaveBeenCalled();
  });

  // Skjemaet og kjernen stopper det samme kravet: uten tekst avviser kjernen med BEGRUNNELSE_MANGLER.
  it('adapteren sender dagene og begrunnelsen som utdypning, og kjernen godtar kravet (KA-U33)', () => {
    const kommando = fristkommandoFraSkjema(
      fristdata('spesifisert', '<p>Peling på kritisk linje.</p>', 12)
    );
    expect(kommando).toEqual({
      type: 'krav',
      spor: 'frist',
      innhold: { dager: 12 },
      utdypning: 'Peling på kritisk linje.',
    });
    const kontekst = {
      sakId: SAK,
      aktoerId: 'te',
      part: 'TE' as const,
      teamId: null,
      tidspunkt: () => new Date('2026-10-17T09:00:00.000Z'),
      nyId: () => crypto.randomUUID(),
    };
    expect(forhaandsvis(kommando, kontekst, medGrunnlag, KJERNE).godtatt).toBe(true);
    const utenUtdypning = { type: 'krav', spor: 'frist', innhold: { dager: 12 } };
    // Forhåndsvisningen krever ikke utdypningen; serveren gjør det med `avvisning` (KA-U33).
    const u = utledJournal(medGrunnlag, KJERNE);
    const regel = (k: Record<string, unknown>) =>
      avvisning(k as unknown as Kommando, 'TE', u, KJERNE.regler, undefined as never, '2026-10-17')
        ?.regel ?? null;
    expect(regel(kommando)).toBeNull();
    expect(regel(utenUtdypning)).toBe('BEGRUNNELSE_MANGLER');
  });

  it.each([
    ['et varsel med fritekst', fristdata('varsel', '<p>Tekst</p>'), 'ingen fritekst'],
    [
      'et krav uten begrunnelse',
      fristdata('spesifisert', '', 3),
      'Begrunnelsen for antallet dager mangler',
    ],
    ['begrunnelse utsatt', fristdata('begrunnelse_utsatt', '<p>Tekst</p>'), 'ennå'],
    ['vedlegg', { ...fristdata('spesifisert', '<p>T</p>', 3), vedlegg_ids: ['v-1'] }, 'ennå'],
  ])('adapteren avviser %s i stedet for å forenkle det', (_navn, data, melding) => {
    expect(() => fristkommandoFraSkjema(data)).toThrow(melding);
  });
});

describe('ny versjon av kravet', () => {
  it('en ny grunnlagsversjon har kategorien og datoen fra gjeldende versjon, og kjernen godtar den (GR-U22, VS-U26)', async () => {
    const u = utledJournal(medGrunnlag, KJERNE);
    const gjeldende = u.spor.grunnlag.gjeldendeKrav!;
    const send = vi.fn().mockResolvedValue(true);
    const brev = vi.fn().mockReturnValue({ tekst: ['brevet TE ser'] });
    const kontroll = lagKravkontroll({
      utledning: u,
      brev,
      send,
    } as unknown as Kjernesakkontekst);
    const sending = kontroll.submit('grunnlag', 'grunnlag_oppdatert', {
      begrunnelse: '<p>BH påla ny peling i akse 3.</p>',
    });
    await vi.waitFor(() => expect(kontroll.letter?.tittel).toMatch(/^Grunnlag – /));
    kontroll.confirm();
    await sending;
    const kommando = send.mock.calls[0][0];
    expect(kommando).toEqual({
      type: 'krav',
      spor: 'grunnlag',
      innhold: {
        hovedkategori: 'endring',
        underkategori: 'irregulaer_endring',
        paalegg_mottatt: '2026-10-01',
      },
      utdypning: 'BH påla ny peling i akse 3.',
    });
    expect(nyGrunnlagsversjon(gjeldende.innhold, ' ')).not.toHaveProperty('utdypning');
    expect(() => skrevet(medGrunnlag, 'TE', kommando)).not.toThrow();
  });

  it('en ny versjon av fristkravet sendes som krav (#909)', async () => {
    const send = vi.fn().mockResolvedValue(true);
    const kontroll = lagKravkontroll({
      brev: () => ({ tekst: ['brevet TE ser'] }),
      send,
    } as unknown as Kjernesakkontekst);
    const sending = kontroll.submit(
      'frist',
      'frist_krav_oppdatert',
      fristdata('spesifisert', '<p>Nye dager.</p>', 20)
    );
    await vi.waitFor(() => expect(kontroll.letter).not.toBeNull());
    kontroll.confirm();
    await sending;
    expect(send.mock.calls[0][0]).toMatchObject({ type: 'krav', innhold: { dager: 20 } });
  });

  it('skjemaet for ny grunnlagsversjon har ingen vedlegg og viser at hjemmelen står (GR-U22)', async () => {
    await vis(medGrunnlag, 'ansvar');
    await fireEvent.click(screen.getByRole('button', { name: 'Send ny versjon av grunnlaget' }));
    expect(
      screen.getByText(/Kontraktsforhold, hjemmel og dato kan ikke endres/)
    ).toBeInTheDocument();
    expect(screen.queryByText(/Vedlegg/)).toBeNull();
  });

  it('etter byggherrens svar viser skjemaet ikke en tom boks for byggherrens standpunkt (#718)', async () => {
    const gjelder = utledJournal(medGrunnlag, KJERNE).spor.grunnlag.gjeldendeKrav!.id;
    const avslag = skrevet(medGrunnlag, 'BH', {
      type: 'brev',
      svar: [
        {
          spor: 'grunnlag',
          gjelder,
          regelversjon: KJERNE.regler.versjon,
          vurderinger: { resultat: 'avslaatt', grunnlag_varslet_i_tide: true },
          resultat: {},
          utdypning: 'Avslått.',
        },
      ],
    } as Kommando);
    await vis(avslag, 'ansvar');
    await fireEvent.click(screen.getByRole('button', { name: 'Send ny versjon av grunnlaget' }));
    expect(screen.getByText(/ny revisjon etter byggherrens svar/)).toBeInTheDocument();
    expect(screen.queryByText('Byggherrens standpunkt')).toBeNull();
    expect(document.querySelector('.bh-context')).toBeNull();
  });
});

describe('trekket', () => {
  it('TE trekker vederlagskravet uten fritekst og med den låste teksten (KA-U22)', async () => {
    const { send } = await vis(medVederlag, 'vederlag');
    await fireEvent.click(screen.getByRole('button', { name: 'Trekk' }));
    const dialog = within(screen.getByRole('dialog', { name: 'Trekk tilbake krav' }));
    expect(dialog.queryByRole('textbox')).toBeNull();
    expect(dialog.queryByText(/automatisk trekke grunnlaget/)).toBeNull();
    expect(dialog.getByText(/Kravet kan ikke tas opp igjen i saken/)).toBeInTheDocument();
    await fireEvent.click(dialog.getByRole('button', { name: 'Se brevet' }));
    const tekst = await bekreftBrevet();

    await vi.waitFor(() => expect(send).toHaveBeenCalledOnce());
    expect(sendt(send)).toEqual({ type: 'trekk', spor: 'vederlag', brevtekst: expect.any(Array) });
    expect(tekst).toContain('TE trekker kravet om justering av vederlaget');
  });

  it('når kjernen avviser trekket, viser dialogen meldingen, og ingenting sendes', async () => {
    const { send } = await vis(medGrunnlag, 'frist', ['trekke:frist']);
    await fireEvent.click(screen.getByRole('button', { name: 'Trekk' }));
    const dialog = within(screen.getByRole('dialog', { name: 'Trekk tilbake krav' }));
    await fireEvent.click(dialog.getByRole('button', { name: 'Se brevet' }));
    expect(await dialog.findByRole('alert')).toHaveTextContent(
      'Det er ikke sendt noe krav om frist.'
    );
    expect(screen.queryByRole('region', { name: 'Brevkontroll' })).toBeNull();
    expect(send).not.toHaveBeenCalled();
  });
});

describe('Kontrollrommet i skjermhøyden (#881)', () => {
  it('feltet «Last saken på nytt» ligger i skallet, ikke over det', async () => {
    const hent = vi
      .fn()
      .mockResolvedValueOnce(svar(medGrunnlag, 'TE'))
      .mockRejectedValueOnce(new Error('Nettverket svarte ikke.'));
    const send = vi
      .fn()
      .mockResolvedValue({ event_id: 'e-9', leveringsoppdrag: 'l-9', versjon: 3 });
    const kjernesak = lagKjernesak({ sakId: SAK, prosjektId: 'p-1', hent, send });
    await kjernesak.last();
    render(Kjernesakrom, {
      kjernesak,
      projectId: 'p-1',
      view: { track: 'ansvar', mode: 'read', role: 'TE' },
      onviewchange: () => {},
      onnewcase: () => {},
    });
    expect(await kjernesak.send({ type: 'krav' }, ['Kontrollert tekst.'])).toBe(true);
    const knapp = await screen.findByRole('button', { name: 'Last saken på nytt' });
    expect(knapp.closest('.shell')).not.toBeNull();
  });
});

const avslaattGrunnlag = () => {
  const gjelder = utledJournal(medGrunnlag, KJERNE).spor.grunnlag.gjeldendeKrav!.id;
  return skrevet(medGrunnlag, 'BH', {
    type: 'brev',
    svar: [
      {
        spor: 'grunnlag',
        gjelder,
        regelversjon: KJERNE.regler.versjon,
        vurderinger: { resultat: 'avslaatt', grunnlag_varslet_i_tide: true },
        resultat: {},
        utdypning: 'Avslått.',
      },
    ],
  } as Kommando);
};

describe('aksept og innsigelse (S-2a.2)', () => {
  it('TE godtar byggherrens gjeldende svar med svaret og regelversjonen brevet er vist med (KA-U10)', async () => {
    const journal = avslaattGrunnlag();
    const svarId = utledJournal(journal, KJERNE).spor.grunnlag.gjeldendeSvar!.id;
    const { send } = await vis(journal, 'ansvar');
    await fireEvent.click(screen.getByRole('button', { name: 'Godta svaret' }));
    expect(await screen.findByText('Du godtar svaret')).toBeInTheDocument();
    const tekst = await bekreftBrevet();
    await vi.waitFor(() => expect(send).toHaveBeenCalledOnce());
    const { brevtekst, ...kommando } = sendt(send);
    expect(kommando).toEqual({
      type: 'aksept',
      spor: 'grunnlag',
      svar: svarId,
      regelversjon: KJERNE.regler.versjon,
    });
    expect(brevtekst.join('')).toBe(tekst);
  });

  it('uten svar fra byggherren tilbys verken aksept eller innsigelse (KA-U10, VS-U14)', async () => {
    await vis(medGrunnlag, 'ansvar');
    expect(screen.queryByRole('button', { name: 'Godta svaret' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Gjør innsigelse' })).toBeNull();
  });

  it('TE gjør innsigelse etter § 5 tredje ledd mot byggherrens svar, uten fritekst (VS-U1, VS-U14)', async () => {
    const journal = avslaattGrunnlag();
    const svarId = utledJournal(journal, KJERNE).spor.grunnlag.gjeldendeSvar!.id;
    const { send } = await vis(journal, 'ansvar');
    await fireEvent.click(screen.getByRole('button', { name: 'Gjør innsigelse' }));
    const dialog = within(screen.getByRole('dialog', { name: 'Innsigelse etter § 5' }));
    expect(dialog.queryByRole('textbox')).toBeNull();
    await fireEvent.click(dialog.getByRole('button', { name: 'Se brevet' }));
    expect(await screen.findByText('Du gjør innsigelse')).toBeInTheDocument();
    await bekreftBrevet();
    await vi.waitFor(() => expect(send).toHaveBeenCalledOnce());
    const { brevtekst, ...kommando } = sendt(send);
    expect(kommando).toEqual({ type: 'innsigelse', gjelder: svarId });
    expect(brevtekst.length).toBeGreaterThan(0);
  });

  it('protest og påberopt passivitet tilbys ikke, selv om kjernen tilbyr dem (OV-U7)', async () => {
    const journal = avslaattGrunnlag();
    const krav = utledJournal(journal, KJERNE).spor.grunnlag.gjeldendeKrav!.id;
    await vis(journal, 'ansvar', [`passivitet:${krav}`, `protest:${krav}`]);
    expect(screen.queryByRole('button', { name: /[Pp]rotest|[Pp]assivitet/ })).toBeNull();
  });

  it('en avvist aksept vises for TE og sendes ikke (#943)', async () => {
    const kontroll = lagKravkontroll({
      utledning: utledJournal(avslaattGrunnlag(), KJERNE),
      regelversjon: KJERNE.regler.versjon,
      brev: () => ({ avvisning: { regel: 'ENIGHET_I_SPORET', melding: 'Partene er enige.' } }),
      send: vi.fn(),
    } as unknown as Kjernesakkontekst);
    await kontroll.aksept('grunnlag', 'S-1');
    expect(kontroll.feil).toBe('Brevet ble ikke sendt. Partene er enige.');
  });
});

describe('registrering av et varsel sendt utenfor appen (S-2a.2)', () => {
  const vedlegg = { vedlegg_id: 'V-1', filnavn: 'varsel.pdf', innhold_sha256: 'a'.repeat(64) };

  it('TE registrerer varselet med datoen og brevet som vedlegg, uten brevkontroll og uten tekst fra appen (MM-U1, OV-U4, MM-U17)', async () => {
    const lastOpp = vi.fn().mockResolvedValue({ ...vedlegg, stoerrelse: 10 });
    const { send } = await vis(medGrunnlag, 'frist', undefined, lastOpp);
    await fireEvent.click(screen.getByRole('button', { name: 'Send varsel eller krav' }));
    await fireEvent.click(screen.getByRole('radio', { name: 'Varsel sendt utenfor appen' }));
    const knapp = screen.getByRole('button', { name: /Registrer varselet/ });
    expect(knapp).toBeDisabled();
    await fireEvent.input(screen.getByLabelText('Datoen varselet ble sendt'), {
      target: { value: '2026-10-10' },
    });
    const fil = new File(['%PDF'], 'varsel.pdf', { type: 'application/pdf' });
    await fireEvent.change(screen.getByLabelText('Brevet med varselet'), {
      target: { files: [fil] },
    });
    await screen.findByText('varsel.pdf');
    expect(lastOpp).toHaveBeenCalledWith(fil);
    await fireEvent.click(knapp);
    await vi.waitFor(() => expect(send).toHaveBeenCalledOnce());
    expect(screen.queryByRole('region', { name: 'Brevkontroll' })).toBeNull();
    expect(sendt(send)).toEqual({
      type: 'varsel',
      spor: 'frist',
      hjemmel: '33.4',
      sendt: '2026-10-10',
      dokumentasjon: ['V-1'],
    });
  });

  // OV-U5 og arbeidsvalget i #909: kravet registrerer varselet, så brevet med det ligger ved.
  it('et spesifisert krav oppgir et varsel sendt utenfor appen med datoen og brevet, som står i brevteksten (OV-U5)', async () => {
    const send = vi
      .fn()
      .mockResolvedValue({ event_id: 'e-9', leveringsoppdrag: 'l-9', versjon: 9 });
    const kjernesak = lagKjernesak({
      sakId: SAK,
      prosjektId: 'p-1',
      hent: async () => svar(medGrunnlag, 'TE'),
      send,
    });
    await kjernesak.last();
    const kontroll = lagKravkontroll(kjernesak);
    const sending = kontroll.submit('frist', 'frist_krav_sendt', {
      ...fristdata('spesifisert', '<p>Peling på kritisk linje.</p>', 12),
      tidligereVarsel: { sendt: '2026-10-01', vedlegg: [vedlegg] },
    });
    await vi.waitFor(() => expect(kontroll.letter).not.toBeNull());
    expect(kontroll.letter!.tekst).toContain('Brevet har vedlegg: «varsel.pdf».');
    kontroll.confirm();
    await sending;
    expect(sendt(send)).toMatchObject({
      type: 'krav',
      innhold: { dager: 12 },
      varsel: { sendt: '2026-10-01', dokumentasjon: ['V-1'] },
    });
  });

  it('skjemaet tilbyr varselet i det spesifiserte kravet bare når kjernen kan registrere det, og krever brevet (OV-U5)', async () => {
    await vis(medGrunnlag, 'frist');
    await fireEvent.click(screen.getByRole('button', { name: 'Send varsel eller krav' }));
    await fireEvent.click(screen.getByRole('radio', { name: 'Spesifisert krav' }));
    expect(screen.queryByLabelText('Datoen varselet ble sendt')).toBeNull();
    await fireEvent.click(
      screen.getByRole('checkbox', { name: /Varselet etter § 33.4 er sendt tidligere/ })
    );
    await fireEvent.input(screen.getByLabelText('Datoen varselet ble sendt'), {
      target: { value: '2026-10-10' },
    });
    expect(screen.getByText('Legg ved brevet med varselet.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Se brev og send' })).toBeDisabled();
    cleanup();
    const varslet = skrevet(medGrunnlag, 'TE', {
      type: 'send_varsel',
      spor: 'frist',
      hjemmel: '33.4',
    });
    await vis(varslet, 'frist');
    await fireEvent.click(screen.getByRole('button', { name: 'Send krav om fristforlengelse' }));
    expect(
      screen.queryByRole('checkbox', { name: /Varselet etter § 33.4/ }),
      'kontrollsak'
    ).toBeNull();
  });

  it.each([
    ['uten vedlegg', { sendt: '2026-10-10', vedlegg: [] }, 'Legg ved brevet'],
    ['med en dato etter i dag', { sendt: '2026-10-20', vedlegg: [vedlegg] }, 'etter dagens dato'],
  ])('adapteren avviser varselet i kravet %s (OV-U5)', (_n, tidligereVarsel, melding) => {
    const data = { ...fristdata('spesifisert', '<p>T</p>', 3), tidligereVarsel };
    expect(() => fristkommandoFraSkjema(data, '2026-10-19')).toThrow(melding);
  });

  it('tilbyr kjernen bare registreringen etter et fristkrav, åpner skjemaet med den (VS-U16)', async () => {
    const medFristkrav = skrevet(medGrunnlag, 'TE', {
      type: 'krav',
      spor: 'frist',
      innhold: { dager: 12 },
      utdypning: 'Peling på kritisk linje.',
    });
    await vis(medFristkrav, 'frist', ['varsle:frist']);
    await fireEvent.click(screen.getByRole('button', { name: 'Registrer varsel' }));
    expect(screen.getByLabelText('Datoen varselet ble sendt')).toBeInTheDocument();
    expect(screen.getByText(/datoen kan ikke endres etterpå/)).toBeInTheDocument();
    expect(screen.queryByLabelText('Antall dager')).toBeNull();
  });

  it.each([
    ['uten vedlegg', { sendt: '2026-10-10', vedlegg: [] }, '', 'Legg ved brevet'],
    ['uten dato', { sendt: '', vedlegg: [vedlegg] }, '', 'Oppgi datoen'],
    [
      'med en dato etter i dag',
      { sendt: '2026-10-20', vedlegg: [vedlegg] },
      '',
      'etter dagens dato',
    ],
    ['med tekst fra appen', { sendt: '2026-10-10', vedlegg: [vedlegg] }, '<p>T</p>', 'ingen tekst'],
  ])(
    'adapteren avviser registreringen %s i stedet for å forenkle den',
    (_n, registrert, tekst, melding) => {
      expect(() =>
        fristkommandoFraSkjema({ ...fristdata('varsel', tekst), registrert }, '2026-10-19')
      ).toThrow(melding);
    }
  );
});
