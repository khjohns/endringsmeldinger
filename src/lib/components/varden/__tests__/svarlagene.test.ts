/**
 * Lagene i vederlagssvaret klassifiserer innsigelsene med vederlagets predikat i kjernen, ikke med
 * fristens (#2242, kravet fra reviewet av #2249 22.11). Fristens predikat er byttet ut med et som
 * aldri gir en innsigelse, så prøven blir rød hvis vederlaget leser det igjen. Vilkåret etter en
 * innsigelse mot beregningsregelen står ved posten, ikke på laget (svar A 24.11 i #2242).
 */

import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { minnebane } from '#kjerne/tester/bane.ts';
import { kjoer, type Forloep } from '#kjerne/tester/kjoerer.ts';
import type { Handling } from '#kjerne/tester/klient.ts';
import { START } from '#kjerne/tester/brukerforloep.ts';
import { testklokke } from '#kjerne/tester/testmiljoe.ts';
import { kravetOgSvaret } from '#lib/components/varden/vederlagsoversikt.ts';
import KravetOgSvaret from '#lib/components/varden/KravetOgSvaret.svelte';
import { lagKjernesak } from '#lib/kjernesak/kontekst.svelte.ts';
import {
  MERKING,
  SAK,
  linje,
  medVederlag,
  skrevet,
} from '#lib/kjernesak/__tests__/provejournal.ts';
import { utledJournal } from '#kjerne/kommandoer/skriving.ts';
import { kravposterI } from '#kjerne/spor/vederlag/format.ts';
import { KJERNE } from '#kjerne/versjon.ts';
import { cleanup, render, screen, within } from '@testing-library/svelte';
import { brevene, standpunktene } from '#lib/components/varden/lesing.ts';
import { leselinjene } from '#lib/components/varden/tekster/index.ts';
import { VEDERLAGET } from '#lib/components/varden/tekster/vederlaget.ts';
import { innsigelsenIFristen } from '#kjerne/spor/frist/format.ts';

vi.mock('#kjerne/spor/frist/format.ts', { spy: true });

afterEach(() => {
  vi.restoreAllMocks();
  cleanup();
});

const BF44 = JSON.parse(readFileSync('docs/domenetabell/brukerforlop/BF-44.json', 'utf8')) as {
  steg: Handling[];
};

describe('Lagene i vederlagssvaret (#2242)', () => {
  it('vilkåret for lagene etter innsigelsene om varselet kommer fra vederlagets predikat, også når fristens predikat ikke gir noen innsigelse (OV-U32, LV-U34)', async () => {
    const forloep: Forloep = {
      id: 'svarlagene',
      rader: [],
      start: null,
      steg: BF44.steg,
      kontroller: [],
    };
    const u = await (
      await kjoer(forloep, minnebane({ sakstittel: 'Pelingen' }), {
        valg: { klokke: testklokke(START) },
      })
    ).utledning();
    // Byttes etter kjøringen, så bare lesingen i visningen rammes, ikke kjernen.
    vi.mocked(innsigelsenIFristen).mockReturnValue(null);
    expect(kravetOgSvaret(u, brevene(u))!.lagene.map((l) => l.vilkaar)).toEqual([
      [],
      [{ art: 'varsel', hjemmel: '34.1.2' }],
      [{ art: 'varsel', hjemmel: '34.1.3' }],
    ]);
    // Punktene ved svarskjemaet leser lagene gjennom `standpunktene`.
    const svar = Object.values(u.svar).find((b) => b.svar.spor === 'vederlag')!.svar;
    expect(
      standpunktene(svar, u).flatMap((l) => ('vilkaar' in l && l.vilkaar ? [l.vilkaar] : []))
    ).toContainEqual([{ art: 'varsel', hjemmel: '34.1.2' }]);
  });
});

/** Et krav med én post etter enhetspriser med justering, og byggherrens svar på posten. */
async function medBeregningsregel(vurdering: Record<string, unknown>) {
  const krav = skrevet(medVederlag.slice(0, -1), 'TE', {
    type: 'krav',
    spor: 'vederlag',
    innhold: {
      kravposter: [{ beskrivelse: 'Spunt', oppgjoersform: 'enhetspriser', justert: true }],
    },
  });
  const v = utledJournal(krav, KJERNE).spor.vederlag.gjeldendeKrav!;
  const journal = skrevet(krav, 'BH', {
    type: 'brev',
    svar: [
      {
        spor: 'vederlag',
        gjelder: v.id,
        regelversjon: KJERNE.regler.versjon,
        vurderinger: { kravposter: [{ gjelder: kravposterI(v)[0]!.id, ...vurdering }] },
        resultat: { resultat: 'delvis_godkjent', godkjent_beloep: 0 },
        utdypning: 'Byggherren godtar ikke beregningsregelen.',
      },
    ],
  });
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
      merking: MERKING,
    }),
  });
  await kjernesak.last();
  const u = kjernesak.utledning!;
  return { u, k: kravetOgSvaret(u, brevene(u))! };
}

describe('Vilkåret ved posten etter en innsigelse mot beregningsregelen (svar A 24.11 i #2242)', () => {
  it('standpunktet til justeringen står i laget etter regelen, så posten i tabellen «Per post» har vilkåret, og laget i kortet har det ikke (OV-U32, lagIKravposten)', async () => {
    const { u, k } = await medBeregningsregel({
      aksepterer: false,
      oensket_oppgjoersform: 'regningsarbeid',
      godtar_justering: false,
    });
    expect(k.poster.map((p) => p.innsigelser)).toEqual([['beregningsregel']]);
    expect(k.lagene.map((l) => l.vilkaar)).toEqual([[], []]);
    render(KravetOgSvaret, { k, u, alle: brevene(u) });
    const tabell = screen.getByRole('table', { name: 'Per post' });
    expect(
      within(tabell).getByText('Hvis innsigelsen mot beregningsregelen ikke fører frem')
    ).toBeTruthy();
  });

  it('uten et standpunkt til posten i et senere lag har posten ikke vilkåret (kontrollsak)', async () => {
    const { k } = await medBeregningsregel({
      aksepterer: false,
      oensket_oppgjoersform: 'regningsarbeid',
    });
    expect(k.lagene).toHaveLength(1);
    expect(k.poster.map((p) => p.innsigelser)).toEqual([[]]);
  });
});

/** Leselinjen for den lukkede kravposten i svarskjemaet, slik `Vederlagssvar.svelte` lager den. */
function leselinjenFor(u: Awaited<ReturnType<typeof medBeregningsregel>>['u']) {
  const b = Object.values(u.svar).find((x) => x.svar.spor === 'vederlag')!.svar;
  const post = kravposterI(u.spor.vederlag.gjeldendeKrav!)[0]!;
  return leselinjene(standpunktene(b, u), post, VEDERLAGET.lagetVilkaar);
}

describe('Leselinjen for en lukket kravpost med en innsigelse mot beregningsregelen (#2338)', () => {
  it('byggherren mener regningsarbeid og gjør subsidiært gjeldende at varselet etter punkt 34.3.3 kom for sent: varselinnsigelsen står under vilkåret om beregningsregelen (VS-U56, OV-U32)', async () => {
    const { u, k } = await medBeregningsregel({
      aksepterer: false,
      oensket_oppgjoersform: 'regningsarbeid',
      varslet_i_tide: false,
      godtar_justering: false,
    });
    const linjer = leselinjenFor(u);
    const vilkaar = linjer.indexOf('Hvis innsigelsen mot beregningsregelen ikke fører frem');
    expect(vilkaar).toBeGreaterThan(0);
    expect(linjer.slice(vilkaar + 1).some((l) => l.includes('34.3.3'))).toBe(true);
    expect(linjer).toContain(
      'Hvis heller ikke innsigelsen om at varselet etter punkt\u00a034.3.3 kom for sent fører frem'
    );
    // Laget i kortet har ikke vilkåret; det står ved posten (svar A 24.11 i #2242). Det første
    // vilkåret på laget sier derfor ikke «heller ikke» (LV-U4 punkt 4, #2280).
    expect(k.lagene.map((l) => [l.vilkaar.map((i) => i.art), l.heller])).toEqual([
      [[], false],
      [[], false],
      [['varsel'], false],
    ]);
  });

  it('byggherren godtar beregningsregelen: leselinjen har ikke vilkåret (kontrollsak)', async () => {
    const { u } = await medBeregningsregel({
      aksepterer: true,
      godtar_justering: true,
      varslet_i_tide: false,
    });
    expect(leselinjenFor(u)).not.toContain(
      'Hvis innsigelsen mot beregningsregelen ikke fører frem'
    );
  });
});
