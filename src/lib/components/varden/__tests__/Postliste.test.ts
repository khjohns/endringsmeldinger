/**
 * Lista over postene i byggherrens svar på et vederlagskrav med to kravposter: én post er åpen
 * om gangen, og de andre står som en leselinje (#1739, system.md), og oppsummeringen av det som
 * mangler, åpner posten feltet står i (MM-U32). Lista er delt ut av `Vederlagssvar` (#1778), og
 * testene fastholder atferden fra før delingen.
 */

import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/svelte';
import { lagKjernesak } from '$lib/kjernesak/kontekst.svelte';
import { MERKING, SAK, linje, medGrunnlag, skrevet } from '$lib/kjernesak/__tests__/provejournal';
import Vederlagssvar from '$lib/components/varden/Vederlagssvar.svelte';

const journal = skrevet(medGrunnlag, 'TE', {
  type: 'krav',
  spor: 'vederlag',
  innhold: {
    kravposter: [
      { beskrivelse: 'Peling', oppgjoersform: 'tilbud', beloep: 100000 },
      { beskrivelse: 'Rigging av borerigg', oppgjoersform: 'tilbud', beloep: 40000 },
    ],
  },
  utdypning: 'Tilbudet gjelder pelingen.',
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
      merking: MERKING,
    }),
  });
  await kjernesak.last();
  render(Vederlagssvar, {
    kjernesak,
    u: kjernesak.utledning!,
    onbrevkontroll: () => {},
    onforkast: () => {},
  });
}

const formen = () => screen.queryByRole('group', { name: /oppgjørsform/i });
const overskrift = () => formen()!.closest('li')!.querySelector('h4')!.textContent;

afterEach(cleanup);

describe('lista over kravpostene i svaret (#1739, #1778)', () => {
  it('den første kravposten er åpen, den andre står som en ubesvart leselinje med «Svar på P2»', async () => {
    await svarskjemaet();
    expect(screen.getAllByRole('group', { name: /oppgjørsform/i })).toHaveLength(1);
    expect(overskrift()).toMatch(/P1\s+Peling/);
    const p2 = screen.getByRole('button', { name: 'Svar på P2' });
    expect(within(p2.closest('li')!).getByText('Ikke besvart')).toBeInTheDocument();
  });

  it('«Svar på P2» åpner P2 og flytter fokus til oppgjørsformen; «Ferdig» lukker den og gir fokus til knappen igjen', async () => {
    await svarskjemaet();
    await fireEvent.click(screen.getByRole('button', { name: 'Svar på P2' }));
    expect(overskrift()).toMatch(/P2\s+Rigging av borerigg/);
    expect(document.activeElement).toBe(formen());
    expect(screen.getByRole('button', { name: 'Svar på P1' })).toBeInTheDocument();

    await fireEvent.click(screen.getByRole('button', { name: 'Ferdig' }));
    expect(formen()).toBeNull();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Svar på P2' }));
  });

  it('en besvart kravpost viser svaret i leselinjen og tilbyr «Endre svaret på P1»', async () => {
    await svarskjemaet();
    await fireEvent.click(
      screen.getByRole('radio', { name: 'Godkjenner fast sum (punkt 34.2.1)' })
    );
    await fireEvent.click(screen.getByRole('radio', { name: 'Hele beløpet' }));
    await fireEvent.click(screen.getByRole('button', { name: 'Ferdig' }));
    const endre = screen.getByRole('button', { name: 'Endre svaret på P1' });
    expect(within(endre.closest('li')!).queryByText('Ikke besvart')).toBeNull();
  });

  it('MM-U32: lenken i oppsummeringen til et felt i en lukket kravpost åpner posten', async () => {
    await svarskjemaet();
    await fireEvent.click(screen.getByRole('button', { name: 'Ferdig' }));
    await fireEvent.click(screen.getByRole('button', { name: 'Se brevet før sending' }));
    const mangler = screen.getByRole('group', { name: 'Dette mangler før brevet kan lages:' });
    const lenke = within(mangler)
      .getAllByRole('link')
      .find((a) => a.getAttribute('href')?.includes('-form-P2'))!;
    await fireEvent.click(lenke);
    expect(overskrift()).toMatch(/P2\s+Rigging av borerigg/);
    expect(document.activeElement).toBe(formen());
  });
});
