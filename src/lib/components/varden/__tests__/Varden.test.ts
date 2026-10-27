/**
 * Varden i demoruta (#1331), med brukerforløpet BF-01 og kjernen i minnet. BH fyller ut svaret
 * i Varden, kontrollerer brevet og sender det, og TE tar stilling og godtar det. Kontrollene
 * ved kontrollpunktene er forløpets, med kilde (`kontrollerEtter`).
 *
 * Sammenligningen med dagens visning: samme kontrollpunkt og samme valg gir samme journal,
 * med samme brevtekst, og de samme handlingene i sporet. Dagens visning sender BHs svar
 * gjennom `lagKravkontroll` med dataene skjemaet gir, som i testen av demoruta.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/svelte';
import { finnForloep, lagDemosak, type Demosak } from '$lib/kjernesak/demosak';
import { lagKjernesak } from '$lib/kjernesak/kontekst.svelte';
import { lagKravkontroll } from '$lib/kjernesak/kravkontroll.svelte';
import type { Journalrad } from '$kjerne/typer';
import { finn, kjoerBrukerforloep, kontrollpunkt, somForloep } from '$kjerne/tester/brukerforloep';
import { kontrollerEtter } from '$kjerne/tester/kjoerer';
import Demoforloep from '$lib/components/brukerforlop/Demoforloep.svelte';

const BF = finn('BF-01');
const START = finnForloep('BF-01')!;
const paastand = (holder: boolean, melding: string) => expect(holder, melding).toBe(true);
const BEGRUNNELSE = 'Varselet kom for sent. Subsidiært godtas 60 000 kr.';

/** Svaret i forløpets steg 4 i dagens skjema (`vederlagssvarFraSkjema`). */
const BH_SVARER_I_DAGENS = {
  hovedkrav_vurdering: 'delvis',
  hovedkrav_godkjent_belop: 60000,
  hovedkrav_varslet_i_tide: false,
  aksepterer_metode: true,
  begrunnelse: `<p>${BEGRUNNELSE}</p>`,
};

const versjonVed = (punkt: string) => START.kontrollpunkter.find((p) => p.id === punkt)!.versjon;
const nyeRader = (demosak: Demosak, etter: number): Journalrad[] =>
  demosak.journal().filter((r) => r.versjon > etter);

function aapne(punkt: string, visning: 'dagens' | 'varden') {
  let demosak: Demosak | null = null;
  render(Demoforloep, {
    forloep: START,
    punkt,
    visning,
    onpunkt: () => {},
    onstart: (d: Demosak) => (demosak = d),
  });
  return () => demosak!;
}

const demopanel = () =>
  within(screen.getByRole('complementary', { name: 'Demo av brukerforløpet' }));

/** BH svarer i Varden som i steg 4, og kommer til brevkontrollen. Gir teksten som vises. */
async function bhSvarerIVarden(): Promise<string[]> {
  await fireEvent.click(await screen.findByText('Skriv brev i sporet'));
  await fireEvent.click(screen.getByRole('button', { name: 'Svar på kravet' }));
  await fireEvent.click(screen.getByRole('radio', { name: 'Varslet for sent' }));
  await fireEvent.click(screen.getByRole('radio', { name: 'Godtar metoden' }));
  await fireEvent.click(screen.getByRole('radio', { name: 'Deler av beløpet' }));
  await fireEvent.input(await screen.findByRole('textbox', { name: 'Beløpet du godtar' }), {
    target: { value: '60 000' },
  });
  await fireEvent.input(screen.getByRole('textbox', { name: /Begrunnelse/ }), {
    target: { value: BEGRUNNELSE },
  });
  await fireEvent.click(screen.getByRole('button', { name: 'Se brevet før sending' }));
  return avsnittene(
    await screen.findByRole('article', { name: 'Svar på krav om vederlagsjustering' })
  );
}

/** Avsnittene i brevteksten slik de står i brevet på skjermen. */
const avsnittene = (brev: HTMLElement) =>
  [...within(brev).getByTestId('laast-tekst').querySelectorAll('p')].map(
    (p) => p.textContent ?? ''
  );

async function sendBrevet(knapp: string) {
  await fireEvent.click(screen.getByRole('checkbox', { name: 'Jeg har kontrollert brevet' }));
  await fireEvent.click(screen.getByRole('button', { name: knapp }));
}

/** BH sender steg 4 gjennom dagens brevkontroll. Gir teksten BH kontrollerte. */
async function bhSenderIDagens(demosak: Demosak) {
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
  const sending = kontroll.submit('vederlag', 'respons_vederlag', BH_SVARER_I_DAGENS);
  await vi.waitFor(() => expect(kontroll.letter).not.toBeNull());
  const vist = kontroll.letter!;
  kontroll.confirm();
  await sending;
  return [...vist.tekst, vist.utdypning];
}

beforeEach(() => vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Ingen nettverk.'))));
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('Varden med brukerforløpet BF-01', () => {
  it('BH sender svaret og TE godtar det i Varden, og kontrollene ved kontrollpunktene holder', async () => {
    const forloep = somForloep(BF);
    const punkt = kontrollpunkt(BF, 'bh-har-mottatt-vederlagskravet');
    const { k, bane } = await kjoerBrukerforloep(BF, { til: punkt.id, paastand });
    const demosak = aapne(punkt.id, 'varden');
    expect(await screen.findByRole('heading', { name: BF.tittel, level: 1 })).toBeInTheDocument();
    bane.journal = async () => demosak().journal();

    // Steg 4: BH vurderer varslingen og beløpet, kontrollerer brevet og sender svaret.
    const vist = await bhSvarerIVarden();
    expect(vist.join(' ')).toMatch(/Prinsipalt: byggherren gjør gjeldende at varselet/);
    await sendBrevet('Send svaret til TE');
    await vi.waitFor(() => expect(nyeRader(demosak(), versjonVed(punkt.id))).toHaveLength(1));
    const [svaret] = nyeRader(demosak(), versjonVed(punkt.id));
    expect(svaret.aktor_rolle).toBe('BH');
    // LV-U2: teksten BH kontrollerte, er teksten som er frosset i brevet.
    const frosset = svaret.data.brevtekst as { laast: string; utdypning?: string }[];
    expect(frosset.flatMap((a) => [a.laast, ...(a.utdypning ? [a.utdypning] : [])])).toEqual(vist);
    k.registrer(BF.steg![3], [svaret]);
    await kontrollerEtter(forloep, 4, k, paastand);

    // Steg 5: TE åpner saken og ser akkurat det svaret BH skrev, i sin helhet.
    await fireEvent.click(demopanel().getByRole('radio', { name: 'TE' }));
    const mottatt = await screen.findByRole('article', {
      name: 'Svar på krav om vederlagsjustering',
    });
    expect(avsnittene(mottatt)).toEqual(vist);
    await fireEvent.click(screen.getByRole('button', { name: 'Ta stilling til svaret' }));
    const panelet = screen.getByRole('region', {
      name: `Ta stilling til svaret i brev ${svaret.versjon}`,
    });
    // KA-U1, GR-U7: aksepten omfatter påberopelsen, og kjernen gir beløpet 0 kr etter den.
    expect(panelet.textContent).toMatch(
      /Aksepten omfatter også at BH gjør gjeldende at varselet etter § 34\.1\.2 kom for sent/
    );
    expect(panelet.textContent).toMatch(/enige om i vederlagssporet 0\skr/);
    const panel = within(panelet);
    await fireEvent.click(panel.getByRole('button', { name: 'Se akseptbrevet' }));
    await sendBrevet('Send aksepten til BH');
    await vi.waitFor(() => expect(nyeRader(demosak(), svaret.versjon)).toHaveLength(1));
    const [aksepten] = nyeRader(demosak(), svaret.versjon);
    expect(aksepten.aktor_rolle).toBe('TE');
    k.registrer(BF.steg![4], [aksepten]);
    await kontrollerEtter(forloep, 5, k, paastand);
    // Etter aksepten tilbyr kjernen ikke å godta på nytt (KA-U7).
    expect(screen.queryByRole('button', { name: 'Ta stilling til svaret' })).toBeNull();
  });

  it('samme valg gir samme journal og brevtekst i Varden og i dagens visning', async () => {
    const punkt = 'bh-har-mottatt-vederlagskravet';
    const dagens = lagDemosak(START, punkt, 'BH');
    const vistIDagens = await bhSenderIDagens(dagens);

    const varden = aapne(punkt, 'varden');
    await screen.findByRole('heading', { name: BF.tittel, level: 1 });
    const vistIVarden = await bhSvarerIVarden();
    await sendBrevet('Send svaret til TE');
    await vi.waitFor(() => expect(nyeRader(varden(), versjonVed(punkt))).toHaveLength(1));

    expect(vistIVarden).toEqual(vistIDagens);
    // Faste ID-er og testklokken: samme kommando og samme tekst gir samme rad.
    expect(varden().journal()).toEqual(dagens.journal());
  });

  it('aksepten gir samme brevtekst og samme rad i Varden og i dagens visning', async () => {
    const punkt = 'te-har-mottatt-svaret';
    const dagens = aapne(punkt, 'dagens');
    await screen.findByRole('heading', { name: BF.tittel });
    await fireEvent.click(
      within(await screen.findByRole('navigation', { name: 'Sakens spor' })).getByRole('button', {
        name: /Vederlag/,
      })
    );
    await fireEvent.click(await screen.findByRole('button', { name: 'Godta svaret' }));
    const kontroll = within(await screen.findByRole('region', { name: 'Brevkontroll' }));
    const tekstIDagens = avsnittene(screen.getByRole('region', { name: 'Brevkontroll' }));
    await fireEvent.click(kontroll.getByRole('checkbox', { name: 'Jeg har kontrollert brevet.' }));
    await fireEvent.click(kontroll.getByRole('button', { name: 'Send til byggherren' }));
    await vi.waitFor(() => expect(nyeRader(dagens(), versjonVed(punkt))).toHaveLength(1));
    const journalIDagens = dagens().journal();
    cleanup();

    const varden = aapne(punkt, 'varden');
    await fireEvent.click(await screen.findByRole('button', { name: 'Ta stilling til svaret' }));
    await fireEvent.click(screen.getByRole('button', { name: 'Se akseptbrevet' }));
    const brev = await screen.findByRole('article', { name: 'Aksept av svaret' });
    expect(avsnittene(brev)).toEqual(tekstIDagens);
    await sendBrevet('Send aksepten til BH');
    await vi.waitFor(() => expect(nyeRader(varden(), versjonVed(punkt))).toHaveLength(1));
    expect(varden().journal()).toEqual(journalIDagens);
  });

  it.each([
    ['bh-har-mottatt-vederlagskravet', 'BH'],
    ['te-har-mottatt-svaret', 'TE'],
    ['te-har-godtatt-svaret', 'TE'],
  ] as const)(
    'ved %s får %s i Varden alle handlingene kjernen tilbyr i vederlagssporet, og i dagens visning de samme unntatt BHs innsigelse',
    async (punkt, part) => {
      // Knappene i dagens visning (`ActionBar`) og nøklene kjernen tilbyr bak dem. Skjemaet bak
      // kravknappen har varslene som valg (`kravvalg`, `varselvalg` i `arbeidsflate.svelte.ts`).
      const varsel = (n: string) => /^(varsle|sende_varsel):/.test(n);
      const KNAPPER: Record<string, (n: string) => boolean> = {
        'Svar på kravet': (n) => n === 'svare:vederlag',
        'Godta svaret': (n) => n === 'godta:vederlag',
        Trekk: (n) => n === 'trekke:vederlag',
        'Gjør innsigelse': (n) => n.startsWith('innsigelse:'),
        'Send ny versjon av kravet': (n) => n === 'krav:vederlag' || varsel(n),
        'Send varsel eller krav': (n) => n === 'krav:vederlag' || varsel(n),
        'Send varsel': varsel,
        'Registrer varsel': varsel,
      };
      let kjernesak: ReturnType<typeof lagKjernesak> | null = null;
      const vis = (visning: 'dagens' | 'varden') =>
        render(Demoforloep, {
          forloep: START,
          punkt,
          visning,
          onpunkt: () => {},
          onstart: (_d: Demosak, k: ReturnType<typeof lagKjernesak>) => (kjernesak = k),
        });
      const somPart = async () => {
        const radio = demopanel().getByRole('radio', { name: part });
        if (radio.getAttribute('aria-checked') !== 'true') await fireEvent.click(radio);
      };

      vis('dagens');
      await somPart();
      await fireEvent.click(
        within(await screen.findByRole('navigation', { name: 'Sakens spor' })).getByRole('button', {
          name: /Vederlag/,
        })
      );
      // Handlingene i vederlagssporet: nøkkelen har sporet eller § 34.1.3, eller den gjelder et
      // krav eller svar i sporet (`handlinger` i `kjerne/kommandoer/handlinger.ts`).
      const u = kjernesak!.utledning!;
      const iSporet = new Set([...u.spor.vederlag.krav, ...u.spor.vederlag.svar].map((e) => e.id));
      const tilbudt = kjernesak!.handlinger.filter((n) => {
        const [type, hva] = n.split(':');
        return (
          hva === 'vederlag' || hva === '34.1.3' || (type === 'innsigelse' && iSporet.has(hva))
        );
      });
      const knapper = Object.keys(KNAPPER).filter(
        (navn) => screen.queryByRole('button', { name: new RegExp(`^${navn}$`) }) !== null
      );
      const iDagens = tilbudt.filter((n) => knapper.some((navn) => KNAPPER[navn](n)));
      // #909 bygde innsigelsen bare for TE (`innsigelser` i `arbeidsflate.svelte.ts`).
      const ikkeIDagens = part === 'BH' ? tilbudt.filter((n) => n.startsWith('innsigelse:')) : [];
      expect(iDagens.sort()).toEqual(tilbudt.filter((n) => !ikkeIDagens.includes(n)).sort());
      cleanup();

      vis('varden');
      await somPart();
      await screen.findByRole('heading', { name: BF.tittel, level: 1 });
      const iVarden = [...document.querySelectorAll('[data-handling]')].map(
        (e) => e.getAttribute('data-handling')!
      );
      if (screen.queryByRole('button', { name: 'Ta stilling til svaret' }))
        iVarden.push('godta:vederlag');
      expect(iVarden.sort()).toEqual([...tilbudt].sort());
    }
  );
});
