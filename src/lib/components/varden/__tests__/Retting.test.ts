/**
 * TEs retting av datoen for et varsel eller et krav lagt til som korrespondanse, i Varden (#1309),
 * med brukerforløpet BF-50 og kjernen i minnet: handlingen ved datoen i tråden, skjemaet og brevet
 * (variant A), datoene i tråden (variant D), stoppene i skjemaet (variant F), datoen som gjelder i
 * svarskjemaet og kravskjemaet, og en lukket sak (variant E). Kontrollene ved kontrollpunktene er
 * forløpets, med kilde (`kontrollerEtter`). Forventningene i visningen viser til U-punktene i
 * bestillingen `docs/domenetabell/brukerforlop/BF-50.md`.
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
const FORKLARING = 'Varselet ble sendt 16.10.2026, ikke 14.10.2026.';
// Mellomrommet foran nummeret i den frosne tittelen kan være hardt (språkfila).
const TITTEL = /^Retting av varseldatoen i sak KOE-17$/;

function aapne(punkt: string, side: 'TE' | 'BH') {
  let demosak: Demosak | null = null;
  render(Demoforloep, {
    forloep: finnForloep('BF-50')!,
    punkt,
    onpunkt: () => {},
    onstart: (d: Demosak) => (demosak = d),
  });
  fireEvent.click(demopanel().getByRole('radio', { name: side }));
  return () => demosak!;
}

const versjonVed = (punkt: string) =>
  finnForloep('BF-50')!.kontrollpunkter.find((p) => p.id === punkt)!.versjon;
const nyeRader = (demosak: Demosak, etter: number): Journalrad[] =>
  demosak.journal().filter((r) => r.versjon > etter);
const kvitteringen = () =>
  screen
    .getAllByRole('status')
    .map((e) => e.textContent ?? '')
    .join(' ');
const demopanel = () =>
  within(screen.getByRole('complementary', { name: 'Demo av brukerforløpet' }));
/** Teksten med vanlige mellomrom, så forventningen ikke avhenger av de harde i brevteksten. */
const tekst = (e: Element) => (e.textContent ?? '').replace(/\s+/g, ' ');
/** Raden i tråden med teksten, som brevet lagt til uten nummer. */
const raden = async (inneholder: string) => {
  const liste = await screen.findByRole('list', { name: /^Brevene/ });
  const li = [...within(liste).getAllByRole('listitem')].find((x) =>
    tekst(x).includes(inneholder)
  )!;
  return { li: within(li), tekst: tekst(li) };
};
const VARSELET = 'Sendt 14. oktober 2026 per post';
const tilFristen = async () =>
  fireEvent.click(await screen.findByRole('button', { name: /^Fristforlengelse/ }));
const lesBrevet = (navn: RegExp) =>
  [
    ...within(screen.getByRole('article', { name: navn }))
      .getByTestId('laast-tekst')
      .querySelectorAll('p'),
  ].map(tekst);
const skriv = (verdi: string) =>
  fireEvent.input(screen.getByLabelText(/^Ny dato/), { target: { value: verdi } });
const seBrevet = () =>
  fireEvent.click(screen.getByRole('button', { name: 'Se brevet før sending' }));

beforeEach(() => vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Ingen nettverk.'))));
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('TE retter datoen for et varsel eller et krav lagt til, i Varden (BF-50)', () => {
  it('variant A: TE retter varseldatoen ved varselet gjennom brevkontrollen, og kontrollene etter brevet holder (MM-U59 punkt 8, MM-U63, U-1–U-5)', async () => {
    const BF = finn('BF-50');
    const punkt = kontrollpunkt(BF, 'te-har-lagt-til-varselet-og-kravet');
    const { k, bane } = await kjoerBrukerforloep(BF, { til: punkt.id, paastand });
    const demosak = aapne(punkt.id, 'TE');
    bane.journal = async () => demosak().journal();
    await tilFristen();

    // U-1: handlingen står ved datoen for varselet lagt til, i tråden.
    await fireEvent.click(
      (await raden(VARSELET)).li.getByRole('button', {
        name: /^Rett datoen for varselet etter punkt\s33\.4$/,
      })
    );
    // U-2: skjemaet sier hvilket varsel, datoen som gjelder med brevet, og at brevet står.
    const skjema = within(screen.getByRole('form'));
    expect(
      skjema.getByText('Varselet etter punkt 33.4 i totalentreprenørens brev av 14. oktober 2026')
    ).toBeTruthy();
    expect(skjema.getByText('14. oktober 2026, oppgitt da brevet ble lagt til')).toBeTruthy();
    expect(
      skjema.getByText(
        'Rettingen sendes i et eget brev til byggherren. Totalentreprenørens brev av 14. oktober 2026 står som det ble lagt til.'
      )
    ).toBeTruthy();

    await skriv('2026-10-16');
    await fireEvent.input(screen.getByRole('textbox', { name: 'Forklaring, Valgfri' }), {
      target: { value: FORKLARING },
    });
    await seBrevet();
    await screen.findByRole('article', { name: TITTEL });
    // U-3: brevet ordrett før sending, med henvisningen, den nye datoen og datoen som gjaldt, og
    // forklaringen under den faste teksten (D-9). Teksten er kjernens.
    const vist = lesBrevet(TITTEL);
    expect(vist[0]).toBe(
      'Totalentreprenøren retter datoen for varselet om fristforlengelse etter NS 8407 punkt 33.4 i totalentreprenørens brev av 14. oktober 2026 til 16. oktober 2026. Datoen som gjaldt, var 14. oktober 2026.'
    );
    expect(vist).toContain(FORKLARING);
    // U-4: «Når du sender» sier at datoen gjelder straks, også når den er tidligere.
    const kontrollen = screen.getByRole('region', { name: 'Sending' });
    expect(kontrollen.textContent).toContain(
      'Den nye datoen gjelder straks som din siste opplysning, også når den er tidligere.'
    );
    expect(kontrollen.textContent).not.toMatch(/lukket/);

    await fireEvent.click(screen.getByRole('checkbox', { name: 'Jeg har kontrollert brevet' }));
    await fireEvent.click(screen.getByRole('button', { name: 'Send brevet til byggherren' }));
    const foer = versjonVed(punkt.id);
    await vi.waitFor(() => expect(nyeRader(demosak(), foer)).toHaveLength(1));
    const [rad] = nyeRader(demosak(), foer);
    expect(rad.aktor_rolle).toBe('TE');
    k.registrer(BF.steg![5], [rad]);
    await kontrollerEtter(somForloep(BF), 6, k, paastand);

    await vi.waitFor(() =>
      expect(kvitteringen()).toContain(
        'Brevet er sendt til byggherren. 16. oktober 2026 er nå datoen som gjelder.'
      )
    );
    await fireEvent.click(screen.getByRole('button', { name: 'Tilbake til saken' }));
    // U-5: ved varselet datoen som gjelder og den tidligere, og rettingen som eget brev.
    const varselet = await raden(VARSELET);
    expect(varselet.tekst).toContain('Datoen som gjelder, er 16. oktober 2026.');
    expect(varselet.tekst).toContain(
      'Oppgitt 14. oktober 2026. Rettet til 16. oktober 2026 i brev 2.'
    );
    expect(varselet.li.getByRole('button', { name: /^Rett datoen/ })).toBeTruthy();
    expect((await raden('Retting av varseldatoen')).tekst).toContain(
      'Retter datoen for varselet etter punkt 33.4 i totalentreprenørens brev av 14. oktober 2026 fra 14. oktober 2026 til 16. oktober 2026.'
    );
  });

  it('variant D: BH ser datoen som gjelder og hver tidligere dato med brevet, den opprinnelige først, og ingen handling (U-1, U-5, U-11)', async () => {
    aapne('varseldatoen-er-rettet-to-ganger', 'BH');
    await tilFristen();
    expect((await raden(VARSELET)).tekst).toContain(
      'Datoen som gjelder, er 8. oktober 2026. Oppgitt 14. oktober 2026. Rettet til 16. oktober 2026 i brev 2, til 10. oktober 2026 i brev 3 og til 8. oktober 2026 i brev 6.'
    );
    expect((await raden('fra 16. oktober 2026 til 10. oktober 2026')).tekst).toContain(
      'Rettet på nytt i brev 6.'
    );
    expect(screen.queryByRole('button', { name: /^Rett datoen/ })).toBeNull();
    expect(document.querySelector('main')!.textContent).not.toMatch(/nå kom i tide|likevel i tide/);
  });

  it('et tomt felt, datoen som gjelder og en dato etter dagens dato stoppes ved feltet, og en dato før påberopelsen avvises av kjernen under knappen uten at noe skrives (U-9, D-7)', async () => {
    const punkt = 'te-har-lagt-til-varselet-og-kravet';
    const demosak = aapne(punkt, 'TE');
    await tilFristen();
    await fireEvent.click((await raden(VARSELET)).li.getByRole('button', { name: /^Rett datoen/ }));
    const felt = () => screen.getByLabelText(/^Ny dato/);
    await seBrevet();
    expect(felt()).toHaveAccessibleDescription(/Skriv den nye datoen\./);
    await skriv('2026-10-14');
    await seBrevet();
    expect(felt()).toHaveAccessibleDescription(
      /Datoen er den samme som datoen som gjelder, 14\. oktober 2026\. Skriv en annen dato\./
    );
    await skriv('2099-01-01');
    await seBrevet();
    expect(felt()).toHaveAccessibleDescription(/Datoen 1\. januar 2099 er etter dagens dato/);
    expect(screen.queryByRole('article', { name: TITTEL })).toBeNull();

    // Variant F: datoen før påberopelsen, 1. oktober 2026 (VS-U58).
    await skriv('2026-09-28');
    await seBrevet();
    await vi.waitFor(() =>
      expect(document.activeElement?.textContent ?? '').toMatch(
        /28\. september 2026.*1\. oktober 2026/s
      )
    );
    expect(screen.queryByRole('article', { name: TITTEL })).toBeNull();
    expect(nyeRader(demosak(), versjonVed(punkt))).toHaveLength(0);
  });

  it('svarskjemaet viser datoen som gjelder for varselet, med brevet den kommer fra (U-6)', async () => {
    aapne('kravdatoen-er-rettet', 'BH');
    await tilFristen();
    await fireEvent.click(await screen.findByRole('button', { name: 'Svar på kravet' }));
    expect(
      await screen.findByText(
        'Datoen som gjelder for varselet, er 10. oktober 2026. Den er rettet i brev 3.'
      )
    ).toBeTruthy();
  });

  it('svaret på varselet alene viser datoen som gjelder for varselet, med brevet den kommer fra (U-6)', async () => {
    aapne('varseldatoen-er-rettet-to-ganger', 'BH');
    await tilFristen();
    await fireEvent.click(
      await screen.findByRole('button', { name: 'Svar på varselet om fristforlengelse' })
    );
    expect(
      await screen.findByText(
        'Datoen som gjelder for varselet, er 8. oktober 2026. Den er rettet i brev 6.'
      )
    ).toBeTruthy();
  });

  it('kravskjemaet viser varseldatoen som gjelder, og lenken til rettingen beholder utkastet (U-10)', async () => {
    aapne('varseldatoen-er-rettet-til-en-tidligere-dato', 'TE');
    await tilFristen();
    await fireEvent.click(
      await screen.findByRole('button', { name: /^Send krav om fristforlengelse/ })
    );
    expect(
      await screen.findByText(/^Varselet ble sendt 10\. oktober 2026\. Datoen er rettet i brev 3\./)
    ).toBeTruthy();
    // Påminnelsen ved det første kravet viser datoen som gjelder i egen setning (U-5).
    expect(
      screen.getByText(
        /^Varsel etter punkt\s33\.4 i totalentreprenørens brev av 14\. oktober 2026\. Datoen som gjelder, er 10\. oktober 2026\. Den er rettet i brev 3\.$/
      )
    ).toBeTruthy();
    const begrunnelse = screen.getByRole('textbox', { name: /^Begrunnelse/ });
    await fireEvent.input(begrunnelse, { target: { value: 'Pelingen tar lengre tid.' } });
    await fireEvent.click(screen.getByRole('button', { name: 'Rett datoen i et eget brev' }));
    expect(await screen.findByLabelText(/^Ny dato/)).toBeTruthy();
    expect(
      within(screen.getByRole('form')).getByText('10. oktober 2026, rettet i brev 3')
    ).toBeTruthy();
    await fireEvent.click(screen.getByRole('link', { name: /^Tilbake til/ }));
    // Utkastet til kravet står ved siden av utkastet til rettingen.
    const kortet = (await screen.findByText('Krav om fristforlengelse')).closest('section, div')!;
    await fireEvent.click(within(kortet as HTMLElement).getByRole('button', { name: /^Fortsett/ }));
    expect(
      (await screen.findByRole('textbox', { name: /^Begrunnelse/ })) as HTMLTextAreaElement
    ).toHaveProperty('value', 'Pelingen tar lengre tid.');
  });

  it('variant E: i en lukket sak sier «Når du sender» at utfallet ikke endres (U-4, D-8)', async () => {
    aapne('datoen-er-rettet-i-en-lukket-sak', 'TE');
    await tilFristen();
    await fireEvent.click((await raden(VARSELET)).li.getByRole('button', { name: /^Rett datoen/ }));
    await skriv('2026-10-07');
    await seBrevet();
    await screen.findByRole('article', { name: TITTEL });
    expect(screen.getByRole('region', { name: 'Sending' }).textContent).toContain(
      'Saken står lukket. Brevet endrer ikke utfallet.'
    );
  });
});
