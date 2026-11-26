/**
 * Datoen TE ble klar over at utgiftene etter punkt 34.1.3 annet ledd ville påløpe, i Varden
 * (#2012), med brukerforløpet BF-48 og kjernen i minnet: datoen i vederlagskravet (variant B),
 * det egne brevet som oppgir eller endrer den (variant D), datoen i tråden og i svarskjemaet.
 * Kontrollene ved kontrollpunktene er forløpets, med kilde (`kontrollerEtter`). Forventningene i
 * visningen viser til U-punktene i bestillingen `docs/domenetabell/brukerforlop/BF-48.md`.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/svelte';
import { finnForloep, type Demosak } from '#lib/kjernesak/demosak.ts';
import type { Journalrad } from '#kjerne/typer.ts';
import {
  finn,
  kjoerBrukerforloep,
  kontrollpunkt,
  somForloep,
} from '#kjerne/tester/brukerforloep.ts';
import { kontrollerEtter } from '#kjerne/tester/kjoerer.ts';
import Demoforloep from '#lib/components/brukerforlop/Demoforloep.svelte';

const paastand = (holder: boolean, melding: string) => expect(holder, melding).toBe(true);
const FORKLARING = 'Peleriggen sto stille i uke 41.';
const FELTET = /^Når ble du klar over at utgiftene ville påløpe\?/;
// Mellomrommet foran nummeret i den frosne tittelen kan være hardt (språkfila).
const TITTEL = /^Når utgiftene etter punkt\s34\.1\.3 ble kjent i sak KOE-17$/;

function aapne(punkt: string) {
  let demosak: Demosak | null = null;
  render(Demoforloep, {
    forloep: finnForloep('BF-48')!,
    punkt,
    onpunkt: () => {},
    onstart: (d: Demosak) => (demosak = d),
  });
  return () => demosak!;
}

const versjonVed = (punkt: string) =>
  finnForloep('BF-48')!.kontrollpunkter.find((p) => p.id === punkt)!.versjon;
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
    await fireEvent.click(await screen.findByRole('button', { name: /^Oppdater kravet/ }));
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
