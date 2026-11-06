/**
 * TEs korrigering av datoen i Varden (#1615), med brukerforløpene BF-02A, BF-02C og BF-02D og
 * kjernen i minnet. TE velger «Korriger datoen» ved datoen i brevtråden, skriver den nye datoen,
 * kontrollerer brevet i brevkontrollen og sender det. Kontrollene ved kontrollpunktene er
 * forløpets, med kilde (`kontrollerEtter`). Forventningene i visningen viser til U-punktene i
 * bestillingen `docs/domenetabell/brukerforlop/BF-02A.md`.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/svelte';
import { finnForloep, type Demosak } from '$lib/kjernesak/demosak';
import type { Journalrad } from '$kjerne/typer';
import { finn, kjoerBrukerforloep, kontrollpunkt, somForloep } from '$kjerne/tester/brukerforloep';
import { kontrollerEtter } from '$kjerne/tester/kjoerer';
import Demoforloep from '$lib/components/brukerforlop/Demoforloep.svelte';

const paastand = (holder: boolean, melding: string) => expect(holder, melding).toBe(true);
const FORKLARING = 'Pålegget står i referatet fra byggemøtet 20.09.';

function aapne(forloep: string, punkt: string) {
  let demosak: Demosak | null = null;
  render(Demoforloep, {
    forloep: finnForloep(forloep)!,
    punkt,
    visning: 'varden',
    onpunkt: () => {},
    onstart: (d: Demosak) => (demosak = d),
  });
  return () => demosak!;
}

const versjonVed = (forloep: string, punkt: string) =>
  finnForloep(forloep)!.kontrollpunkter.find((p) => p.id === punkt)!.versjon;
const nyeRader = (demosak: Demosak, etter: number): Journalrad[] =>
  demosak.journal().filter((r) => r.versjon > etter);
/** Teksten i kvitteringene øverst i arbeidet. */
const kvitteringen = () =>
  screen
    .getAllByRole('status')
    .map((e) => e.textContent ?? '')
    .join(' ');
const demopanel = () =>
  within(screen.getByRole('complementary', { name: 'Demo av brukerforløpet' }));
const traaden = async () =>
  within(await screen.findByRole('list', { name: 'Brevene om forholdet' }));
const innlegget = async (tittel: RegExp) =>
  within((await traaden()).getByRole('heading', { name: tittel }).closest('li')!);

async function tilForholdet() {
  await fireEvent.click(await screen.findByRole('button', { name: 'Irregulær endring' }));
}

async function skrivDatoen(dato: string) {
  await fireEvent.input(screen.getByLabelText('Ny dato for når pålegget ble mottatt'), {
    target: { value: dato },
  });
}

/** TE går fra datoen i brevtråden til brevkontrollen. Gir avsnittene i brevet. */
async function teKorrigerer(dato: string, forklaring?: string): Promise<string[]> {
  await tilForholdet();
  await fireEvent.click(
    (await traaden()).getByRole('button', { name: 'Korriger datoen pålegget ble mottatt' })
  );
  await skrivDatoen(dato);
  if (forklaring)
    await fireEvent.input(screen.getByRole('textbox', { name: 'Forklaring (valgfri)' }), {
      target: { value: forklaring },
    });
  await fireEvent.click(screen.getByRole('button', { name: 'Se brevet før sending' }));
  const brev = await screen.findByRole('article', { name: 'Korrigering av datoen i sak KOE-17' });
  return [...within(brev).getByTestId('laast-tekst').querySelectorAll('p')].map(
    (p) => p.textContent ?? ''
  );
}

async function sendKorrigeringen() {
  await fireEvent.click(screen.getByRole('checkbox', { name: 'Jeg har kontrollert brevet' }));
  await fireEvent.click(screen.getByRole('button', { name: 'Send korrigeringen til byggherren' }));
}

beforeEach(() => vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Ingen nettverk.'))));
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('TE korrigerer datoen i Varden (BF-02A, BF-02C, BF-02D)', () => {
  it('BF-02A: TE korrigerer ved datoen gjennom brevkontrollen, og kontrollene etter korrigeringen holder (MM-U52 punkt 10–11, U-1–U-4)', async () => {
    const BF = finn('BF-02A');
    const punkt = kontrollpunkt(BF, 'te-har-mottatt-svaret');
    const { k, bane } = await kjoerBrukerforloep(BF, { til: punkt.id, paastand });
    const demosak = aapne('BF-02A', punkt.id);
    bane.journal = async () => demosak().journal();

    const vist = await teKorrigerer('2026-09-20', FORKLARING);
    // U-3, D-1: brevet ordrett før sending, med henvisningen til brevet med opplysningen, og
    // forklaringen under den vedtatte teksten (MM-U53).
    expect(vist[0]).toBe(
      'Totalentreprenøren oppgir nå at pålegget ble mottatt 20. september 2026. I brev K201-KOE-017-01 av 1. oktober 2026 oppga totalentreprenøren 15. september 2026.'
    );
    const kontrollen = screen.getByRole('region', { name: 'Sending' });
    expect(within(kontrollen).getByText('Viser til')).toBeTruthy();
    expect(kontrollen.textContent).toMatch(/Svaret i brev 2 står som det ble sendt\./);

    await sendKorrigeringen();
    const foer = versjonVed('BF-02A', punkt.id);
    await vi.waitFor(() => expect(nyeRader(demosak(), foer)).toHaveLength(1));
    const [rad] = nyeRader(demosak(), foer);
    expect(rad.aktor_rolle).toBe('TE');
    const frosset = rad.data.brevtekst as { laast: string; utdypning?: string }[];
    expect(frosset[0].laast).toBe(vist[0]);
    expect(frosset[0].utdypning).toBe(FORKLARING);
    k.registrer(BF.steg![2], [rad]);
    await kontrollerEtter(somForloep(BF), 3, k, paastand);

    // U-4: kvitteringen sier at datoen er TEs siste opplysning, og at påberopelsen og svaret står (oppdragsgiver 06.11).
    await vi.waitFor(() =>
      expect(kvitteringen()).toMatch(
        /20\. september 2026 er nå din siste opplysning om når pålegget ble mottatt\. Påberopelsen og svaret står som de ble sendt\./
      )
    );
    // U-1: handlingen står ved den siste opplysningen, ikke ved den første.
    const foerste = await innlegget(/^Brev 1 ·/);
    expect(foerste.queryByRole('button', { name: /Korriger datoen/ })).toBeNull();
    expect(
      foerste.getByText(/15\. september 2026, ifølge totalentreprenøren\. Korrigert i brev 3\./)
    ).toBeTruthy();
    const korrigeringen = await innlegget(/^Brev 3 · Korrigering av datoen/);
    expect(korrigeringen.getByRole('button', { name: /Korriger datoen/ })).toBeTruthy();
    // U-5: hvilken opplysning svaret gjaldt.
    const svaret = await innlegget(/^Brev 2 ·/);
    expect(
      svaret.getByText(
        'Svaret gjaldt opplysningen i brev 1 om at pålegget ble mottatt 15. september 2026.'
      )
    ).toBeTruthy();
  });

  it('BF-02A: BH ser den nye og den tidligere datoen, at svaret står som det ble sendt, og ingenting om at varselet nå kom i tide (U-5, U-6, MM-U50)', async () => {
    aapne('BF-02A', 'korrigeringen-er-sendt');
    await fireEvent.click(demopanel().getByRole('radio', { name: 'BH' }));
    await tilForholdet();
    const korrigeringen = await innlegget(/^Brev 3 · Korrigering av datoen/);
    expect(
      korrigeringen.getByText(
        /20\. september 2026, ifølge totalentreprenøren\. Korrigerer 15\. september 2026, oppgitt i brev 1\./
      )
    ).toBeTruthy();
    expect(
      korrigeringen.getByText(
        'Svaret i brev 2 står som det ble sendt. Byggherren kan ta stilling til den nye datoen i et senere svar.'
      )
    ).toBeTruthy();
    expect(korrigeringen.queryByText(/venter/)).toBeNull();
    expect(screen.queryByRole('button', { name: /Korriger datoen/ })).toBeNull();
    // MM-U50: påberopelsen står, og visningen sier ikke at varselet nå kom i tide.
    expect(
      (await innlegget(/^Brev 2 ·/)).getByText(/varselet etter punkt 32\.2 i brev 1 kom for sent/)
    ).toBeTruthy();
    expect(document.querySelector('main')!.textContent).not.toMatch(
      /nå kom i tide|likevel i tide|varslet i tide|godkjenner at varselet/
    );
    // G-7: tidslinja har begge opplysningene, lest av `datoopplysninger`.
    const linja = within(screen.getByRole('region', { name: /Tidslinje/ }));
    expect(linja.getByText('Oppgitt av TE i brev 1')).toBeTruthy();
    expect(linja.getByText('Oppgitt av TE i brev 3')).toBeTruthy();
  });

  it('en uendret dato, en dato etter dagens dato og et tomt felt stoppes i skjemaet med det som hindrer, og brevet vises ikke (U-3, D-4)', async () => {
    aapne('BF-02A', 'te-har-mottatt-svaret');
    await tilForholdet();
    await fireEvent.click(
      (await traaden()).getByRole('button', { name: 'Korriger datoen pålegget ble mottatt' })
    );
    const se = () => fireEvent.click(screen.getByRole('button', { name: 'Se brevet før sending' }));
    const felt = () => screen.getByLabelText('Ny dato for når pålegget ble mottatt');

    await se();
    expect(felt()).toHaveAccessibleDescription(/Skriv datoen pålegget ble mottatt\./);
    await skrivDatoen('2026-09-15');
    await se();
    expect(felt()).toHaveAccessibleDescription(
      /Datoen er den samme som i brev 1, 15\. september 2026\./
    );
    expect(felt()).toHaveAttribute('aria-invalid', 'true');
    await skrivDatoen('2999-01-01');
    await se();
    expect(felt()).toHaveAccessibleDescription(/Datoen er etter dagens dato\./);
    expect(screen.queryByRole('article')).toBeNull();
  });

  it('datoen og forklaringen står når TE går tilbake fra brevkontrollen, og «Forkast utkast» tømmer dem (U-3)', async () => {
    aapne('BF-02A', 'te-har-mottatt-svaret');
    await teKorrigerer('2026-09-20', FORKLARING);
    await fireEvent.click(screen.getByRole('button', { name: 'Tilbake til utkastet' }));
    expect(screen.getByLabelText('Ny dato for når pålegget ble mottatt')).toHaveValue('2026-09-20');
    expect(screen.getByRole('textbox', { name: 'Forklaring (valgfri)' })).toHaveValue(FORKLARING);
    await fireEvent.click(screen.getByRole('button', { name: 'Forkast utkast' }));
    await fireEvent.click(screen.getByRole('button', { name: 'Forkast' }));
    await vi.waitFor(() => expect(kvitteringen()).toMatch(/Utkastet er forkastet/));
    await fireEvent.click(
      (await traaden()).getByRole('button', { name: 'Korriger datoen pålegget ble mottatt' })
    );
    expect(screen.getByLabelText('Ny dato for når pålegget ble mottatt')).toHaveValue('');
  });

  it('skjemaet har utkastkortet og sier hvilken opplysning som korrigeres, og at påberopelsen og svaret står som de ble sendt (U-2, svaret på S-4b i BF-10; oppdragsgiver 06.11)', async () => {
    aapne('BF-02A', 'te-har-mottatt-svaret');
    await tilForholdet();
    await fireEvent.click(
      (await traaden()).getByRole('button', { name: 'Korriger datoen pålegget ble mottatt' })
    );
    const skjema = within(screen.getByRole('form'));
    expect(skjema.getByRole('heading', { level: 2 }).textContent).toMatch(/^Utkast · ikke sendt/);
    expect(skjema.getByText('Til byggherren (BH)')).toBeTruthy();
    expect(
      skjema.getByText('15. september 2026, datoen du oppga for når pålegget ble mottatt')
    ).toBeTruthy();
    expect(
      skjema.getByText(
        'Korrigeringen sendes som et eget brev til byggherren. Påberopelsen i brev 1 og svaret i brev 2 står som de ble sendt. Den nye datoen gjelder straks som din siste opplysning.'
      )
    ).toBeTruthy();
    // Brevet står ikke ved siden av mens TE skriver (S-4b A).
    expect(screen.queryByRole('article')).toBeNull();
  });

  it('«Korriger datoen» står ikke under «Andre handlinger» (U-1, #1615)', async () => {
    aapne('BF-02A', 'te-har-mottatt-svaret');
    await tilForholdet();
    const kortet = within(
      (await screen.findByRole('heading', { name: 'Det du kan gjøre nå' })).closest('section')!
    );
    expect(kortet.queryByText(/Korriger datoen|Handlingen korrigere/)).toBeNull();
  });

  it('BF-02C: TE korrigerer i stedet for å sende en ny versjon, og kontrollene etter korrigeringen holder (MM-U52, LV-U54)', async () => {
    const BF = finn('BF-02C');
    const punkt = kontrollpunkt(BF, 'te-vil-sende-ny-versjon');
    const { k, bane } = await kjoerBrukerforloep(BF, { til: punkt.id, paastand });
    const demosak = aapne('BF-02C', punkt.id);
    bane.journal = async () => demosak().journal();
    await teKorrigerer('2026-09-20');
    await sendKorrigeringen();
    const foer = versjonVed('BF-02C', punkt.id);
    await vi.waitFor(() => expect(nyeRader(demosak(), foer)).toHaveLength(1));
    k.registrer(BF.steg![2], nyeRader(demosak(), foer));
    await kontrollerEtter(somForloep(BF), 3, k, paastand);
  });

  it('BF-02D: i den lukkede saken står korrigeringen ved datoen med at den ikke endrer utfallet, og kvitteringen sier at saken står lukket (MM-U51, GR-U27, U-6)', async () => {
    const BF = finn('BF-02D');
    const punkt = kontrollpunkt(BF, 'saken-er-lukket');
    const { k, bane } = await kjoerBrukerforloep(BF, { til: punkt.id, paastand });
    const demosak = aapne('BF-02D', punkt.id);
    bane.journal = async () => demosak().journal();
    await tilForholdet();
    expect(
      (await innlegget(/^Brev 1 ·/)).getByText(
        /Saken står lukket, og korrigeringen endrer ikke utfallet\. Byggherren kan ta stilling til den nye datoen i et innlegg\./
      )
    ).toBeTruthy();
    await teKorrigerer('2026-09-20');
    expect(screen.getByRole('region', { name: 'Sending' }).textContent).toMatch(
      /Saken står lukket, og korrigeringen endrer ikke utfallet/
    );
    await sendKorrigeringen();
    const foer = versjonVed('BF-02D', punkt.id);
    await vi.waitFor(() => expect(nyeRader(demosak(), foer)).toHaveLength(1));
    k.registrer(BF.steg![3], nyeRader(demosak(), foer));
    await kontrollerEtter(somForloep(BF), 4, k, paastand);
    await vi.waitFor(() =>
      expect(kvitteringen()).toMatch(/Saken står lukket, og utfallet er det samme\./)
    );
    // Teksten om den lukkede saken står én gang ved korrigeringen.
    expect(
      (await innlegget(/^Brev 4 ·/)).getAllByText(/^Saken står lukket, og korrigeringen/)
    ).toHaveLength(1);
  });
});
