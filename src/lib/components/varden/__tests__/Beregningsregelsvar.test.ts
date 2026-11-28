/**
 * Byggherrens svar på kravposter etter en beregningsregel i Varden (#1756), med kjernen i minnet.
 * Kildene er BF-14 (D-7, D-14, D-15) og vedtakene der: KA-U66 for at posten ikke har et krevd
 * beløp, KA-U69 og KA-U71 for kravet om tilbud, KA-U64 og VS-U63 for varselet etter punkt 34.4,
 * KA-U68, VS-U4 og VS-U56 for varselet etter punkt 34.3.3 og justeringen. Ordene i skjemaet er
 * design etter prototype v3 og v4 (`#svar`).
 */

import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/svelte';
import { lagKjernesak } from '#lib/kjernesak/kontekst.svelte.ts';
import { MERKING, SAK, linje, opprettet, skrevet } from '#lib/kjernesak/__tests__/provejournal.ts';
import type { TilBrevkontrollen } from '#lib/components/varden/Brevkontroll.svelte';
import Vederlagssvar from '#lib/components/varden/Vederlagssvar.svelte';

// Svikt, så varselet etter punkt 34.1.2 er et spørsmål i svaret (OV-U15).
const grunnforhold = skrevet([opprettet], 'TE', {
  type: 'krav',
  spor: 'forhold',
  innhold: {
    hovedkategori: 'svikt',
    underkategori: 'grunnforhold',
    klar_over_forholdet: '2026-10-01',
  },
  utdypning: 'Leire der rapporten sa fjell.',
});

const journal = skrevet(grunnforhold, 'TE', {
  type: 'krav',
  spor: 'vederlag',
  innhold: {
    kravposter: [
      {
        beskrivelse: 'Pumping',
        oppgjoersform: 'regningsarbeid',
        kostnadsoverslag: 150000,
        pns: '21',
      },
      { beskrivelse: 'Spunt', oppgjoersform: 'enhetspriser', justert: true },
    ],
  },
  utdypning: 'Pumpingen og spunten gjøres opp etter en beregningsregel.',
});

async function svarskjemaet() {
  const kjernesak = lagKjernesak({
    sakId: SAK,
    prosjektId: 'p-1',
    part: 'BH',
    hent: async () => ({
      versjon: journal.at(-1)!.versjon,
      part: 'BH',
      visning: null as never,
      journal: journal.map(linje),
      leveringsoppdrag: [],
      catenda_lenke: null,
      sakskode: null,
      kontraktsforkortelse: null,
      kan_foreslaa_sakskode: false,
      merking: MERKING,
    }),
  });
  await kjernesak.last();
  const sendt: TilBrevkontrollen[] = [];
  render(Vederlagssvar, {
    kjernesak,
    u: kjernesak.utledning!,
    onbrevkontroll: (k: TilBrevkontrollen) => sendt.push(k),
    onforkast: () => {},
  });
  return sendt;
}

const radio = (navn: string) => screen.getByRole('radio', { name: navn });
// Varselet etter punkt 34.1.2 og varselet for kravposten har de samme valgene (#2443).
const hovedvarselet = (navn: string) =>
  within(
    document.querySelector<HTMLElement>('fieldset[id$="-itide"]:not([id$="saerskilt-itide"])')!
  ).getByRole('radio', { name: navn });
const kravpostvarselet = (navn: string) =>
  screen
    .queryAllByRole('group', { name: /^Varselet om justering av enhetsprisene/ })
    .flatMap((g) => within(g).queryAllByRole('radio', { name: navn }))[0];
const aapne = (post: string) =>
  fireEvent.click(screen.getByRole('button', { name: `Svar på ${post}` }));
const ferdig = () => fireEvent.click(screen.getByRole('button', { name: 'Ferdig' }));
const seBrevet = () =>
  fireEvent.click(screen.getByRole('button', { name: 'Se brevet før sending' }));
const forutsetningene = (gruppe: string) => {
  const id = screen.getByRole('group', { name: gruppe }).getAttribute('aria-describedby');
  return id ? document.getElementById(id.split(' ')[0]!)?.textContent?.replace(/\s+/g, ' ') : null;
};

afterEach(cleanup);

describe('svaret på en kravpost etter en beregningsregel (#1756)', () => {
  it('skjemaet svarer på kravet, og kravposten har regelen og overslaget, ingen spørsmål om beløpet og ikke fast sum (KA-U66, OV-U115 punkt 1 og 5)', async () => {
    await svarskjemaet();
    expect(screen.queryByText(/følger en beregningsregel/)).toBeNull();
    expect(
      screen.getByText(
        'Totalentreprenøren krever regningsarbeid, kostnadsoverslag 150 000 kr · PNS 21'
      )
    ).toBeInTheDocument();
    const formen = screen.getByRole('group', { name: 'Oppgjørsformen' });
    expect(
      within(formen)
        .getAllByRole('radio')
        .map((r) => r.closest('label')!.textContent?.trim())
    ).toEqual(['Godtar regningsarbeid (punkt\u00a034.4)', 'Mener enhetspriser (punkt\u00a034.3)']);
    expect(screen.queryByRole('group', { name: 'Hvor mye av beløpet godkjenner du?' })).toBeNull();
  });

  it('kravet om tilbud står bare når BH ikke godkjenner regelen, og alene er det svaret på oppgjørsformen (KA-U71, svar 3 A 10.11)', async () => {
    const sendt = await svarskjemaet();
    const tilbud = () =>
      screen.queryByRole('checkbox', {
        name: 'Krev at totalentreprenøren gir et spesifisert tilbud for P1',
      });
    expect(tilbud()).toBeInTheDocument();
    await fireEvent.click(radio('Godtar regningsarbeid (punkt\u00a034.4)'));
    expect(tilbud()).toBeNull();
    await fireEvent.click(radio('Mener enhetspriser (punkt\u00a034.3)'));
    await fireEvent.click(tilbud()!);
    await ferdig();
    expect(
      screen.getByRole('button', { name: 'Endre svaret på P1' }).closest('li')!.textContent
    ).toContain('Mener enhetspriser (punkt\u00a034.3), krever spesifisert tilbud');
    await aapne('P2');
    await fireEvent.click(radio('Godtar enhetspriser (punkt\u00a034.3)'));
    expect(kravpostvarselet('Kom i tide')!.closest('.kort')).not.toHaveClass('stablet');
    expect(radio('Godtar justeringen').closest('.kort')).not.toHaveClass('stablet');
    await fireEvent.click(kravpostvarselet('Kom i tide')!);
    await fireEvent.click(radio('Godtar justeringen'));
    await fireEvent.click(hovedvarselet('Kom i tide'));
    await seBrevet();
    expect(sendt).toHaveLength(1);
    expect(sendt[0]!.avsnitt.map((a) => a.laast).join(' ')).toContain(
      'Byggherren krever at totalentreprenøren gir et spesifisert tilbud'
    );
  });

  it('spørsmålet om spesifisert tilbud er merket «Valgfri», som de andre valgfrie spørsmålene (KA-U69, KA-U71, #2511)', async () => {
    await svarskjemaet();
    const gruppen = screen.getByRole('group', {
      name: 'Spesifisert tilbud (punkt\u00a034.2.1), Valgfri',
    });
    expect(
      within(gruppen).getByRole('checkbox', {
        name: 'Krev at totalentreprenøren gir et spesifisert tilbud for P1',
      })
    ).not.toBeChecked();
  });

  it('punkt 34.4 er en setning, og lenken gjør gjeldende at varselet ikke ble gitt eller kom for sent (VS-U63)', async () => {
    const sendt = await svarskjemaet();
    await fireEvent.click(radio('Godtar regningsarbeid (punkt\u00a034.4)'));
    expect(screen.getByText('Ingen innsigelse.')).toBeInTheDocument();
    expect(kravpostvarselet('Kom i tide')).toBeUndefined();
    await fireEvent.click(
      screen.getByRole('button', { name: 'Varselet ble ikke gitt eller kom for sent' })
    );
    expect(
      screen.getByText('Du gjør gjeldende at varselet ikke ble gitt eller kom for sent.')
    ).toBeInTheDocument();
    await ferdig();
    await aapne('P2');
    await fireEvent.click(radio('Mener regningsarbeid (punkt\u00a034.4)'));
    await fireEvent.click(hovedvarselet('Kom i tide'));
    await seBrevet();
    // LV-U34: «NS 8407» står bare første gang i brevet.
    expect(sendt[0]!.avsnitt.map((a) => a.laast).join(' ')).toContain(
      'Byggherren gjør gjeldende at varselet om regningsarbeid etter punkt\u00a034.4 for P1 ikke ble gitt eller kom for sent.'
    );
  });

  it('mener BH enhetspriser for regningsarbeidet, kan BH likevel gjøre gjeldende at varselet etter punkt 34.4 ikke ble gitt eller kom for sent (oppdragsgiver 23.11 i #2171)', async () => {
    const sendt = await svarskjemaet();
    await fireEvent.click(radio('Mener enhetspriser (punkt\u00a034.3)'));
    await fireEvent.click(
      screen.getByRole('button', { name: 'Varselet ble ikke gitt eller kom for sent' })
    );
    await ferdig();
    await aapne('P2');
    await fireEvent.click(radio('Mener regningsarbeid (punkt\u00a034.4)'));
    await fireEvent.click(hovedvarselet('Kom i tide'));
    await seBrevet();
    expect(sendt[0]!.avsnitt.map((a) => a.laast).join(' ')).toContain(
      'Byggherren gjør gjeldende at varselet om regningsarbeid etter punkt\u00a034.4 for P1 ikke ble gitt eller kom for sent.'
    );
  });

  it('godkjenner BH justerte enhetspriser, må justeringen besvares, mens svaret på varselet er valgfritt (arbeidsvalg A i #2025)', async () => {
    const sendt = await svarskjemaet();
    await fireEvent.click(radio('Godtar regningsarbeid (punkt\u00a034.4)'));
    await ferdig();
    await aapne('P2');
    await fireEvent.click(radio('Godtar enhetspriser (punkt\u00a034.3)'));
    await fireEvent.click(hovedvarselet('Kom i tide'));
    await seBrevet();
    expect(sendt).toHaveLength(0);
    const mangler = screen.getByRole('group', { name: 'Dette mangler før brevet kan lages:' });
    expect(
      within(mangler)
        .getAllByRole('link')
        .map((a) => a.textContent)
    ).toEqual(['P2: Velg om du godtar justeringen av enhetsprisene.']);
    expect(
      screen.getByRole('group', {
        name: 'Varselet om justering av enhetsprisene (punkt\u00a034.3.3), Valgfri',
      })
    ).toBeTruthy();
  });

  it('mener BH en annen regel, er varselet etter punkt 34.3.3 og justeringen valgfrie og står subsidiært, med lenke til standpunktet (VS-U56, VS-U4)', async () => {
    await svarskjemaet();
    await aapne('P2');
    await fireEvent.click(radio('Mener regningsarbeid (punkt\u00a034.4)'));
    const varselet = 'Varselet om justering av enhetsprisene (punkt\u00a034.3.3), Valgfri';
    const justeringen = 'Justeringen av enhetsprisene (punkt\u00a034.3.2), Valgfri';
    expect(forutsetningene(varselet)).toBe(
      'Gjelder hvis standpunktet ditt til oppgjørsformen ikke fører frem'
    );
    expect(
      within(
        screen.getByRole('group', { name: varselet }).previousElementSibling as HTMLElement
      ).getByRole('link', {
        name: 'standpunktet ditt til oppgjørsformen',
      })
    ).toHaveAttribute('href', expect.stringMatching(/-form-P2$/));
    await fireEvent.click(kravpostvarselet('Kom for sent')!);
    const liste = document.getElementById(
      screen.getByRole('group', { name: justeringen }).getAttribute('aria-describedby')!
    )!;
    expect([...liste.querySelectorAll('li')].map((li) => li.textContent?.trim())).toEqual([
      'standpunktet ditt til oppgjørsformen ikke fører frem',
      'innsigelsen om at varselet etter punkt\u00a034.3.3 kom for sent ikke fører frem',
    ]);
  });

  it('et valgfritt svar på varselet etter punkt 34.3.3 kan fjernes med «Fjern svaret», og fokus går til valget som var gjort (oppdragsgiver 17.11 i #2137, U-19 i BF-14)', async () => {
    const sendt = await svarskjemaet();
    await fireEvent.click(radio('Godtar regningsarbeid (punkt\u00a034.4)'));
    await ferdig();
    await aapne('P2');
    await fireEvent.click(radio('Mener regningsarbeid (punkt\u00a034.4)'));
    const gruppe = screen.getByRole('group', {
      name: 'Varselet om justering av enhetsprisene (punkt\u00a034.3.3), Valgfri',
    });
    const fjern = () => within(gruppe).queryByRole('button', { name: /^Fjern svaret/ });
    expect(fjern()).toBeNull();
    // Kontrollsak: spørsmålet om oppgjørsformen er ikke valgfritt og har ingen knapp.
    expect(
      within(radio('Mener regningsarbeid (punkt\u00a034.4)').closest('fieldset')!).queryByRole(
        'button',
        { name: /^Fjern svaret/ }
      )
    ).toBeNull();
    await fireEvent.click(within(gruppe).getByRole('radio', { name: 'Kom for sent' }));
    expect(fjern()).toHaveAccessibleName(
      'Fjern svaret på «Varselet om justering av enhetsprisene (punkt\u00a034.3.3)»'
    );
    await fireEvent.click(fjern()!);
    expect(
      within(gruppe)
        .getAllByRole('radio')
        .filter((r) => (r as HTMLInputElement).checked)
    ).toEqual([]);
    expect(fjern()).toBeNull();
    await vi.waitFor(() =>
      expect(within(gruppe).getByRole('radio', { name: 'Kom for sent' })).toHaveFocus()
    );
    // Brevet har ikke noe standpunkt til varselet etter punkt 34.3.3.
    await fireEvent.click(hovedvarselet('Kom i tide'));
    await seBrevet();
    expect(sendt).toHaveLength(1);
    expect(sendt[0]!.avsnitt.map((a) => a.laast).join(' ')).not.toMatch(
      /varselet om justering av enhetsprisene/
    );
  });
});
