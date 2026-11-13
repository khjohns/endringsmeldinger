/**
 * Varden i demoruta (#1331), med brukerforløpet BF-01 og kjernen i minnet. BH fyller ut svaret
 * i Varden, kontrollerer brevet og sender det, og TE tar stilling og godtar det. Kontrollene
 * ved kontrollpunktene er forløpets, med kilde (`kontrollerEtter`).
 * Handlingene i sporet er de kjernen tilbyr.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/svelte';
import { finnForloep, lagDemosak, type Demosak } from '$lib/kjernesak/demosak';
import { lagKjernesak } from '$lib/kjernesak/kontekst.svelte';
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

const versjonVed = (punkt: string) => START.kontrollpunkter.find((p) => p.id === punkt)!.versjon;
const nyeRader = (demosak: Demosak, etter: number): Journalrad[] =>
  demosak.journal().filter((r) => r.versjon > etter);

function aapne(punkt: string) {
  let demosak: Demosak | null = null;
  render(Demoforloep, {
    forloep: START,
    punkt,
    onpunkt: () => {},
    onstart: (d: Demosak) => (demosak = d),
  });
  return () => demosak!;
}

const demopanel = () =>
  within(screen.getByRole('complementary', { name: 'Demo av brukerforløpet' }));

/** BH svarer i Varden som i steg 4, og kommer til brevkontrollen. Gir teksten som vises. */
async function bhSvarerIVarden(): Promise<string[]> {
  await fireEvent.click(await screen.findByRole('button', { name: 'Svar på kravet' }));
  await fireEvent.click(screen.getByRole('radio', { name: 'Varslet for sent' }));
  await fireEvent.click(screen.getByRole('radio', { name: 'Godkjenner fast sum (punkt 34.2.1)' }));
  await fireEvent.click(screen.getByRole('radio', { name: 'Deler av beløpet' }));
  await fireEvent.input(await screen.findByRole('textbox', { name: 'Beløpet du godkjenner' }), {
    target: { value: '60 000' },
  });
  // KA-U46: begrunnelsen står under punktet om varselet.
  await fireEvent.input(
    await screen.findByRole('textbox', { name: /Varselet om vederlagsjustering/ }),
    { target: { value: BEGRUNNELSE } }
  );
  await fireEvent.click(screen.getByRole('button', { name: 'Se brevet før sending' }));
  return avsnittene(
    await screen.findByRole('article', { name: 'Svar på krav om vederlagsjustering i sak KOE-17' })
  );
}

/** Avsnittene i brevteksten slik de står i brevet på skjermen. */
const avsnittene = (brev: HTMLElement) =>
  [...within(brev).getByTestId('laast-tekst').querySelectorAll('h3, p')].map(
    (p) => p.textContent ?? ''
  );

async function sendBrevet(knapp: string) {
  await fireEvent.click(screen.getByRole('checkbox', { name: 'Jeg har kontrollert brevet' }));
  await fireEvent.click(screen.getByRole('button', { name: knapp }));
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
    const demosak = aapne(punkt.id);
    expect(await screen.findByRole('heading', { name: BF.tittel, level: 2 })).toBeInTheDocument();
    bane.journal = async () => demosak().journal();

    // Steg 4: BH vurderer varslingen og beløpet, kontrollerer brevet og sender svaret.
    const vist = await bhSvarerIVarden();
    // LV-U34: lagslinjen står for seg over påberopelsen, og begrunnelsen under punktet.
    expect(vist).toContain('Prinsipalt');
    expect(vist.join(' ')).toMatch(/Byggherren gjør gjeldende at varselet om vederlagsjustering/);
    expect(vist).toContain(BEGRUNNELSE);
    // MM-U34 punkt 26: skjemaet sier ikke at BH er bundet av svaret eller at det ikke kan revideres.
    // OV-U81 og #1443: hvordan løsningen virker, står på siden «Om Varden», ikke ved feltene.
    // KA-U19: skjemaet sier at virkningen regnes ut fra valgene, i infotipset «Om svaret». Det
    // prøves i testen for #1466 og #1467. Brevkontrollen har ikke infotipset «Om brevet»
    // (oppdragsgiver 07.11, PR 1650).
    expect(document.body.textContent).not.toMatch(/tolkes ikke|vurderes ikke/);
    expect(document.body.textContent).not.toMatch(/er bundet av svaret|kan ikke revideres/);
    expect(document.body.textContent).not.toMatch(/\bKA-U\d/);
    await sendBrevet('Send svaret til totalentreprenøren');
    await vi.waitFor(() => expect(nyeRader(demosak(), versjonVed(punkt.id))).toHaveLength(1));
    const [svaret] = nyeRader(demosak(), versjonVed(punkt.id));
    expect(svaret.aktor_rolle).toBe('BH');
    // LV-U2: teksten BH kontrollerte, er teksten som er frosset i brevet.
    const frosset = svaret.data.brevtekst as { laast: string; utdypning?: string }[];
    // Et punkt viser overskriften og hvert avsnitt for seg (LV-U70).
    expect(
      frosset.flatMap((a) => [...a.laast.split('\n\n'), ...(a.utdypning ? [a.utdypning] : [])])
    ).toEqual(vist);
    k.registrer(BF.steg![3], [svaret]);
    await kontrollerEtter(forloep, 4, k, paastand);

    // Steg 5: TE åpner saken og ser akkurat det svaret BH skrev, i sin helhet.
    await fireEvent.click(demopanel().getByRole('radio', { name: 'TE' }));
    const mottatt = await screen.findByRole('article', {
      name: 'Svar på krav om vederlagsjustering i sak KOE-17',
    });
    expect(avsnittene(mottatt)).toEqual(vist);
    // Aksepten er primærhandlingen, med linja om hva den gjør, og resten
    // står synlig under «Andre handlinger», uten panel (oppdragsgiver 06.11, #1631).
    const kortet = within(
      screen.getByRole('heading', { name: 'Det du kan gjøre nå' }).closest('section')!
    );
    expect(kortet.getByText(/^Du godtar hele svaret i brev 4\./)).toBeTruthy();
    expect(kortet.getByText('Andre handlinger')).toBeTruthy();
    await fireEvent.click(kortet.getByRole('button', { name: /^Godta svaret/ }));
    // KA-U1, GR-U7: aksepten omfatter påberopelsen, og kjernen gir beløpet 0 kr etter den. Det
    // står i brevkontrollen før sendingen.
    const kontrollen = screen.getByRole('region', { name: 'Sending' });
    expect(kontrollen.textContent).toMatch(
      /Aksepten omfatter også at byggherren gjør gjeldende at varselet etter punkt 34\.1\.2 kom for sent/
    );
    expect(kontrollen.textContent).toMatch(/enige om for vederlagsjusteringen 0\skr/);
    await sendBrevet('Send aksepten til byggherren');
    await vi.waitFor(() => expect(nyeRader(demosak(), svaret.versjon)).toHaveLength(1));
    const [aksepten] = nyeRader(demosak(), svaret.versjon);
    expect(aksepten.aktor_rolle).toBe('TE');
    k.registrer(BF.steg![4], [aksepten]);
    await kontrollerEtter(forloep, 5, k, paastand);
    // Etter aksepten tilbyr kjernen ikke å godta på nytt: enigheten er registrert (GR-U8).
    expect(screen.queryByRole('button', { name: /^Godta svaret/ })).toBeNull();
  });

  it('«Se brevet før sending» er alltid aktiv, og klikket uten svar viser det som mangler ved feltet og øverst, ikke brevet (MM-U32, BF-01 S-3 B)', async () => {
    // MM-U32: «En handling parten kan gjøre nå, er alltid aktiv. Mangler noe i skjemaet,
    // kontrollerer appen det når parten sender, og sier ved feltet og øverst i skjemaet hva som
    // mangler.» BF-01 S-3: reserven B, fordi kjernen ikke lager tekst for et ufullstendig svar.
    aapne('bh-har-mottatt-vederlagskravet');
    await fireEvent.click(await screen.findByRole('button', { name: 'Svar på kravet' }));
    const seBrevet = screen.getByRole('button', { name: 'Se brevet før sending' });
    expect(seBrevet).not.toHaveAttribute('aria-disabled');
    // #1391: før BH har prøvd, står det verken «Ikke besvart» eller en hindring.
    expect(screen.queryByText('Ikke besvart')).toBeNull();
    expect(screen.queryByRole('group', { name: 'Dette mangler før brevet kan lages:' })).toBeNull();

    await fireEvent.click(seBrevet);
    expect(
      screen.queryByRole('article', { name: 'Svar på krav om vederlagsjustering i sak KOE-17' })
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
      'Velg om du godkjenner fast sum.',
      'Velg hvor mye av beløpet du godkjenner.',
    ]);
    const ved = (spoersmaal: string) =>
      screen.getByRole('group', { name: spoersmaal }).getAttribute('aria-describedby');
    const tekstVed = (spoersmaal: string) =>
      document.getElementById(ved(spoersmaal) ?? '')?.textContent ?? null;
    expect(tekstVed('Kom varselet om kravet i tide?')).toBe('Velg om varselet kom i tide.');
    expect(tekstVed('Hvor mye av beløpet godkjenner du?')).toBe(
      'Velg hvor mye av beløpet du godkjenner.'
    );

    // Beskjeden ved feltet forsvinner når feltet er besvart.
    await fireEvent.click(screen.getByRole('radio', { name: 'Varslet for sent' }));
    expect(ved('Kom varselet om kravet i tide?')).toBeNull();
    expect(
      within(
        screen.getByRole('group', { name: 'Dette mangler før brevet kan lages:' })
      ).getAllByRole('listitem')
    ).toHaveLength(2);

    await fireEvent.click(
      screen.getByRole('radio', { name: 'Godkjenner fast sum (punkt 34.2.1)' })
    );
    await fireEvent.click(screen.getByRole('radio', { name: 'Deler av beløpet' }));
    const beloep = await screen.findByRole('textbox', { name: 'Beløpet du godkjenner' });
    await fireEvent.input(beloep, { target: { value: '150 000' } });
    expect(beloep).toHaveAttribute('aria-invalid', 'true');
    expect(beloep.getAttribute('aria-describedby')).toMatch(/-delbeloep-P1-feil$/);
    expect(
      screen.getByRole('group', { name: 'Dette mangler før brevet kan lages:' }).textContent
    ).toMatch(/Beløpet du godkjenner må være mer enn 0 kr og mindre enn 100\s000\skr\./);
    // Et punktum er ikke desimaltegn i et beløp: «60.000» blir ikke 60 kr.
    await fireEvent.input(beloep, { target: { value: '60.000' } });
    expect(
      screen.getByRole('group', { name: 'Dette mangler før brevet kan lages:' }).textContent
    ).toContain('Skriv beløpet med sifre og komma før øre, for eksempel 100 000,40.');
    expect(document.body.textContent).not.toMatch(/_vurdering|_beloe?p|mangler;|\bKA-U\d/);

    await fireEvent.input(beloep, { target: { value: '60 000' } });
    // KA-U46 punkt 1: begrunnelsen er valgfri i hvert punkt i svaret på vederlaget, også når BH
    // gjør gjeldende sen varsling og ikke godtar hele beløpet.
    expect(screen.queryByRole('group', { name: 'Dette mangler før brevet kan lages:' })).toBeNull();
    await fireEvent.click(screen.getByRole('button', { name: 'Se brevet før sending' }));
    expect(
      await screen.findByRole('article', {
        name: 'Svar på krav om vederlagsjustering i sak KOE-17',
      })
    ).toBeInTheDocument();
  });

  it('etter «Varslet for sent» står beløpsspørsmålet under «Gjelder hvis» med innsigelsen det bygger på (oppdragsgiver 30.10, #1391)', async () => {
    aapne('bh-har-mottatt-vederlagskravet');
    await fireEvent.click(await screen.findByRole('button', { name: 'Svar på kravet' }));
    const beloep = () => screen.getByRole('group', { name: 'Hvor mye av beløpet godkjenner du?' });
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

  it('BF-04: over beløpet står avslaget av forholdet først og så innsigelsen om sen varsling, og hovedlinjene begynner på avslaget (#1400, S1-A og S2-A, OV-U32, OV-U33, OV-U76)', async () => {
    render(Demoforloep, {
      forloep: finnForloep('BF-04')!,
      punkt: 'bh-har-mottatt-vederlagskravet',
      onpunkt: () => {},
      onstart: () => {},
    });
    await fireEvent.click(await screen.findByRole('button', { name: 'Svar på kravet' }));
    const forutsetningene = () => {
      const beloep = screen.getByRole('group', { name: 'Hvor mye av beløpet godkjenner du?' });
      const id = beloep.getAttribute('aria-describedby');
      return id
        ? [...document.getElementById(id)!.querySelectorAll('li')].map((li) =>
            li.textContent!.replace(/\s+/g, ' ').trim()
          )
        : [];
    };
    // Svaret på grunnlaget er brev 2 i saken (versjon 3, etter `sak_opprettet`), i kortform
    // (oppdragsgiver 05.11 i #1631).
    const AVSLAGET = 'avslaget av forholdet i brev 2 ikke fører frem';

    // S1-A: et ubesvart varslingsspørsmål regnes som at innsigelsen ikke er gjort gjeldende.
    expect(forutsetningene()).toEqual([AVSLAGET]);
    await fireEvent.click(screen.getByRole('radio', { name: 'Varslet for sent' }));
    // S2-A: grunnene fra grunnlaget først, så innsigelsen mot vederlagskravet.
    expect(forutsetningene()).toEqual([AVSLAGET, 'innsigelsen om sen varsling ikke fører frem']);

    // KA-U72: mener BH en annen oppgjørsform, spør skjemaet ikke om beløpet.
    await fireEvent.click(screen.getByRole('radio', { name: 'Mener regningsarbeid (punkt 34.4)' }));
    expect(screen.queryByRole('group', { name: 'Hvor mye av beløpet godkjenner du?' })).toBeNull();

    // Som i brevet står avslaget prinsipalt, foran sporet (OV-U33).
    const linjer = within(
      screen.getByRole('region', { name: 'Hovedlinjene i svaret' })
    ).getAllByRole('listitem');
    expect(linjer[0].textContent!.replace(/\s+/g, ' ').trim()).toBe(
      'prinsipalt Du har avslått forholdet i brev 2'
    );
    expect(linjer[1].textContent).toMatch(/^subsidiært/i);
  });

  it('BF-04: mener BH en annen oppgjørsform, spør skjemaet ikke om beløpet, og hovedlinjene sier ikke noe om det; med fast sum godkjent står valget for beløpet igjen (KA-U72)', async () => {
    render(Demoforloep, {
      forloep: finnForloep('BF-04')!,
      punkt: 'bh-har-mottatt-vederlagskravet',
      onpunkt: () => {},
      onstart: () => {},
    });
    await fireEvent.click(await screen.findByRole('button', { name: 'Svar på kravet' }));
    const beloepet = () =>
      screen.queryByRole('group', { name: 'Hvor mye av beløpet godkjenner du?' });
    const linjer = () =>
      within(screen.getByRole('region', { name: 'Hovedlinjene i svaret' }))
        .queryAllByRole('listitem')
        .map((li) => li.textContent!.replace(/\s+/g, ' ').trim());

    await fireEvent.click(screen.getByRole('radio', { name: 'Varslet i tide' }));
    expect(beloepet(), 'forutsetning: uten oppgjørsform spør skjemaet om beløpet').not.toBeNull();
    await fireEvent.click(screen.getByRole('radio', { name: 'Ingenting' }));
    await fireEvent.click(screen.getByRole('radio', { name: 'Mener regningsarbeid (punkt 34.4)' }));
    expect(beloepet()).toBeNull();
    expect(linjer().some((l) => l.includes('Vederlagsjustering'))).toBe(false);
    expect(linjer().some((l) => l.includes('regningsarbeid'))).toBe(true);

    await fireEvent.click(
      screen.getByRole('radio', { name: 'Godkjenner fast sum (punkt 34.2.1)' })
    );
    expect(beloepet()).not.toBeNull();
    expect(screen.getByRole('radio', { name: 'Ingenting' })).toBeChecked();
    expect(linjer().some((l) => l.includes('Vederlagsjustering'))).toBe(true);
  });

  it('BF-04: over varselet står avslaget av forholdet, og over metoden står i tillegg innsigelsen om sen varsling etter «Varslet for sent», som kjernen gir (oppdragsgiver 30.10 i #1411, S2-A i #1400, LV-U31, OV-U76)', async () => {
    render(Demoforloep, {
      forloep: finnForloep('BF-04')!,
      punkt: 'bh-har-mottatt-vederlagskravet',
      onpunkt: () => {},
      onstart: () => {},
    });
    await fireEvent.click(await screen.findByRole('button', { name: 'Svar på kravet' }));
    const forutsetningene = (spoersmaal: string | RegExp) => {
      const id = screen.getByRole('group', { name: spoersmaal }).getAttribute('aria-describedby');
      return id
        ? [...document.getElementById(id)!.querySelectorAll('li')].map((li) =>
            li.textContent!.replace(/\s+/g, ' ').trim()
          )
        : [];
    };
    // Nummeret i saken, ikke versjonen i journalen (oppdragsgiver 05.11 i #1631).
    const AVSLAGET = ['avslaget av forholdet i brev 2 ikke fører frem'];
    const VARSEL = 'Kom varselet om kravet i tide?';
    const METODE = 'Oppgjørsformen (punkt 34.2.2)';

    expect(forutsetningene(VARSEL)).toEqual(AVSLAGET);
    expect(forutsetningene(METODE)).toEqual(AVSLAGET);
    await fireEvent.click(screen.getByRole('radio', { name: 'Varslet i tide' }));
    expect(forutsetningene(VARSEL)).toEqual(AVSLAGET);
    expect(forutsetningene(METODE)).toEqual(AVSLAGET);
    await fireEvent.click(screen.getByRole('radio', { name: 'Varslet for sent' }));
    expect(forutsetningene(VARSEL)).toEqual(AVSLAGET);
    expect(forutsetningene(METODE)).toEqual([
      ...AVSLAGET,
      'innsigelsen om sen varsling ikke fører frem',
    ]);
    // Svaret på oppgjørsformen flytter ikke oppgjørsformen ut av laget sitt.
    await fireEvent.click(screen.getByRole('radio', { name: 'Mener regningsarbeid (punkt 34.4)' }));
    expect(forutsetningene(METODE)).toEqual([
      ...AVSLAGET,
      'innsigelsen om sen varsling ikke fører frem',
    ]);
  });

  it('«Forkast utkast» spør først, «Behold utkastet» lar valgene stå, og «Forkast» tømmer dem uten å sende (BF-01 S-8, #1391)', async () => {
    const demosak = aapne('bh-har-mottatt-vederlagskravet');
    await fireEvent.click(await screen.findByRole('button', { name: 'Svar på kravet' }));
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
    // Kvitteringen står i den levende regionen som finnes før meldingen kommer.
    expect(melding.closest('[role="status"]')).not.toBeNull();
    expect(document.activeElement).toBe(melding.closest('[role="status"]'));
    expect(nyeRader(demosak(), versjonVed('bh-har-mottatt-vederlagskravet'))).toHaveLength(0);
    // Et nytt svar begynner tomt.
    await fireEvent.click(await screen.findByRole('button', { name: 'Svar på kravet' }));
    expect(screen.getByRole('radio', { name: 'Varslet for sent' })).not.toBeChecked();
  });

  it('utkastet står når BH velger et annet spor, og merket «Utkast» står i panelet bare mens et annet spor er valgt (BF-01 S-8, #1391)', async () => {
    aapne('bh-har-mottatt-vederlagskravet');
    await fireEvent.click(await screen.findByRole('button', { name: 'Svar på kravet' }));
    await fireEvent.click(screen.getByRole('radio', { name: 'Varslet for sent' }));
    const panelet = within(
      screen.getByRole('navigation', { name: 'Forholdet og kravene i saken' })
    );
    const vederlag = () => panelet.getByRole('button', { name: /^Vederlag/ });
    // #1391: mens utkastet er åpent, står ikke kortet med handlingene.
    expect(screen.queryByRole('heading', { name: 'Det du kan gjøre nå' })).toBeNull();
    expect(vederlag().textContent).not.toMatch(/Utkast/);

    // Forholdet heter det TE påberoper (OV-U78).
    await fireEvent.click(panelet.getByRole('button', { name: /^Manglende medvirkning/ }));
    expect(screen.queryByRole('form')).toBeNull();
    expect(vederlag().textContent).toMatch(/Utkast/);

    await fireEvent.click(vederlag());
    expect(screen.getByRole('radio', { name: 'Varslet for sent' })).toBeChecked();
    expect(vederlag().textContent).not.toMatch(/Utkast/);
  });

  it('panelet til venstre har forholdet under «Kontraktsforhold» og kravene under «Krav», uten linje under navnene, og sakens kode over tittelen (oppdragsgiver 06.11, #1631)', async () => {
    aapne('bh-har-mottatt-vederlagskravet');
    const panelet = within(
      await screen.findByRole('navigation', { name: 'Forholdet og kravene i saken' })
    );
    const forholdet = panelet.getByRole('list', { name: 'Kontraktsforhold' });
    const kravene = panelet.getByRole('list', { name: 'Krav' });
    const navn = (b: HTMLElement) => b.querySelector('.navn')?.textContent?.trim();
    expect(within(forholdet).getAllByRole('button').map(navn)).toEqual([
      'Manglende medvirkning eller leveranser fra byggherren',
    ]);
    expect(within(kravene).getAllByRole('button').map(navn)).toEqual([
      'Vederlagsjustering',
      'Fristforlengelse',
    ]);
    const tittel = screen.getByRole('heading', { level: 2, name: BF.tittel });
    expect(tittel.previousElementSibling?.textContent).toMatch(/^KOE-\d+$/);
  });

  it('under hvert spor i panelet står betegnelsen og siste brev, aldri hvem som skal handle (#1899 punkt 2, MM-U30, system.md «Visningen sier det løsningen vet»)', async () => {
    aapne('bh-har-mottatt-vederlagskravet');
    const panelet = within(
      await screen.findByRole('navigation', { name: 'Forholdet og kravene i saken' })
    );
    const vederlag = within(panelet.getByRole('list', { name: 'Krav' })).getAllByRole('button')[0];
    expect(vederlag.querySelector('.st')?.textContent).toBe('Svar ikke registrert');
    expect(vederlag.querySelector('.st2')?.textContent).toMatch(
      /^Siste: brev \d+ fra totalentreprenøren$/
    );
    for (const b of panelet.getAllByRole('button'))
      expect(b.textContent).not.toMatch(/venter på|neste steg|skal svare|må svare/i);
  });

  it('panelet til venstre felles inn mens brevet leses ved siden av skjemaet, og kommer tilbake når brevet lukkes (oppdragsgiver 30.10, #1391)', async () => {
    aapne('bh-har-mottatt-vederlagskravet');
    await fireEvent.click(await screen.findByRole('button', { name: 'Svar på kravet' }));
    const omslaget = () => screen.queryByRole('heading', { level: 2, name: BF.tittel });
    expect(omslaget()).toBeInTheDocument();

    // Der panelet er felt inn, står sporene i topplinja (U-16 i BF-44, #1899 punkt 4).
    await fireEvent.click(screen.getByRole('button', { name: 'Les brevet ved siden av' }));
    expect(omslaget()).toBeNull();
    const sporene = screen.getByRole('navigation', { name: 'Forholdet og kravene i saken' });
    expect(within(sporene).getByRole('button', { name: 'Vederlagsjustering' })).toHaveAttribute(
      'aria-current',
      'page'
    );

    await fireEvent.click(screen.getByRole('button', { name: 'Lukk brevet' }));
    expect(omslaget()).toBeInTheDocument();
  });

  it('«Send svaret til totalentreprenøren» er aktiv uten avkrysning, og klikket sender ikke, men sier fra ved avkrysningen (MM-U32)', async () => {
    const demosak = aapne('bh-har-mottatt-vederlagskravet');
    await bhSvarerIVarden();
    const send = screen.getByRole('button', { name: 'Send svaret til totalentreprenøren' });
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

  it('#1466 og #1467: skjemaet og brevkontrollen bruker ordene i sprak.md og OV-U75, og forklaringene av løsningen står bare i infotipsene (OV-U81)', async () => {
    aapne('bh-har-mottatt-vederlagskravet');
    // Teksten i brevet kommer fra kjernen og hører til #1433; infotipsene prøves for seg.
    const synlig = () => {
      const kopi = document.body.cloneNode(true) as HTMLElement;
      kopi
        .querySelectorAll('[role="note"], [data-testid="laast-tekst"]')
        .forEach((e) => e.remove());
      return kopi.textContent!.replace(/\s+/g, ' ');
    };
    const infotips = () =>
      [...document.querySelectorAll('[role="note"]')].map((e) => e.textContent).join(' ');
    const FORKLARINGER = [
      'Løsningen viser datoene',
      'Virkningen av svaret regnes ut fra valgene over',
      'Teksten lages fra valgene og kan ikke endres her',
      'Skjermvisning som tåler tekstforstørrelse',
      'Et sendt brev kan ikke endres',
    ];
    const kontroller = () => {
      const tekst = synlig();
      expect(tekst).not.toMatch(/§/);
      expect(tekst).not.toMatch(/hovedkrav/i);
      // Totalentreprenøren godtar svaret; byggherren godkjenner (sprak.md, «Godkjenner og godtar»).
      expect(tekst.replace(/TE godtar|Godtar totalentreprenøren/g, '')).not.toMatch(/\bgodtar\b/i);
      expect(tekst).not.toMatch(/(?<!total)entreprenøren/i);
      for (const f of FORKLARINGER) expect(tekst).not.toContain(f);
    };

    await bhSvarerIVarden();
    kontroller();
    // Brevkontrollen har ingen infotips (oppdragsgiver 07.11, PR 1650).
    expect(screen.queryByRole('button', { name: 'Om brevet' })).toBeNull();

    await fireEvent.click(screen.getByRole('button', { name: 'Tilbake til utkastet' }));
    kontroller();
    expect(screen.getByText('Om varselet kom i tide, avgjør partene.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Om datoene' })).toBeTruthy();
    // KA-U19: skjemaet sier at virkningen regnes ut fra valgene, i et infotips (OV-U81).
    expect(screen.getByRole('button', { name: 'Om svaret' })).toBeTruthy();
    expect(infotips()).toContain('Virkningen av svaret regnes ut fra valgene over.');
  });

  it.each([
    ['bh-har-mottatt-vederlagskravet', 'BH'],
    ['te-har-mottatt-svaret', 'TE'],
    ['te-har-godtatt-svaret', 'TE'],
  ] as const)(
    'ved %s får %s i Varden alle handlingene kjernen tilbyr i vederlagssporet unntatt innsigelsen',
    async (punkt, part) => {
      let kjernesak: ReturnType<typeof lagKjernesak> | null = null;
      render(Demoforloep, {
        forloep: START,
        punkt,
        onpunkt: () => {},
        onstart: (_d: Demosak, k: ReturnType<typeof lagKjernesak>) => (kjernesak = k),
      });
      const radio = demopanel().getByRole('radio', { name: part });
      if (radio.getAttribute('aria-checked') !== 'true') await fireEvent.click(radio);
      await screen.findByRole('heading', { name: BF.tittel, level: 2 });
      // Handlingene kjernen gir vederlagssporet (`tilbudte` i `kjerne/kommandoer/handlinger.ts`),
      // uten varslene etter § 34.3.3 og § 34.4, som får skjema i økt 3 (G-8 i BF-14, #1703).
      const tilbudt = kjernesak!.tilbudte
        .filter((h) => h.spor === 'vederlag' && !['34.3.3', '34.4'].includes(h.hjemmel ?? ''))
        .map((h) => h.noekkel);
      const iVarden = [...document.querySelectorAll('[data-handling]')].map(
        (e) => e.getAttribute('data-handling')!
      );
      // Primærhandlingen i kortet står ikke i lista «Andre handlinger».
      if (
        screen.queryByRole('button', { name: /^Godta svaret/ }) &&
        !iVarden.includes('godta:vederlag')
      )
        iVarden.push('godta:vederlag');
      if (screen.queryByRole('button', { name: 'Svar på kravet' })) iVarden.push('svare:vederlag');
      if (screen.queryByRole('button', { name: 'Revider krav' })) iVarden.push('krav:vederlag');
      // Innsigelsen om at et brev kom for sent er ikke en handling i Varden (oppdragsgiver 06.11,
      // PR 1650).
      expect(iVarden.sort()).toEqual(tilbudt.filter((n) => !n.startsWith('innsigelse:')).sort());
    }
  );

  it('etter avslaget av forholdet er primærhandlingen for TE «Oppdater påberopelse», og godta og trekk står synlige under (oppdragsgiver 06.11, #1631, #1649)', async () => {
    const demosak = lagDemosak(finnForloep('BF-04')!, 'forholdet-er-avslaatt', 'TE');
    const kjernesak = lagKjernesak({
      sakId: demosak.sakId,
      prosjektId: 'demo',
      part: 'TE',
      hent: demosak.hent,
      send: demosak.send,
    });
    await kjernesak.last();
    render(Vardensak, { kjernesak, spor: 'forhold' });
    // Handlingen står ved brevet den svarer på, byggherrens svar (U-16 i BF-44, #1898).
    const primaer = await screen.findByRole('button', { name: 'Oppdater påberopelse' });
    const raden = within(primaer.closest('li')!);
    expect(raden.getByRole('heading', { level: 3 }).textContent).toMatch(/^Svar på påberopelsen/);
    // Teksten oppdragsgiver ga 06.11 i #1631, med «har risikoen for» som i § 33.1 c.
    expect(document.getElementById(primaer.getAttribute('aria-describedby')!)!.textContent).toMatch(
      /^Redegjør nærmere for hvorfor dette er et forhold byggherren har risikoen for\./
    );
    expect(raden.getByRole('button', { name: 'Godta avslaget' })).toBeTruthy();
    const andre = within(screen.getByRole('region', { name: 'Andre handlinger' }));
    expect(andre.getByRole('button', { name: /^Trekk påberopelsen/ })).toBeTruthy();
    expect(andre.queryByRole('button', { name: /^Godta/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /Ta stilling/ })).toBeNull();
  });

  it('etter svaret på vederlagskravet er primærhandlingen for TE «Revider krav» (oppdragsgiver 06.11, #1631)', async () => {
    const demosak = lagDemosak(finnForloep('BF-04')!, 'te-har-mottatt-svaret', 'TE');
    const kjernesak = lagKjernesak({
      sakId: demosak.sakId,
      prosjektId: 'demo',
      part: 'TE',
      hent: demosak.hent,
      send: demosak.send,
    });
    await kjernesak.last();
    render(Vardensak, { kjernesak, spor: 'vederlag' });
    const kortet = within(
      (await screen.findByRole('heading', { name: 'Det du kan gjøre nå' })).closest('section')!
    );
    const primaer = kortet.getByRole('button', { name: 'Revider krav' });
    expect(document.getElementById(primaer.getAttribute('aria-describedby')!)!.textContent).toBe(
      'Juster kravet eller begrunnelsen. Byggherren svarer på nytt.'
    );
    expect(kortet.getByRole('button', { name: /^Godta svaret/ })).toBeTruthy();
  });

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
    await screen.findByRole('heading', { name: BF.tittel, level: 2 });
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

  it('saksomslaget har partene øverst og prosjektet nederst, og et navn som mangler, står ikke der (panel B, #1899 punkt 1, #1398)', async () => {
    const demosak = lagDemosak(START, 'bh-har-mottatt-vederlagskravet', 'BH');
    const kjernesak = lagKjernesak({
      sakId: demosak.sakId,
      prosjektId: 'demo',
      part: 'BH',
      hent: demosak.hent,
      send: demosak.send,
    });
    await kjernesak.last();
    const { container } = render(Vardensak, {
      kjernesak,
      kontrakt: { prosjekt: 'Prosjekt A', byggherre: 'Byggherre AS' },
    });

    await screen.findByRole('heading', { level: 2, name: BF.tittel });
    const parter = container.querySelector('.parter')!;
    expect([...parter.querySelectorAll('dt')].map((e) => e.textContent)).toEqual(['Byggherre']);
    expect(within(parter as HTMLElement).getByText('Byggherre AS')).toBeTruthy();
    expect(container.querySelector('.avsender')?.textContent).toContain('Prosjekt A');
    expect(screen.queryByRole('region', { name: 'Kontrakten' })).toBeNull();
  });

  it('uten kontrakt fra demoruta leser omslaget navnene på partene fra prosjektet, og kontraktsformen, som serveren ikke gir, står ikke der (#1398, arbeidsvalget «Prosjektruta»)', async () => {
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
    const { container } = render(Vardensak, { kjernesak });

    await screen.findByRole('heading', { level: 2, name: BF.tittel });
    expect([...container.querySelectorAll('.parter dd')].map((e) => e.textContent?.trim())).toEqual(
      ['Entreprenør TE', 'Byggherre BH']
    );
    const avsender = container.querySelector('.avsender')!.textContent!;
    expect(avsender).toContain('Prosjekt B');
    expect(avsender).not.toContain('·');
    projectStore.set(null);
  });

  it.each([
    ['TE', 1],
    ['BH', 0],
  ] as const)(
    '%s ser lenken «Nytt krav om endringsordre» %i gang(er), i topplinja og ikke i panelet (#1899 punkt 3, oppdragsgiver 13.11: «topplinja»)',
    async (part, antall) => {
      const demosak = lagDemosak(START, 'bh-har-mottatt-vederlagskravet', part);
      const kjernesak = lagKjernesak({
        sakId: demosak.sakId,
        prosjektId: 'demo',
        part,
        hent: demosak.hent,
        send: demosak.send,
      });
      await kjernesak.last();
      render(Vardensak, { kjernesak, nySakLenke: '/demo/ny' });
      await screen.findByRole('heading', { level: 2, name: BF.tittel });
      const lenker = screen.queryAllByRole('link', { name: 'Nytt krav om endringsordre' });
      expect(lenker).toHaveLength(antall);
      for (const l of lenker) {
        expect(l.getAttribute('href')).toBe('/demo/ny');
        expect(l.closest('.topplinje')).not.toBeNull();
      }
    }
  );

  it('topplinja har stien Varden › prosjektet › saken og den innloggede med initialene, ikke rollen (prototypen grunnlagsoversikt.html, oppdragsgiver 06.11)', async () => {
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
      kontrakt: { prosjekt: 'Skolebygg Nord' },
      prosjekter: '/',
      saksliste: '/demo',
      bruker: { name: 'Kari Nordmann' },
    });

    const sti = await screen.findByRole('navigation', { name: 'Du er her' });
    expect(within(sti).getByRole('link', { name: 'Varden' }).getAttribute('href')).toBe('/');
    expect(within(sti).getByRole('link', { name: 'Skolebygg Nord' }).getAttribute('href')).toBe(
      '/demo'
    );
    expect(
      within(sti)
        .getByText(/^KOE-\d+$/)
        .getAttribute('aria-current')
    ).toBe('page');
    expect(screen.getByText('KN')).toBeTruthy();
    expect(screen.getByText('Kari Nordmann')).toBeTruthy();
    expect(screen.queryByText(/^Du er /)).toBeNull();
    expect(screen.queryByRole('button', { name: 'Kopier lenke' })).toBeNull();
  });
});

describe('brevhodet og en avvist sending (A2b i #1497)', () => {
  it('brevkontrollen viser Vår ref. og Deres ref. som kjernen fryser, og etter en avvist sending lages brevet på nytt mot saken slik den er lastet (LV-U2, LV-U49, U-4 og D-5 i BF-07)', async () => {
    const demosak = lagDemosak(START, 'bh-har-mottatt-vederlagskravet', 'BH');
    // Driften retter kontraktsforkortelsen mens brevet står i brevkontrollen (D-2 i BF-07).
    let forkortelse = 'K201';
    const hent: typeof demosak.hent = async (...a) => {
      const sak = await demosak.hent(...a);
      return {
        ...sak,
        merking: sak.merking && { ...sak.merking, kontraktsforkortelse: forkortelse },
      };
    };
    const send = vi.fn().mockImplementationOnce(async () => {
      forkortelse = 'K202';
      throw new ApiError(409, 'Saken er endret.', {
        error: 'VERSJONSKONFLIKT',
        expected_version: 4,
        current_version: 5,
      });
    });
    const kjernesak = lagKjernesak({
      sakId: demosak.sakId,
      prosjektId: 'demo',
      part: 'BH',
      hent,
      send,
    });
    await kjernesak.last();
    render(Vardensak, { kjernesak });
    await bhSvarerIVarden();
    const krav = demosak.journal().at(-1)!;
    // Svaret er brev 4 i saken: påberopelsen, svaret på den og kravet er brev 1–3 (G-5).
    expect(screen.getByTestId('vaar-ref').textContent).toBe('K201-KOE-017-04');
    // Svaret viser til TEs krav med merkingen kjernen frøs på det (LV-U49).
    expect(screen.getByTestId('deres-ref').textContent!.trim()).toBe(krav.data.merking);

    await sendBrevet('Send svaret til totalentreprenøren');
    await vi.waitFor(() =>
      expect(screen.getByTestId('vaar-ref').textContent).toBe('K202-KOE-017-04')
    );
    // Det nye brevet kontrolleres på nytt før det kan sendes (LV-U2).
    expect(
      (screen.getByRole('checkbox', { name: 'Jeg har kontrollert brevet' }) as HTMLInputElement)
        .checked
    ).toBe(false);
    expect(send).toHaveBeenCalledTimes(1);
  });

  it('har saken fått en ny versjon når sendingen avvises, lukkes brevkontrollen med en melding, og brevet sendes ikke på nytt (oppdragsgiver 07.11, punkt 2 i #1596)', async () => {
    const demosak = lagDemosak(START, 'bh-har-mottatt-vederlagskravet', 'BH');
    // En annen i byggherrens team sender det samme svaret først, så saken får en ny versjon.
    const send = vi
      .fn<typeof demosak.send>()
      .mockImplementationOnce(async (sak, versjon, _id, kommando, prosjekt) => {
        await demosak.send(sak, versjon, 'annen-kommando', kommando, prosjekt);
        throw new ApiError(409, 'Saken er endret.', { error: 'VERSJONSKONFLIKT' });
      });
    const kjernesak = lagKjernesak({
      sakId: demosak.sakId,
      prosjektId: 'demo',
      part: 'BH',
      hent: demosak.hent,
      send,
    });
    await kjernesak.last();
    render(Vardensak, { kjernesak });
    await bhSvarerIVarden();
    const foer = kjernesak.versjon;

    await sendBrevet('Send svaret til totalentreprenøren');
    await vi.waitFor(() =>
      expect(screen.queryByRole('checkbox', { name: 'Jeg har kontrollert brevet' })).toBeNull()
    );
    expect(kjernesak.versjon).not.toBe(foer);
    expect(screen.getByText(/saken er endret siden du åpnet brevkontrollen/)).toBeTruthy();
    expect(send).toHaveBeenCalledTimes(1);
  });
});
