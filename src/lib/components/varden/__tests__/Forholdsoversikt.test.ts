/**
 * Siden for forholdet (#1449, kriteriene 1–4). Sakene kjøres gjennom kjernen i minnet med
 * testklienten, så utledningen er kjernens. Kildene er OV-U76–OV-U78 for overskriftene og
 * tittelen, GR-U31 for brevnavnet, MM-U30 for «Svar ikke registrert», OV-U85 for datoen på
 * registrert korrespondanse, OV-U81 for infotipset og GR-U30 for trekket.
 */

import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/svelte';
import { minnebane } from '$kjerne/tester/bane';
import { kjoer, type Forloep } from '$kjerne/tester/kjoerer';
import type { Handling } from '$kjerne/tester/klient';
import Forholdsoversikt from '$lib/components/varden/Forholdsoversikt.svelte';
import Tidslinje from '$lib/components/varden/Tidslinje.svelte';
import { brevene } from '$lib/components/varden/lesing';

afterEach(cleanup);

const PAABEROPELSE: Handling = {
  handling: 'krav',
  spor: 'forhold',
  hovedkategori: 'endring',
  underkategori: 'irregulaer_endring',
  navn: 'K-g1',
  utdypning: 'Pålegg om tegl på østfasaden.',
};
const REGISTRERT: Handling = {
  handling: 'registrert_brev',
  part: 'BH',
  navn: 'D-r1',
  sendt: '2026-09-20',
  beskrivelse: 'Foreløpig tilbakemelding om pålegget',
  sporene: ['forhold'],
};
const VEDERLAG: Handling = { handling: 'krav', spor: 'vederlag', belop: 420000, navn: 'K-v1' };
const AVSLAG: Handling = {
  handling: 'brev',
  navn: 'D2',
  svar: [
    {
      spor: 'forhold',
      navn: 'S-g1',
      resultat: 'avslaatt',
      varslet_i_tide: true,
      utdypning: 'Ingen endring.',
    },
  ],
};

async function utledning(steg: Handling[]) {
  const forloep: Forloep = { id: 'forholdssiden', rader: [], start: null, steg, kontroller: [] };
  const k = await kjoer(forloep, minnebane({ sakstittel: 'Fasaden' }));
  return k.utledning();
}

async function vis(steg: Handling[], ekstra: Record<string, unknown> = {}) {
  const u = await utledning(steg);
  const lest: string[] = [];
  const valgt: string[] = [];
  render(Forholdsoversikt, {
    u,
    onles: (id: string) => lest.push(id),
    onspor: (s: string) => valgt.push(s),
    ...ekstra,
  });
  return { u, lest, valgt };
}

const traad = () => within(screen.getByRole('list', { name: 'Brevene om forholdet' }));

describe('Siden for forholdet', () => {
  it('gruppen står over tittelen, og tittelen er forholdet selv (OV-U77, OV-U78)', async () => {
    await vis([PAABEROPELSE]);
    const tittel = screen.getByRole('heading', { level: 2, name: 'Irregulær endring' });
    expect(tittel.previousElementSibling?.textContent).toBe('Endringer, jf. punkt 31 og 32');
  });

  it('ingen tekst brukeren ser, sier «grunnlag» (kriterium 1, OV-U76)', async () => {
    const { container } = render(Forholdsoversikt, {
      u: await utledning([PAABEROPELSE, REGISTRERT, VEDERLAG, AVSLAG]),
      onles: () => {},
    });
    expect(container.textContent).not.toMatch(/grunnlag/i);
  });

  it('ubesvart påberopelse: brevet har nummer, navnet fra GR-U31, part og dato, og tråden slutter med «Svar ikke registrert» (kriterium 2, MM-U30)', async () => {
    await vis([PAABEROPELSE]);
    const brev = traad().getAllByRole('listitem');
    expect(brev).toHaveLength(2);
    expect(within(brev[0]).getByRole('heading', { level: 3 }).textContent?.trim()).toMatch(
      /^Brev 1 · Påberopelse av irregulær endring/
    );
    expect(brev[0].querySelector('.meta')?.textContent?.trim()).toMatch(
      /^Totalentreprenøren · \d+\. \w+ 2026 · K201-/
    );
    expect(brev[1].textContent).toContain('Svar ikke registrert.');
    expect(screen.getByText(/^Siste brev: brev 1 fra TE, \d+\. \w+ 2026\.$/)).toBeTruthy();
  });

  it('tråden har begge partenes brev og den registrerte korrespondansen med datoen avsenderen oppgir og infotipset (kriterium 2, OV-U85, OV-U81)', async () => {
    const { u } = await vis([PAABEROPELSE, REGISTRERT, VEDERLAG, AVSLAG]);
    const brev = traad().getAllByRole('listitem');
    expect(brev.map((li) => li.querySelector('.part')?.textContent)).toEqual(['TE', 'BH', 'BH']);
    const registrert = brev[1];
    expect(registrert.textContent).toContain('Korrespondanse fra byggherren');
    expect(registrert.textContent).toContain('Sendt 20. september 2026, ifølge byggherren');
    expect(within(registrert).queryByRole('button', { name: /Les brevet/ })).toBeNull();
    expect(within(registrert).getByRole('button', { name: 'Om korrespondansen' })).toBeTruthy();
    // Infotipset står ikke i overskriften (#1511).
    expect(registrert.querySelector('h3 button')).toBeNull();
    // Svaret står etter brevet det svarer på, og saken venter ikke på svar.
    expect(brev[2].textContent).not.toContain('Svar ikke registrert');
    expect(u.spor.forhold.gjeldendeSvar).not.toBeNull();
  });

  it('«Les brevet» gir brevet å lese, med brevet som beskrivelse av knappen (#1449)', async () => {
    const { lest, u } = await vis([PAABEROPELSE]);
    await fireEvent.click(traad().getByRole('button', { name: 'Les brevet' }));
    expect(lest).toEqual([u.spor.forhold.gjeldendeKrav!.dokument]);
  });

  it('tilknyttede krav står med betegnelsen, siste brev og lenken til sporet (kriterium 3, MM-U30)', async () => {
    const { valgt } = await vis([PAABEROPELSE, VEDERLAG]);
    const kortet = within(screen.getByRole('region', { name: 'Tilknyttede krav' }));
    expect(kortet.getByText('Vederlagsjustering')).toBeTruthy();
    expect(kortet.getByText(/^Svar ikke registrert · brev .* fra TE$/)).toBeTruthy();
    expect(kortet.queryByText('Fristforlengelse')).toBeNull();
    await fireEvent.click(kortet.getByRole('button', { name: /Åpne vederlagsjustering/ }));
    expect(valgt).toEqual(['vederlag']);
  });

  it('uten krav om vederlag eller frist sier kortet det', async () => {
    await vis([PAABEROPELSE]);
    expect(
      screen.getByText(/Ingen krav om vederlagsjustering eller fristforlengelse/)
    ).toBeTruthy();
  });

  it('trukket påberopelse: trekket står i sporhodet, og kravet står som «Trukket» (kriterium 4, GR-U30, MM-U30)', async () => {
    const { u } = await vis([PAABEROPELSE, VEDERLAG, { handling: 'trekk', spor: 'forhold' }]);
    expect(screen.getByRole('note').textContent).toMatch(/^Påberopelsen er trukket i brev /);
    const kortet = within(screen.getByRole('region', { name: 'Tilknyttede krav' }));
    // Linja viser til trekket, ikke til siste brev i vederlaget (funnet i saksruta).
    const trekket = u.journal.findLast((h) => h.art === 'dokument')!;
    const linja = kortet.getByText(/^Trukket · /).textContent!;
    expect(trekket.art === 'dokument' && trekket.dokument.brevnummer).toBe(3);
    expect(linja).toMatch(/brev (3|\S+-03 av [^·]*) fra TE$/);
    expect(traad().queryByText('Svar ikke registrert.')).toBeNull();
  });

  it('tidslinja har den registrerte korrespondansen på datoen avsenderen oppgir, med datoen den ble lagt til i kilden (OV-U85, #1596)', async () => {
    const u = await utledning([PAABEROPELSE, REGISTRERT]);
    const { container } = render(Tidslinje, { brev: brevene(u), datoer: [] });
    const linje = [...container.querySelectorAll('li')].find((li) =>
      li.textContent?.includes('Sendt ifølge BH')
    );
    expect(linje?.textContent).toContain('20. september 2026');
    expect(linje?.textContent).toMatch(/lagt til \d+\. \w+ 2026/);
  });
});
