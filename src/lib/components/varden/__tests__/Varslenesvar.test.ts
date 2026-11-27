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
import { KJERNE } from '#kjerne/versjon.ts';
import type { Journalrad } from '#kjerne/typer.ts';
import {
  MERKING,
  SAK,
  linje,
  medGrunnlag,
  skrevet,
} from '#lib/kjernesak/__tests__/provejournal.ts';
import type { TilBrevkontrollen } from '#lib/components/varden/Brevkontroll.svelte';
import Varslenesvar from '#lib/components/varden/Varslenesvar.svelte';
import Vardensak from '#lib/components/varden/Vardensak.svelte';

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
    expect(
      screen.getByRole('link', { name: 'Ta stilling til varselet for minst én kravpost.' })
    ).toBeInTheDocument();
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
    expect(await screen.findByRole('button', { name: 'Svar på kravet' })).toBeInTheDocument();
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
