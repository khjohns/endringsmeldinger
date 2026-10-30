/**
 * Demoruta for brukerforløpet BF-01 (#1330), med den ekte saksvisningen og kjernen i
 * minnet. Forløpet starter fra et kontrollpunkt i startjournalen, BH sender svaret
 * gjennom brevkontrollen, og TE godtar det i visningen. Etter hvert steg kontrolleres
 * forløpets kontroller med kilde mot journalen demoruta skrev (`kontrollerEtter`).
 *
 * BHs skjema for vederlagssvaret fylles ut i nettleseren (`mockup-nettleser`); her går
 * svaret gjennom `lagKravkontroll`, som skjemaet sender med, med dataene skjemaet gir.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/svelte';
import { finnForloep, lagDemosak, type Demosak } from '$lib/kjernesak/demosak';
import { lagKjernesak } from '$lib/kjernesak/kontekst.svelte';
import { lagKravkontroll } from '$lib/kjernesak/kravkontroll.svelte';
import type { Journalrad } from '$kjerne/typer';
import { finn, kjoerBrukerforloep, kontrollpunkt, somForloep } from '$kjerne/tester/brukerforloep';
import { kontrollerEtter } from '$kjerne/tester/kjoerer';
import Demoforloep from '../Demoforloep.svelte';

const BF = finn('BF-01');
const START = finnForloep('BF-01')!;
const paastand = (holder: boolean, melding: string) => expect(holder, melding).toBe(true);

/** Svaret i forløpets steg 4, med feltene BHs skjema gir (`vederlagssvarFraSkjema`). */
const BH_SVARER = {
  hovedkrav_vurdering: 'delvis',
  hovedkrav_godkjent_belop: 60000,
  hovedkrav_varslet_i_tide: false,
  aksepterer_metode: true,
  begrunnelse: '<p>Varselet kom for sent. Subsidiært godtas 60 000 kr.</p>',
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
  const kontroll = lagKravkontroll(kjernesak);
  const sending = kontroll.submit('vederlag', 'respons_vederlag', BH_SVARER);
  await vi.waitFor(() => expect(kontroll.letter).not.toBeNull());
  const vist = kontroll.letter!.tekst;
  kontroll.confirm();
  await sending;
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

  it('BH sender svaret, TE ser akkurat det svaret og godtar det, og kontrollene ved kontrollpunktene holder', async () => {
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

    // Steg 5: TE åpner saken og ser svaret BH skrev, med samme event_id.
    await fireEvent.click(screen.getByRole('radio', { name: 'TE' }));
    // Panelet sier ikke lenger at BH skal svare, når svaret er sendt.
    const panel = within(screen.getByRole('complementary', { name: 'Demo av brukerforløpet' }));
    expect(await panel.findByText(/Saken er endret etter kontrollpunktet/)).toBeInTheDocument();
    expect(panel.queryByText(/Neste steg i forløpet/)).toBeNull();
    await fireEvent.click(
      within(await screen.findByRole('navigation', { name: 'Sakens spor' })).getByRole('button', {
        name: /Vederlag/,
      })
    );
    await fireEvent.click(await screen.findByRole('button', { name: 'Godta svaret' }));
    const brevkontroll = within(await screen.findByRole('region', { name: 'Brevkontroll' }));
    await fireEvent.click(
      brevkontroll.getByRole('checkbox', { name: 'Jeg har kontrollert brevet.' })
    );
    await fireEvent.click(brevkontroll.getByRole('button', { name: 'Send til byggherren' }));
    await vi.waitFor(() => expect(nyeRader(demosak!, svaret.versjon)).toHaveLength(1));
    const [aksepten] = nyeRader(demosak!, svaret.versjon);
    expect(aksepten.aktor_rolle).toBe('TE');
    const godtatt = (aksepten.data.utsagn as { art: string; gjelder: string }[]).find(
      (u) => u.art === 'aksept'
    );
    const svarId = (svaret.data.svar as { id: string }[])[0].id;
    expect(godtatt?.gjelder).toBe(svarId);
    k.registrer(BF.steg![4], [aksepten]);
    await kontrollerEtter(forloep, 5, k, paastand);
  });

  it('et vedlegg i demoruta lastes ikke opp til serveren', async () => {
    let kjernesak: ReturnType<typeof lagKjernesak> | null = null;
    render(Demoforloep, {
      forloep: START,
      punkt: 'bh-har-mottatt-vederlagskravet',
      onpunkt: () => {},
      onstart: (_d: Demosak, k: ReturnType<typeof lagKjernesak>) => (kjernesak = k),
    });
    await screen.findByRole('heading', { name: BF.tittel });
    await expect(kjernesak!.lastOppVedlegg(new File(['x'], 'tegning.pdf'))).rejects.toThrow(
      'Vedlegg kan ikke lastes opp i demoen'
    );
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
