/**
 * Byggherrens svar bare på varselet når kravet selv er varselet (VS-U96 punkt 38 og 39, K2 i
 * #2456), med kjernen i minnet: per kravpost i vederlagskravet etter punkt 34.3.3 og 34.4, og i
 * fristkravet etter punkt 33.4. Svaret har kravversjonen i `gjelder` og `bare_varselet` (svaret på
 * spørsmål 3 i #2456).
 */

import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/svelte';
import { lagKjernesak } from '#lib/kjernesak/kontekst.svelte.ts';
import { varsleneIVederlagskravet } from '#lib/kjernesak/vederlagskrav.ts';
import { utledJournal } from '#kjerne/kommandoer/skriving.ts';
import { kravposterI } from '#kjerne/spor/vederlag/format.ts';
import { innholdIFristen } from '#kjerne/spor/frist/format.ts';
import { KJERNE } from '#kjerne/versjon.ts';
import type { Journalrad } from '#kjerne/typer.ts';
import {
  MERKING,
  SAK,
  linje,
  medGrunnlag,
  opprettet,
  skrevet,
} from '#lib/kjernesak/__tests__/provejournal.ts';
import type { TilBrevkontrollen } from '#lib/components/varden/Brevkontroll.svelte';
import Varslenesvar from '#lib/components/varden/Varslenesvar.svelte';
import Vardensak from '#lib/components/varden/Vardensak.svelte';
import Varselsvar from '#lib/components/varden/Varselsvar.svelte';
import { brevene } from '#lib/components/varden/lesing.ts';
import { TIDSLINJE, TRAADEN } from '#lib/components/varden/tekster/index.ts';
import { varseletSvaretPaa } from '#lib/kjernesak/vederlagskrav.ts';

afterEach(cleanup);

const REGNINGSARBEID = {
  beskrivelse: 'Pumping',
  oppgjoersform: 'regningsarbeid',
  varsel: { art: 'kravet' },
};
const JUSTERT = {
  beskrivelse: 'Graving',
  oppgjoersform: 'enhetspriser',
  justert: true,
  varsel: { art: 'kravet' },
};
const FAST = { beskrivelse: 'Rigg', oppgjoersform: 'tilbud', beloep: 10000 };

/** Vederlagskravet uten varsel før: kravet er varselet for P1 og P2 (VS-U96 punkt 22). */
const medVederlagskravet = (kravposter: unknown[] = [REGNINGSARBEID, JUSTERT, FAST]) =>
  skrevet(medGrunnlag, 'TE', {
    type: 'krav',
    spor: 'vederlag',
    innhold: { kravposter },
    utdypning: 'Totalentreprenørens begrunnelse for kravet.',
  });
/** Fristkravet uten varsel før: kravet er varselet etter § 33.4 (VS-U96 punkt 7). */
const medFristkravet = () =>
  skrevet(medGrunnlag, 'TE', {
    type: 'krav',
    spor: 'frist',
    innhold: { frister: [{ navn: 'Sluttfristen', dager: 20 }] },
    utdypning: 'Pelingen tar fire uker lenger.',
  });
const kravet = (journal: Journalrad[]) => {
  const k = utledJournal(journal, KJERNE).spor.vederlag.gjeldendeKrav!;
  return { id: k.id, poster: kravposterI(k).map((p) => p.id) };
};

const kjernesakFor = (journal: Journalrad[]) =>
  lagKjernesak({
    sakId: SAK,
    prosjektId: 'p-1',
    part: 'BH',
    hent: async () => ({
      versjon: journal.at(-1)!.versjon,
      part: 'BH',
      visning: null as never,
      journal: journal.map(linje),
      leveringsoppdrag: [],
      catenda_lenke: null,
      sakskode: null,
      kontraktsforkortelse: null,
      kan_foreslaa_sakskode: false,
      merking: MERKING,
    }),
  });

async function skjemaet(journal: Journalrad[]) {
  const kjernesak = kjernesakFor(journal);
  await kjernesak.last();
  const u = kjernesak.utledning!;
  const sendt: TilBrevkontrollen[] = [];
  render(Varslenesvar, {
    kjernesak,
    u,
    varslene: varsleneIVederlagskravet(u, kravet(journal).id)!,
    onbrevkontroll: (k: TilBrevkontrollen) => sendt.push(k),
    onforkast: () => {},
  });
  return sendt;
}

const seBrevet = () =>
  fireEvent.click(screen.getByRole('button', { name: 'Se brevet før sending' }));

it('svaret bare på varselet i kravet kan ta stilling etter punkt 34.1.2 (VS-U100)', async () => {
  const svikt = skrevet([opprettet], 'TE', {
    type: 'krav',
    spor: 'forhold',
    innhold: {
      hovedkategori: 'svikt',
      underkategori: 'grunnforhold',
      klar_over_forholdet: '2026-09-25',
    },
    utdypning: 'Grunnforholdene avviker fra grunnundersøkelsen.',
  });
  const journal = skrevet(svikt, 'TE', {
    type: 'krav',
    spor: 'vederlag',
    innhold: { kravposter: [REGNINGSARBEID] },
  });
  const sendt = await skjemaet(journal);
  expect(screen.getByText(/Varselet gjelder også som varsel om vederlagsjustering/)).toBeInTheDocument();
  await fireEvent.click(screen.getByRole('radio', { name: /Kom for sent etter punkt\s34\.1\.2/ }));
  await fireEvent.click(screen.getByRole('button', { name: 'Varselet kom for sent' }));
  await seBrevet();
  expect(sendt[0]?.kommando).toMatchObject({
    type: 'brev',
    svar: [{
      gjelder: kravet(journal).id,
      bare_varselet: true,
      vurderinger: {
        hovedkrav_varslet_i_tide: false,
        kravposter: [{ gjelder: kravet(journal).poster[0], varslet_i_tide: false }],
      },
    }],
  });
});
const kommandoen = (k: TilBrevkontrollen) =>
  k.kommando as { type: string; erstatter?: string; svar: unknown };
const posten = (betegnelse: string) =>
  within(screen.getByRole('region', { name: new RegExp(`${betegnelse} `) }));

describe('svaret bare på varslene i vederlagskravet, per kravpost (VS-U96 punkt 38)', () => {
  it('ett punkt per kravpost kravet er varselet for, ikke for posten med fast sum (punkt 22 og 38)', async () => {
    await skjemaet(medVederlagskravet());
    expect(
      screen.getByRole('heading', { name: /^Svar på varslene i krav om vederlagsjustering/ })
    ).toBeInTheDocument();
    expect(screen.getByText(/^Du svarer bare på varslene\./)).toBeInTheDocument();
    expect(screen.getByRole('region', { name: /P1 Pumping/ })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: /P2 Graving/ })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: /P3 Rigg/ })).toBeNull();
  });

  it('svaret har kravversjonen i `gjelder`, `bare_varselet` og standpunktet per post, og kjernen godtar det (svaret på spørsmål 3 i #2456)', async () => {
    const journal = medVederlagskravet();
    const { id, poster } = kravet(journal);
    const sendt = await skjemaet(journal);
    await fireEvent.click(posten('P1').getByRole('button', { name: 'Varselet kom for sent' }));
    await fireEvent.click(posten('P2').getByRole('radio', { name: 'Kom for sent' }));
    await fireEvent.click(posten('P2').getByRole('radio', { name: 'Godtar justeringen' }));
    await seBrevet();
    expect(sendt).toHaveLength(1);
    expect(kommandoen(sendt[0]!)).toMatchObject({
      type: 'brev',
      svar: [
        {
          spor: 'vederlag',
          gjelder: id,
          bare_varselet: true,
          resultat: {},
          vurderinger: {
            kravposter: [
              { gjelder: poster[0], varslet_i_tide: false },
              { gjelder: poster[1], varslet_i_tide: false, godtar_justering: true },
            ],
          },
        },
      ],
    });
    const besvart = skrevet(journal, 'BH', kommandoen(sendt[0]!));
    const u = utledJournal(besvart, KJERNE);
    expect(u.spor.vederlag.svarPaaVarsler).toHaveLength(1);
    expect(u.spor.vederlag.svar, 'svaret bare på varslene er ikke et svar på kravet').toEqual([]);
  });

  it('uten standpunkt til noen post vises ikke brevet (punkt 38: minst én kravpost)', async () => {
    const sendt = await skjemaet(medVederlagskravet());
    await seBrevet();
    expect(sendt).toHaveLength(0);
    const lenken = screen.getByRole('link', {
      name: 'Ta stilling til varselet for minst én kravpost.',
    });
    // Lenken i lista fører til beskjeden under innledningen (design-review av #2488).
    const maal = document.getElementById(lenken.getAttribute('href')!.slice(1));
    expect(maal?.textContent).toBe('Ta stilling til varselet for minst én kravpost.');
  });

  it('når byggherren har tatt stilling til varselet for posten etter punkt 34.3.3, er justeringen ikke lenger valgfri (design-review av #2488)', async () => {
    await skjemaet(medVederlagskravet());
    const justeringen = () => posten('P2').getByRole('group', { name: /Justeringen/ });
    expect(within(justeringen()).getByText('Valgfri')).toBeInTheDocument();
    await fireEvent.click(posten('P2').getByRole('radio', { name: 'Kom for sent' }));
    expect(within(justeringen()).queryByText('Valgfri')).toBeNull();
  });

  it('har byggherren tatt stilling til varselet for posten etter punkt 34.3.3, må justeringen også besvares (VS-U96 punkt 30)', async () => {
    const sendt = await skjemaet(medVederlagskravet());
    await fireEvent.click(posten('P2').getByRole('radio', { name: 'Kom i tide' }));
    await seBrevet();
    expect(sendt).toHaveLength(0);
    expect(
      screen.getByRole('link', { name: 'Velg om du godtar justeringen av enhetsprisene.' })
    ).toBeInTheDocument();
  });

  it('et nytt svar erstatter det forrige og gjentar innsigelsen for posten (VS-U96 punkt 33, 34 og 38)', async () => {
    const journal = medVederlagskravet();
    const { id, poster } = kravet(journal);
    const besvart = skrevet(journal, 'BH', {
      type: 'brev',
      svar: [
        {
          spor: 'vederlag',
          gjelder: id,
          bare_varselet: true,
          regelversjon: KJERNE.regler.versjon,
          vurderinger: { kravposter: [{ gjelder: poster[0], varslet_i_tide: false }] },
          resultat: {},
        },
      ],
    });
    const forrige = utledJournal(besvart, KJERNE).spor.vederlag.svarPaaVarsler[0]!.id;
    const sendt = await skjemaet(besvart);
    expect(
      posten('P1').getByText(/at varselet kom for sent\. Svaret gjentar innsigelsen\.$/)
    ).toBeInTheDocument();
    await seBrevet();
    expect(kommandoen(sendt[0]!)).toMatchObject({
      type: 'revisjon',
      erstatter: forrige,
      svar: {
        gjelder: id,
        bare_varselet: true,
        vurderinger: { kravposter: [{ gjelder: poster[0], varslet_i_tide: false }] },
      },
    });
    expect(() => skrevet(besvart, 'BH', kommandoen(sendt[0]!))).not.toThrow();
  });
});

describe('handlingen ved kravet i Varden (VS-U96 punkt 38 og 39, U-16 i BF-44)', () => {
  it('i vederlaget står «Svar på varslene i kravet» ved siden av «Svar på kravet», og åpner skjemaet', async () => {
    const kjernesak = kjernesakFor(medVederlagskravet());
    await kjernesak.last();
    render(Vardensak, { kjernesak, spor: 'vederlag' });
    const kravet = await screen.findByRole('button', { name: 'Svar på kravet' });
    // Samme knappegruppe, så de står vannrett ved siden av hverandre (oppdragsgiver 27.11, #2493).
    expect(screen.getByRole('button', { name: 'Svar på varslene i kravet' }).parentElement).toBe(
      kravet.parentElement
    );
    await fireEvent.click(screen.getByRole('button', { name: 'Svar på varslene i kravet' }));
    expect(
      await screen.findByRole('heading', { name: /^Svar på varslene i krav om vederlagsjustering/ })
    ).toBeInTheDocument();
  });

  it('med én post heter handlingen etter varselet for posten', async () => {
    const kjernesak = kjernesakFor(medVederlagskravet([REGNINGSARBEID, FAST]));
    await kjernesak.last();
    render(Vardensak, { kjernesak, spor: 'vederlag' });
    expect(
      await screen.findByRole('button', { name: 'Svar på varselet om regningsarbeid' })
    ).toBeInTheDocument();
  });

  it('i fristen står «Svar på varselet om fristforlengelse» ved siden av «Svar på kravet», og svarplikten for kravet står (punkt 39)', async () => {
    const kjernesak = kjernesakFor(medFristkravet());
    await kjernesak.last();
    render(Vardensak, { kjernesak, spor: 'frist' });
    expect(await screen.findByRole('button', { name: 'Svar på kravet' })).toBeInTheDocument();
    await fireEvent.click(
      screen.getByRole('button', { name: 'Svar på varselet om fristforlengelse' })
    );
    expect(
      await screen.findByRole('heading', { name: /^Svar på varsel om fristforlengelse/ })
    ).toBeInTheDocument();
  });
});

describe('funnene fra /code-review av #2488', () => {
  it('tittelen følger postene svaret har standpunkt til, som brevtittelen i kjernen (`svaretGjelder`)', async () => {
    await skjemaet(medVederlagskravet());
    expect(
      screen.getByRole('heading', { name: /^Svar på varslene i krav om vederlagsjustering/ })
    ).toBeInTheDocument();
    await fireEvent.click(posten('P1').getByRole('button', { name: 'Varselet kom for sent' }));
    expect(screen.queryByRole('heading', { name: /^Svar på varslene/ })).toBeNull();
    expect(screen.getByRole('heading', { name: /^Svar på varsel / })).toBeInTheDocument();
  });

  it('svaret bare på varselet i en ny versjon av fristkravet svarer på brevet med den versjonen (VS-U96 punkt 38)', async () => {
    const v1 = medFristkravet();
    const v2 = skrevet(v1, 'TE', {
      type: 'krav',
      spor: 'frist',
      innhold: {
        frister: [
          {
            id: innholdIFristen(utledJournal(v1, KJERNE).spor.frist.gjeldendeKrav!).frister[0]!.id,
            navn: 'Sluttfristen',
            dager: 25,
          },
        ],
      },
      utdypning: 'Pelingen tar fem uker lenger.',
    });
    const kjernesak = kjernesakFor(v2);
    await kjernesak.last();
    const u = kjernesak.utledning!;
    const krav = u.spor.frist.gjeldendeKrav!;
    render(Varselsvar, {
      kjernesak,
      u,
      varselet: varseletSvaretPaa(u, krav.id)!,
      onbrevkontroll: () => {},
      onforkast: () => {},
    });
    const nummer = brevene(u).find((b) => b.id === krav.dokument)!.nummer;
    expect(screen.getByText(new RegExp(`^Svarer på brev ${nummer} `))).toBeInTheDocument();
  });

  it('brevtråden og tidslinja kaller et brev med svar bare på varslene i både vederlaget og fristen etter varslene (#2481)', () => {
    const vederlag = medVederlagskravet([REGNINGSARBEID, FAST]);
    const journal = skrevet(vederlag, 'TE', {
      type: 'krav',
      spor: 'frist',
      innhold: { frister: [{ navn: 'Sluttfristen', dager: 20 }] },
      utdypning: 'Pelingen tar fire uker lenger.',
    });
    const u = utledJournal(journal, KJERNE);
    const { id, poster } = kravet(journal);
    const besvart = skrevet(journal, 'BH', {
      type: 'brev',
      svar: [
        {
          spor: 'vederlag',
          gjelder: id,
          bare_varselet: true,
          regelversjon: KJERNE.regler.versjon,
          vurderinger: { kravposter: [{ gjelder: poster[0], varslet_i_tide: false }] },
          resultat: {},
        },
        {
          spor: 'frist',
          gjelder: u.spor.frist.gjeldendeKrav!.id,
          bare_varselet: true,
          regelversjon: KJERNE.regler.versjon,
          vurderinger: { varslet_i_tide: false },
          resultat: {},
        },
      ],
    });
    const brevet = brevene(utledJournal(besvart, KJERNE)).at(-1)!;
    expect(TRAADEN.hva(brevet)).not.toMatch(/krav om/);
    expect(TRAADEN.hva(brevet)).toMatch(/^Svar på varsel .* og varsel om fristforlengelse$/);
    expect(TIDSLINJE.hva(brevet)).toMatch(/^Svar på varselet .* og varselet om fristforlengelse$/);
  });
});
