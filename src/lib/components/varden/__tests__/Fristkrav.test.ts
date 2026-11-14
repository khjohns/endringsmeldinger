/**
 * TEs krav om fristforlengelse i Varden (G-3 i BF-20), med kjernen i minnet og fristtabellen for
 * prosjektet i merkingen: én rad per frist med dagene for den (U-1, KA-U74), en frist fra
 * fristtabellen eller en som ikke er registrert (KA-U79), et krav på 0 dager avvises (D-1, KA-U8),
 * og en ny versjon trekker en frist uttrykkelig (U-10).
 */

import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/svelte';
import { lagKjernesak } from '$lib/kjernesak/kontekst.svelte';
import type { Journalrad } from '$kjerne/typer';
import { MERKING, SAK, linje, medGrunnlag, skrevet } from '$lib/kjernesak/__tests__/provejournal';
import type { TilBrevkontrollen } from '$lib/components/varden/Brevkontroll.svelte';
import Fristkrav from '$lib/components/varden/Fristkrav.svelte';

const FRISTTABELLEN = [
  { fristId: 1, nummer: '5', navn: 'Mekanisk ferdigstillelse' },
  { fristId: 2, nummer: null, navn: 'Overtakelse' },
];

async function kravskjemaet(journal: Journalrad[]) {
  const kjernesak = lagKjernesak({
    sakId: SAK,
    prosjektId: 'p-1',
    part: 'TE',
    hent: async () => ({
      versjon: journal.at(-1)!.versjon,
      part: 'TE',
      visning: null as never,
      journal: journal.map(linje),
      leveringsoppdrag: [],
      merking: { ...MERKING, kontraktsfrister: FRISTTABELLEN },
    }),
  });
  await kjernesak.last();
  const sendt: TilBrevkontrollen[] = [];
  render(Fristkrav, {
    kjernesak,
    u: kjernesak.utledning!,
    onbrevkontroll: (k: TilBrevkontrollen) => sendt.push(k),
    onforkast: () => {},
  });
  return sendt;
}

const seBrevet = () =>
  fireEvent.click(screen.getByRole('button', { name: 'Se brevet før sending' }));
const velg = (felt: HTMLElement, verdi: string) =>
  fireEvent.change(felt, { target: { value: verdi } });
const skriv = (felt: HTMLElement, verdi: string) =>
  fireEvent.input(felt, { target: { value: verdi } });

afterEach(cleanup);

describe('TEs krav om fristforlengelse i Varden (G-3 i BF-20)', () => {
  it('det første kravet er varselet etter punkt 33.4, og brevet lages ikke før fristen, dagene og begrunnelsen er fylt ut (U-6, D-1)', async () => {
    const sendt = await kravskjemaet(medGrunnlag);
    expect(screen.getByText('Dette kravet er varselet.')).toBeInTheDocument();
    await seBrevet();
    expect(sendt).toHaveLength(0);
    const oppsummering = screen.getByRole('group', { name: 'Dette mangler før brevet kan lages:' });
    expect(
      within(oppsummering).getByText('Frist 1: Velg fristen kravet gjelder.')
    ).toBeInTheDocument();
    expect(within(oppsummering).getByText('Skriv begrunnelsen for kravet.')).toBeInTheDocument();
  });

  it('en frist fra fristtabellen og en som ikke er registrert gir én frist hver i kommandoen, med dagene for hver (KA-U74, KA-U79)', async () => {
    const sendt = await kravskjemaet(medGrunnlag);
    await velg(screen.getByLabelText('Frist'), '1');
    await skriv(screen.getByLabelText('Dager'), '25');
    await fireEvent.click(screen.getByRole('button', { name: 'Legg til frist' }));
    const frister = screen.getAllByLabelText('Frist');
    await velg(frister[1]!, 'annen');
    await skriv(screen.getByLabelText('Navnet i kontrakten'), 'Sluttfristen');
    await skriv(screen.getAllByLabelText('Dager')[1]!, '10');
    await skriv(
      screen.getByRole('textbox', { name: 'Begrunnelse' }),
      'Pelingen tar fire uker lenger.'
    );
    // Panelet har én linje per frist, uten sum (U-1).
    expect(screen.getByText('5 Mekanisk ferdigstillelse: 25 dager')).toBeInTheDocument();
    expect(screen.getByText('Sluttfristen: 10 dager')).toBeInTheDocument();
    await seBrevet();
    expect(sendt).toHaveLength(1);
    expect(sendt[0]!.kommando).toEqual({
      type: 'krav',
      spor: 'frist',
      innhold: {
        frister: [
          { frist_id: 1, dager: 25 },
          { navn: 'Sluttfristen', dager: 10 },
        ],
      },
      utdypning: 'Pelingen tar fire uker lenger.',
    });
  });

  it('et krav på 0 dager er ikke et krav, og feltet sier det (D-1, KA-U8)', async () => {
    const sendt = await kravskjemaet(medGrunnlag);
    await velg(screen.getByLabelText('Frist'), '2');
    await skriv(screen.getByLabelText('Dager'), '0');
    await skriv(screen.getByRole('textbox', { name: 'Begrunnelse' }), 'Begrunnelse.');
    await seBrevet();
    expect(sendt).toHaveLength(0);
    expect(
      screen.getAllByText(/Overtakelse: Et krav på 0 dager er ikke et krav/).length
    ).toBeGreaterThan(0);
  });

  it('en ny versjon har fristene fra forrige versjon, og en frist som tas ut, trekkes med ID-en (U-10)', async () => {
    const medKrav = skrevet(medGrunnlag, 'TE', {
      type: 'krav',
      spor: 'frist',
      innhold: {
        frister: [
          { nummer: '5', navn: 'Mekanisk ferdigstillelse', dager: 25 },
          { navn: 'Sluttfristen', dager: 10 },
        ],
      },
      utdypning: 'Pelingen tar fire uker lenger.',
    });
    const sendt = await kravskjemaet(medKrav);
    expect(screen.getByText(/Varselet ble sendt i brev/)).toBeInTheDocument();
    await fireEvent.click(screen.getByRole('button', { name: 'Trekk Sluttfristen' }));
    expect(screen.getByText('Sluttfristen: trekkes')).toBeInTheDocument();
    await skriv(screen.getByLabelText('Dager'), '30');
    await skriv(
      screen.getByRole('textbox', { name: 'Begrunnelse' }),
      'Pelingen tar seks uker lenger.'
    );
    await seBrevet();
    expect(sendt).toHaveLength(1);
    const innhold = (sendt[0]!.kommando as { innhold: { frister: unknown[]; trekker: string[] } })
      .innhold;
    expect(innhold.frister).toEqual([
      { id: expect.any(String), nummer: '5', navn: 'Mekanisk ferdigstillelse', dager: 30 },
    ]);
    expect(innhold.trekker).toHaveLength(1);
  });
});
