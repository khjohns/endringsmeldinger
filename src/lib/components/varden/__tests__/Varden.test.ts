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
import Vardensak from '$lib/components/varden/Vardensak.svelte';
import { ApiError } from '$lib/api/client';
import { projectStore } from '$lib/stores/project.svelte';

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
  await fireEvent.click(await screen.findByText('Skriv brev'));
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
    // MM-U34 punkt 26: skjemaet sier ikke at BH er bundet av svaret eller at det ikke kan revideres.
    expect(document.body.textContent).toMatch(/Begrunnelsen tolkes ikke\./);
    expect(document.body.textContent).not.toMatch(/er bundet av svaret|kan ikke revideres/);
    expect(document.body.textContent).not.toMatch(/\bKA-U\d/);
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
    expect(panelet.textContent).toMatch(/enige om for vederlagsjusteringen 0\skr/);
    const panel = within(panelet);
    await fireEvent.click(panel.getByRole('button', { name: 'Se akseptbrevet' }));
    await sendBrevet('Send aksepten til BH');
    await vi.waitFor(() => expect(nyeRader(demosak(), svaret.versjon)).toHaveLength(1));
    const [aksepten] = nyeRader(demosak(), svaret.versjon);
    expect(aksepten.aktor_rolle).toBe('TE');
    k.registrer(BF.steg![4], [aksepten]);
    await kontrollerEtter(forloep, 5, k, paastand);
    // Etter aksepten tilbyr kjernen ikke å godta på nytt: enigheten er registrert (GR-U8).
    expect(screen.queryByRole('button', { name: 'Ta stilling til svaret' })).toBeNull();
  });

  it('«Se brevet før sending» er alltid aktiv, og klikket uten svar viser det som mangler ved feltet og øverst, ikke brevet (MM-U32, BF-01 S-3 B)', async () => {
    // MM-U32: «En handling parten kan gjøre nå, er alltid aktiv. Mangler noe i skjemaet,
    // kontrollerer appen det når parten sender, og sier ved feltet og øverst i skjemaet hva som
    // mangler.» BF-01 S-3: reserven B, fordi kjernen ikke lager tekst for et ufullstendig svar.
    aapne('bh-har-mottatt-vederlagskravet', 'varden');
    await fireEvent.click(await screen.findByText('Skriv brev'));
    await fireEvent.click(screen.getByRole('button', { name: 'Svar på kravet' }));
    const seBrevet = screen.getByRole('button', { name: 'Se brevet før sending' });
    expect(seBrevet).not.toHaveAttribute('aria-disabled');
    // #1391: før BH har prøvd, står det verken «Ikke besvart» eller en hindring.
    expect(screen.queryByText('Ikke besvart')).toBeNull();
    expect(screen.queryByRole('group', { name: 'Dette mangler før brevet kan lages:' })).toBeNull();

    await fireEvent.click(seBrevet);
    expect(
      screen.queryByRole('article', { name: 'Svar på krav om vederlagsjustering' })
    ).toBeNull();
    const oeverst = await screen.findByRole('group', {
      name: 'Dette mangler før brevet kan lages:',
    });
    expect(document.activeElement).toBe(oeverst);
    expect(
      within(oeverst)
        .getAllByRole('listitem')
        .map((l) => l.textContent)
    ).toEqual([
      'Velg om varselet kom i tide.',
      'Velg om du godtar beregningsmetoden.',
      'Velg hvor mye av hovedkravet du godtar.',
    ]);
    const ved = (spoersmaal: string) =>
      screen.getByRole('group', { name: spoersmaal }).getAttribute('aria-describedby');
    const tekstVed = (spoersmaal: string) =>
      document.getElementById(ved(spoersmaal) ?? '')?.textContent ?? null;
    expect(tekstVed('Kom varselet om kravet i tide?')).toBe('Velg om varselet kom i tide.');
    expect(tekstVed('Hvor mye av hovedkravet godtar du?')).toBe(
      'Velg hvor mye av hovedkravet du godtar.'
    );

    // Beskjeden ved feltet forsvinner når feltet er besvart.
    await fireEvent.click(screen.getByRole('radio', { name: 'Varslet for sent' }));
    expect(ved('Kom varselet om kravet i tide?')).toBeNull();
    expect(
      within(
        screen.getByRole('group', { name: 'Dette mangler før brevet kan lages:' })
      ).getAllByRole('listitem')
    ).toHaveLength(2);

    await fireEvent.click(screen.getByRole('radio', { name: 'Godtar metoden' }));
    await fireEvent.click(screen.getByRole('radio', { name: 'Deler av beløpet' }));
    const beloep = await screen.findByRole('textbox', { name: 'Beløpet du godtar' });
    await fireEvent.input(beloep, { target: { value: '150 000' } });
    expect(beloep).toHaveAttribute('aria-invalid', 'true');
    expect(beloep.getAttribute('aria-describedby')).toMatch(/-beloep-feil$/);
    expect(
      screen.getByRole('group', { name: 'Dette mangler før brevet kan lages:' }).textContent
    ).toMatch(/Beløpet du godtar må være mer enn 0 kr og mindre enn 100\s000\skr\./);
    // Et punktum er ikke desimaltegn i et beløp: «60.000» blir ikke 60 kr.
    await fireEvent.input(beloep, { target: { value: '60.000' } });
    expect(
      screen.getByRole('group', { name: 'Dette mangler før brevet kan lages:' }).textContent
    ).toContain('Skriv beløpet med sifre og komma før øre, for eksempel 100 000,40.');
    expect(document.body.textContent).not.toMatch(/_vurdering|_belop|mangler;|\bKA-U\d/);

    await fireEvent.input(beloep, { target: { value: '60 000' } });
    // KA-U24: kjernen krever begrunnelse når BH gjør gjeldende sen varsling og ikke godtar hele
    // beløpet. Det står ved feltet med kjernens grunn, og ikke med regelkoden.
    const begrunnelse = screen.getByRole('textbox', { name: /Begrunnelse/ });
    expect(begrunnelse).toHaveAttribute('aria-invalid', 'true');
    expect(
      within(
        screen.getByRole('group', { name: 'Dette mangler før brevet kan lages:' })
      ).getAllByRole('listitem')
    ).toHaveLength(1);
    expect(
      screen.getByRole('group', { name: 'Dette mangler før brevet kan lages:' }).textContent
    ).toMatch(/Svaret må ha en begrunnelse, fordi du/);
    expect(document.body.textContent).not.toMatch(/BEGRUNNELSE_MANGLER/);
    await fireEvent.input(begrunnelse, { target: { value: BEGRUNNELSE } });
    expect(screen.queryByRole('group', { name: 'Dette mangler før brevet kan lages:' })).toBeNull();
    await fireEvent.click(screen.getByRole('button', { name: 'Se brevet før sending' }));
    expect(
      await screen.findByRole('article', { name: 'Svar på krav om vederlagsjustering' })
    ).toBeInTheDocument();
  });

  it('etter «Varslet for sent» står beløpsspørsmålet under «Gjelder hvis» med innsigelsen det bygger på (oppdragsgiver 30.10, #1391)', async () => {
    aapne('bh-har-mottatt-vederlagskravet', 'varden');
    await fireEvent.click(await screen.findByText('Skriv brev'));
    await fireEvent.click(screen.getByRole('button', { name: 'Svar på kravet' }));
    const beloep = () => screen.getByRole('group', { name: 'Hvor mye av hovedkravet godtar du?' });
    expect(beloep().getAttribute('aria-describedby')).toBeNull();
    expect(screen.queryByText('Gjelder hvis')).toBeNull();

    await fireEvent.click(screen.getByRole('radio', { name: 'Varslet for sent' }));
    const forutsetninger = document.getElementById(beloep().getAttribute('aria-describedby')!)!;
    expect(forutsetninger.textContent?.replace(/\s+/g, ' ').trim()).toBe(
      'Gjelder hvis innsigelsen om sen varsling ikke fører frem'
    );
    const lenke = within(forutsetninger).getByRole('link', { name: 'innsigelsen om sen varsling' });
    expect(document.querySelector(lenke.getAttribute('href')!)).toBe(
      screen.getByRole('group', { name: 'Kom varselet om kravet i tide?' })
    );

    await fireEvent.click(screen.getByRole('radio', { name: 'Varslet i tide' }));
    expect(screen.queryByText('Gjelder hvis')).toBeNull();
  });

  it('BF-04: over beløpet står avslaget av grunnlaget først og så innsigelsen om sen varsling, og hovedlinjene begynner på avslaget (#1400, S1-A og S2-A, OV-U32, OV-U33)', async () => {
    render(Demoforloep, {
      forloep: finnForloep('BF-04')!,
      punkt: 'bh-har-mottatt-vederlagskravet',
      visning: 'varden',
      onpunkt: () => {},
      onstart: () => {},
    });
    await fireEvent.click(await screen.findByText('Skriv brev'));
    await fireEvent.click(screen.getByRole('button', { name: 'Svar på kravet' }));
    const forutsetningene = () => {
      const beloep = screen.getByRole('group', { name: 'Hvor mye av hovedkravet godtar du?' });
      const id = beloep.getAttribute('aria-describedby');
      return id
        ? [...document.getElementById(id)!.querySelectorAll('li')].map((li) =>
            li.textContent!.replace(/\s+/g, ' ').trim()
          )
        : [];
    };
    const AVSLAGET = 'avslaget av grunnlaget i brev 3 ikke fører frem';

    // S1-A: et ubesvart varslingsspørsmål regnes som at innsigelsen ikke er gjort gjeldende.
    expect(forutsetningene()).toEqual([AVSLAGET]);
    await fireEvent.click(screen.getByRole('radio', { name: 'Varslet for sent' }));
    // S2-A: grunnene fra grunnlaget først, så innsigelsen mot vederlagskravet.
    expect(forutsetningene()).toEqual([AVSLAGET, 'innsigelsen om sen varsling ikke fører frem']);

    // Avslått metode uten ønsket metode forstår ikke kjernen; skjemaet står, og lagene med det.
    await fireEvent.click(screen.getByRole('radio', { name: 'Godtar ikke metoden' }));
    expect(forutsetningene()).toEqual([AVSLAGET, 'innsigelsen om sen varsling ikke fører frem']);
    await fireEvent.click(screen.getByRole('radio', { name: 'Regningsarbeid (§ 34.4)' }));
    await fireEvent.click(screen.getByRole('radio', { name: 'Ingenting' }));

    // Som i brevet står avslaget prinsipalt, foran sporet (OV-U33).
    const linjer = within(
      screen.getByRole('region', { name: 'Hovedlinjene i svaret' })
    ).getAllByRole('listitem');
    expect(linjer[0].textContent!.replace(/\s+/g, ' ').trim()).toBe(
      'prinsipalt Du har avslått grunnlaget i brev 3'
    );
    expect(linjer[1].textContent).toMatch(/^subsidiært/i);
  });

  it('«Forkast utkast» spør først, «Behold utkastet» lar valgene stå, og «Forkast» tømmer dem uten å sende (BF-01 S-8, #1391)', async () => {
    const demosak = aapne('bh-har-mottatt-vederlagskravet', 'varden');
    await fireEvent.click(await screen.findByText('Skriv brev'));
    await fireEvent.click(screen.getByRole('button', { name: 'Svar på kravet' }));
    await fireEvent.click(screen.getByRole('radio', { name: 'Varslet for sent' }));

    await fireEvent.click(screen.getByRole('button', { name: 'Forkast utkast' }));
    const spoersmaal = screen.getByRole('group', {
      name: 'Forkaste utkastet? Valgene og begrunnelsen slettes.',
    });
    await fireEvent.click(within(spoersmaal).getByRole('button', { name: 'Behold utkastet' }));
    expect(screen.getByRole('radio', { name: 'Varslet for sent' })).toBeChecked();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Forkast utkast' }));

    await fireEvent.click(screen.getByRole('button', { name: 'Forkast utkast' }));
    await fireEvent.click(screen.getByRole('button', { name: 'Forkast' }));
    expect(screen.queryByRole('form')).toBeNull();
    const melding = screen.getByText('Utkastet er forkastet.');
    expect(melding.getAttribute('role')).toBe('status');
    expect(document.activeElement).toBe(melding);
    expect(nyeRader(demosak(), versjonVed('bh-har-mottatt-vederlagskravet'))).toHaveLength(0);
    // Et nytt svar begynner tomt.
    await fireEvent.click(screen.getByText('Skriv brev'));
    await fireEvent.click(screen.getByRole('button', { name: 'Svar på kravet' }));
    expect(screen.getByRole('radio', { name: 'Varslet for sent' })).not.toBeChecked();
  });

  it('utkastet står når BH velger et annet spor, og merket «Utkast» står i panelet bare mens et annet spor er valgt (BF-01 S-8, #1391)', async () => {
    aapne('bh-har-mottatt-vederlagskravet', 'varden');
    await fireEvent.click(await screen.findByText('Skriv brev'));
    await fireEvent.click(screen.getByRole('button', { name: 'Svar på kravet' }));
    await fireEvent.click(screen.getByRole('radio', { name: 'Varslet for sent' }));
    const panelet = within(screen.getByRole('navigation', { name: 'Saken' }));
    const vederlag = () => panelet.getByRole('button', { name: /^Vederlag/ });
    // #1391: mens utkastet er åpent, står ingen meny for å skrive brev.
    expect(screen.queryByText('Skriv brev')).toBeNull();
    expect(vederlag().textContent).not.toMatch(/Utkast/);

    await fireEvent.click(panelet.getByRole('button', { name: /^Grunnlag/ }));
    expect(screen.queryByRole('form')).toBeNull();
    expect(vederlag().textContent).toMatch(/Utkast/);

    await fireEvent.click(vederlag());
    expect(screen.getByRole('radio', { name: 'Varslet for sent' })).toBeChecked();
    expect(vederlag().textContent).not.toMatch(/Utkast/);
  });

  it('panelet til venstre felles inn mens brevet leses ved siden av skjemaet, og kommer tilbake når brevet lukkes (oppdragsgiver 30.10, #1391)', async () => {
    aapne('bh-har-mottatt-vederlagskravet', 'varden');
    await fireEvent.click(await screen.findByText('Skriv brev'));
    await fireEvent.click(screen.getByRole('button', { name: 'Svar på kravet' }));
    expect(screen.getByRole('navigation', { name: 'Saken' })).toBeInTheDocument();

    await fireEvent.click(screen.getByRole('button', { name: 'Les brevet ved siden av' }));
    expect(screen.queryByRole('navigation', { name: 'Saken' })).toBeNull();

    await fireEvent.click(screen.getByRole('button', { name: 'Lukk brevet' }));
    expect(screen.getByRole('navigation', { name: 'Saken' })).toBeInTheDocument();
  });

  it('«Send svaret til TE» er aktiv uten avkrysning, og klikket sender ikke, men sier fra ved avkrysningen (MM-U32)', async () => {
    const demosak = aapne('bh-har-mottatt-vederlagskravet', 'varden');
    await bhSvarerIVarden();
    const send = screen.getByRole('button', { name: 'Send svaret til TE' });
    expect(send).not.toHaveAttribute('aria-disabled');
    const avkrysning = screen.getByRole('checkbox', { name: 'Jeg har kontrollert brevet' });
    // Beskjeden må være koblet til før fokus flyttes, ellers leser skjermleseren den ikke.
    let vedFokus: string | null = null;
    avkrysning.addEventListener('focus', () => {
      vedFokus = avkrysning.getAttribute('aria-describedby');
    });
    await fireEvent.click(send);
    expect(document.activeElement).toBe(avkrysning);
    expect(vedFokus).not.toBeNull();
    expect(avkrysning).toHaveAttribute('aria-invalid', 'true');
    expect(
      document.getElementById(avkrysning.getAttribute('aria-describedby')!)?.textContent
    ).toMatch(/Kryss av for at du har kontrollert brevet, så kan du sende\./);
    expect(nyeRader(demosak(), versjonVed('bh-har-mottatt-vederlagskravet'))).toHaveLength(0);
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

  it('når lastingen feiler, viser Varden feilen og «Prøv igjen» i stedet for «Laster saken …» (#1373, funn 1)', async () => {
    const demosak = lagDemosak(START, 'bh-har-mottatt-vederlagskravet', 'BH');
    const hent = vi
      .fn()
      .mockRejectedValueOnce(new ApiError(500, 'Serveren svarte med feilkode 500 uten forklaring.'))
      .mockImplementation(demosak.hent);
    const kjernesak = lagKjernesak({
      sakId: demosak.sakId,
      prosjektId: 'demo',
      part: 'BH',
      hent,
      send: demosak.send,
    });
    await kjernesak.last();
    render(Vardensak, { kjernesak });

    const feil = await screen.findByRole('alert');
    expect(within(feil).getByRole('heading', { name: 'Saken kunne ikke lastes' })).toBeTruthy();
    // En feil fra serveren beklager og sier hva parten kan gjøre (.interface-design/system.md).
    expect(feil.textContent).toContain('Beklager, saken ble ikke hentet. Prøv igjen om litt.');
    expect(feil.textContent).toContain('Serveren svarte med feilkode 500 uten forklaring.');
    expect(screen.queryByText('Laster saken …')).toBeNull();

    await fireEvent.click(within(feil).getByRole('button', { name: 'Prøv igjen' }));
    await screen.findByRole('heading', { name: BF.tittel, level: 1 });
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('«Prøv igjen» er opptatt mens saken lastes på nytt, og en ny feil viser når det sist ble forsøkt (#1373, funn 1)', async () => {
    const demosak = lagDemosak(START, 'bh-har-mottatt-vederlagskravet', 'BH');
    let svar!: (v: unknown) => void;
    const hent = vi
      .fn()
      .mockRejectedValueOnce(new ApiError(500, 'Serveren svarte med feilkode 500 uten forklaring.'))
      .mockImplementationOnce(
        () => new Promise((_, avvis) => (svar = () => avvis(new ApiError(500, 'Igjen.'))))
      );
    const kjernesak = lagKjernesak({
      sakId: demosak.sakId,
      prosjektId: 'demo',
      part: 'BH',
      hent,
      send: demosak.send,
    });
    await kjernesak.last();
    render(Vardensak, { kjernesak });

    await fireEvent.click(screen.getByRole('button', { name: 'Prøv igjen' }));
    const opptatt = await screen.findByRole('button', { name: 'Prøver igjen …' });
    expect(opptatt.getAttribute('aria-busy')).toBe('true');

    svar(null);
    const knapp = await screen.findByRole('button', { name: 'Prøv igjen' });
    expect(knapp.getAttribute('aria-busy')).toBeNull();
    expect(screen.getByRole('alert').textContent).toMatch(/Sist forsøkt kl\. \d\d\.\d\d\./);
    expect(screen.getByRole('alert').textContent).toContain('Igjen.');
  });

  it('panelet viser prosjektet og partene under «Kontrakten», og et navn som mangler, står ikke der (oppdragsgiver 30.10, #1398)', async () => {
    const demosak = lagDemosak(START, 'bh-har-mottatt-vederlagskravet', 'BH');
    const kjernesak = lagKjernesak({
      sakId: demosak.sakId,
      prosjektId: 'demo',
      part: 'BH',
      hent: demosak.hent,
      send: demosak.send,
    });
    await kjernesak.last();
    render(Vardensak, {
      kjernesak,
      kontrakt: { prosjekt: 'Prosjekt A', byggherre: 'Byggherre AS' },
    });

    const kontrakten = await screen.findByRole('region', { name: 'Kontrakten' });
    expect([...kontrakten.querySelectorAll('dt')].map((e) => e.textContent)).toEqual([
      'Prosjekt',
      'Byggherre',
    ]);
    expect(within(kontrakten).getByText('Byggherre AS')).toBeTruthy();
    expect(within(kontrakten).queryByText('Totalentreprenør')).toBeNull();
  });

  it('uten kontrakt fra demoruta leser panelet navnene på partene fra prosjektet, og kontraktsformen, som serveren ikke gir, står ikke der (#1398, arbeidsvalget «Prosjektruta»)', async () => {
    projectStore.set({
      id: 'p1',
      organisasjon_id: 'o1',
      name: 'Prosjekt B',
      settings: {
        contract: { byggherre_navn: 'Byggherre BH', totalentreprenor_navn: 'Entreprenør TE' },
      },
      created_at: '2026-10-30T00:00:00Z',
      is_active: true,
    });
    const demosak = lagDemosak(START, 'bh-har-mottatt-vederlagskravet', 'BH');
    const kjernesak = lagKjernesak({
      sakId: demosak.sakId,
      prosjektId: 'demo',
      part: 'BH',
      hent: demosak.hent,
      send: demosak.send,
    });
    await kjernesak.last();
    render(Vardensak, { kjernesak });

    const kontrakten = await screen.findByRole('region', { name: 'Kontrakten' });
    expect([...kontrakten.querySelectorAll('dd')].map((e) => e.textContent?.trim())).toEqual([
      'Prosjekt B',
      'Byggherre BH',
      'Entreprenør TE',
    ]);
    expect(within(kontrakten).queryByText('Kontraktsform')).toBeNull();
    projectStore.set(null);
  });

  it.each([
    ['kopieres', () => Promise.resolve(), 'Lenken er kopiert.'],
    [
      'ikke kan kopieres',
      () => Promise.reject(new Error('nektet')),
      'Lenken ble ikke kopiert. Kopier adressen fra adressefeltet.',
    ],
  ])('«Kopier lenke» i topplinja sier fra når lenken %s (#1391)', async (_, svar, tekst) => {
    const writeText = vi.fn(svar);
    vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } });
    const demosak = lagDemosak(START, 'bh-har-mottatt-vederlagskravet', 'BH');
    const kjernesak = lagKjernesak({
      sakId: demosak.sakId,
      prosjektId: 'demo',
      part: 'BH',
      hent: demosak.hent,
      send: demosak.send,
    });
    await kjernesak.last();
    render(Vardensak, { kjernesak });

    await fireEvent.click(await screen.findByRole('button', { name: 'Kopier lenke' }));
    expect(writeText).toHaveBeenCalledWith(location.href);
    expect((await screen.findByText(tekst)).getAttribute('role')).toBe('status');
    vi.unstubAllGlobals();
  });
});
