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
import { lagKjernesak } from '#lib/kjernesak/kontekst.svelte.ts';
import type { Journalrad } from '#kjerne/typer.ts';
import {
  MERKING,
  SAK,
  linje,
  medFristvarsel,
  medGrunnlag,
  opprettet,
  skrevet,
} from '#lib/kjernesak/__tests__/provejournal.ts';
import type { TilBrevkontrollen } from '#lib/components/varden/Brevkontroll.svelte';
import Fristkrav from '#lib/components/varden/Fristkrav.svelte';
import type { Fristdato } from '#lib/kjernesak/brevtekst.ts';

const FRISTTABELLEN = [
  { fristId: 1, nummer: '5', navn: 'Mekanisk ferdigstillelse' },
  { fristId: 2, nummer: null, navn: 'Overtakelse' },
];

const BREVET = { vedlegg_id: 'v-1', filnavn: 'varsel.pdf', innhold_sha256: '0'.repeat(64) };

/** Datoene i fristtabellen (`dato` i `server/kontraktsfrister.ts`), til U-4 og U-5. */
const FRISTDATOENE = [
  { fristId: 1, dato: '2027-03-01', dagmulktbelagt: false },
  { fristId: 2, dato: '2027-06-01', dagmulktbelagt: true },
];

async function kravskjemaet(
  journal: Journalrad[],
  fristdatoer: readonly Fristdato[] = [],
  sakerIkkeForstaatt: string[] = []
) {
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
      catenda_lenke: null,
      merking: { ...MERKING, kontraktsfrister: FRISTTABELLEN, fristdatoer, sakerIkkeForstaatt },
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
    // Den første fristen lukkes til en linje i tabellen, og den nye står åpen.
    expect(
      screen.getByRole('button', { name: 'Endre 5 Mekanisk ferdigstillelse' })
    ).toBeInTheDocument();
    await fireEvent.click(screen.getByRole('radio', { name: 'En frist som ikke er registrert' }));
    await skriv(screen.getByLabelText('Navnet i kontrakten'), 'Sluttfristen');
    await skriv(screen.getByLabelText('Dagene du krever'), '10');
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

  it('valget viser datoen i kontrakten og dagmulkten, og snarveien krever like mange dager for de senere fristene, hver i sin rad (U-4, U-5)', async () => {
    const sendt = await kravskjemaet(medGrunnlag, FRISTDATOENE);
    await fireEvent.click(
      screen.getByRole('radio', { name: '5 Mekanisk ferdigstillelse · 1. mars 2027' })
    );
    expect(
      screen.getByRole('radio', { name: 'Overtakelse · 1. juni 2027 · dagmulkt' })
    ).toBeInTheDocument();
    await skriv(screen.getByLabelText('Dagene du krever'), '20');
    // Tidslinja har fristene i kontrakten, og den krevde fristen sier dagene (U-5).
    const tidslinja = within(screen.getByRole('region', { name: 'Tidslinje' }));
    expect(tidslinja.getByText('Fristene i kontrakten')).toBeInTheDocument();
    expect(tidslinja.getByText('krevd forlenget 20 dager fra 1. mars 2027')).toBeInTheDocument();
    expect(tidslinja.getByText('dagmulkt')).toBeInTheDocument();
    await fireEvent.click(screen.getByRole('button', { name: 'Ferdig' }));
    await fireEvent.click(
      screen.getByRole('button', {
        name: 'Krev også 20 dager for overtakelse, som for frist 5 (mekanisk ferdigstillelse)',
      })
    );
    expect(screen.getByRole('button', { name: 'Endre Overtakelse' })).toHaveFocus();
    expect(screen.queryByRole('button', { name: /^Krev også/ })).not.toBeInTheDocument();
    await skriv(screen.getByRole('textbox', { name: 'Begrunnelse' }), 'Begrunnelse.');
    await seBrevet();
    expect(sendt).toHaveLength(1);
    expect((sendt[0]!.kommando as { innhold: { frister: unknown[] } }).innhold.frister).toEqual([
      { frist_id: 1, dager: 20 },
      { frist_id: 2, dager: 20 },
    ]);
  });

  it('lenken i «Dette mangler» åpner fristen som mangler dagene, og flytter fokus til feltet (MM-U32)', async () => {
    await kravskjemaet(medGrunnlag, FRISTDATOENE);
    await fireEvent.click(
      screen.getByRole('radio', { name: '5 Mekanisk ferdigstillelse · 1. mars 2027' })
    );
    await fireEvent.click(screen.getByRole('button', { name: 'Ferdig' }));
    expect(screen.getByText('Ikke oppgitt')).toBeInTheDocument();
    await seBrevet();
    await fireEvent.click(
      screen.getByRole('link', { name: /^5 Mekanisk ferdigstillelse: Skriv dagene/ })
    );
    expect(screen.getByLabelText('Dagene du krever')).toHaveFocus();
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
    // Fristene fra forrige versjon står som linjer i tabellen, og én åpnes om gangen.
    expect(screen.queryByLabelText('Dagene du krever')).not.toBeInTheDocument();
    await fireEvent.click(screen.getByRole('button', { name: 'Endre Sluttfristen' }));
    await fireEvent.click(screen.getByRole('button', { name: 'Trekk fristen Sluttfristen' }));
    expect(screen.getByText('Sluttfristen: trekkes')).toBeInTheDocument();
    expect(screen.getByText(/^Kravet om forlengelse av sluttfristen trekkes/)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Angre trekket av Sluttfristen' })
    ).toBeInTheDocument();
    await fireEvent.click(screen.getByRole('button', { name: 'Endre 5 Mekanisk ferdigstillelse' }));
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
    // Den faste fristen har ikke valget, så «Endre» gir fokus til dagene.
    await fireEvent.click(screen.getByRole('button', { name: 'Endre 5 Mekanisk ferdigstillelse' }));
    expect(screen.queryAllByRole('radio')).toHaveLength(0);
    expect(screen.getByLabelText('Dagene du krever')).toHaveFocus();
    await fireEvent.click(screen.getByRole('button', { name: 'Ferdig' }));
    await fireEvent.click(screen.getByRole('button', { name: 'Legg til frist' }));
    await fireEvent.click(screen.getByRole('radio', { name: '5 Mekanisk ferdigstillelse' }));
    await skriv(screen.getByLabelText('Dagene du krever'), '5');
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

  it('merket ved spørsmålet om varselet sier «pkt. 33.4», fordi henvisningen står alene (OV-U75)', async () => {
    await kravskjemaet(medGrunnlag);
    const varselet = screen.getByRole('heading', { name: 'Varselet om fristforlengelse' });
    expect(varselet.parentElement).toHaveTextContent(/pkt\. 33\.4$/);
    expect(varselet.parentElement).not.toHaveTextContent('punkt 33.4');
  });

  it('TE kan bare varsle etter punkt 33.4, uten dager, og «Når du sender» sier virkningen (U-13, VS-U15)', async () => {
    const sendt = await kravskjemaet(medGrunnlag);
    await fireEvent.click(
      screen.getByRole('radio', { name: 'Bare varsle etter punkt\u00a033.4, uten dager' })
    );
    expect(screen.queryByLabelText('Dagene du krever')).not.toBeInTheDocument();
    expect(screen.getByText('Varselet etter punkt 33.4, uten dager')).toBeInTheDocument();
    await seBrevet();
    expect(sendt).toHaveLength(1);
    expect(sendt[0]!.kommando).toEqual({ type: 'send_varsel', spor: 'frist', hjemmel: '33.4' });
    expect(sendt[0]!.virkninger[0]).toMatch(/^Varselet etter punkt\u00a033\.4 sendes i dag/);
  });

  it('et varsel sendt utenfor løsningen registreres med typen, sendemåten, datoen, dokumentet og beskrivelsen, uten brevkontroll (U-13, VS-U16, LV-U42, OV-U79)', async () => {
    const sendt = await kravskjemaet(medGrunnlag);
    await fireEvent.click(
      screen.getByRole('radio', { name: 'Bare varsle etter punkt\u00a033.4, uten dager' })
    );
    await fireEvent.click(
      screen.getByRole('radio', { name: 'Registrer et varsel sendt utenfor løsningen' })
    );
    const registrer = () =>
      fireEvent.click(screen.getByRole('button', { name: 'Registrer varselet' }));
    await registrer();
    const mangler = within(
      screen.getByRole('group', { name: 'Dette mangler før brevet kan lages:' })
    );
    expect(mangler.getByText('Oppgi datoen varselet ble sendt.')).toBeInTheDocument();
    expect(mangler.getByText('Legg ved dokumentet du varslet i.')).toBeInTheDocument();
    expect(mangler.getByText('Beskriv varselet.')).toBeInTheDocument();
    // VS-U72: opplysningen fra kapittel B står ved registreringen, som ved punkt 32.2 (VS-U39).
    expect(
      screen.getByText(/^Etter kapittel B i kontraktsgrunnlaget skal varsel om endring sendes/)
    ).toBeInTheDocument();
    // Skjermleseren leser opplysningen når spørsmålet om typen får fokus (uu-sjekk).
    expect(
      screen.getByRole('group', { name: 'Hvordan ble varselet gitt?' })
    ).toHaveAccessibleDescription(/^Etter kapittel B i kontraktsgrunnlaget/);
    const gitt = within(screen.getByRole('group', { name: 'Hvordan ble varselet gitt?' }));
    // Etiketten for vedlegget gjelder alle typene (#2056, oppdragsgiver 16.11).
    expect(screen.getByText('Dokumentet du varslet i')).toBeInTheDocument();
    await fireEvent.click(gitt.getByRole('radio', { name: 'E-post' }));
    expect(screen.getByText('Dokumentet du varslet i')).toBeInTheDocument();
    await fireEvent.click(gitt.getByRole('radio', { name: 'Brev' }));
    expect(screen.getByText('Dokumentet du varslet i')).toBeInTheDocument();
    // OV-U79: sendemåten oppgis for et brev.
    await registrer();
    expect(mangler.getByText('Velg hvordan brevet ble sendt.')).toBeInTheDocument();
    await fireEvent.click(screen.getByRole('radio', { name: 'Per post' }));
    await skriv(screen.getByLabelText('Datoen det ble sendt'), '2026-10-05');
    await leggVed();
    await skriv(
      screen.getByLabelText('Kort beskrivelse av varselet'),
      'Varsel om forsinket tegning.'
    );
    await registrer();
    expect(sendt).toHaveLength(0);
    expect(sendt.sendtTilServeren).toEqual([
      {
        type: 'varsel',
        spor: 'frist',
        hjemmel: '33.4',
        sendt: '2026-10-05',
        korrespondansetype: 'brev',
        sendemaate: 'post',
        beskrivelse: 'Varsel om forsinket tegning.',
        dokumentasjon: ['v-1'],
      },
    ]);
    await vi.waitFor(() => expect(sendt.registrert()).toBe(true));
  });

  it('en registrering av varselet som ikke er fylt ut, blir ikke med når TE går tilbake til kravet, og kravet er varselet (U-6, U-13)', async () => {
    const sendt = await kravskjemaet(medGrunnlag);
    await fireEvent.click(
      screen.getByRole('radio', { name: 'Bare varsle etter punkt\u00a033.4, uten dager' })
    );
    await fireEvent.click(
      screen.getByRole('radio', { name: 'Registrer et varsel sendt utenfor løsningen' })
    );
    await fireEvent.click(screen.getByRole('radio', { name: 'Send kravet med dagene' }));
    expect(screen.queryByLabelText('Datoen det ble sendt')).not.toBeInTheDocument();
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
    await skriv(screen.getByLabelText('Datoen det ble sendt'), '2026-10-05');
    await leggVed();
    const gitt = within(screen.getByRole('group', { name: 'Hvordan ble varselet gitt?' }));
    await fireEvent.click(gitt.getByRole('radio', { name: 'Brev' }));
    await fireEvent.click(screen.getByRole('radio', { name: 'Som PDF i e-post' }));
    await skriv(
      screen.getByLabelText('Kort beskrivelse av varselet'),
      'Varsel om forsinket tegning.'
    );
    await seBrevet();
    expect(sendt).toHaveLength(1);
    expect(sendt[0]!.kommando).toMatchObject({
      type: 'krav',
      varsel: {
        sendt: '2026-10-05',
        korrespondansetype: 'brev',
        sendemaate: 'pdf_e_post',
        beskrivelse: 'Varsel om forsinket tegning.',
        dokumentasjon: ['v-1'],
      },
    });
    // Brevet sier når varselet ble gitt (OV-U5).
    expect(JSON.stringify(sendt[0]!.avsnitt)).toMatch(/5\. oktober 2026/);
  });

  it('VS-U34, LV-U42: et varsel gitt før i kravet krever typen, og kravet sender den (C1 i #2056)', async () => {
    const sendt = await kravskjemaet(medGrunnlag);
    await fireEvent.click(
      screen.getByRole('button', { name: 'Varselet er gitt før, utenfor løsningen' })
    );
    await fireEvent.click(screen.getByRole('radio', { name: 'Overtakelse' }));
    await skriv(screen.getByLabelText('Dagene du krever'), '20');
    await skriv(screen.getByRole('textbox', { name: 'Begrunnelse' }), 'Begrunnelse.');
    await skriv(screen.getByLabelText('Datoen det ble sendt'), '2026-10-05');
    await leggVed();
    await skriv(screen.getByLabelText('Kort beskrivelse av varselet'), 'Varsel på e-post.');
    await seBrevet();
    expect(sendt, 'uten typen sendes ingenting').toHaveLength(0);
    const mangler = within(
      screen.getByRole('group', { name: 'Dette mangler før brevet kan lages:' })
    );
    expect(mangler.getByText('Velg hvordan varselet ble gitt.')).toBeInTheDocument();
    const gitt = within(screen.getByRole('group', { name: 'Hvordan ble varselet gitt?' }));
    await fireEvent.click(gitt.getByRole('radio', { name: 'E-post' }));
    await seBrevet();
    expect(sendt).toHaveLength(1);
    expect(sendt[0]!.kommando).toMatchObject({
      varsel: { korrespondansetype: 'e_post', beskrivelse: 'Varsel på e-post.' },
    });
    // OV-U79: bare et brev har sendemåten.
    expect((sendt[0]!.kommando as { varsel: object }).varsel).not.toHaveProperty('sendemaate');
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
    await skriv(screen.getByLabelText('Datoen det ble sendt'), '2026-10-05');
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
      'Svaret er en begrunnelse etter punkt\u00a033.6.2 annet ledd b. For kravet du sender senere, gjelder punkt\u00a033.6.1 (punkt\u00a033.6.2 femte ledd).',
    ]);
  });

  describe('Gjeldende frist og ny dato (U-2, U-5, D-9, KA-U77, KA-U79)', () => {
    /** Frist 1 er forlenget 10 dager i en annen sak og 5 dager i denne saken (KA-U77). */
    const FORLENGET: Fristdato[] = [
      {
        fristId: 1,
        dato: '2027-03-01',
        dagmulktbelagt: false,
        forlengelser: [
          { sakId: 'sak-a', sakskode: null, dager: 10 },
          { sakId: SAK, sakskode: null, dager: 5 },
        ],
      },
      { fristId: 2, dato: '2027-03-20', dagmulktbelagt: false },
    ];

    it('gjeldende frist har forlengelsen i den andre saken, ikke i saken selv, og ny dato er regnet fra den, også i raden (D-9, KA-U77, HF-U5)', async () => {
      await kravskjemaet(medGrunnlag, FORLENGET);
      await fireEvent.click(
        screen.getByRole('radio', { name: '5 Mekanisk ferdigstillelse · 11. mars 2027' })
      );
      const gjeldende = screen.getByText(/^Gjeldende frist 11\. mars 2027/);
      expect(gjeldende).toHaveTextContent('forlenget 10 dager i sak sak-a.');
      expect(gjeldende).not.toHaveTextContent(SAK);
      expect(gjeldende).toHaveTextContent(
        'Den nye datoen forutsetter at dagene du krever, kommer i tillegg til forlengelsen som er avtalt.'
      );
      const feltet = screen.getByLabelText('Dagene du krever');
      expect(feltet.getAttribute('aria-describedby')).toContain(gjeldende.id);
      await skriv(feltet, '20');
      expect(screen.getByText('Ny dato: 31. mars 2027.')).toBeInTheDocument();
      await fireEvent.click(screen.getByRole('button', { name: 'Ferdig' }));
      const raden = screen.getByRole('listitem', { name: '5 Mekanisk ferdigstillelse' });
      expect(raden).toHaveTextContent(/Gjeldende:\s*Gjeldende11\. mars 2027/);
      expect(raden).toHaveTextContent(/Ny dato:\s*Ny dato31\. mars 2027/);
      expect(raden).toHaveTextContent('forlenget 10 dager i sak sak-a');
      expect(raden).not.toHaveTextContent(`i sak ${SAK}`);
    });

    it('tidslinja har den krevde fristen på den nye datoen, i rekkefølgen fristene får hvis kravet godtas (U-5)', async () => {
      await kravskjemaet(medGrunnlag, FORLENGET);
      await fireEvent.click(
        screen.getByRole('radio', { name: '5 Mekanisk ferdigstillelse · 11. mars 2027' })
      );
      await skriv(screen.getByLabelText('Dagene du krever'), '20');
      const tidslinja = within(screen.getByRole('region', { name: 'Tidslinje' }));
      const fristene = within(tidslinja.getByRole('list', { name: 'Fristene i kontrakten' }));
      expect(fristene.getAllByRole('listitem').map((li) => li.textContent?.trim())).toEqual([
        expect.stringMatching(/^20\. mars 2027\s*Overtakelse/),
        expect.stringMatching(
          /^31\. mars 2027\s*5 Mekanisk ferdigstillelse\s*krevd forlenget 20 dager fra 11\. mars 2027/
        ),
      ]);
    });

    it('en annen sak kjernen ikke forstår, gjør gjeldende frist ukjent, og skjemaet viser ingen ny dato (MM-U2)', async () => {
      await kravskjemaet(medGrunnlag, FORLENGET, ['sak-b']);
      await fireEvent.click(
        screen.getByRole('radio', { name: '5 Mekanisk ferdigstillelse · 1. mars 2027' })
      );
      expect(
        screen.getByText(
          'Fristen er 1. mars 2027 i kontrakten. Gjeldende frist kan ikke regnes nå, fordi en annen sak i prosjektet ikke kan leses.'
        )
      ).toBeInTheDocument();
      await skriv(screen.getByLabelText('Dagene du krever'), '20');
      expect(screen.queryByText(/^Ny dato: /)).not.toBeInTheDocument();
      // Tidslinja viser ikke datoen i kontrakten som en ny dato.
      const tidslinja = within(screen.getByRole('region', { name: 'Tidslinje' }));
      expect(
        tidslinja.getByText('krevd forlenget 20 dager · ny dato kan ikke regnes nå')
      ).toBeInTheDocument();
      await fireEvent.click(screen.getByRole('button', { name: 'Ferdig' }));
      const raden = screen.getByRole('listitem', { name: '5 Mekanisk ferdigstillelse' });
      expect(raden).toHaveTextContent(/Gjeldende:\s*Gjeldende–/);
      expect(raden).toHaveTextContent(/Ny dato:\s*Ny datoKan ikke regnes nå/);
    });

    it('en frist som ikke er registrert, har ingen ny dato, og skjemaet sier hvorfor (KA-U79)', async () => {
      await kravskjemaet(medGrunnlag, FORLENGET);
      await fireEvent.click(screen.getByRole('radio', { name: 'En frist som ikke er registrert' }));
      // Før fristen har et navn, heter den «Ny frist», også når den ikke er registrert (U-1).
      expect(screen.queryByText(/Ny frist 0/)).toBeNull();
      expect(screen.getByRole('heading', { name: 'Ny frist' })).toBeInTheDocument();
      const hvorfor = screen.getByText(
        'Gjeldende frist er ikke kjent, fordi fristen ikke er registrert for prosjektet.'
      );
      expect(screen.getByLabelText('Dagene du krever').getAttribute('aria-describedby')).toContain(
        hvorfor.id
      );
      await skriv(screen.getByLabelText('Dagene du krever'), '20');
      expect(screen.queryByText(/^Ny dato: /)).not.toBeInTheDocument();
      await fireEvent.click(screen.getByRole('button', { name: 'Ferdig' }));
      expect(
        screen.getAllByRole('listitem').find((li) => li.classList.contains('frist'))
      ).toHaveTextContent(/Ny dato:\s*Ny datoIkke registrert/);
    });
  });
});
