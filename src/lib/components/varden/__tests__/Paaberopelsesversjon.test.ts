/**
 * TEs nye versjon av påberopelsen i Varden (BF-10), med brukerforløpene BF-04 og BF-02C og
 * kjernen i minnet, og primærhandlingen i «Det du kan gjøre nå» (#1649). Forventningene viser
 * til U- og D-punktene i bestillingen `docs/domenetabell/brukerforlop/BF-10.md`, til BF-02A U-7
 * og til vedtakene der.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/svelte';
import { finnForloep, lagDemosak, type Demosak } from '$lib/kjernesak/demosak';
import { lagKjernesak } from '$lib/kjernesak/kontekst.svelte';
import type { Part } from '$kjerne/typer';
import Demoforloep from '$lib/components/brukerforlop/Demoforloep.svelte';
import Vardensak from '../Vardensak.svelte';

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

async function vis(forloep: string, punkt: string, part: Part, spor: 'forhold' | 'vederlag') {
  const demosak = lagDemosak(finnForloep(forloep)!, punkt, part);
  const kjernesak = lagKjernesak({
    sakId: demosak.sakId,
    prosjektId: 'demo',
    part,
    hent: demosak.hent,
    send: demosak.send,
  });
  await kjernesak.last();
  render(Vardensak, { kjernesak, spor });
  return within(
    (await screen.findByRole('heading', { name: 'Det du kan gjøre nå' })).closest('section')!
  );
}

const tilForholdet = async () =>
  fireEvent.click(await screen.findByRole('button', { name: 'Irregulær endring' }));
const teksten = () => screen.getByRole('textbox', { name: 'Oppdatert begrunnelse' });
const laastTekst = async (tittel: RegExp) =>
  [
    ...within(await screen.findByRole('article', { name: tittel }))
      .getByTestId('laast-tekst')
      .querySelectorAll('p'),
  ].map((p) => p.textContent ?? '');

beforeEach(() => vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Ingen nettverk.'))));
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('TE oppdaterer påberopelsen i Varden (BF-10)', () => {
  it('etter svaret skriver TE i teksten fra forrige versjon med svaret ved siden av, og forhåndsvisningen viser datoen, veien til korrigeringen og hvem som mister hvilken mulighet (U-1–U-5, D-1, D-3–D-5, D-8)', async () => {
    const demosak = aapne('BF-02C', 'te-vil-sende-ny-versjon');
    await tilForholdet();
    // U-1: primærhandlingen etter svaret (#1649).
    await fireEvent.click(await screen.findByRole('button', { name: 'Oppdater påberopelse' }));

    // U-6: utkastet ser aldri sendt ut.
    const skjema = within(screen.getByRole('form'));
    expect(skjema.getByText('Utkast · ikke sendt')).toBeTruthy();
    // S-3 B: teksten står slik den sist ble sendt, i ett felt, uten hjelpetekst (oppdragsgiver 06.11, PR 1650).
    expect((teksten() as HTMLTextAreaElement).value).not.toBe('');
    expect(teksten().getAttribute('aria-describedby')).toBeNull();
    // Mens TE skriver, står verken hovedlinjene, tidslinja eller virkningen (oppdragsgiver 06.11).
    expect(screen.queryByRole('heading', { name: /Hovedlinjene/ })).toBeNull();
    expect(screen.queryByRole('heading', { name: 'Tidslinje' })).toBeNull();
    expect(screen.queryByText(/Erstatter påberopelsen/)).toBeNull();

    // Svaret åpnes ved siden av utkastet, så TE kan lese og skrive samtidig.
    const les = skjema.getByRole('button', { name: 'Les byggherrens svar i brev 2' });
    await fireEvent.click(les);
    expect(les.getAttribute('aria-expanded')).toBe('true');
    const [svaret] = screen.getAllByRole('region', { name: /K201-KOE-017-02/ });
    expect(within(svaret).getByRole('article')).toBeTruthy();
    expect(teksten()).toBeTruthy();
    await fireEvent.click(skjema.getByRole('button', { name: 'Lukk svaret' }));
    expect(screen.queryAllByRole('region', { name: /K201-KOE-017-02/ })).toHaveLength(0);

    await fireEvent.input(teksten(), {
      target: { value: 'Vi fastholder at pålegget er en endring.' },
    });
    await fireEvent.click(screen.getByRole('button', { name: 'Gå til forhåndsvisning' }));
    // U-4, D-4 (LV-U56): brevet ordrett, med den låste delen og datoen.
    const vist = await laastTekst(/Påberopelse av irregulær endring/);
    expect(vist.join(' ')).toMatch(/Pålegget ble mottatt 15\. september 2026\./);
    expect(vist.join(' ')).not.toMatch(/erstatter/);
    const kontrollen = within(screen.getByRole('region', { name: 'Sending' }));
    expect(kontrollen.getByText('Viser til')).toBeTruthy();
    // U-2, U-3, D-5: mottakeren, datoen med veien til korrigeringen, og hvem som mister hva.
    expect(kontrollen.getByText('Til').nextElementSibling?.textContent).toMatch(/\(BH\)$/);
    expect(kontrollen.getByText(/Pålegget mottatt 15\. september 2026, som før/)).toBeTruthy();
    expect(kontrollen.getByRole('button', { name: 'Korriger datoen i et eget brev' })).toBeTruthy();
    expect(
      kontrollen.getByText(
        'Erstatter påberopelsen i brev 1. Du kan ikke lenger godta svaret i brev 2 i denne saken. Byggherren svarer på den nye versjonen.'
      )
    ).toBeTruthy();

    const foer = demosak().journal().length;
    await fireEvent.click(screen.getByRole('checkbox', { name: 'Jeg har kontrollert brevet' }));
    await fireEvent.click(
      screen.getByRole('button', { name: 'Send den nye versjonen til byggherren' })
    );
    await screen.findByText(/Den nye versjonen er sendt til byggherren/);
    const ny = demosak().journal().slice(foer);
    expect(ny).toHaveLength(1);
    // D-1, D-3: en ny kravversjon med samme dato og kategori.
    expect(JSON.stringify(ny[0])).toMatch(/"paalegg_mottatt":"2026-09-15"/);
    expect(JSON.stringify(ny[0])).toMatch(/Vi fastholder at pålegget er en endring\./);
  });

  it('#1647: brevet med den nye versjonen viser datoen i brevtråden, selv om den gjentar TEs siste opplysning (MM-U52 punkt 10)', async () => {
    aapne('BF-02C', 'te-vil-sende-ny-versjon');
    await tilForholdet();
    await fireEvent.click(await screen.findByRole('button', { name: 'Oppdater påberopelse' }));
    await fireEvent.click(screen.getByRole('button', { name: 'Gå til forhåndsvisning' }));
    await fireEvent.click(
      await screen.findByRole('checkbox', { name: 'Jeg har kontrollert brevet' })
    );
    await fireEvent.click(
      screen.getByRole('button', { name: 'Send den nye versjonen til byggherren' })
    );
    await screen.findByText(/Den nye versjonen er sendt til byggherren/);
    const traaden = within(await screen.findByRole('list', { name: 'Brevene om forholdet' }));
    const nyVersjon = traaden
      .getAllByRole('heading', { name: /^Brev \d+ · Påberopelse/ })
      .at(-1)!
      .closest('li')!;
    expect(nyVersjon.textContent).toMatch(/Pålegget mottatt 15\. september 2026/);
  });

  it('BF-02C steg 2C: byggherren sier at varselet kom for sent, så datoen står ved feltet med veien til korrigeringen; teksten står når TE kommer tilbake, og den nye versjonen har den korrigerte datoen (BF-02A U-7, #1617)', async () => {
    const demosak = aapne('BF-02C', 'te-vil-sende-ny-versjon');
    await tilForholdet();
    await fireEvent.click(await screen.findByRole('button', { name: 'Oppdater påberopelse' }));
    const skjema = within(screen.getByRole('form'));
    expect(skjema.getByText(/15\. september 2026 \(brev 1\)/)).toBeTruthy();
    expect(skjema.getByText(/Datoen kan ikke endres i en ny versjon/)).toBeTruthy();
    await fireEvent.input(teksten(), { target: { value: 'Utkastet mitt.' } });
    await fireEvent.click(screen.getByRole('button', { name: 'Korriger datoen i et eget brev' }));
    await fireEvent.input(screen.getByLabelText('Ny dato for når pålegget ble mottatt'), {
      target: { value: '2026-09-20' },
    });
    await fireEvent.click(screen.getByRole('button', { name: 'Se brevet før sending' }));
    await fireEvent.click(
      await screen.findByRole('checkbox', { name: 'Jeg har kontrollert brevet' })
    );
    await fireEvent.click(
      screen.getByRole('button', { name: 'Send korrigeringen til byggherren' })
    );
    await screen.findByText(/Korrigeringen er sendt til byggherren/);

    await tilForholdet();
    await fireEvent.click(await screen.findByRole('button', { name: 'Oppdater påberopelse' }));
    // U-2: ingen av veiene kaster det TE har skrevet.
    expect((teksten() as HTMLTextAreaElement).value).toBe('Utkastet mitt.');
    expect(screen.getByText(/20\. september 2026 \(brev 3\)/)).toBeTruthy();
    await fireEvent.click(screen.getByRole('button', { name: 'Gå til forhåndsvisning' }));
    const vist = await laastTekst(/Påberopelse av irregulær endring/);
    // LV-U56: den korrigerte datoen og den tidligere med brevet.
    expect(vist.join(' ')).toMatch(/Pålegget ble mottatt 20\. september 2026\./);
    expect(vist.join(' ')).toMatch(/15\. september 2026 i brev K201-KOE-017-01/);
    const foer = demosak().journal().length;
    await fireEvent.click(screen.getByRole('checkbox', { name: 'Jeg har kontrollert brevet' }));
    await fireEvent.click(
      screen.getByRole('button', { name: 'Send den nye versjonen til byggherren' })
    );
    await screen.findByText(/Den nye versjonen er sendt til byggherren/);
    expect(JSON.stringify(demosak().journal().slice(foer))).toMatch(
      /"paalegg_mottatt":"2026-09-20"/
    );
  });

  it('før svaret heter handlingen «Send ny versjon av påberopelsen» og står under «Andre handlinger», uten primærhandling (U-1, #1649)', async () => {
    const kortet = await vis('BF-05', 'paaberopelsen-er-sendt', 'TE', 'forhold');
    expect(kortet.queryByRole('button', { name: 'Oppdater påberopelse' })).toBeNull();
    expect(
      kortet.queryAllByRole('button').filter((k) => k.className.includes('primaer'))
    ).toHaveLength(0);
    await fireEvent.click(kortet.getByRole('button', { name: /^Send ny versjon av påberopelsen/ }));
    expect(screen.getByRole('textbox', { name: 'Oppdatert begrunnelse' })).toBeTruthy();
    // Før svaret er det ikke noe svar å lese.
    expect(screen.queryByRole('button', { name: /Les byggherrens svar/ })).toBeNull();
    expect(screen.queryByText(/Si hva du mener om svaret/)).toBeNull();
  });
});

describe('primærhandlingen i «Det du kan gjøre nå» (#1649)', () => {
  it('BH: «Svar på påberopelsen» er primær når påberopelsen ikke er besvart', async () => {
    const kortet = await vis('BF-05', 'paaberopelsen-er-sendt', 'BH', 'forhold');
    const knapper = kortet.getAllByRole('button').filter((k) => k.className.includes('primaer'));
    expect(knapper.map((k) => k.textContent?.trim())).toEqual(['Svar på påberopelsen']);
  });

  it('BH: etter korrigeringen har kortet ingen primærhandling', async () => {
    const kortet = await vis('BF-02A', 'korrigeringen-er-sendt', 'BH', 'forhold');
    expect(
      kortet.queryAllByRole('button').filter((k) => k.className.includes('primaer'))
    ).toHaveLength(0);
  });

  it('i demoruta er «Revider krav» primær etter svaret også når den ikke er bygget, og et klikk sier det (#1636)', async () => {
    const kortet = await vis('BF-04', 'te-har-mottatt-svaret', 'TE', 'vederlag');
    await fireEvent.click(kortet.getByRole('button', { name: 'Revider krav' }));
    expect(kortet.getByText('Denne handlingen er ikke bygget i prøven ennå.')).toBeTruthy();
  });
});
