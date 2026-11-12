/**
 * Demoruta for brukerforløpet BF-01 (#1330), med den ekte saksvisningen og kjernen i
 * minnet. Forløpet starter fra et kontrollpunkt i startjournalen, BH sender svaret
 * gjennom brevkontrollen, og TE godtar det i visningen. Etter hvert steg kontrolleres
 * forløpets kontroller med kilde mot journalen demoruta skrev (`kontrollerEtter`).
 *
 * BHs skjema for vederlagssvaret i Varden prøves i Varden-testen; her lages svaret med
 * `vederlagssvaret`, som skjemaet bruker, av valgene skjemaet gir, og kjernesaken sender det
 * med den låste teksten BH ser.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/svelte';
import { finnForloep, lagDemosak, type Demosak } from '$lib/kjernesak/demosak';
import { lagKjernesak } from '$lib/kjernesak/kontekst.svelte';
import { vederlagssvaret, type Svarvalg } from '$lib/components/varden/kommandoer';
import type { Journalrad } from '$kjerne/typer';
import { finn, kjoerBrukerforloep, kontrollpunkt, somForloep } from '$kjerne/tester/brukerforloep';
import { kontrollerEtter } from '$kjerne/tester/kjoerer';
import Demoforloep from '../Demoforloep.svelte';

const BF = finn('BF-01');
const START = finnForloep('BF-01')!;
const paastand = (holder: boolean, melding: string) => expect(holder, melding).toBe(true);

/** Svaret i forløpets steg 4, med valgene BHs skjema i Varden gir (`Vederlagssvar.svelte`). */
const BH_SVARER: Svarvalg = {
  iTide: false,
  poster: { P1: { form: 'tilbud', beloep: 'deler', delbeloep: '60 000' } },
  begrunnelse: 'Varselet kom for sent. Subsidiært godtas 60 000 kr.',
};

/** Kjøreren til kontrollpunktet, med journalen den skrev, og banen som leser demosaken. */
async function kjoeringTil(punkt: string) {
  const { k, bane } = await kjoerBrukerforloep(BF, { til: punkt, paastand });
  const skrevet = await bane.journal();
  const lesFra = (demosak: Demosak) => (bane.journal = async () => demosak.journal());
  return { k, skrevet, lesFra };
}

const nyeRader = (demosak: Demosak, etter: number): Journalrad[] =>
  demosak.journal().filter((r) => r.versjon > etter);

async function bhSenderSvaret(demosak: Demosak) {
  demosak.part = 'BH';
  const kjernesak = lagKjernesak({
    sakId: demosak.sakId,
    prosjektId: 'demo',
    part: 'BH',
    hent: demosak.hent,
    send: demosak.send,
  });
  await kjernesak.last();
  const kommando = vederlagssvaret(BH_SVARER, kjernesak.utledning!, kjernesak.regler)!;
  const brevet = kjernesak.brev(kommando, undefined, true);
  if (!brevet || !('tekst' in brevet) || !brevet.tekst)
    throw new Error('Kjernen ga ikke noe brev for svaret.');
  const vist = brevet.tekst;
  expect(await kjernesak.send(kommando, vist)).toBe(true);
  return vist;
}

beforeEach(() => vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Ingen nettverk.'))));
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('demoruta for brukerforløpet BF-01', () => {
  it('startjournalen ved hvert kontrollpunkt er journalen kjøreren skriver dit', async () => {
    for (const p of BF.kontrollpunkter!) {
      const { skrevet } = await kjoeringTil(p.id);
      const demosak = lagDemosak(START, p.id, 'TE');
      expect(demosak.journal(), p.id).toEqual(skrevet);
    }
  });

  it('forløpet starter i visningen fra et navngitt kontrollpunkt, med siden som handler i neste steg', async () => {
    let demosak: Demosak | null = null;
    render(Demoforloep, {
      forloep: START,
      punkt: 'bh-har-mottatt-vederlagskravet',
      onpunkt: () => {},
      onstart: (d: Demosak) => (demosak = d),
    });
    expect(await screen.findByRole('heading', { name: BF.tittel })).toBeInTheDocument();
    const panel = within(screen.getByRole('complementary', { name: 'Demo av brukerforløpet' }));
    expect(panel.getByRole('combobox', { name: 'Start fra kontrollpunktet' })).toHaveValue(
      'bh-har-mottatt-vederlagskravet'
    );
    expect(panel.getByRole('radio', { name: 'BH' })).toHaveAttribute('aria-checked', 'true');
    expect(panel.getByText('Neste steg i forløpet: BH svarer på kravet.')).toBeInTheDocument();
    expect(demosak!.journal().at(-1)!.versjon).toBe(
      START.kontrollpunkter.find((p) => p.id === 'bh-har-mottatt-vederlagskravet')!.versjon
    );
  });

  // Oppdragsgiver 30.10 (#1391): panelet starter lukket, og en brukertest viser saken uten det.
  it('demopanelet starter lukket, og uten panelet vises saken alene', async () => {
    render(Demoforloep, { forloep: START, punkt: 'start', onpunkt: () => {} });
    const panel = screen.getByRole('complementary', { name: 'Demo av brukerforløpet' });
    expect(panel.querySelector('details')).not.toHaveAttribute('open');
    cleanup();

    render(Demoforloep, { forloep: START, punkt: 'start', panel: false, onpunkt: () => {} });
    expect(await screen.findByRole('heading', { name: BF.tittel })).toBeInTheDocument();
    expect(screen.queryByRole('complementary', { name: 'Demo av brukerforløpet' })).toBeNull();
  });

  // Oppdragsgiver 02.11 i PR #1492: skjemaet for ny sak står i skallet i Varden, med panelet
  // og topplinja, og bare TE kan sende det (BF-05). Overskriften står i utkastkortet etter merket
  // «Utkast · ikke sendt» (S-4 og S-4b i BF-10, oppdragsgiver 06.11).
  it('BF-05: skjemaet for ny sak står i skallet i Varden, og siden kan ikke byttes før saken finnes', async () => {
    const bf05 = finnForloep('BF-05')!;
    render(Demoforloep, {
      forloep: bf05,
      punkt: bf05.kontrollpunkter[0].id,
      onpunkt: () => {},
    });
    const overskrift = await screen.findByRole('heading', {
      level: 1,
      name: /^Utkast · ikke sendt\s*Nytt krav om endringsordre$/,
    });
    expect(overskrift).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Kontrakten' })).toBeTruthy();
    const sti = screen.getByRole('navigation', { name: 'Du er her' });
    expect(within(sti).getByText('Ny sak').getAttribute('aria-current')).toBe('page');
    expect(screen.queryByRole('radiogroup', { name: 'Du handler som' })).toBeNull();
    expect(screen.queryByText('Du handler som')).toBeNull();
  });

  it('BH sender svaret i demoruta, kontrollene ved kontrollpunktet holder, og når TE åpner saken, sier panelet at den er endret', async () => {
    const forloep = somForloep(BF);
    const punkt = kontrollpunkt(BF, 'bh-har-mottatt-vederlagskravet');
    const { k, lesFra } = await kjoeringTil(punkt.id);
    const versjon = START.kontrollpunkter.find((p) => p.id === punkt.id)!.versjon;

    let demosak: Demosak | null = null;
    render(Demoforloep, {
      forloep: START,
      punkt: punkt.id,
      onpunkt: () => {},
      onstart: (d: Demosak) => (demosak = d),
    });
    await screen.findByRole('heading', { name: BF.tittel });
    lesFra(demosak!);

    // Steg 4: BH kontrollerer brevet og sender svaret. Kjernen skrev det i journalen i minnet.
    const vist = await bhSenderSvaret(demosak!);
    const [svaret] = nyeRader(demosak!, versjon);
    expect(nyeRader(demosak!, versjon)).toHaveLength(1);
    expect(svaret.aktor_rolle).toBe('BH');
    // LV-U2: teksten BH kontrollerte, er teksten som er frosset i brevet.
    expect((svaret.data.brevtekst as { laast: string }[]).map((a) => a.laast)).toEqual(vist);
    k.registrer(BF.steg![3], [svaret]);
    await kontrollerEtter(forloep, 4, k, paastand);

    // Svaret er demoens eget, ikke svaret i startjournalen.
    const forhaandslaget = START.journal.find((r) => r.versjon === svaret.versjon)!;
    expect(svaret.event_id).not.toBe(forhaandslaget.event_id);
    expect(svaret.event_id.startsWith(START.idhode)).toBe(true);

    // TE åpner saken. Godtakelsen i Varden prøves i Varden-testen for BF-01.
    await fireEvent.click(screen.getByRole('radio', { name: 'TE' }));
    // Panelet sier ikke lenger at BH skal svare, når svaret er sendt.
    const panel = within(screen.getByRole('complementary', { name: 'Demo av brukerforløpet' }));
    expect(await panel.findByText(/Saken er endret etter kontrollpunktet/)).toBeInTheDocument();
    expect(panel.queryByText(/Neste steg i forløpet/)).toBeNull();
  });

  it('et vedlegg i demoruta legges i minnet og lastes ikke opp til serveren (VS-U53, BF-14)', async () => {
    let kjernesak: ReturnType<typeof lagKjernesak> | null = null;
    render(Demoforloep, {
      forloep: START,
      punkt: 'bh-har-mottatt-vederlagskravet',
      onpunkt: () => {},
      onstart: (_d: Demosak, k: ReturnType<typeof lagKjernesak>) => (kjernesak = k),
    });
    await screen.findByRole('heading', { name: BF.tittel });
    const vedlegg = await kjernesak!.lastOppVedlegg(new File(['x'], 'tegning.pdf'));
    expect(vedlegg.filnavn).toBe('tegning.pdf');
    expect(vedlegg.innhold_sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('en omstart fra kontrollpunktet med de samme handlingene gir samme journal', async () => {
    const journaler: Journalrad[][] = [];
    for (let i = 0; i < 2; i++) {
      const demosak = lagDemosak(START, 'bh-har-mottatt-vederlagskravet', 'BH');
      await bhSenderSvaret(demosak);
      journaler.push(demosak.journal());
    }
    expect(journaler[1]).toEqual(journaler[0]);
  });

  it('to forløp som kjører samtidig, deler ikke journal', async () => {
    const a = lagDemosak(START, 'bh-har-mottatt-vederlagskravet', 'BH');
    const b = lagDemosak(START, 'bh-har-mottatt-vederlagskravet', 'BH');
    await bhSenderSvaret(a);
    expect(b.journal()).toEqual(START.journal.filter((r) => r.versjon <= 4));
  });
});
