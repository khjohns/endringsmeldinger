/**
 * Datoen TE ble klar over at utgiftene etter punkt 34.1.3 annet ledd ville påløpe, i Varden
 * (#2012), med brukerforløpet BF-48 og kjernen i minnet: datoen i vederlagskravet (variant B),
 * det egne brevet som oppgir eller endrer den (variant D), varselet lagt til som korrespondanse
 * (variant C, BF-48C), det egne brevet i en lukket sak (variant E, BF-48E), datoen i tråden og i
 * svarskjemaet.
 * Kontrollene ved kontrollpunktene er forløpets, med kilde (`kontrollerEtter`). Forventningene i
 * visningen viser til U-punktene i bestillingen `docs/domenetabell/brukerforlop/BF-48.md`.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/svelte';
import { finnForloep, type Demosak, type Startjournal } from '#lib/kjernesak/demosak.ts';
import type { Journalrad } from '#kjerne/typer.ts';
import {
  finn,
  kjoerBrukerforloep,
  kontrollpunkt,
  somForloep,
  startjournal,
} from '#kjerne/tester/brukerforloep.ts';
import { kontrollerEtter } from '#kjerne/tester/kjoerer.ts';
import Demoforloep from '#lib/components/brukerforlop/Demoforloep.svelte';

const paastand = (holder: boolean, melding: string) => expect(holder, melding).toBe(true);
const FORKLARING = 'Peleriggen sto stille i uke 41.';
const FELTET = /^Når ble du klar over at utgiftene ville påløpe\?/;
// Mellomrommet foran nummeret i den frosne tittelen kan være hardt (språkfila).
const TITTEL = /^Når utgiftene etter punkt\s34\.1\.3 ble kjent i sak KOE-17$/;

function aapne(punkt: string, forloep: Startjournal = finnForloep('BF-48')!) {
  let demosak: Demosak | null = null;
  render(Demoforloep, {
    forloep,
    punkt,
    onpunkt: () => {},
    onstart: (d: Demosak) => (demosak = d),
  });
  return () => demosak!;
}

const versjonVed = (punkt: string, id = 'BF-48') =>
  finnForloep(id)!.kontrollpunkter.find((p) => p.id === punkt)!.versjon;
const nyeRader = (demosak: Demosak, etter: number): Journalrad[] =>
  demosak.journal().filter((r) => r.versjon > etter);
const kvitteringen = () =>
  screen
    .getAllByRole('status')
    .map((e) => e.textContent ?? '')
    .join(' ');
const demopanel = () =>
  within(screen.getByRole('complementary', { name: 'Demo av brukerforløpet' }));
const traaden = async () => within(await screen.findByRole('list', { name: /^Brevene/ }));
/** Teksten i raden for brevet med nummeret `n` i tråden, med mellomrommene samlet. */
const innlegget = async (n: number) => {
  const li = [...(await traaden()).getAllByRole('listitem')].find(
    (x) =>
      x.querySelector(':scope > .rad .dato')?.textContent?.match(/· brev (\d+)/)?.[1] === `${n}`
  )!;
  return { li: within(li), tekst: li.textContent!.replace(/\s+/g, ' ') };
};
const tilVederlaget = async () =>
  fireEvent.click(await screen.findByRole('button', { name: /^Vederlagsjustering/ }));
/** Teksten med vanlige mellomrom, så forventningen ikke avhenger av de harde i brevteksten. */
const tekst = (e: Element) => (e.textContent ?? '').replace(/\s+/g, ' ');
const lesBrevet = (navn: RegExp) =>
  [
    ...within(screen.getByRole('article', { name: navn }))
      .getByTestId('laast-tekst')
      .querySelectorAll('p'),
  ].map(tekst);
const skriv = (etikett: string | RegExp, verdi: string) =>
  fireEvent.input(screen.getByLabelText(etikett), { target: { value: verdi } });

beforeEach(() => vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Ingen nettverk.'))));
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('TE oppgir datoen etter punkt 34.1.3 i Varden (BF-48)', () => {
  it('variant D: TE oppgir datoen ved varselet gjennom brevkontrollen, og kontrollene etter brevet holder (VS-U86 punkt 14, VS-U82, U-4, U-5, U-7)', async () => {
    const BF = finn('BF-48');
    const punkt = kontrollpunkt(BF, 'te-har-mottatt-svaret');
    const { k, bane } = await kjoerBrukerforloep(BF, { til: punkt.id, paastand });
    const demosak = aapne(punkt.id);
    bane.journal = async () => demosak().journal();
    await tilVederlaget();

    // U-4: handlingen står ved varselet når datoen ikke er oppgitt.
    const varselet = await innlegget(3);
    expect(varselet.tekst).toContain(
      'Totalentreprenøren har ikke oppgitt når utgiftene ble kjent.'
    );
    await fireEvent.click(
      varselet.li.getByRole('button', {
        name: 'Oppgi datoen du ble klar over at utgiftene ville påløpe',
      })
    );
    // U-5: skjemaet sier hvilket varsel opplysningen gjelder, og at datoen ikke er oppgitt.
    const skjema = within(screen.getByRole('form'));
    expect(
      skjema.getByText('Varselet etter punkt 34.1.3 i brev 3 av 1. oktober 2026')
    ).toBeTruthy();
    expect(skjema.getByText('Ikke oppgitt')).toBeTruthy();
    expect(
      skjema.getByText(
        'Datoen sendes i et eget brev til byggherren. Varselet og svaret i brev 4 står som de ble sendt. Den nye datoen gjelder straks som din siste opplysning.'
      )
    ).toBeTruthy();

    await skriv(FELTET, '2026-09-28');
    await fireEvent.input(screen.getByRole('textbox', { name: 'Forklaring, Valgfri' }), {
      target: { value: FORKLARING },
    });
    await fireEvent.click(screen.getByRole('button', { name: 'Se brevet før sending' }));
    await screen.findByRole('article', { name: TITTEL });
    // U-5, G-6: brevet ordrett før sending, med varselet det gjelder, og forklaringen under
    // den faste teksten (D-5, MM-U53).
    const vist = lesBrevet(TITTEL);
    expect(vist[0]).toBe(
      'Totalentreprenøren oppgir nå å ha blitt klar over at utgiftene ville påløpe 28. september 2026. Opplysningen gjelder varselet om særskilt justering for nedsatt produktivitet eller forstyrrelser etter NS 8407 punkt 34.1.3 tredje ledd i brev K201-KOE-017-03 av 1. oktober 2026.'
    );
    expect(vist).toContain(FORKLARING);
    const kontrollen = screen.getByRole('region', { name: 'Sending' });
    expect(within(kontrollen).getByText('Viser til')).toBeTruthy();
    expect(kontrollen.textContent).toMatch(/Svaret i brev 4 endres ikke\./);

    await fireEvent.click(screen.getByRole('checkbox', { name: 'Jeg har kontrollert brevet' }));
    await fireEvent.click(screen.getByRole('button', { name: 'Send brevet til byggherren' }));
    const foer = versjonVed(punkt.id);
    await vi.waitFor(() => expect(nyeRader(demosak(), foer)).toHaveLength(1));
    const [rad] = nyeRader(demosak(), foer);
    expect(rad.aktor_rolle).toBe('TE');
    k.registrer(BF.steg![5], [rad]);
    await kontrollerEtter(somForloep(BF), 6, k, paastand);

    // U-7: kvitteringen sier at datoen er TEs siste opplysning, og at svaret står.
    await vi.waitFor(() =>
      expect(kvitteringen()).toMatch(
        /28\. september 2026 er nå din siste opplysning om når du ble klar over at utgiftene ville påløpe\. Svaret byggherren har gitt, står som det ble sendt\./
      )
    );
    await fireEvent.click(screen.getByRole('button', { name: 'Tilbake til saken' }));
    // U-4, U-7: handlingen står ved den siste opplysningen, og varselet viser til den.
    const brevet = await innlegget(5);
    expect(brevet.tekst).toContain(
      'Klar over at utgiftene ville påløpe 28. september 2026, ifølge totalentreprenøren.'
    );
    expect(brevet.li.getByRole('button', { name: /^Endre datoen/ })).toBeTruthy();
    const varselNaa = await innlegget(3);
    expect(varselNaa.li.queryByRole('button', { name: /datoen/ })).toBeNull();
    expect(varselNaa.tekst).toContain(
      'Brevet oppgir ikke når utgiftene ble kjent. Totalentreprenørens siste opplysning er 28. september 2026, i brev 5.'
    );
    // U-8: ved svaret står at datoen ikke var oppgitt da svaret ble sendt.
    expect((await innlegget(4)).tekst).toContain(
      'Da svaret ble sendt, hadde totalentreprenøren ikke oppgitt når utgiftene ble kjent.'
    );
  });

  it('variant D: BH ser den siste og den tidligere datoen med brevet, at svaret står, og ingenting om at varselet nå kom i tide (U-7, U-8, MM-U50)', async () => {
    aapne('datoen-er-endret');
    await fireEvent.click(demopanel().getByRole('radio', { name: 'BH' }));
    await tilVederlaget();
    const siste = await innlegget(6);
    expect(siste.tekst).toContain(
      'Klar over at utgiftene ville påløpe 25. september 2026, ifølge totalentreprenøren. Endrer 28. september 2026, oppgitt i brev 5.'
    );
    expect(siste.tekst).toContain(
      'Svaret i brev 4 endres ikke. Byggherren kan ta stilling til datoen i et senere svar.'
    );
    expect((await innlegget(5)).tekst).toContain(
      'Klar over at utgiftene ville påløpe 28. september 2026, ifølge totalentreprenøren. Datoen var ikke oppgitt før. Endret i brev 6.'
    );
    expect((await innlegget(3)).tekst).toContain(
      'Totalentreprenørens siste opplysning er 25. september 2026, i brev 6.'
    );
    expect(screen.queryByRole('button', { name: /datoen/ })).toBeNull();
    expect(document.querySelector('main')!.textContent).not.toMatch(
      /nå kom i tide|likevel i tide|venter på/
    );
  });

  it('en uendret dato, en dato etter dagens dato og et tomt felt stoppes i skjemaet med det som hindrer, og brevet vises ikke (U-6, D-6)', async () => {
    aapne('datoen-er-oppgitt');
    await tilVederlaget();
    await fireEvent.click(
      (await innlegget(5)).li.getByRole('button', {
        name: 'Endre datoen du ble klar over at utgiftene ville påløpe',
      })
    );
    const se = () => fireEvent.click(screen.getByRole('button', { name: 'Se brevet før sending' }));
    const felt = () => screen.getByLabelText(FELTET);
    await se();
    expect(felt()).toHaveAccessibleDescription(
      /Skriv datoen du ble klar over at utgiftene ville påløpe\./
    );
    await skriv(FELTET, '2026-09-28');
    await se();
    expect(felt()).toHaveAccessibleDescription(
      /Datoen er den samme som i brev 5, 28\. september 2026\. Skriv en annen dato\./
    );
    expect(felt()).toHaveAttribute('aria-invalid', 'true');
    await skriv(FELTET, '2999-01-01');
    await se();
    expect(felt()).toHaveAccessibleDescription(/Datoen 1\. januar 2999 er etter dagens dato, /);
    expect(screen.queryByRole('article')).toBeNull();
  });

  it('«Oppgi datoen» står ikke under «Andre handlinger» (U-4)', async () => {
    aapne('te-har-mottatt-svaret');
    await tilVederlaget();
    const kortet = within(await screen.findByRole('region', { name: 'Andre handlinger' }));
    expect(kortet.queryByText(/datoen|oppgi_kunnskapsdato/)).toBeNull();
  });

  it('svarskjemaet sier at datoen ikke er oppgitt, når kravet har den særskilte posten (U-9)', async () => {
    aapne('bh-har-mottatt-kravet');
    await fireEvent.click(demopanel().getByRole('radio', { name: 'BH' }));
    await tilVederlaget();
    await fireEvent.click(await screen.findByRole('button', { name: 'Svar på kravet' }));
    const kortet = within(screen.getByText('Varselet etter punkt 34.1.3').closest('section')!);
    expect(
      kortet.getByText('Totalentreprenøren har ikke oppgitt når utgiftene ble kjent.')
    ).toBeTruthy();
  });
});

describe('datoen i vederlagskravet (BF-48 variant B)', () => {
  async function kravMedPosten() {
    aapne('te-skal-kreve-vederlaget');
    await tilVederlaget();
    // Det første kravet er hovedvalget i et spor uten varsel eller krav (U-1 i BF-51).
    await fireEvent.click(
      await screen.findByRole('button', { name: 'Send krav om vederlagsjustering' })
    );
    await fireEvent.click(screen.getByRole('button', { name: 'Fjern posten' }));
    await fireEvent.click(
      screen.getByRole('button', { name: 'Legg til særskilt vederlagsjustering' })
    );
    await fireEvent.input(screen.getByRole('textbox', { name: 'Beløpet du krever' }), {
      target: { value: '40000' },
    });
  }

  it('feltet står ved varselet når kravet gir det, er valgfritt, og datoen står i tidslinja og i brevet etter varselet (U-1, U-2, U-3, VS-U86 punkt 12)', async () => {
    await kravMedPosten();
    const felt = screen.getByLabelText(FELTET);
    expect(felt.closest('li')!.id).toMatch(/varsel-34\.1\.3$/);
    expect(screen.getByText(FELTET).closest('label')!.textContent).toMatch(/Valgfri/);
    await skriv(FELTET, '2026-09-28');
    expect(
      within(screen.getByRole('region', { name: /Tidslinje/ })).getByText(
        'Klar over at utgiftene ville påløpe'
      )
    ).toBeTruthy();
    await fireEvent.click(screen.getByRole('button', { name: 'Se brevet før sending' }));
    const brevet = await screen.findByRole('article', { name: /^Krav om vederlagsjustering/ });
    expect(tekst(brevet)).toContain(
      'Totalentreprenøren varsler særskilt etter NS 8407 punkt 34.1.3 tredje ledd. Totalentreprenøren oppgir å ha blitt klar over at utgiftene ville påløpe 28. september 2026.'
    );
  });

  it('uten datoen sier brevet ingenting om den (U-1, punkt 13 i VS-U86)', async () => {
    await kravMedPosten();
    await fireEvent.click(screen.getByRole('button', { name: 'Se brevet før sending' }));
    const brevet = await screen.findByRole('article', { name: /^Krav om vederlagsjustering/ });
    expect(tekst(brevet)).not.toMatch(/klar over at utgiftene/);
  });

  it('en dato etter datoen brevet sendes, stoppes ved feltet med begge datoene (U-6, VS-U83)', async () => {
    await kravMedPosten();
    await skriv(FELTET, '2999-01-01');
    await fireEvent.click(screen.getByRole('button', { name: 'Se brevet før sending' }));
    expect(screen.getByLabelText(FELTET)).toHaveAccessibleDescription(
      /Datoen 1\. januar 2999 er etter datoen brevet sendes, /
    );
    expect(screen.queryByRole('article')).toBeNull();
  });

  it('i en ny versjon står datoen fast ved varselet, og lenken til det egne brevet beholder utkastet (U-10, D-2, VS-U85)', async () => {
    aapne('datoen-er-endret');
    await tilVederlaget();
    await fireEvent.click(await screen.findByRole('button', { name: /^Oppdater kravet/ }));
    expect(screen.queryByLabelText(FELTET)).toBeNull();
    expect(
      screen.getByText('Klar over at utgiftene ville påløpe 25. september 2026, oppgitt i brev 6.')
    ).toBeTruthy();
    await fireEvent.input(screen.getByRole('textbox', { name: /Forbehold/ }), {
      target: { value: 'Forbeholdet står.' },
    });
    await fireEvent.click(screen.getByRole('button', { name: 'Endre datoen i et eget brev' }));
    expect(await screen.findByText('25. september 2026, i brev 6')).toBeTruthy();
    await fireEvent.click(screen.getByRole('link', { name: 'Tilbake til vederlagsjusteringen' }));
    await fireEvent.click(await screen.findByRole('button', { name: /^Oppdater kravet/ }));
    expect(screen.getByRole('textbox', { name: /Forbehold/ })).toHaveValue('Forbeholdet står.');
  });
});

describe('varselet lagt til som korrespondanse (BF-48 variant C, BF-48C)', () => {
  it('TE legger til e-posten med datoen, og datoen står ved varselet som den siste opplysningen (VS-U86 punkt 12, U-1, U-4, U-6, U-7)', async () => {
    const BF = finn('BF-48C');
    const punkt = kontrollpunkt(BF, 'te-skal-legge-til-varselet');
    const { k, bane } = await kjoerBrukerforloep(BF, { til: punkt.id, paastand });
    const demosak = aapne(punkt.id, finnForloep('BF-48C')!);
    bane.journal = async () => demosak().journal();
    await tilVederlaget();
    await fireEvent.click(await screen.findByRole('button', { name: 'Legg til korrespondanse' }));
    await fireEvent.click(screen.getByRole('radio', { name: 'E-post' }));
    await fireEvent.click(screen.getByRole('radio', { name: 'Totalentreprenøren' }));
    await skriv('Datoen det ble sendt', '2026-09-30');
    // Kontrollsummen i demoruta regnes i nettleseren; jsdom har ikke en som tar fila.
    vi.spyOn(crypto.subtle, 'digest').mockResolvedValue(new ArrayBuffer(32));
    const fil = new File(['%PDF-1.4'], 'varsel.pdf', { type: 'application/pdf' });
    await fireEvent.change(document.querySelector('input[type=file]')!, {
      target: { files: [fil] },
    });
    await fireEvent.click(screen.getByRole('radio', { name: 'Et varsel' }));
    await fireEvent.click(
      screen.getByRole('checkbox', { name: /^Varsel om særskilt vederlagsjustering/ })
    );
    await skriv('Kort beskrivelse av korrespondansen', 'E-post med særskilt varsel');
    // U-6, VS-U83: en dato etter datoen e-posten ble sendt, stoppes ved feltet.
    await skriv(FELTET, '2026-10-01');
    await fireEvent.click(screen.getByRole('button', { name: 'Legg til' }));
    expect(screen.getByLabelText(FELTET)).toHaveAccessibleDescription(
      /Datoen 1\. oktober 2026 er etter datoen korrespondansen ble sendt, 30\. september 2026\./
    );
    const foer = versjonVed(punkt.id, 'BF-48C');
    expect(nyeRader(demosak(), foer)).toHaveLength(0);

    await skriv(FELTET, '2026-09-28');
    await fireEvent.click(screen.getByRole('button', { name: 'Legg til' }));
    await vi.waitFor(() => expect(nyeRader(demosak(), foer)).toHaveLength(1));
    const [rad] = nyeRader(demosak(), foer);
    expect(rad.aktor_rolle).toBe('TE');
    k.registrer(BF.steg![2], [rad]);
    await kontrollerEtter(somForloep(BF), 3, k, paastand);

    // U-4, U-7: datoen står ved varselet i tråden, med handlingen for det egne brevet.
    const varselet = within((await traaden()).getAllByRole('listitem')[0]);
    expect(tekst((await traaden()).getAllByRole('listitem')[0])).toContain(
      'Klar over at utgiftene ville påløpe 28. september 2026, ifølge totalentreprenøren.'
    );
    expect(varselet.getByRole('button', { name: /^Endre datoen/ })).toBeTruthy();
  });
});

describe('det egne brevet i en lukket sak (BF-48 variant E, BF-48E)', () => {
  it('TE oppgir datoen etter at avslaget er godtatt, og skjemaet, brevkontrollen og kvitteringen sier at saken står lukket (VS-U84, GR-U27)', async () => {
    const BF = finn('BF-48E');
    const punkt = kontrollpunkt(BF, 'saken-er-lukket');
    const { k, bane } = await kjoerBrukerforloep(BF, { til: punkt.id, paastand });
    const demosak = aapne(punkt.id, finnForloep('BF-48E')!);
    bane.journal = async () => demosak().journal();
    await tilVederlaget();
    await fireEvent.click(
      (await innlegget(2)).li.getByRole('button', {
        name: 'Oppgi datoen du ble klar over at utgiftene ville påløpe',
      })
    );
    const skjema = within(screen.getByRole('form'));
    expect(skjema.getByText('Saken står lukket. Brevet endrer ikke utfallet.')).toBeTruthy();
    await skriv(FELTET, '2026-09-28');
    await fireEvent.input(screen.getByRole('textbox', { name: 'Forklaring, Valgfri' }), {
      target: { value: 'Utgiftene ble kjent da peleriggen sto stille.' },
    });
    await fireEvent.click(screen.getByRole('button', { name: 'Se brevet før sending' }));
    await screen.findByRole('article', { name: TITTEL });
    expect(screen.getByRole('region', { name: 'Sending' }).textContent).toContain(
      'Saken står lukket. Brevet endrer ikke utfallet. Byggherren kan ta stilling til datoen i et innlegg.'
    );
    await fireEvent.click(screen.getByRole('checkbox', { name: 'Jeg har kontrollert brevet' }));
    await fireEvent.click(screen.getByRole('button', { name: 'Send brevet til byggherren' }));
    const foer = versjonVed(punkt.id, 'BF-48E');
    await vi.waitFor(() => expect(nyeRader(demosak(), foer)).toHaveLength(1));
    const [rad] = nyeRader(demosak(), foer);
    k.registrer(BF.steg![4], [rad]);
    await kontrollerEtter(somForloep(BF), 5, k, paastand);
    await vi.waitFor(() =>
      expect(kvitteringen()).toMatch(/Saken står lukket, og utfallet er det samme\./)
    );
  });
});

describe('det egne brevet etter at påberopelsen er trukket (BF-48E med trekket, #2514)', () => {
  it('TE oppgir datoen etter trekket, og skjemaet, brevkontrollen og kvitteringen sier at saken står lukket (GR-U27, GR-U5, VS-U84)', async () => {
    // BF-48E med trekket av påberopelsen i stedet for avslaget og aksepten.
    const BF = finn('BF-48E');
    const steg = (h: string, spor: string) =>
      BF.steg!.find((x) => x.handling === h && 'spor' in x && x.spor === spor)!;
    const sj = await startjournal({
      ...BF,
      id: 'BF-48E-trekk',
      steg: [
        steg('krav', 'forhold'),
        steg('krav', 'vederlag'),
        { handling: 'trekk', spor: 'forhold' },
      ],
      kontrollpunkter: [
        {
          id: 'paaberopelsen-er-trukket',
          etter: 3,
          beskrivelse: 'Totalentreprenøren har trukket påberopelsen.',
          kontroller: [],
          forstaaelse: [],
        },
      ],
    } as typeof BF);
    const demosak = aapne('paaberopelsen-er-trukket', sj);
    await tilVederlaget();
    await fireEvent.click(
      (await innlegget(2)).li.getByRole('button', {
        name: 'Oppgi datoen du ble klar over at utgiftene ville påløpe',
      })
    );
    const skjema = within(screen.getByRole('form'));
    expect(skjema.getByText('Saken står lukket. Brevet endrer ikke utfallet.')).toBeTruthy();
    await skriv(FELTET, '2026-09-28');
    await fireEvent.click(screen.getByRole('button', { name: 'Se brevet før sending' }));
    await screen.findByRole('article', { name: TITTEL });
    expect(screen.getByRole('region', { name: 'Sending' }).textContent).toContain(
      'Saken står lukket. Brevet endrer ikke utfallet.'
    );
    await fireEvent.click(screen.getByRole('checkbox', { name: 'Jeg har kontrollert brevet' }));
    await fireEvent.click(screen.getByRole('button', { name: 'Send brevet til byggherren' }));
    const foer = sj.kontrollpunkter[0]!.versjon;
    await vi.waitFor(() => expect(nyeRader(demosak(), foer)).toHaveLength(1));
    await vi.waitFor(() =>
      expect(kvitteringen()).toMatch(/Saken står lukket, og utfallet er det samme\./)
    );
  });
});

describe('meldingen under det egne brevet er den som gjaldt da det ble sendt (#2523, MM-U50)', () => {
  /** Forløpet med stegene i `steg` (nummer i forløpet `fra`) og et kontrollpunkt etter det siste. */
  async function forloepet(fra: string, steg: (number | 'trekk')[]): Promise<Startjournal> {
    const BF = finn(fra);
    return startjournal({
      ...BF,
      id: `${fra}-${steg.join('-')}`,
      steg: steg.map((n) =>
        n === 'trekk' ? { handling: 'trekk', spor: 'forhold' } : BF.steg![n - 1]
      ),
      kontrollpunkter: [
        { id: 'slutt', etter: steg.length, beskrivelse: '', kontroller: [], forstaaelse: [] },
      ],
    } as typeof BF);
  }

  it('brevet sendt før TE godtok avslaget, sier ikke at saken står lukket (MM-U50, GR-U27, VS-U84)', async () => {
    // BF-48E: avslaget i brev 3, datoen i brev 4 mens saken er åpen, aksepten i brev 5.
    aapne('slutt', await forloepet('BF-48E', [1, 2, 3, 5, 4]));
    await tilVederlaget();
    expect((await innlegget(4)).tekst).not.toContain('Saken står lukket');
    // Kontrollsak: brevet etter aksepten står i den lukkede saken.
    cleanup();
    aapne('slutt', await forloepet('BF-48E', [1, 2, 3, 4, 5]));
    await tilVederlaget();
    expect((await innlegget(5)).tekst).toContain(
      'Saken står lukket. Brevet endrer ikke utfallet. Byggherren kan ta stilling til datoen i et innlegg.'
    );
  });

  it('brevet sendt før TE trakk påberopelsen, sier at svaret står (MM-U50, GR-U5)', async () => {
    // BF-48: svaret på vederlaget i brev 4, datoene i brev 5 og 6, trekket i brev 7.
    aapne('slutt', await forloepet('BF-48', [1, 2, 3, 4, 5, 6, 'trekk']));
    await tilVederlaget();
    const brevet = (await innlegget(6)).tekst;
    expect(brevet).not.toContain('Saken står lukket');
    expect(brevet).toContain(
      'Svaret i brev 4 endres ikke. Byggherren kan ta stilling til datoen i et senere svar.'
    );
    // Kontrollsak: brevet etter trekket står i den lukkede saken (GR-U27).
    cleanup();
    aapne('slutt', await forloepet('BF-48', [1, 2, 3, 4, 'trekk', 5]));
    await tilVederlaget();
    expect((await innlegget(6)).tekst).toContain('Saken står lukket. Brevet endrer ikke utfallet.');
  });
});
