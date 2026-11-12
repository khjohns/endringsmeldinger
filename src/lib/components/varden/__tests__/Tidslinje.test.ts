/**
 * Tidslinja i Varden uten oppføringer: det er ingenting å åpne, så hodet er ingen knapp
 * (#1391, funnet fra reviewet av #1373). Like oppføringer gir ikke `each_key_duplicate` (#1393).
 */

import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/svelte';
import Tidslinje from '$lib/components/varden/Tidslinje.svelte';
import { brevene, type Brevet } from '$lib/components/varden/lesing';
import type { Utledning } from '$kjerne/utledning/utled';

afterEach(cleanup);

describe('Tidslinje', () => {
  it('uten oppføringer kan tidslinja ikke åpnes, og hodet sier at det ikke er noe ennå (#1391)', () => {
    const { container } = render(Tidslinje, { brev: [], datoer: [] });
    expect(container.querySelector('details, summary')).toBeNull();
    expect(screen.getByText('Ingen datoer eller brev ennå.')).toBeInTheDocument();
  });

  it('to like oppgitte datoer i samme brev står begge i tidslinja, uten nøkkelkollisjon (#1393)', () => {
    const d = {
      dato: '2026-10-01',
      hva: 'klar_over_forholdet' as const,
      oppgittAv: 'TE' as const,
      brev: {
        id: 'brev-1',
        nummer: 1,
        registrert: '2026-10-02T10:00:00Z',
        omtale: null,
        art: 'krav' as const,
      },
      spor: [],
    };
    const { container } = render(Tidslinje, { brev: [], datoer: [d, { ...d }], aapen: true });
    expect(container.querySelectorAll('li')).toHaveLength(2);
  });

  it('LV-U44, LV-U45: brevet etter registrert korrespondanse får brevnummeret, ikke versjonen, og det registrerte brevet får ikke noe nummer', () => {
    const dokument = (id: string, nummer: number | null, tittel: string | null, tid: string) => ({
      art: 'dokument',
      versjon: 0,
      dokument: {
        id,
        avsender: 'TE',
        registrert: tid,
        spor: [],
        krav: [],
        svar: [],
        utsagn: [],
        opplysninger: [],
        brevnummer: nummer,
        merking: nummer === null ? null : `K201-KOE-017-0${nummer}`,
        deresRef: [],
        korrespondansetype: null,
        brevtittel: tittel,
        brevtekst: tittel === null ? null : [{ laast: 'Teksten.' }],
      },
    });
    const journal = [
      {
        ...dokument('brev-a', 1, 'Krav om endring i sak KOE-17', '2026-10-01T08:00:00Z'),
        versjon: 2,
      },
      { ...dokument('registrert', null, null, '2026-10-02T08:00:00Z'), versjon: 3 },
      {
        ...dokument('brev-b', 2, 'Krav om vederlagsjustering i sak KOE-17', '2026-10-03T08:00:00Z'),
        versjon: 4,
      },
    ];
    const tomt = { krav: [], svar: [], varsler: {}, kravpostvarsler: [], foresporsler: [] };
    const u = {
      journal,
      registrerteBrev: [],
      datoopplysninger: [],
      spor: { forhold: tomt, vederlag: tomt, frist: tomt },
    } as unknown as Utledning;
    const brev = brevene(u);
    expect(brev.map((b) => b.nummer)).toEqual([1, null, 2]);

    const { container } = render(Tidslinje, { brev, datoer: [], aapen: true });
    const linjer = [...container.querySelectorAll('li')].map((li) => li.textContent ?? '');
    expect(linjer[1]).toContain('Korrespondanse');
    expect(linjer[1]).not.toMatch(/Brev \d/);
    // LV-U44: kilden har brevets nummer i saken, ikke versjonen i journalen.
    expect(linjer[2]).toContain('Brev 2 sendt av TE');
    expect(container.textContent).not.toMatch(/Brev 4|K201-KOE-017-04/);
  });

  it('brevet står med hva det gjør, ikke merkingen og den frosne tittelen, og nummeret står i kilden (prototypen grunnlagsoversikt.html, oppdragsgiver 06.11)', () => {
    const brevet = (
      id: string,
      nummer: number,
      avsender: 'TE' | 'BH',
      art: Brevet['art'],
      spor: Brevet['spor']
    ): Brevet => ({
      id,
      nummer,
      avsender,
      registrert: `2026-10-0${nummer}T08:00:00Z`,
      sendt: null,
      spor,
      art,
      forhold: null,
      merking: `K201-KOE-017-0${nummer}`,
      deresRef: [],
      omtale: null,
      brevtittel: 'Lang tittel i sak KOE-17',
      avsnitt: null,
    });
    const { container } = render(Tidslinje, {
      brev: [
        brevet('a', 1, 'TE', 'krav', ['forhold']),
        brevet('b', 2, 'TE', 'krav', ['vederlag']),
        brevet('c', 3, 'BH', 'svar', ['frist']),
        brevet('d', 4, 'TE', 'trekk', ['forhold', 'vederlag']),
      ],
      datoer: [],
      aapen: true,
    });
    const hva = [...container.querySelectorAll('.hva')].map((p) => p.textContent);
    expect(hva).toEqual([
      'Påberopelse av forholdet',
      'Krav om vederlagsjustering',
      'Svar på kravet om fristforlengelse',
      'Trekk av påberopelsen',
    ]);
    expect(container.textContent).not.toMatch(/K201-KOE|Lang tittel/);
    expect(container.querySelectorAll('.kilde')[2].textContent).toBe(
      'Brev 3 sendt av BH kl. 10.00'
    );
  });
});
