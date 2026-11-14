/**
 * TEs krav om fristforlengelse i Varden (G-3 i BF-20), med kjernen i minnet og fristtabellen for
 * prosjektet i merkingen: én rad per frist med dagene for den (U-1, KA-U74), en frist fra
 * fristtabellen eller en som ikke er registrert (KA-U79), et krav på 0 dager avvises (D-1, KA-U8),
 * og en ny versjon trekker en frist uttrykkelig (U-10). Skjemaet sender også varselet etter punkt
 * 33.4 alene eller registrerer det (U-13, VS-U15, VS-U16), tar et varsel gitt før utenfor
 * løsningen med datoen og brevet (U-6, OV-U5) og svarer på forespørselen etter punkt 33.6.2
 * (U-11, VS-U17).
 */

import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/svelte';
import { lagKjernesak } from '$lib/kjernesak/kontekst.svelte';
import type { Journalrad } from '$kjerne/typer';
import {
  MERKING,
  SAK,
  linje,
  medFristvarsel,
  medGrunnlag,
  opprettet,
  skrevet,
} from '$lib/kjernesak/__tests__/provejournal';
import type { TilBrevkontrollen } from '$lib/components/varden/Brevkontroll.svelte';
import Fristkrav from '$lib/components/varden/Fristkrav.svelte';

const FRISTTABELLEN = [
  { fristId: 1, nummer: '5', navn: 'Mekanisk ferdigstillelse' },
  { fristId: 2, nummer: null, navn: 'Overtakelse' },
];

const BREVET = { vedlegg_id: 'v-1', filnavn: 'varsel.pdf', innhold_sha256: '0'.repeat(64) };

async function kravskjemaet(journal: Journalrad[]) {
  const sendtTilServeren: unknown[] = [];
  let registrert = false;
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
    send: async (_sak, versjon, _id, kommando) => {
      sendtTilServeren.push(kommando);
      return { event_id: 'e-1', leveringsoppdrag: 'l-1', versjon: versjon + 1 };
    },
    lastOppVedlegg: async () => ({ ...BREVET, stoerrelse: 8 }),
  });
  await kjernesak.last();
  const sendt: TilBrevkontrollen[] = [];
  render(Fristkrav, {
    kjernesak,
    u: kjernesak.utledning!,
    onbrevkontroll: (k: TilBrevkontrollen) => sendt.push(k),
    onforkast: () => {},
    onregistrert: () => (registrert = true),
  });
  return Object.assign(sendt, { sendtTilServeren, registrert: () => registrert });
}

const leggVed = async () => {
  const fil = new File(['%PDF-1.4'], 'varsel.pdf', { type: 'application/pdf' });
  await fireEvent.change(document.querySelector('input[type=file]')!, {
    target: { files: [fil] },
  });
  await screen.findByText('varsel.pdf');
};

/** Byggherren ber om dagene etter punkt 33.6.2 etter varselet (VS-U19). */
const medForesporsel = skrevet(medFristvarsel, 'BH', {
  type: 'foresporsel',
  spor: 'frist',
  hjemmel: '33.6.2',
});

const seBrevet = () =>
  fireEvent.click(screen.getByRole('button', { name: 'Se brevet før sending' }));
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
      within(oppsummering).getByText('Ny frist: Velg fristen kravet gjelder.')
    ).toBeInTheDocument();
    expect(within(oppsummering).getByText('Skriv begrunnelsen for kravet.')).toBeInTheDocument();
  });

  it('en frist fra fristtabellen og en som ikke er registrert gir én frist hver i kommandoen, med dagene for hver (KA-U74, KA-U79)', async () => {
    const sendt = await kravskjemaet(medGrunnlag);
    await fireEvent.click(screen.getByRole('radio', { name: '5 Mekanisk ferdigstillelse' }));
    await skriv(screen.getByLabelText('Dagene du krever'), '25');
    await fireEvent.click(screen.getByRole('button', { name: 'Legg til frist' }));
    await fireEvent.click(
      screen.getAllByRole('radio', { name: 'En frist som ikke er registrert' })[1]!
    );
    await skriv(screen.getByLabelText('Navnet i kontrakten'), 'Sluttfristen');
    await skriv(screen.getAllByLabelText('Dagene du krever')[1]!, '10');
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
    await fireEvent.click(screen.getByRole('radio', { name: 'Overtakelse' }));
    await skriv(screen.getByLabelText('Dagene du krever'), '0');
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
    await fireEvent.click(screen.getByRole('button', { name: 'Trekk fristen Sluttfristen' }));
    expect(screen.getByText('Sluttfristen: trekkes')).toBeInTheDocument();
    await skriv(screen.getByLabelText('Dagene du krever'), '30');
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
    // «Dette sender du» sier at fristen trekkes, som brevet (U-10).
    expect(sendt[0]!.detteSender.map((l) => l.tekst)).toEqual([
      '5 Mekanisk ferdigstillelse: 30 dager',
      'Sluttfristen: trekkes',
    ]);
  });

  it('en registrert frist fra forrige versjon står fast med ID-en og fristen i tabellen, og samme frist kan ikke velges to ganger (U-10, KA-U79)', async () => {
    const medKrav = skrevet(
      medGrunnlag,
      'TE',
      {
        type: 'krav',
        spor: 'frist',
        innhold: { frister: [{ frist_id: 1, dager: 25 }] },
        utdypning: 'Pelingen tar fire uker lenger.',
      },
      new Map(),
      FRISTTABELLEN
    );
    const sendt = await kravskjemaet(medKrav);
    expect(screen.queryAllByRole('radio')).toHaveLength(0);
    await fireEvent.click(screen.getByRole('button', { name: 'Legg til frist' }));
    await fireEvent.click(screen.getByRole('radio', { name: '5 Mekanisk ferdigstillelse' }));
    await skriv(screen.getAllByLabelText('Dagene du krever')[1]!, '5');
    await skriv(screen.getByRole('textbox', { name: 'Begrunnelse' }), 'Begrunnelse.');
    await seBrevet();
    expect(sendt).toHaveLength(0);
    expect(screen.getAllByText(/Fristen står allerede i kravet/).length).toBeGreaterThan(0);
    await fireEvent.click(screen.getByRole('button', { name: 'Fjern 5 Mekanisk ferdigstillelse' }));
    await seBrevet();
    expect(sendt).toHaveLength(1);
    expect((sendt[0]!.kommando as { innhold: { frister: unknown[] } }).innhold.frister).toEqual([
      { id: expect.any(String), frist_id: 1, dager: 25 },
    ]);
  });

  it('TE kan bare varsle etter punkt 33.4, uten dager, og «Når du sender» sier virkningen (U-13, VS-U15)', async () => {
    const sendt = await kravskjemaet(medGrunnlag);
    await fireEvent.click(
      screen.getByRole('radio', { name: 'Bare varsle etter punkt 33.4, uten dager' })
    );
    expect(screen.queryByLabelText('Dagene du krever')).not.toBeInTheDocument();
    expect(screen.getByText('Varselet etter punkt 33.4, uten dager')).toBeInTheDocument();
    await seBrevet();
    expect(sendt).toHaveLength(1);
    expect(sendt[0]!.kommando).toEqual({ type: 'send_varsel', spor: 'frist', hjemmel: '33.4' });
    expect(sendt[0]!.virkninger[0]).toMatch(/^Varselet etter punkt 33\.4 sendes i dag/);
  });

  it('et varsel sendt utenfor løsningen registreres med typen, datoen og brevet, uten brevkontroll (U-13, VS-U16, LV-U42)', async () => {
    const sendt = await kravskjemaet(medGrunnlag);
    await fireEvent.click(
      screen.getByRole('radio', { name: 'Bare varsle etter punkt 33.4, uten dager' })
    );
    await fireEvent.click(
      screen.getByRole('radio', { name: 'Registrer et brev sendt utenfor løsningen' })
    );
    const registrer = () =>
      fireEvent.click(screen.getByRole('button', { name: 'Registrer varselet' }));
    await registrer();
    const mangler = within(
      screen.getByRole('group', { name: 'Dette mangler før brevet kan lages:' })
    );
    expect(mangler.getByText('Oppgi datoen for varselet.')).toBeInTheDocument();
    expect(mangler.getByText('Legg ved brevet du varslet i.')).toBeInTheDocument();
    await fireEvent.click(screen.getByRole('radio', { name: 'Brev' }));
    await skriv(screen.getByLabelText('Datoen for varselet'), '2026-10-05');
    await leggVed();
    await registrer();
    expect(sendt).toHaveLength(0);
    expect(sendt.sendtTilServeren).toEqual([
      {
        type: 'varsel',
        spor: 'frist',
        hjemmel: '33.4',
        sendt: '2026-10-05',
        korrespondansetype: 'brev',
        dokumentasjon: ['v-1'],
      },
    ]);
    await vi.waitFor(() => expect(sendt.registrert()).toBe(true));
  });

  it('en registrering av varselet som ikke er fylt ut, blir ikke med når TE går tilbake til kravet, og kravet er varselet (U-6, U-13)', async () => {
    const sendt = await kravskjemaet(medGrunnlag);
    await fireEvent.click(
      screen.getByRole('radio', { name: 'Bare varsle etter punkt 33.4, uten dager' })
    );
    await fireEvent.click(
      screen.getByRole('radio', { name: 'Registrer et brev sendt utenfor løsningen' })
    );
    await fireEvent.click(screen.getByRole('radio', { name: 'Send kravet med dagene' }));
    expect(screen.queryByLabelText('Datoen for varselet')).not.toBeInTheDocument();
    await fireEvent.click(screen.getByRole('radio', { name: 'Overtakelse' }));
    await skriv(screen.getByLabelText('Dagene du krever'), '20');
    await skriv(screen.getByRole('textbox', { name: 'Begrunnelse' }), 'Begrunnelse.');
    await seBrevet();
    expect(sendt).toHaveLength(1);
    expect(sendt[0]!.kommando).toMatchObject({ type: 'krav' });
    expect(sendt[0]!.kommando).not.toHaveProperty('varsel');
  });

  it('et varsel gitt før, utenfor løsningen, står i kravet med datoen og brevet som vedlegg (U-6, OV-U5)', async () => {
    const sendt = await kravskjemaet(medGrunnlag);
    await fireEvent.click(
      screen.getByRole('button', { name: 'Varselet er gitt før, utenfor løsningen' })
    );
    await fireEvent.click(screen.getByRole('radio', { name: 'Overtakelse' }));
    await skriv(screen.getByLabelText('Dagene du krever'), '20');
    await skriv(screen.getByRole('textbox', { name: 'Begrunnelse' }), 'Begrunnelse.');
    await seBrevet();
    expect(sendt).toHaveLength(0);
    await skriv(screen.getByLabelText('Datoen for varselet'), '2026-10-05');
    await leggVed();
    await seBrevet();
    expect(sendt).toHaveLength(1);
    expect(sendt[0]!.kommando).toMatchObject({
      type: 'krav',
      varsel: { sendt: '2026-10-05', dokumentasjon: ['v-1'] },
    });
    // Brevet sier når varselet ble gitt (OV-U5).
    expect(JSON.stringify(sendt[0]!.avsnitt)).toMatch(/5\. oktober 2026/);
  });

  it('et varsel gitt før sier kalenderdagene fra datoen TE ble klar over forholdet først når datoen for varselet er oppgitt (U-6)', async () => {
    const klarOver = skrevet([opprettet], 'TE', {
      type: 'krav',
      spor: 'forhold',
      innhold: {
        hovedkategori: 'svikt',
        underkategori: 'grunnforhold',
        klar_over_forholdet: '2026-10-01',
      },
      utdypning: 'Leire der rapporten sa fjell.',
    });
    await kravskjemaet(klarOver);
    expect(screen.getByText(/Sendes varselet i dag/)).toBeInTheDocument();
    await fireEvent.click(
      screen.getByRole('button', { name: 'Varselet er gitt før, utenfor løsningen' })
    );
    expect(screen.queryByText(/Sendes varselet i dag/)).not.toBeInTheDocument();
    await skriv(screen.getByLabelText('Datoen for varselet'), '2026-10-05');
    expect(
      screen.getByText(/Varselet ble gitt 5\. oktober 2026, 4 kalenderdager etter/)
    ).toBeInTheDocument();
  });

  it('byggherrens forespørsel etter punkt 33.6.2 vises, og bokstav b sender begrunnelsen som svar på den (U-11, VS-U17)', async () => {
    const sendt = await kravskjemaet(medForesporsel);
    expect(
      screen.getByText(/^Byggherren ber deg angi og begrunne antall dager/)
    ).toBeInTheDocument();
    // Kravet etter bokstav a er svaret, og utkastet heter det (prototypen, `#foresporsel`).
    expect(
      screen.getByText('Svar på byggherrens forespørsel etter punkt 33.6.2')
    ).toBeInTheDocument();
    await fireEvent.click(
      screen.getByRole('radio', {
        name: 'Begrunne hvorfor du ennå ikke kan beregne dagene (bokstav b)',
      })
    );
    expect(screen.queryByLabelText('Dagene du krever')).not.toBeInTheDocument();
    await seBrevet();
    expect(sendt).toHaveLength(0);
    await skriv(
      screen.getByRole('textbox', { name: 'Hvorfor du ennå ikke kan beregne dagene' }),
      'Omfanget av omprosjekteringen er ikke kjent.'
    );
    await seBrevet();
    expect(sendt).toHaveLength(1);
    expect(sendt[0]!.kommando).toEqual({
      type: 'foresporselssvar',
      gjelder: expect.any(String),
      utdypning: 'Omfanget av omprosjekteringen er ikke kjent.',
    });
    expect(sendt[0]!.virkninger).toEqual([
      'Svaret er en begrunnelse etter punkt 33.6.2 annet ledd bokstav b. For kravet du sender senere, gjelder punkt 33.6.1 (punkt 33.6.2 femte ledd).',
    ]);
  });
});
