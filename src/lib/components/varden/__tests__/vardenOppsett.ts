/** Felles oppsett for Varden-testene: demoforløpet BF-01 og hjelperne som flere testfiler bruker. */
import { afterEach, beforeEach, expect, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/svelte';
import { finnForloep, type Demosak } from '#lib/kjernesak/demosak.ts';
import { type Journalrad } from '#kjerne/typer.ts';
import { finn } from '#kjerne/tester/brukerforloep.ts';
import Demoforloep from '#lib/components/brukerforlop/Demoforloep.svelte';

export const BF = finn('BF-01');
export const START = finnForloep('BF-01')!;
export const paastand = (holder: boolean, melding: string) => expect(holder, melding).toBe(true);
export const BEGRUNNELSE = 'Varselet kom for sent. Subsidiært godtas 60 000 kr.';

export const versjonVed = (punkt: string) =>
  START.kontrollpunkter.find((p) => p.id === punkt)!.versjon;
export const nyeRader = (demosak: Demosak, etter: number): Journalrad[] =>
  demosak.journal().filter((r) => r.versjon > etter);

export function aapne(punkt: string) {
  let demosak: Demosak | null = null;
  render(Demoforloep, {
    forloep: START,
    punkt,
    onpunkt: () => {},
    onstart: (d: Demosak) => (demosak = d),
  });
  return () => demosak!;
}

export const demopanel = () =>
  within(screen.getByRole('complementary', { name: 'Demo av brukerforløpet' }));

/** BH svarer i Varden som i steg 4, og kommer til brevkontrollen. Gir teksten som vises. */
export async function bhSvarerIVarden(): Promise<string[]> {
  await fireEvent.click(await screen.findByRole('button', { name: 'Svar på kravet' }));
  await fireEvent.click(screen.getByRole('radio', { name: 'Kom for sent' }));
  // #2190: varselet kan begrunnes under punktet før spørsmålene om vederlaget er besvart.
  const varselpunktet = screen
    .getByRole('group', { name: 'Kom varselet i tide?' })
    .closest('section')!;
  await fireEvent.input(
    within(varselpunktet).getByRole('textbox', { name: /Varselet om vederlagsjustering/ }),
    {
      target: { value: BEGRUNNELSE },
    }
  );
  await fireEvent.click(
    screen.getByRole('radio', { name: 'Godkjenner fast sum (punkt\u00a034.2.1)' })
  );
  await fireEvent.click(screen.getByRole('radio', { name: 'Deler av beløpet' }));
  await fireEvent.input(await screen.findByRole('textbox', { name: 'Beløpet du godkjenner' }), {
    target: { value: '60 000' },
  });
  const tittel = within(varselpunktet).getByRole('heading').textContent!;
  expect(tittel).toMatch(/^\d+\. Varselet om vederlagsjustering/);
  expect(
    within(screen.getByRole('region', { name: 'Punktene i brevet' })).getByText(
      (tekst) => tekst === tittel.replaceAll('\u00a0', ' ')
    )
  ).toBeVisible();
  await fireEvent.click(screen.getByRole('button', { name: 'Se brevet før sending' }));
  return avsnittene(
    await screen.findByRole('article', { name: 'Svar på krav om vederlagsjustering i sak KOE-17' })
  );
}

/** Avsnittene i brevteksten slik de står i brevet på skjermen. */
export const avsnittene = (brev: HTMLElement) =>
  [...within(brev).getByTestId('laast-tekst').querySelectorAll('h3, p')].map(
    (p) => p.textContent ?? ''
  );

export async function sendBrevet(knapp: string) {
  await fireEvent.click(screen.getByRole('checkbox', { name: 'Jeg har kontrollert brevet' }));
  await fireEvent.click(screen.getByRole('button', { name: knapp }));
}

export function registrerOppsett() {
  beforeEach(() => vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Ingen nettverk.'))));
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });
}
