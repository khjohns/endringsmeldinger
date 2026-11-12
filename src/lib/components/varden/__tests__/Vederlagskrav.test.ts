/**
 * TEs krav om vederlagsjustering i Varden (BF-14, økt 3 i #1663), med brukerforløpet BF-01 og
 * kjernen i minnet. Forventningene viser til D- og U-punktene i bestillingen
 * `docs/domenetabell/brukerforlop/BF-14.md` og til vedtakene der. Brevteksten er kjernens; her
 * prøves at skjemaet sender det TE fyller ut, og at det som mangler, står ved feltet.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/svelte';
import { finnForloep, type Demosak } from '$lib/kjernesak/demosak';
import Demoforloep from '$lib/components/brukerforlop/Demoforloep.svelte';
import type { Journalrad } from '$kjerne/typer';

beforeEach(() => vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Ingen nettverk.'))));
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

async function aapneSomTe(punkt: string) {
  let demosak: Demosak | null = null;
  render(Demoforloep, {
    forloep: finnForloep('BF-01')!,
    punkt,
    onpunkt: () => {},
    onstart: (d: Demosak) => (demosak = d),
  });
  const panel = within(screen.getByRole('complementary', { name: 'Demo av brukerforløpet' }));
  await fireEvent.click(panel.getByRole('radio', { name: 'TE' }));
  await fireEvent.click(await screen.findByRole('button', { name: 'Vederlagsjustering' }));
  return () => demosak!;
}

const knapp = (name: string | RegExp) => screen.getByRole('button', { name });
const felt = (name: string) => screen.getByLabelText(name, { exact: true }) as HTMLInputElement;
const skriv = (name: string, value: string) => fireEvent.input(felt(name), { target: { value } });

/** Det siste kravet i journalen, slik kjernen lagret det. */
const sistSendt = (j: Journalrad[]) =>
  (j.findLast((r) => 'krav' in r.data)!.data as { krav: Record<string, unknown>[] }).krav[0];

async function sendBrevet() {
  await fireEvent.click(knapp('Se brevet før sending'));
  await fireEvent.click(
    await screen.findByRole('checkbox', { name: 'Jeg har kontrollert brevet' })
  );
  await fireEvent.click(knapp('Send til byggherren'));
  await screen.findByText('Brevet er sendt til byggherren.');
}

describe('TE krever vederlag med kravposter i Varden (BF-14)', () => {
  it('det første kravet begynner med én åpen kravpost, og det som mangler, står øverst og ved feltet (MM-U32, D-1)', async () => {
    await aapneSomTe('forholdet-er-godkjent');
    await fireEvent.click(
      within(
        await screen.findByText((_, e) => e?.getAttribute('data-handling') === 'krav:vederlag')
      ).getByRole('button')
    );
    expect(await screen.findByRole('heading', { name: /^P1 · Ny kravpost/ })).toBeTruthy();
    await fireEvent.click(knapp('Se brevet før sending'));
    const mangler = within(
      screen.getByRole('group', { name: 'Dette mangler før brevet kan lages:' })
    );
    expect(mangler.getByRole('link', { name: 'P1: Beskriv posten.' })).toBeTruthy();
    expect(mangler.getByRole('link', { name: 'P1: Velg oppgjørsformen.' })).toBeTruthy();
    expect(screen.queryByRole('checkbox', { name: 'Jeg har kontrollert brevet' })).toBeNull();
  });

  it('TE sender fast sum og regningsarbeid med PNS, og kravet bærer oppgjørsformen, beløpet og overslaget per post (D-1, D-3, D-5, KA-U61, KA-U66)', async () => {
    const demosak = await aapneSomTe('forholdet-er-godkjent');
    await fireEvent.click(
      within(
        await screen.findByText((_, e) => e?.getAttribute('data-handling') === 'krav:vederlag')
      ).getByRole('button')
    );
    await skriv('Beskrivelse av posten', 'Omlegging av rør');
    await fireEvent.click(screen.getByRole('radio', { name: /^Fast sum/ }));
    await skriv('Beløpet du krever', '210 000');
    await skriv('PNS (valgfritt)', '31');
    await fireEvent.click(knapp('Ferdig'));
    await fireEvent.click(knapp('Legg til kravpost'));
    await skriv('Beskrivelse av posten', 'Ekstra graving');
    await fireEvent.click(screen.getByRole('radio', { name: /^Regningsarbeid/ }));
    await skriv('Kostnadsoverslag (valgfritt)', '150000');
    await fireEvent.click(knapp('Ferdig'));

    // U-5: panelet skiller de faste beløpene fra overslaget, og sier hva som er tilbud.
    expect(
      screen.getByText(
        'Kravet for P1 er et tilbud etter punkt 34.2.1. Byggherren kan akseptere det.'
      )
    ).toBeTruthy();
    // VS-U48 og VS-U49: kravet regnes også som varselet etter § 34.4 for P2, som ikke har stått i
    // saken før. Ordene står i språkfila, «Varselet i kravet».
    const raden = screen.getByText('Gjelder P2').closest('li')!;
    expect(within(raden).getByText('Gis i dette brevet.')).toBeTruthy();

    await sendBrevet();
    const innhold = sistSendt(demosak().journal());
    expect(innhold.kravposter).toEqual([
      expect.objectContaining({
        betegnelse: 'P1',
        oppgjoersform: 'tilbud',
        beloep: 210000,
        pns: '31',
      }),
      expect.objectContaining({
        betegnelse: 'P2',
        oppgjoersform: 'regningsarbeid',
        kostnadsoverslag: 150000,
      }),
    ]);
    expect(innhold.kravposter).toEqual([
      expect.not.objectContaining({ varsel: expect.anything() }),
      expect.not.objectContaining({ varsel: expect.anything() }),
    ]);
  });

  it('den nye versjonen har postene fra forrige krav, og et trekk står i kravet og kan angres før sending (D-4, D-18, KA-U56, KA-U75)', async () => {
    const demosak = await aapneSomTe('te-har-mottatt-svaret');
    await fireEvent.click(await screen.findByRole('button', { name: 'Revider krav' }));
    // KA-U56: P1 fra brev 3 står uten at TE gjør noe.
    expect(await screen.findByRole('button', { name: 'Endre P1' })).toBeTruthy();
    await fireEvent.click(knapp('Endre P1'));
    await fireEvent.click(knapp('Trekk P1'));
    expect(screen.getByText(/Kravet i P1 trekkes i dette brevet/)).toBeTruthy();
    // F-6: trekket angres, og posten står igjen.
    await fireEvent.click(knapp('Angre trekket av P1'));
    expect(screen.queryByText(/Kravet i P1 trekkes/)).toBeNull();

    await fireEvent.click(knapp('Endre P1'));
    await fireEvent.click(knapp('Trekk P1'));
    await fireEvent.click(knapp('Legg til kravpost'));
    await skriv('Beskrivelse av posten', 'Tetting av gjennomføringer');
    await fireEvent.click(screen.getByRole('radio', { name: /^Fast sum/ }));
    await skriv('Beløpet du krever', '45000');
    await fireEvent.click(knapp('Ferdig'));
    await sendBrevet();
    const innhold = sistSendt(demosak().journal());
    expect((innhold.trekker as string[]).length).toBe(1);
    expect(innhold.kravposter).toEqual([expect.objectContaining({ betegnelse: 'P2' })]);

    // KA-U75: P1 kan tas med igjen i neste brev, med samme betegnelse.
    await fireEvent.click(
      within(
        await screen.findByText((_, e) => e?.getAttribute('data-handling') === 'krav:vederlag')
      ).getByRole('button')
    );
    await fireEvent.click(await screen.findByRole('button', { name: /^Ta med igjen P1/ }));
    expect(screen.getByRole('heading', { name: /^P1 · / })).toBeTruthy();
  });

  it('for en ny post med justerte enhetspriser kan TE oppgi at varselet er gitt i et dokument, og dokumentet legges ved kravet (VS-U50, VS-U51, VS-U53, D-19)', async () => {
    const demosak = await aapneSomTe('te-har-mottatt-svaret');
    await fireEvent.click(await screen.findByRole('button', { name: 'Revider krav' }));
    await fireEvent.click(knapp('Legg til kravpost'));
    await skriv('Beskrivelse av posten', 'Tetting av gjennomføringer');
    await fireEvent.click(screen.getByRole('radio', { name: /^Enhetspriser/ }));
    await fireEvent.click(screen.getByRole('radio', { name: /^Justerte enhetspriser/ }));
    await fireEvent.click(knapp('Ferdig'));
    await fireEvent.click(knapp('Endre varselet for P2'));
    await fireEvent.click(
      screen.getByRole('radio', { name: 'I et dokument sendt utenfor løsningen' })
    );

    // D-19: kravet sendes ikke uten typen, datoen og dokumentet.
    await fireEvent.click(knapp('Se brevet før sending'));
    const mangler = within(
      screen.getByRole('group', { name: 'Dette mangler før brevet kan lages:' })
    );
    expect(
      mangler.getByRole('link', { name: 'P2: Oppgi datoen dokumentet ble sendt.' })
    ).toBeTruthy();
    expect(mangler.getByRole('link', { name: 'P2: Legg ved dokumentet.' })).toBeTruthy();

    await fireEvent.click(screen.getByRole('radio', { name: 'E-post' }));
    await skriv('Datoen det ble sendt', '2026-09-28');
    const fil = new File(['%PDF-1.4'], 'varsel.pdf', { type: 'application/pdf' });
    await fireEvent.change(document.querySelector('input[type=file]')!, {
      target: { files: [fil] },
    });
    await screen.findByText('varsel.pdf');
    await fireEvent.click(knapp('Se brevet før sending'));
    const brevet = await screen.findByRole('article', { name: /Krav om vederlagsjustering/ });
    expect(brevet.textContent).toMatch(
      /Totalentreprenøren opplyser at varselet om justering av enhetsprisene etter NS 8407 punkt 34\.3\.3 ble gitt i .* som er vedlagt\./
    );
    await fireEvent.click(
      await screen.findByRole('checkbox', { name: 'Jeg har kontrollert brevet' })
    );
    await fireEvent.click(knapp('Send til byggherren'));
    await screen.findByText('Brevet er sendt til byggherren.');
    const [, p2] = sistSendt(demosak().journal()).kravposter as { varsel?: string }[];
    expect(typeof p2.varsel).toBe('string');
  });

  it('panelet «Punktene» markerer punktet for avsnittet du står i, også når et indre element ruller og i bunnen, og hver kravpost er en lenke til kravposten (U-15 i BF-14, #1827)', async () => {
    await aapneSomTe('forholdet-er-godkjent');
    await fireEvent.click(
      within(
        await screen.findByText((_, e) => e?.getAttribute('data-handling') === 'krav:vederlag')
      ).getByRole('button')
    );
    const panelet = within(screen.getByRole('heading', { name: 'Punktene' }).closest('section')!);
    const lenke = (navn: string) => panelet.getByRole('link', { name: navn });
    const avsnitt = (navn: string) => document.querySelector(lenke(navn).getAttribute('href')!)!;
    const merket = () =>
      panelet
        .getAllByRole('link')
        .filter((a) => a.getAttribute('aria-current') === 'location')
        .map((a) => a.textContent);
    // Avsnittene er under linja 30 % ned i vinduet, bortsett fra dem som er rullet forbi.
    const toppen = (forbi: string[]) => {
      for (const navn of ['Vederlagsjustering', 'Varslene', 'Forbehold'])
        vi.spyOn(avsnitt(navn), 'getBoundingClientRect').mockReturnValue({
          top: forbi.includes(navn) ? 0 : window.innerHeight,
        } as DOMRect);
    };
    // Saken ruller i et element inne i skallet, ikke i vinduet (`.project-shell`).
    const rulleflate = avsnitt('Vederlagsjustering').parentElement!;
    const rull = async () => {
      await fireEvent.scroll(rulleflate);
      await new Promise((ferdig) => requestAnimationFrame(ferdig));
    };
    toppen([]);
    await rull();
    expect(merket()).toEqual(['Vederlagsjustering']);
    toppen(['Vederlagsjustering', 'Varslene']);
    await rull();
    expect(merket()).toEqual(['Varslene']);
    // En annen flate i bunnen, som brevet ved siden av, flytter ikke markeringen.
    const annen = document.createElement('div');
    document.body.append(annen);
    for (const [felt, verdi] of [
      ['scrollTop', 600],
      ['clientHeight', 400],
      ['scrollHeight', 1000],
    ] as const)
      Object.defineProperty(annen, felt, { configurable: true, value: verdi });
    await fireEvent.scroll(annen);
    await new Promise((ferdig) => requestAnimationFrame(ferdig));
    expect(merket()).toEqual(['Varslene']);
    annen.remove();
    // Et klikk i panelet som ikke ruller, markerer punktet det fører til.
    window.location.hash = lenke('Forbehold').getAttribute('href')!;
    await fireEvent(window, new HashChangeEvent('hashchange'));
    expect(merket()).toEqual(['Forbehold']);
    window.location.hash = '';
    toppen(['Vederlagsjustering', 'Varslene']);
    await rull();
    expect(merket()).toEqual(['Varslene']);
    // I bunnen er det siste punktet markert, også når det ikke når linja.
    for (const [felt, verdi] of [
      ['scrollTop', 600],
      ['clientHeight', 400],
      ['scrollHeight', 1000],
    ] as const)
      Object.defineProperty(rulleflate, felt, { configurable: true, value: verdi });
    await rull();
    expect(merket()).toEqual(['Forbehold']);
    const p1 = panelet.getByRole('link', { name: /^P1/ });
    expect(document.querySelector(p1.getAttribute('href')!)?.classList.contains('post')).toBe(true);
  });

  it('den særskilte vederlagsjusteringen står åpen når den legges til, og som en leselinje med «Endre» etter «Ferdig» (system.md «Én leselinje til du åpner», #1827 punkt 2)', async () => {
    const demosak = await aapneSomTe('forholdet-er-godkjent');
    await fireEvent.click(
      within(
        await screen.findByText((_, e) => e?.getAttribute('data-handling') === 'krav:vederlag')
      ).getByRole('button')
    );
    await skriv('Beskrivelse av posten', 'Omlegging av rør');
    await fireEvent.click(screen.getByRole('radio', { name: /^Fast sum/ }));
    await skriv('Beløpet du krever', '210 000');
    await fireEvent.click(knapp('Ferdig'));

    await fireEvent.click(knapp('Legg til særskilt vederlagsjustering'));
    const seksjonen = within(screen.getByRole('region', { name: 'Særskilt vederlagsjustering' }));
    expect(document.activeElement).toBe(seksjonen.getByLabelText('Beløpet du krever'));
    await fireEvent.click(seksjonen.getByRole('button', { name: 'Ferdig' }));
    expect(seksjonen.queryByLabelText('Beløpet du krever')).toBeNull();
    expect(document.activeElement).toBe(knapp('Endre særskilt vederlagsjustering'));

    // MM-U32: et tomt beløp står i oppsummeringen, og lenken åpner feltet.
    await fireEvent.click(knapp('Se brevet før sending'));
    const mangler = within(
      screen.getByRole('group', { name: 'Dette mangler før brevet kan lages:' })
    );
    await fireEvent.click(mangler.getByRole('link', { name: /^Særskilt vederlagsjustering/ }));
    expect(document.activeElement).toBe(seksjonen.getByLabelText('Beløpet du krever'));
    await fireEvent.input(seksjonen.getByLabelText('Beløpet du krever'), {
      target: { value: '40000' },
    });
    await fireEvent.click(seksjonen.getByRole('button', { name: 'Ferdig' }));
    expect(seksjonen.getByText(/^40\s000/)).toBeTruthy();

    await sendBrevet();
    expect(sistSendt(demosak().journal()).saerskilt).toEqual({
      produktivitet: { beloep: 40000 },
    });
  });
});
