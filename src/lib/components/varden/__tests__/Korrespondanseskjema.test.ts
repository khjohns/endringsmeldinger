/**
 * Korrespondanse parten har sendt utenfor løsningen, lagt til i saken (OV-U79, OV-U80, OV-U98,
 * arbeidsvalget 16.11 i #807), med kjernen i minnet: valgene parten har i «Hva er det etter
 * kontrakten?», dokumentasjonen og aksepten lagt til herfra, kravet og svaret på forholdet lagt til
 * fra skjemaet for dem, og merknadene etter OV-U102 og OV-U104 lest av kjernens forhåndsvisning.
 */

import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/svelte';
import { lagKjernesak } from '$lib/kjernesak/kontekst.svelte';
import type { Journalrad, Part, Spor } from '$kjerne/typer';
import {
  MERKING,
  SAK,
  linje,
  medGrunnlag,
  medVederlag,
  skrevet,
} from '$lib/kjernesak/__tests__/provejournal';
import { KJERNE } from '$kjerne/versjon';
import { utledJournal } from '$kjerne/kommandoer/skriving';
import Korrespondanseskjema from '$lib/components/varden/Korrespondanseskjema.svelte';
import Forholdssvar from '$lib/components/varden/Forholdssvar.svelte';
import Fristkrav from '$lib/components/varden/Fristkrav.svelte';
import Vederlagskrav from '$lib/components/varden/Vederlagskrav.svelte';
import Lagttilmerknader from '$lib/components/varden/Lagttilmerknader.svelte';
import type { Korrespondansevalg } from '$lib/components/varden/korrespondansen';
import { kravposterI } from '$kjerne/spor/vederlag/format';
import { LEGG_TIL } from '$lib/components/varden/tekster';

/** Byggherren godkjenner 200 000 av 250 000 kr, så aksepten gir enighet (KA-U1). */
const medDelvisSvar = (() => {
  const krav = utledJournal(medVederlag, KJERNE).spor.vederlag.gjeldendeKrav!;
  return skrevet(medVederlag, 'BH', {
    type: 'brev',
    svar: [
      {
        spor: 'vederlag',
        gjelder: krav.id,
        regelversjon: KJERNE.regler.versjon,
        vurderinger: {
          kravposter: [
            {
              gjelder: kravposterI(krav)[0]!.id,
              vurdering: 'delvis',
              godkjent_beloep: 200000,
              aksepterer: true,
            },
          ],
        },
        resultat: { resultat: 'delvis_godkjent', godkjent_beloep: 200000 },
      },
    ],
  });
})();

const BREVET = { vedlegg_id: 'v-1', filnavn: 'brevet.pdf', innhold_sha256: '0'.repeat(64) };

async function saken(journal: Journalrad[], part: Part, merking: Record<string, unknown> = {}) {
  const tilServeren: Record<string, unknown>[] = [];
  const kjernesak = lagKjernesak({
    sakId: SAK,
    prosjektId: 'p-1',
    part,
    hent: async () => ({
      versjon: journal.at(-1)!.versjon,
      part,
      visning: null as never,
      journal: journal.map(linje),
      leveringsoppdrag: [],
      catenda_lenke: null,
      merking: { ...MERKING, ...merking },
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

async function skjemaet(journal: Journalrad[], part: Part, spor: Spor) {
  const { kjernesak, tilServeren } = await saken(journal, part);
  const neste: string[] = [];
  const lagtTil: string[] = [];
  render(Korrespondanseskjema, {
    kjernesak,
    u: kjernesak.utledning!,
    spor,
    onneste: (k: string) => neste.push(k),
    onlagttil: (k: string) => lagtTil.push(k),
    onavbryt: () => {},
  });
  return { tilServeren, neste, lagtTil };
}

const radio = (navn: string) => fireEvent.click(screen.getByRole('radio', { name: navn }));
const skriv = (felt: HTMLElement, verdi: string) =>
  fireEvent.input(felt, { target: { value: verdi } });

/** Fyller ut korrespondansen: et brev per post, datoen, dokumentet og beskrivelsen. */
async function fyllUt(dato: string) {
  await radio('Brev');
  await radio('Per post');
  await skriv(screen.getByLabelText('Datoen det ble sendt'), dato);
  const fil = new File(['%PDF-1.4'], 'brevet.pdf', { type: 'application/pdf' });
  await fireEvent.change(document.querySelector('input[type=file]')!, {
    target: { files: [fil] },
  });
  await screen.findByText('brevet.pdf');
  await skriv(screen.getByRole('textbox', { name: /Kort beskrivelse/ }), '  Brevet om pelingen. ');
}

const KORRESPONDANSEN = {
  sendt: '2026-10-16',
  korrespondansetype: 'brev',
  sendemaate: 'post',
  beskrivelse: 'Brevet om pelingen.',
  dokumentasjon: ['v-1'],
};

const valgene = () =>
  screen.getByRole('group', { name: LEGG_TIL.kategorien }).querySelectorAll('input[type=radio]');

afterEach(cleanup);

describe('korrespondanse lagt til i saken (OV-U79, OV-U80)', () => {
  it('totalentreprenøren kan legge til dokumentasjon, et krav og en aksept i vederlaget, men ikke et svar (OV-U80)', async () => {
    await skjemaet(medDelvisSvar, 'TE', 'vederlag');
    const tekster = [...valgene()].map((r) => r.parentElement!.textContent!.trim());
    expect(tekster).toEqual([
      LEGG_TIL.kategorier.dokumentasjon,
      LEGG_TIL.kategorier.krav,
      LEGG_TIL.kategorier.aksept,
    ]);
  });

  it('byggherren kan legge til dokumentasjon og et svar på forholdet, men ikke et krav eller en aksept (OV-U80)', async () => {
    await skjemaet(medGrunnlag, 'BH', 'forhold');
    const tekster = [...valgene()].map((r) => r.parentElement!.textContent!.trim());
    expect(tekster).toEqual([LEGG_TIL.kategorier.dokumentasjon, LEGG_TIL.kategorier.svar]);
  });

  it('uten kategorien legges ingenting til, og det som mangler står øverst', async () => {
    const { tilServeren } = await skjemaet(medVederlag, 'TE', 'vederlag');
    await fireEvent.click(screen.getByRole('button', { name: LEGG_TIL.leggTil }));
    expect(tilServeren).toEqual([]);
    expect(screen.getByText(LEGG_TIL.kategorienMangler, { selector: 'a' })).toBeInTheDocument();
  });

  it('dokumentasjonen sendes som et registrert brev ved sporet, med typen, sendemåten, datoen, beskrivelsen og dokumentet (OV-U4, OV-U79)', async () => {
    const { tilServeren, lagtTil } = await skjemaet(medVederlag, 'TE', 'vederlag');
    await fyllUt('2026-10-16');
    await radio(LEGG_TIL.kategorier.dokumentasjon);
    await fireEvent.click(screen.getByRole('button', { name: LEGG_TIL.leggTil }));
    expect(tilServeren).toEqual([
      { type: 'registrert_brev', spor: ['vederlag'], ...KORRESPONDANSEN },
    ]);
    await vi.waitFor(() => expect(lagtTil).toEqual(['dokumentasjon']));
  });

  it('kravet går videre til kravskjemaet i stedet for å legges til her (OV-U80)', async () => {
    const { tilServeren, neste } = await skjemaet(medVederlag, 'TE', 'vederlag');
    await fyllUt('2026-10-16');
    await radio(LEGG_TIL.kategorier.krav);
    expect(screen.getByText(LEGG_TIL.neste.krav)).toBeInTheDocument();
    await fireEvent.click(screen.getByRole('button', { name: LEGG_TIL.gaaVidere }));
    expect(neste).toEqual(['krav']);
    expect(tilServeren).toEqual([]);
  });

  it('aksepten sendt samme dag som svaret legges til og gjelder svaret, og skjemaet sier at rekkefølgen ikke er kjent (OV-U98, OV-U104)', async () => {
    const { tilServeren, lagtTil } = await skjemaet(medDelvisSvar, 'TE', 'vederlag');
    await fyllUt('2026-10-16');
    await radio(LEGG_TIL.kategorier.aksept);
    const svaret = screen.getAllByRole('radio').at(-1)!;
    await fireEvent.click(svaret);
    // Kjernen sammenlikner aksepten med svaret og kravet det svarte på, begge sendt 16. oktober.
    expect(screen.getAllByText(/^Sendt samme dag som brev/)).toHaveLength(2);
    await fireEvent.click(screen.getByRole('button', { name: LEGG_TIL.leggTil }));
    expect(tilServeren).toHaveLength(1);
    expect(tilServeren[0]).toMatchObject({ type: 'aksept', spor: 'vederlag', ...KORRESPONDANSEN });
    await vi.waitFor(() => expect(lagtTil).toEqual(['aksept']));
  });

  it('en aksept sendt før byggherren svarte, avvises av kjernen, og skjemaet viser hvorfor (OV-U98)', async () => {
    const { tilServeren, lagtTil } = await skjemaet(medDelvisSvar, 'TE', 'vederlag');
    await fyllUt('2026-10-15');
    await radio(LEGG_TIL.kategorier.aksept);
    await fireEvent.click(screen.getAllByRole('radio').at(-1)!);
    await fireEvent.click(screen.getByRole('button', { name: LEGG_TIL.leggTil }));
    expect(tilServeren).toEqual([]);
    expect(lagtTil).toEqual([]);
    expect(screen.getByText(/gjeldende svar da aksepten ble sendt/)).toBeInTheDocument();
  });
});

describe('merknadene før kravet legges til (OV-U102, OV-U104)', () => {
  // KA-U56: kravet har postene i det siste kravet.
  const kravet = (sendt: string, post: string) => ({
    type: 'krav',
    spor: 'vederlag',
    innhold: {
      kravposter: [
        { id: post, beskrivelse: 'Kravposten', oppgjoersform: 'tilbud', beloep: 100000 },
      ],
    },
    ...KORRESPONDANSEN,
    sendt,
  });

  async function merknadene(sendt: string) {
    const { kjernesak } = await saken(medVederlag, 'TE');
    const post = kravposterI(kjernesak.utledning!.spor.vederlag.gjeldendeKrav!)[0]!.id;
    render(Lagttilmerknader, {
      kjernesak,
      u: kjernesak.utledning!,
      spor: 'vederlag',
      kommando: kravet(sendt, post),
      vedlegg: new Map([['v-1', BREVET]]),
    });
  }

  it('et krav sendt før totalentreprenørens siste krav blir ikke gjeldende, og skjemaet sier det (OV-U102)', async () => {
    await merknadene('2026-10-10');
    expect(screen.getByText(LEGG_TIL.kravUtenforRekken)).toBeInTheDocument();
  });

  it('et krav sendt samme dag som det siste blir gjeldende, og skjemaet sier at rekkefølgen ikke er kjent (OV-U104)', async () => {
    await merknadene('2026-10-16');
    expect(screen.queryByText(LEGG_TIL.kravUtenforRekken)).not.toBeInTheDocument();
    expect(screen.getByText(/^Sendt samme dag som brev/)).toBeInTheDocument();
  });

  it('kontrollsak: et krav sendt etter det siste har ingen merknad', async () => {
    await merknadene('2026-10-20');
    expect(screen.queryByText(LEGG_TIL.kravUtenforRekken)).not.toBeInTheDocument();
    expect(screen.queryByText(/^Sendt samme dag som/)).not.toBeInTheDocument();
  });
});

describe('svaret på forholdet lagt til (OV-U80, OV-U98, OV-U101)', () => {
  const korrespondansen = (dato: string): Korrespondansevalg => ({
    type: 'brev',
    sendemaate: 'post',
    dato,
    vedlegg: [{ ...BREVET, stoerrelse: 8 }],
    beskrivelse: 'Brevet om pelingen.',
  });

  async function svaret(dato: string) {
    const { kjernesak, tilServeren } = await saken(medGrunnlag, 'BH');
    let lagtTil = false;
    render(Forholdssvar, {
      kjernesak,
      u: kjernesak.utledning!,
      onbrevkontroll: () => {
        throw new Error('Et svar lagt til går ikke til brevkontrollen');
      },
      onforkast: () => {},
      lagtTil: korrespondansen(dato),
      onendre: () => {},
      onlagttil: () => (lagtTil = true),
    });
    return { tilServeren, lagtTil: () => lagtTil };
  }

  it('skjemaet viser til korrespondansen, har ingen begrunnelse eller forbehold, og sender svaret med datoen uten brevtekst (KA-U24)', async () => {
    const { tilServeren, lagtTil } = await svaret('2026-10-16');
    expect(screen.getByText(/^Legges til fra byggherrens brev av 16\. okt/)).toBeInTheDocument();
    expect(screen.queryByLabelText(/Forbehold/)).not.toBeInTheDocument();
    await radio('Nei');
    await radio('Enig, endringsordre');
    await fireEvent.click(screen.getAllByRole('button', { name: LEGG_TIL.leggTilSvaret })[0]!);
    expect(tilServeren).toHaveLength(1);
    const sendt = tilServeren[0] as { svar: Record<string, unknown>[]; brevtekst?: unknown };
    expect(sendt).toMatchObject({ type: 'brev', ...KORRESPONDANSEN });
    expect(sendt.brevtekst).toBeUndefined();
    expect(sendt.svar[0]).not.toHaveProperty('utdypning');
    expect(sendt.svar[0]).not.toHaveProperty('utdypninger');
    await vi.waitFor(() => expect(lagtTil()).toBe(true));
  });

  it('et svar sendt før påberopelsen avvises av kjernen og legges ikke til (OV-U98)', async () => {
    const { tilServeren, lagtTil } = await svaret('2026-10-01');
    await radio('Nei');
    await radio('Enig, endringsordre');
    await fireEvent.click(screen.getAllByRole('button', { name: LEGG_TIL.leggTilSvaret })[0]!);
    expect(tilServeren).toEqual([]);
    expect(lagtTil()).toBe(false);
  });
});

describe('kravet lagt til (OV-U80, OV-U98, KA-U24)', () => {
  const korrespondansen: Korrespondansevalg = {
    type: 'e_post',
    sendemaate: null,
    dato: '2026-10-16',
    vedlegg: [{ ...BREVET, stoerrelse: 8 }],
    beskrivelse: 'Kravet om dagene.',
  };
  const REGISTRERT = {
    sendt: '2026-10-16',
    korrespondansetype: 'e_post',
    beskrivelse: 'Kravet om dagene.',
    dokumentasjon: ['v-1'],
  };

  it('fristkravet har verken varselet eller begrunnelsen, og sendes med datoen uten tekst fra løsningen', async () => {
    const { kjernesak, tilServeren } = await saken(medGrunnlag, 'TE', {
      kontraktsfrister: [{ fristId: 1, nummer: '5', navn: 'Mekanisk ferdigstillelse' }],
    });
    let lagtTil = false;
    render(Fristkrav, {
      kjernesak,
      u: kjernesak.utledning!,
      onbrevkontroll: () => {
        throw new Error('Et krav lagt til går ikke til brevkontrollen');
      },
      onforkast: () => {},
      onregistrert: () => {},
      lagtTil: korrespondansen,
      onlagttil: () => (lagtTil = true),
    });
    expect(
      screen.getByText(/^Legges til fra totalentreprenørens e-post av 16\. okt/)
    ).toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: 'Begrunnelse' })).not.toBeInTheDocument();
    expect(screen.queryByText('Dette kravet er varselet.')).not.toBeInTheDocument();
    await radio('5 Mekanisk ferdigstillelse');
    await skriv(screen.getByLabelText('Dagene du krever'), '25');
    await fireEvent.click(screen.getAllByRole('button', { name: LEGG_TIL.leggTilKravet })[0]!);
    expect(tilServeren).toEqual([
      {
        type: 'krav',
        spor: 'frist',
        innhold: { frister: [{ frist_id: 1, dager: 25 }] },
        ...REGISTRERT,
      },
    ]);
    await vi.waitFor(() => expect(lagtTil).toBe(true));
  });

  it('vederlagskravet har ikke forbeholdet, og sendes med datoen', async () => {
    const { kjernesak, tilServeren } = await saken(medVederlag, 'TE');
    render(Vederlagskrav, {
      kjernesak,
      u: kjernesak.utledning!,
      onbrevkontroll: () => {
        throw new Error('Et krav lagt til går ikke til brevkontrollen');
      },
      onforkast: () => {},
      lagtTil: korrespondansen,
      onlagttil: () => {},
    });
    expect(screen.queryByLabelText(/Forbehold/)).not.toBeInTheDocument();
    await fireEvent.click(screen.getAllByRole('button', { name: LEGG_TIL.leggTilKravet })[0]!);
    expect(tilServeren).toHaveLength(1);
    expect(tilServeren[0]).toMatchObject({ type: 'krav', spor: 'vederlag', ...REGISTRERT });
    expect(tilServeren[0]).not.toHaveProperty('forbehold');
  });
});
