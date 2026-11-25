/**
 * Kravskjemaene for et krav lagt til, sendt før totalentreprenørens siste krav i sporet (OV-U118,
 * OV-U119), med kjernen i minnet. Journalen: påberopelsen 01.10, et vederlagskrav lagt til, sendt
 * 10.10, med P1 Riving og P2 Stillas, og kravet fra løsningen 16.10, som tar med P1, trekker P2 og
 * har P3 Montering. Kravet som legges til, er sendt 12.10.
 */

import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/svelte';
import { lagKjernesak } from '#lib/kjernesak/kontekst.svelte.ts';
import type { Journalrad } from '#kjerne/typer.ts';
import {
  MERKING,
  SAK,
  linje,
  medGrunnlag,
  skrevet,
} from '#lib/kjernesak/__tests__/provejournal.ts';
import { KJERNE } from '#kjerne/versjon.ts';
import { utledJournal } from '#kjerne/kommandoer/skriving.ts';
import { kravposterI } from '#kjerne/spor/vederlag/format.ts';
import { innholdIFristen } from '#kjerne/spor/frist/format.ts';
import Vederlagskrav from '#lib/components/varden/Vederlagskrav.svelte';
import Fristkrav from '#lib/components/varden/Fristkrav.svelte';
import type { Korrespondansevalg } from '#lib/components/varden/korrespondansen.ts';
import { startvalg, type Kravvalg } from '#lib/components/varden/vederlagskrav.ts';
import { LEGG_TIL } from '#lib/components/varden/tekster/index.ts';

afterEach(cleanup);

const BREVET = { vedlegg_id: 'v-1', filnavn: 'brevet.pdf', innhold_sha256: '0'.repeat(64) };
const VEDLEGG = new Map([['v-1', BREVET]]);
const lagtTilDen = (sendt: string) => ({
  sendt,
  korrespondansetype: 'e_post',
  beskrivelse: 'Kravet.',
  dokumentasjon: ['v-1'],
});

/** Påberopelsen sendt 01.10, så kravene kan legges til med datoer før kravet fra løsningen 16.10. */
const medPaaberopelsen: Journalrad[] = [
  ...medGrunnlag.slice(0, -1),
  { ...medGrunnlag.at(-1)!, tidsstempel: '2026-10-01T09:00:00.000Z' },
];

const medFoersteVederlagskrav = skrevet(
  medPaaberopelsen,
  'TE',
  {
    type: 'krav',
    spor: 'vederlag',
    innhold: {
      kravposter: [
        { beskrivelse: 'Riving', oppgjoersform: 'tilbud', beloep: 60000 },
        { beskrivelse: 'Stillas', oppgjoersform: 'tilbud', beloep: 10000 },
      ],
    },
    ...lagtTilDen('2026-10-10'),
  },
  VEDLEGG
);
const [riving, stillas] = kravposterI(
  utledJournal(medFoersteVederlagskrav, KJERNE).spor.vederlag.gjeldendeKrav!
);
const medVederlagskravene = skrevet(medFoersteVederlagskrav, 'TE', {
  type: 'krav',
  spor: 'vederlag',
  innhold: {
    kravposter: [
      { id: riving!.id, beskrivelse: 'Riving', oppgjoersform: 'tilbud', beloep: 60000 },
      { beskrivelse: 'Montering', oppgjoersform: 'tilbud', beloep: 40000 },
    ],
    trekker: [stillas!.id],
  },
});
const montering = kravposterI(
  utledJournal(medVederlagskravene, KJERNE).spor.vederlag.gjeldendeKrav!
)[1]!;

const FRISTER = [
  { fristId: 1, nummer: '5', navn: 'Mekanisk ferdigstillelse' },
  { fristId: 2, nummer: '6', navn: 'Overtakelse' },
];
const medFoersteFristkrav = skrevet(
  medPaaberopelsen,
  'TE',
  {
    type: 'krav',
    spor: 'frist',
    innhold: {
      frister: [
        { frist_id: 1, dager: 10 },
        { frist_id: 2, dager: 5 },
      ],
    },
    ...lagtTilDen('2026-10-10'),
  },
  VEDLEGG,
  FRISTER
);
const [femte, sjette] = innholdIFristen(
  utledJournal(medFoersteFristkrav, KJERNE).spor.frist.gjeldendeKrav!
).frister;
const medFristkravene = skrevet(
  medFoersteFristkrav,
  'TE',
  {
    type: 'krav',
    spor: 'frist',
    innhold: { frister: [{ id: femte!.id, frist_id: 1, dager: 20 }], trekker: [sjette!.id] },
    utdypning: 'Fristen for overtakelsen trekkes.',
  },
  new Map(),
  FRISTER
);

async function saken(journal: Journalrad[]) {
  const tilServeren: Record<string, unknown>[] = [];
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
      catenda_lenke: null,
      sakskode: null,
      kontraktsforkortelse: null,
      kan_foreslaa_sakskode: false,
      merking: { ...MERKING, kontraktsfrister: FRISTER },
    }),
    send: async (_sak, versjon, _id, kommando) => {
      tilServeren.push(kommando as Record<string, unknown>);
      return { event_id: 'e-x', leveringsoppdrag: 'l-1', versjon: versjon + 1 };
    },
    lastOppVedlegg: async () => ({ ...BREVET, stoerrelse: 8 }),
  });
  await kjernesak.last();
  return { kjernesak, tilServeren };
}

const korrespondansen = (dato: string): Korrespondansevalg => ({
  type: 'e_post',
  sendemaate: null,
  dato,
  vedlegg: [{ ...BREVET, stoerrelse: 8 }],
  beskrivelse: 'Kravet.',
});
const ingenKontroll = () => {
  throw new Error('Et krav lagt til går ikke til brevkontrollen');
};
const leggTil = () =>
  fireEvent.click(screen.getAllByRole('button', { name: LEGG_TIL.leggTilKravet })[0]!);

describe('vederlagskravet sendt før det siste kravet i sporet (OV-U118, OV-U119)', () => {
  async function skjemaet(dato: string, valg: Kravvalg | null = null) {
    const { kjernesak, tilServeren } = await saken(medVederlagskravene);
    render(Vederlagskrav, {
      kjernesak,
      u: kjernesak.utledning!,
      ...(valg ? { valg } : {}),
      onbrevkontroll: ingenKontroll,
      onforkast: () => {},
      lagtTil: korrespondansen(dato),
      onlagttil: () => {},
    });
    return { tilServeren };
  }
  const postene = () => screen.getByRole('region', { name: /^Vederlagsjustering/ });
  const betegnelsene = () =>
    within(postene())
      .getAllByRole('heading', { level: 4 })
      .map((h) => h.textContent?.replace(/\s+/g, ' ').trim());

  it('tar utgangspunkt i kravet sendt før det, og trekker bare en post derfra', async () => {
    const { tilServeren } = await skjemaet('2026-10-12');
    expect(
      screen.getByText(
        /^Kravpostene er hentet fra totalentreprenørens e-post av 10\. oktober 2026, det siste kravet sendt før dokumentet\./
      )
    ).toBeInTheDocument();
    // Montering står bare i kravet sendt etter, så skjemaet har den ikke, og trekker den ikke.
    expect(betegnelsene()).toEqual(['P1 Riving', 'P2 Stillas']);
    expect(screen.queryByRole('button', { name: /Ta med igjen/ })).not.toBeInTheDocument();
    await fireEvent.click(screen.getByRole('button', { name: 'Endre P2' }));
    await fireEvent.click(screen.getByRole('button', { name: 'Trekk P2' }));
    await leggTil();
    expect(tilServeren).toHaveLength(1);
    expect(tilServeren[0]).toMatchObject({
      type: 'krav',
      spor: 'vederlag',
      sendt: '2026-10-12',
      innhold: { trekker: [stillas!.id] },
    });
    const innhold = tilServeren[0]!.innhold as { kravposter: { id?: string }[] };
    expect(innhold.kravposter.map((p) => p.id)).toEqual([riving!.id]);
  });

  it('en ny post kan oppgis som samme kravpost som en post i kravet sendt etter', async () => {
    const { tilServeren } = await skjemaet('2026-10-12');
    await fireEvent.click(screen.getByRole('button', { name: 'Legg til kravpost' }));
    const sporsmaal = screen.getByRole('group', {
      name: /Er dette en kravpost i et annet krav i saken\?/,
    });
    // Kjernen gir en ny post neste betegnelse i sporet, også med kravene utenfor rekken (KA-U53).
    expect(betegnelsene().at(-1)).toMatch(/^P4 · /);
    // P1 og P2 står alt i skjemaet, så bare P3 kan velges.
    const valgene = within(sporsmaal)
      .getAllByRole('radio')
      .map((r) => r.closest('label')?.textContent?.trim());
    expect(valgene).toEqual(['Nei, en ny kravpost', 'Ja, P3 Montering']);
    await fireEvent.click(within(sporsmaal).getByRole('radio', { name: 'Ja, P3 Montering' }));
    expect(screen.getByRole('textbox', { name: /Beskrivelse av posten/ })).toHaveValue('Montering');
    await fireEvent.click(screen.getByRole('radio', { name: /Fast sum/ }));
    await fireEvent.input(screen.getByRole('textbox', { name: /Beløpet du krever/ }), {
      target: { value: '30000' },
    });
    await leggTil();
    const innhold = tilServeren[0]!.innhold as { kravposter: { id?: string }[] };
    expect(innhold.kravposter.map((p) => p.id)).toEqual([riving!.id, stillas!.id, montering.id]);
    expect(innhold).not.toHaveProperty('trekker');
  });

  it('et krav sendt før alle kravene i sporet har ingen poster å trekke', async () => {
    const { tilServeren } = await skjemaet('2026-10-05');
    expect(screen.getByText(/^Ingen krav var sendt før dokumentet/)).toBeInTheDocument();
    const sporsmaal = screen.getByRole('group', {
      name: /Er dette en kravpost i et annet krav i saken\?/,
    });
    expect(within(sporsmaal).getAllByRole('radio')).toHaveLength(4);
    await fireEvent.click(within(sporsmaal).getByRole('radio', { name: 'Ja, P1 Riving' }));
    await fireEvent.click(screen.getByRole('radio', { name: /Fast sum/ }));
    await fireEvent.input(screen.getByRole('textbox', { name: /Beløpet du krever/ }), {
      target: { value: '60000' },
    });
    await leggTil();
    expect(tilServeren).toHaveLength(1);
    const innhold = tilServeren[0]!.innhold as { kravposter: { id?: string }[] };
    expect(innhold.kravposter.map((p) => p.id)).toEqual([riving!.id]);
  });

  it('et utkast fra gjeldende krav startes på nytt fra kravet sendt før', async () => {
    const { kjernesak } = await saken(medVederlagskravene);
    await skjemaet('2026-10-12', startvalg(kjernesak.utledning!));
    expect(betegnelsene()).toEqual(['P1 Riving', 'P2 Stillas']);
  });

  it('et krav lagt til, sendt etter det siste, følger gjeldende krav som før', async () => {
    await skjemaet('2026-10-20');
    expect(screen.queryByText(/er hentet fra/)).not.toBeInTheDocument();
    expect(betegnelsene()).toEqual(['P1 Riving', 'P3 Montering']);
  });
});

describe('fristkravet sendt før det siste kravet i sporet (OV-U118)', () => {
  it('tar utgangspunkt i kravet sendt før det, og trekker bare en frist derfra', async () => {
    const { kjernesak, tilServeren } = await saken(medFristkravene);
    render(Fristkrav, {
      kjernesak,
      u: kjernesak.utledning!,
      onbrevkontroll: ingenKontroll,
      onforkast: () => {},
      onregistrert: () => {},
      lagtTil: korrespondansen('2026-10-12'),
      onlagttil: () => {},
    });
    expect(
      screen.getByText(
        /^Fristene er hentet fra totalentreprenørens e-post av 10\. oktober 2026, det siste kravet sendt før dokumentet\./
      )
    ).toBeInTheDocument();
    await fireEvent.click(screen.getByRole('button', { name: /^Endre 5/ }));
    await fireEvent.click(screen.getByRole('button', { name: /^Trekk fristen 5/ }));
    await leggTil();
    expect(tilServeren).toHaveLength(1);
    expect(tilServeren[0]).toMatchObject({
      type: 'krav',
      spor: 'frist',
      sendt: '2026-10-12',
      innhold: { frister: [{ id: sjette!.id, frist_id: 2, dager: 5 }], trekker: [femte!.id] },
    });
  });
});
