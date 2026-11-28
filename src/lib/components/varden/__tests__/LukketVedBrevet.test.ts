import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/svelte';
import { minnebane } from '#kjerne/tester/bane.ts';
import { finn, somForloep } from '#kjerne/tester/brukerforloep.ts';
import type { Handling } from '#kjerne/tester/klient.ts';
import { kjoer } from '#kjerne/tester/kjoerer.ts';
import { testklokke } from '#kjerne/tester/testmiljoe.ts';
import { avsluttetAvTe } from '#kjerne/utledning/visning.ts';
import Forholdsoversikt from '../Forholdsoversikt.svelte';
import Vederlagsoversikt from '../Vederlagsoversikt.svelte';

afterEach(cleanup);

const trekk: Handling = { handling: 'trekk', spor: 'forhold' };

describe.each([
  {
    brevtype: 'korrigeringen',
    Side: Forholdsoversikt,
    forloep: 'BF-02D',
    tittel: /^Korrigering av datoen/,
    aapen:
      'Svaret i brev 2 endres ikke. Byggherren kan ta stilling til den nye datoen i et senere svar.',
    lukket:
      'Saken står lukket. Korrigeringen endrer ikke utfallet. Byggherren kan ta stilling til den nye datoen i et innlegg.',
  },
  {
    brevtype: 'kunnskapsdatoen',
    Side: Vederlagsoversikt,
    forloep: 'BF-48E',
    tittel: /^Når utgiftene/,
    aapen: 'Svaret i brev 4 endres ikke. Byggherren kan ta stilling til datoen i et senere svar.',
    lukket:
      'Saken står lukket. Brevet endrer ikke utfallet. Byggherren kan ta stilling til datoen i et innlegg.',
  },
])('Meldingen under brevet med $brevtype (MM-U50, GR-U27, #2523)', (tilfelle) => {
  const forloep = somForloep(finn(tilfelle.forloep));
  const forhistorie = forloep.steg.slice(0, -2);
  const [aksept, egetBrev] = forloep.steg.slice(-2) as [Handling, Handling];
  if (tilfelle.forloep === 'BF-48E') {
    // Svaret på vederlaget fra BF-48 gir en melding å kontrollere mens saken er åpen.
    forhistorie.push({ ...finn('BF-48').steg![3]!, navn: 'D-svar-vederlag' });
  }

  async function vis(steg: Handling[]) {
    const k = await kjoer({ ...forloep, steg, kontroller: [] }, minnebane(), {
      valg: { klokke: testklokke('2026-10-01T09:00:00Z') },
    });
    const u = await k.utledning();
    expect(avsluttetAvTe(u)).toBe(true);
    render(tilfelle.Side, {
      u,
      betegnelser: { forhold: null, vederlag: null, frist: null },
      onles: () => {},
    });
    return within(screen.getByRole('heading', { name: tilfelle.tittel }).closest('li')!);
  }

  it.each([
    { lukking: 'godtatt avslag', steg: aksept },
    { lukking: 'trekk av påberopelsen', steg: trekk },
  ])('beholder meldingen fra den åpne saken etter $lukking', async ({ steg }) => {
    const rad = await vis([...forhistorie, egetBrev, steg]);
    expect(rad.getByText(tilfelle.aapen)).toBeVisible();
    expect(rad.queryByText(tilfelle.lukket)).toBeNull();
  });

  it('sier at saken står lukket når påberopelsen ble trukket før brevet', async () => {
    const rad = await vis([...forhistorie, trekk, egetBrev]);
    expect(rad.getByText(tilfelle.lukket)).toBeVisible();
    expect(rad.queryByText(tilfelle.aapen)).toBeNull();
  });
});
