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
const teksten = () => screen.getByRole('textbox', { name: 'Beskrivelse av pålegget' });
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
  it('etter svaret sender TE en ny versjon gjennom brevkontrollen, med låst forhold og dato og teksten fra forrige versjon (U-1–U-5, D-1, D-3–D-5, D-8)', async () => {
    const demosak = aapne('BF-02C', 'te-vil-sende-ny-versjon');
    await tilForholdet();
    // U-1: primærhandlingen etter svaret (#1649).
    await fireEvent.click(await screen.findByRole('button', { name: 'Oppdater påberopelse' }));

    // U-6: utkastet ser aldri sendt ut.
    const skjema = within(screen.getByRole('form'));
    expect(skjema.getByText('Utkast · ikke sendt')).toBeTruthy();
    // U-2: forholdet, hjemmelen og datoen står som låste verdier, ikke som felt.
    expect(skjema.getByText('Irregulær endring (punkt 32.1)')).toBeTruthy();
    expect(skjema.getByText(/15\. september 2026, din siste opplysning \(brev 1\)/)).toBeTruthy();
    expect(screen.queryByLabelText(/Datoen pålegget/)).toBeNull();
    // S-3 B: teksten står slik den sist ble sendt, i ett felt.
    expect((teksten() as HTMLTextAreaElement).value).not.toBe('');
    // U-3, D-5: hvilket brev den erstatter, og at svaret ikke kan godtas her når den er sendt.
    expect(
      skjema.getByText(/Erstatter påberopelsen i brev 1\. Svaret i brev 2 kan da ikke godtas her/)
    ).toBeTruthy();
    expect(skjema.getByText(/Si hva du mener om byggherrens svar i brev 2/)).toBeTruthy();

    await fireEvent.input(teksten(), {
      target: { value: 'Vi fastholder at pålegget er en endring.' },
    });
    await fireEvent.click(screen.getByRole('button', { name: 'Se brevet før sending' }));
    // U-4, D-4 (LV-U56): brevet ordrett, med den låste delen og datoen.
    const vist = await laastTekst(/Påberopelse av irregulær endring/);
    expect(vist.join(' ')).toMatch(/Pålegget ble mottatt 15\. september 2026\./);
    expect(vist.join(' ')).not.toMatch(/erstatter/);
    const kontrollen = screen.getByRole('region', { name: 'Sending' });
    expect(within(kontrollen).getByText('Viser til')).toBeTruthy();

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
    await fireEvent.click(screen.getByRole('button', { name: 'Se brevet før sending' }));
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

  it('BF-02C steg 2C: datoen er låst med veien til korrigeringen, teksten står når TE kommer tilbake, og etter korrigeringen har den nye versjonen den korrigerte datoen (BF-02A U-7, #1617)', async () => {
    const demosak = aapne('BF-02C', 'te-vil-sende-ny-versjon');
    await tilForholdet();
    await fireEvent.click(await screen.findByRole('button', { name: 'Oppdater påberopelse' }));
    expect(screen.getByText(/Datoen kan ikke endres i en ny versjon/)).toBeTruthy();
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
    expect(screen.getByText(/20\. september 2026, din siste opplysning \(brev 3\)/)).toBeTruthy();
    await fireEvent.click(screen.getByRole('button', { name: 'Se brevet før sending' }));
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
    expect(screen.getByRole('textbox', { name: /Beskrivelse av/ })).toBeTruthy();
    expect(screen.queryByText(/Si hva du mener om byggherrens svar/)).toBeNull();
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
