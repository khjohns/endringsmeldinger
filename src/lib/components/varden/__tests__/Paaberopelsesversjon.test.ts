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
import { HANDLINGENE } from '../tekster';

function aapne(forloep: string, punkt: string) {
  let demosak: Demosak | null = null;
  render(Demoforloep, {
    forloep: finnForloep(forloep)!,
    punkt,
    onpunkt: () => {},
    onstart: (d: Demosak) => (demosak = d),
  });
  return () => demosak!;
}

afterEach(() => vi.restoreAllMocks());

async function vis(
  forloep: string,
  punkt: string,
  part: Part,
  spor: 'forhold' | 'vederlag' | 'frist',
  nySakLenke?: string
) {
  const demosak = lagDemosak(finnForloep(forloep)!, punkt, part);
  const kjernesak = lagKjernesak({
    sakId: demosak.sakId,
    prosjektId: 'demo',
    part,
    hent: demosak.hent,
    send: demosak.send,
  });
  await kjernesak.last();
  render(Vardensak, { kjernesak, spor, nySakLenke });
  // På siden for forholdet står handlingen ved brevet og resten under «Andre handlinger» (U-16 i
  // BF-44, #1898), så forventningene gjelder hele arbeidet.
  if (spor === 'forhold') {
    await screen.findByRole('list', { name: 'Brevene i saken, nyeste først' });
    return within(screen.getByRole('main'));
  }
  return within(
    (await screen.findByRole('heading', { name: 'Det du kan gjøre nå' })).closest('section')!
  );
}

const tilForholdet = async () =>
  fireEvent.click(await screen.findByRole('button', { name: /^Irregulær endring/ }));
const teksten = () => screen.getByRole('textbox', { name: 'Begrunnelse' });
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
  it('etter svaret skriver TE i brevet i midten med svaret åpent til høyre, og bekreftelsen viser hva brevet erstatter og viser til (U-1–U-5, D-1, D-3–D-5, D-8)', async () => {
    const demosak = aapne('BF-02C', 'te-vil-sende-ny-versjon');
    await tilForholdet();
    // U-1: primærhandlingen etter svaret (#1649).
    await fireEvent.click(await screen.findByRole('button', { name: 'Oppdater påberopelse' }));

    // Arbeidsraden over utkastet har brevet som skrives, mottakeren, utkaststatusen og
    // «Forhåndsvis brevet». U-6: utkastet ser aldri sendt ut (oppdragsgiver 06.11 og 07.11, PR 1650).
    const skjema = within(screen.getByRole('form'));
    expect(screen.getByRole('heading', { name: 'Brev 3 · Oppdatert påberopelse' })).toBeTruthy();
    expect(screen.getByText('Til byggherren (BH)')).toBeTruthy();
    // Utkastet sier ikke at det bare er synlig for teamet (system.md, «Utkastet sier det selv», #1663).
    expect(screen.getByText('Utkast')).toBeTruthy();
    expect(document.body.textContent).not.toMatch(/synlig for teamet/i);
    expect(skjema.queryByRole('button', { name: 'Forhåndsvis brevet' })).toBeNull();
    // S-3 B: teksten står slik den sist ble sendt, i ett felt, uten hjelpetekst.
    expect((teksten() as HTMLTextAreaElement).value).not.toBe('');
    expect(teksten().getAttribute('aria-describedby')).toBeNull();

    // Til høyre: brevene om forholdet med svaret åpent, og tidslinja.
    expect(screen.getByRole('button', { name: 'Forhåndsvis brevet' })).toBeTruthy();
    const brevene = within(screen.getByRole('region', { name: 'Tidligere brev om forholdet' }));
    const svaret = brevene.getByRole('button', { name: /^Brev 2 · Byggherrens svar/ });
    expect(svaret.getAttribute('aria-current')).toBe('true');
    expect(
      within(brevene.getByRole('region', { name: 'Brev 2 · Byggherrens svar' })).getByRole(
        'article'
      )
    ).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Les svaret/ })).toBeNull();
    expect(screen.queryByRole('heading', { name: /Hovedlinjene/ })).toBeNull();
    expect(screen.getByRole('region', { name: /Tidslinje/ })).toBeTruthy();

    // Brevvalget åpner påberopelsen på samme plass.
    await fireEvent.click(
      brevene.getByRole('button', { name: /^Brev 1 · Totalentreprenørens påberopelse/ })
    );
    expect(
      brevene.getByRole('region', { name: 'Brev 1 · Totalentreprenørens påberopelse' })
    ).toBeTruthy();
    expect(svaret.getAttribute('aria-current')).toBeNull();

    await fireEvent.input(teksten(), {
      target: { value: 'Vi fastholder at pålegget er en endring.' },
    });
    await fireEvent.click(screen.getByRole('button', { name: 'Forhåndsvis brevet' }));
    // U-4, D-4 (LV-U56): brevet ordrett, med den låste delen og datoen.
    const vist = await laastTekst(/Påberopelse av irregulær endring/);
    expect(vist.join(' ')).toMatch(/Pålegget ble mottatt 15\. september 2026\./);
    expect(vist.join(' ')).not.toMatch(/erstatter/);
    // Teksten TE skrev står i avsnittene kjernen lager, slik brevet sendes (LV-U2, #1856).
    expect(
      within(screen.getByRole('article', { name: /Påberopelse av irregulær endring/ })).getByText(
        'Vi fastholder at pålegget er en endring.'
      )
    ).toBeTruthy();
    const kontrollen = within(screen.getByRole('region', { name: 'Sending' }));
    expect(kontrollen.getByRole('heading', { name: /^Kontroller og send/ })).toBeTruthy();
    // U-3, D-5: mottakeren og brevrelasjonene. Datoen står i brevet, og korrigeringen på
    // oversikten, ikke i bekreftelsen (oppdragsgiver 06.11 og 07.11, PR 1650).
    expect(kontrollen.queryByText('Fra')).toBeNull();
    expect(kontrollen.getByText('Mottaker').nextElementSibling?.textContent).toMatch(/\(BH\)$/);
    // Rekkefølgen, ikke hva brevene sier i forhold til hverandre, og uten eier på TEs eget brev
    // (oppdragsgiver 07.11, PR 1650; språkfila, «Brev, ikke versjon»).
    expect(kontrollen.queryByText('Erstatter')).toBeNull();
    expect(kontrollen.getByText('Forrige brev').nextElementSibling?.textContent).toBe(
      'Påberopelsen i brev 1'
    );
    expect(kontrollen.getByText('Viser til').nextElementSibling?.textContent).toBe(
      'Byggherrens svar i brev 2'
    );
    expect(kontrollen.queryByRole('heading', { name: 'Når du sender' })).toBeNull();
    expect(kontrollen.queryByText(/Pålegget mottatt/)).toBeNull();
    expect(kontrollen.queryByRole('button', { name: /Korriger datoen/ })).toBeNull();

    const foer = demosak().journal().length;
    await fireEvent.click(screen.getByRole('checkbox', { name: 'Jeg har kontrollert brevet' }));
    await fireEvent.click(screen.getByRole('button', { name: 'Send til byggherren' }));
    await screen.findByText(/Brevet er sendt til byggherren/);
    const ny = demosak().journal().slice(foer);
    expect(ny).toHaveLength(1);
    // D-1, D-3: en ny kravversjon med samme dato og kategori.
    expect(JSON.stringify(ny[0])).toMatch(/"paalegg_mottatt":"2026-09-15"/);
    expect(JSON.stringify(ny[0])).toMatch(/Vi fastholder at pålegget er en endring\./);
  });

  it('«Forkast utkast» står nederst i utkastet og bekreftes i en dialog, der «Behold utkastet» lar teksten stå (oppdragsgiver 06.11 og 07.11, PR 1650)', async () => {
    // jsdom har ikke den modale dialogen.
    vi.spyOn(HTMLDialogElement.prototype, 'showModal').mockImplementation(function (
      this: HTMLDialogElement
    ) {
      this.setAttribute('open', '');
    });
    vi.spyOn(HTMLDialogElement.prototype, 'close').mockImplementation(function (
      this: HTMLDialogElement
    ) {
      this.removeAttribute('open');
      this.dispatchEvent(new Event('close'));
    });
    aapne('BF-02C', 'te-vil-sende-ny-versjon');
    await tilForholdet();
    await fireEvent.click(await screen.findByRole('button', { name: 'Oppdater påberopelse' }));
    await fireEvent.input(teksten(), { target: { value: 'Utkastet mitt.' } });
    const forkast = within(screen.getByRole('form')).getByRole('button', {
      name: 'Forkast utkast',
    });

    await fireEvent.click(forkast);
    const dialogen = within(screen.getByRole('dialog', { name: 'Forkaste utkastet?' }));
    await fireEvent.click(dialogen.getByRole('button', { name: 'Behold utkastet' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(forkast);
    expect((teksten() as HTMLTextAreaElement).value).toBe('Utkastet mitt.');

    await fireEvent.click(forkast);
    await fireEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Forkast utkast' })
    );
    expect(screen.queryByRole('textbox', { name: 'Begrunnelse' })).toBeNull();
  });

  it('uten begrunnelse står beskjeden ved feltet og fokus flyttes dit, med knappen aktiv (oppdragsgiver 07.11, PR 1650, MM-U32)', async () => {
    aapne('BF-02C', 'te-vil-sende-ny-versjon');
    await tilForholdet();
    await fireEvent.click(await screen.findByRole('button', { name: 'Oppdater påberopelse' }));
    await fireEvent.input(teksten(), { target: { value: '  ' } });
    const knappen = screen.getByRole('button', { name: 'Forhåndsvis brevet' });
    expect(knappen.getAttribute('aria-disabled')).toBeNull();

    await fireEvent.click(knappen);
    expect(screen.queryByRole('checkbox', { name: 'Jeg har kontrollert brevet' })).toBeNull();
    expect(teksten()).toBe(document.activeElement);
    expect(teksten().getAttribute('aria-invalid')).toBe('true');
    expect(teksten()).toHaveAccessibleDescription('Skriv en begrunnelse for å gå videre.');
    // Beskjeden står rett under feltet (oppdragsgiver 07.11, PR 1650).
    expect(teksten().nextElementSibling?.textContent).toBe('Skriv en begrunnelse for å gå videre.');

    await fireEvent.input(teksten(), { target: { value: 'Vi fastholder kravet.' } });
    expect(teksten().getAttribute('aria-invalid')).toBeNull();
  });

  it('#1647: brevet med den nye versjonen viser datoen i brevtråden, selv om den gjentar TEs siste opplysning (MM-U52 punkt 10)', async () => {
    aapne('BF-02C', 'te-vil-sende-ny-versjon');
    await tilForholdet();
    await fireEvent.click(await screen.findByRole('button', { name: 'Oppdater påberopelse' }));
    await fireEvent.click(screen.getByRole('button', { name: 'Forhåndsvis brevet' }));
    await fireEvent.click(
      await screen.findByRole('checkbox', { name: 'Jeg har kontrollert brevet' })
    );
    await fireEvent.click(screen.getByRole('button', { name: 'Send til byggherren' }));
    await screen.findByText(/Brevet er sendt til byggherren/);
    const traaden = within(
      await screen.findByRole('list', { name: 'Brevene i saken, nyeste først' })
    );
    // Tråden står nyest først, så den nye versjonen er den første påberopelsen.
    const nyVersjon = traaden
      .getAllByRole('heading', { name: /^Påberopelse av forholdet/ })
      .at(0)!
      .closest('li')!;
    expect(nyVersjon.textContent).toMatch(/Pålegget mottatt 15\. september 2026/);
  });

  it('BF-02C steg 2C: datoen står ikke i arbeidsflaten; TE korrigerer den fra oversikten, teksten står når TE kommer tilbake, og den nye versjonen har den korrigerte datoen (BF-02A U-7, #1617)', async () => {
    const demosak = aapne('BF-02C', 'te-vil-sende-ny-versjon');
    await tilForholdet();
    await fireEvent.click(await screen.findByRole('button', { name: 'Oppdater påberopelse' }));
    // Arbeidsflaten har bare det TE skriver (oppdragsgiver 06.11, PR 1650).
    const skjema = within(screen.getByRole('form'));
    expect(skjema.queryByText(/15\. september 2026/)).toBeNull();
    expect(skjema.queryByRole('button', { name: /Korriger datoen/ })).toBeNull();
    await fireEvent.input(teksten(), { target: { value: 'Utkastet mitt.' } });
    // TE går tilbake til oversikten og korrigerer datoen ved datoen i brevtråden.
    await fireEvent.click(screen.getByRole('button', { name: 'Tilbake til forholdet' }));
    await fireEvent.click(
      within(await screen.findByRole('list', { name: 'Brevene i saken, nyeste først' })).getByRole(
        'button',
        { name: 'Korriger datoen pålegget ble mottatt' }
      )
    );
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
    await fireEvent.click(screen.getByRole('button', { name: 'Forhåndsvis brevet' }));
    const vist = await laastTekst(/Påberopelse av irregulær endring/);
    // LV-U56: den korrigerte datoen og den tidligere med brevet.
    expect(vist.join(' ')).toMatch(/Pålegget ble mottatt 20\. september 2026\./);
    expect(vist.join(' ')).toMatch(/15\. september 2026 i brev K201-KOE-017-01/);
    const foer = demosak().journal().length;
    await fireEvent.click(screen.getByRole('checkbox', { name: 'Jeg har kontrollert brevet' }));
    await fireEvent.click(screen.getByRole('button', { name: 'Send til byggherren' }));
    await screen.findByText(/Brevet er sendt til byggherren/);
    expect(JSON.stringify(demosak().journal().slice(foer))).toMatch(
      /"paalegg_mottatt":"2026-09-20"/
    );
  });

  it('før svaret heter handlingen også «Oppdater påberopelse» og står under «Andre handlinger», uten primærhandling (U-1, #1649, oppdragsgiver 07.11)', async () => {
    const kortet = await vis('BF-05', 'paaberopelsen-er-sendt', 'TE', 'forhold');
    expect(kortet.queryByRole('button', { name: 'Oppdater påberopelse' })).toBeNull();
    expect(
      kortet.queryAllByRole('button').filter((k) => k.className.includes('primaer'))
    ).toHaveLength(0);
    await fireEvent.click(kortet.getByRole('button', { name: /^Oppdater påberopelse/ }));
    expect(screen.getByRole('textbox', { name: 'Begrunnelse' })).toBeTruthy();
    // Før svaret er påberopelsen det eneste brevet til høyre, og den er åpen.
    expect(
      screen.getByRole('heading', { name: /^Brev \d+ · Oppdatert påberopelse$/ })
    ).toBeTruthy();
    const brevene = within(screen.getByRole('region', { name: 'Tidligere brev om forholdet' }));
    expect(
      brevene.getByRole('button', { name: /^Brev 1 · Totalentreprenørens påberopelse/ })
    ).toBeTruthy();
    expect(brevene.queryByRole('button', { name: /Byggherrens svar/ })).toBeNull();
    expect(screen.getByRole('button', { name: 'Forhåndsvis brevet' })).toBeTruthy();
    expect(screen.queryByText(/Si hva du mener om svaret/)).toBeNull();
  });
});

describe('veien til en ny sak (BF-10 U-2, GR-U22, OV-U57)', () => {
  it('TE finner «Opprett ny sak» under kortet med handlingene, og den står verken i arbeidsflaten eller bekreftelsen (oppdragsgiver 06.11, PR 1650)', async () => {
    await vis('BF-04', 'forholdet-er-avslaatt', 'TE', 'forhold', '/demo/ny');
    const handlingene = screen.getByRole('region', { name: 'Andre handlinger' });
    const veien = handlingene.querySelector('.annen') as HTMLElement;
    expect(veien.textContent).toMatch(/^Annen hjemmel eller endringsordre\?/);
    const lenken = within(veien).getByRole('link', { name: /^Opprett ny sak/ });
    expect(lenken.getAttribute('href')).toBe('/demo/ny');
    expect(lenken.getAttribute('target')).toBe('_blank');
    expect(lenken.textContent).toMatch(/åpnes i ny fane/);
    expect(
      within(
        screen.getByRole('region', {
          name: 'Manglende medvirkning eller leveranser fra byggherren',
        })
      ).queryByRole('link', { name: /ny sak/i })
    ).toBeNull();

    await fireEvent.click(screen.getByRole('button', { name: 'Oppdater påberopelse' }));
    expect(screen.queryByRole('link', { name: /ny sak/i })).toBeNull();
    await fireEvent.click(screen.getByRole('button', { name: 'Forhåndsvis brevet' }));
    await screen.findByRole('checkbox', { name: 'Jeg har kontrollert brevet' });
    expect(screen.queryByRole('link', { name: /ny sak/i })).toBeNull();
  });

  it('innsigelsen om at svaret kom for sent er ikke en handling på oversikten, selv om kjernen tilbyr den (oppdragsgiver 06.11, PR 1650)', async () => {
    const kortet = await vis('BF-04', 'forholdet-er-avslaatt', 'TE', 'forhold');
    expect(
      kortet.queryAllByRole('button').filter((b) => /kom for sent/.test(b.textContent ?? ''))
    ).toEqual([]);
    expect(kortet.getByRole('button', { name: /^Godta avslaget/ })).toBeTruthy();
  });

  it('veien står bare i forholdssporet, ikke i vederlagssporet, selv om TE kan sende en ny versjon av påberopelsen (U-2)', async () => {
    await vis('BF-04', 'te-har-mottatt-svaret', 'TE', 'vederlag', '/demo/ny');
    expect(screen.queryByRole('link', { name: /ny sak/i })).toBeNull();
  });

  it('BH ser ikke veien, fordi BH ikke kan sende en ny versjon av påberopelsen', async () => {
    await vis('BF-04', 'forholdet-er-avslaatt', 'BH', 'forhold', '/demo/ny');
    expect(screen.queryByRole('link', { name: /ny sak/i })).toBeNull();
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

  it('i fristsporet er kravet i «Andre handlinger» ikke bygget, fordi bare den nye versjonen av påberopelsen er bygget i Varden, og et klikk sier det (BF-10, BF-02B, #1636)', async () => {
    const kortet = await vis('BF-04', 'forholdet-er-avslaatt', 'TE', 'frist');
    const raden = kortet.getByText(
      (_, e) => e?.getAttribute('data-handling') === 'krav:frist'
    ) as HTMLElement;
    expect(within(raden).queryByRole('link')).toBeNull();
    await fireEvent.click(within(raden).getByRole('button'));
    expect(within(raden).getByRole('status')).toHaveTextContent(HANDLINGENE.ikkeBygget);
  });

  it('i demoruta er «Revider krav» primær etter svaret og åpner kravskjemaet for vederlaget (#1636, BF-14)', async () => {
    const kortet = await vis('BF-04', 'te-har-mottatt-svaret', 'TE', 'vederlag');
    await fireEvent.click(kortet.getByRole('button', { name: 'Revider krav' }));
    expect(
      await screen.findByRole('heading', { name: 'Vederlagsjustering', level: 3 })
    ).toBeTruthy();
    expect(screen.queryByText(HANDLINGENE.ikkeBygget)).toBeNull();
  });
});
