/**
 * Strukturen i byggherrens svar (#2337): ett punkt per post (LV-U78), lagslinjen med navnet på
 * innsigelsen i det nærmeste laget foran som rammer standpunktet (LV-U79, OV-U117), én del per
 * krav med tittelen som nevner alle kravene (LV-U80), høyst ett punkt «Forbehold», sist i brevet
 * (LV-U81), og «Prinsipalt» på avslaget av forholdet (LV-U82). Saken i minnet er `sak()` i
 * `brevsak.ts`, og tilfellene er brevene i sammenstillingen i #2337.
 */

import { describe, expect, it } from 'vitest';
import { lesJournal } from '../format/leser.ts';
import { regnUtSvar } from '../frosset/utregning.ts';
import { erLagslinje, FORBEHOLDET as PUNKTET_FORBEHOLD } from '../frosset/tekst.ts';
import { UgyldigVurdering } from '../regler/feil.ts';
import { kravposterI } from '../spor/vederlag/format.ts';
import type { Avsnitt, Journalrad } from '../typer.ts';
import { KJERNE } from '../versjon.ts';
import {
  type Data,
  DELEN,
  FORBEHOLD_FOR,
  FORBEHOLDET,
  FRISTKRAV,
  MOT,
  PAABEROPELSE,
  sak,
  svar,
  tekst,
} from './brevsak.ts';

type Saken = ReturnType<typeof sak>;

const FORBEHOLD_V = 'Byggherrens forbehold for hele svaret på vederlagskravet.';
const FORBEHOLD_F = 'Byggherrens forbehold for hele svaret på fristkravet.';

const vederlagskrav = (kravposter: Data[], rest: Data = {}) => ({
  type: 'krav',
  spor: 'vederlag',
  innhold: { kravposter, ...rest },
  utdypning: 'Totalentreprenørens begrunnelse for kravet.',
});
const justert = (beskrivelse: string) => ({
  beskrivelse,
  oppgjoersform: 'enhetspriser',
  justert: true,
});
const fastSum = (beskrivelse: string, beloep: number) => ({
  beskrivelse,
  oppgjoersform: 'tilbud',
  beloep,
});

/** Svaret på vederlagskravet med vurderingene per kravpost og resultatet fra regelen. */
function vederlagssvar(s: Saken, kravposter: Record<string, Data>, resten: Data = {}) {
  const u = s.u();
  const k = u.spor.vederlag.gjeldendeKrav!;
  const v = {
    ...resten,
    kravposter: kravposterI(k).map((p) => ({ gjelder: p.id, ...kravposter[p.betegnelse] })),
  };
  let resultat: Data = {};
  try {
    const r = regnUtSvar(
      'vederlag',
      v,
      { krav: k, paaberopelse: u.spor.forhold.gjeldendeKrav },
      KJERNE.regler
    );
    resultat = { resultat: r.resultat, godkjent_beloep: r.godkjent_beloep };
    if ('subsidiaert_godkjent_beloep' in r)
      resultat.subsidiaert_godkjent_beloep = r.subsidiaert_godkjent_beloep;
    if ('poster' in r) resultat.poster = r.poster;
  } catch (e) {
    if (!(e instanceof UgyldigVurdering)) throw e;
  }
  return svar('vederlag', k.id, v, resultat, FORBEHOLD_V);
}

const lest = (t: string) => t.replaceAll(' ', ' ');
const overskriftene = (rad: Journalrad) =>
  tekst(rad).flatMap((a) => (a.overskrift ? [lest(a.overskrift)] : []));
/** Lagslinjene i punktet med overskriften som begynner med `punkt`. */
const lagslinjeneI = (rad: Journalrad, punkt: string) =>
  lest(tekst(rad).find((a) => a.overskrift?.startsWith(punkt))!.laast)
    .split('\n\n')
    .filter(erLagslinje);
const avsnittet = (rad: Journalrad, punkt: string) =>
  lest(tekst(rad).find((a) => a.overskrift?.startsWith(punkt))!.laast);
const mot = (t: string) => lest(t);

/** Tilfellet i #2337 (brev 01): forholdet avslått i samme brev, P1 og P2 med ulike vilkår. */
function toKravposterEtterAvslag() {
  const s = sak();
  s.send('TE', PAABEROPELSE);
  s.send('TE', vederlagskrav([justert('Spunt'), justert('Masseutskifting')]));
  return s.send('BH', {
    type: 'brev',
    svar: [
      svar('forhold', s.krav('forhold'), { resultat: 'avslaatt', grunnlag_varslet_i_tide: true }),
      vederlagssvar(s, {
        P1: { aksepterer: true, varslet_i_tide: false, godtar_justering: true },
        P2: {
          aksepterer: false,
          oensket_oppgjoersform: 'regningsarbeid',
          varslet_i_tide: true,
          godtar_justering: false,
        },
      }),
    ],
  });
}

describe('strukturen i byggherrens svar (#2337, LV-U78–LV-U82)', () => {
  it('LV-U78, LV-U80: ett punkt per kravpost med beskrivelsen i overskriften, én del per krav og tittelen med begge kravene', () => {
    const rad = toKravposterEtterAvslag();
    expect(rad.data.brevtittel).toBe(
      'Svar på forholdet og krav om vederlagsjustering i sak KOE-17'
    );
    expect(overskriftene(rad)).toEqual([
      DELEN.forhold,
      '1. Varselet etter punkt 32.2',
      '2. Forholdet',
      DELEN.vederlag,
      '3. Vederlagsjustering for P1 Spunt (punkt 34.1.1)',
      '4. Vederlagsjustering for P2 Masseutskifting (punkt 34.1.1)',
      '5. Forbehold',
    ]);
  });

  it('LV-U79, OV-U117: lagslinjen for hver kravpost nevner bare innsigelsen som rammer posten, med navn og uten punktnummer', () => {
    const rad = toKravposterEtterAvslag();
    expect(lagslinjeneI(rad, '3.')).toEqual([
      `Subsidiært, hvis ${MOT.forholdet} ikke fører frem`,
      `Videre subsidiært, hvis heller ikke ${mot(MOT.varselet('34.3.3', 'P1'))} fører frem`,
    ]);
    expect(lagslinjeneI(rad, '4.')).toEqual([
      `Subsidiært, hvis ${MOT.forholdet} ikke fører frem`,
      `Videre subsidiært, hvis heller ikke ${MOT.beregningsregelen('P2')} fører frem`,
    ]);
    // Et standpunkt uten etikett står først i punktet (presiseringen av 1 E, OV-U32).
    expect(avsnittet(rad, '4.').split('\n\n')[1]).toMatch(/^Byggherren gjør ikke gjeldende/);
    expect(tekst(rad).some((a) => /ovenfor/.test(a.laast.split('\n\n')[0]!))).toBe(false);
  });

  it('LV-U82: avslaget av forholdet i samme brev får «Prinsipalt» når svaret på vederlaget står subsidiært til det', () => {
    expect(lagslinjeneI(toKravposterEtterAvslag(), '2.')).toEqual(['Prinsipalt']);
    // Kontrollsak: avslaget alene, uten noe standpunkt subsidiært til det, har ingen etikett.
    const s = sak();
    s.send('TE', PAABEROPELSE);
    const alene = s.send('BH', {
      type: 'brev',
      svar: [
        svar('forhold', s.krav('forhold'), { resultat: 'avslaatt', grunnlag_varslet_i_tide: true }),
      ],
    });
    expect(lagslinjeneI(alene, '2.')).toEqual([]);
  });

  it('LV-U78: varselet etter punkt 34.1.3 og beløpet etter begrensningen står i samme avsnitt i punktet for den særskilte justeringen', () => {
    const s = sak();
    s.send('TE', PAABEROPELSE);
    s.send(
      'TE',
      vederlagskrav([fastSum('Ny fundamentering', 125000)], {
        saerskilt: { produktivitet: { beloep: 40000 } },
      })
    );
    const rad = s.send('BH', {
      type: 'brev',
      svar: [
        vederlagssvar(
          s,
          { P1: { aksepterer: true, vurdering: 'delvis', godkjent_beloep: 100000 } },
          {
            produktivitet_varslet_i_tide: false,
            produktivitet_vurdering: 'delvis',
            produktivitet_godkjent_beloep: 20000,
            produktivitet_begrenset_beloep: 10000,
          }
        ),
      ],
    });
    const punktet = avsnittet(rad, '2. Særskilt vederlagsjustering').split('\n\n');
    expect(punktet[1]).toBe('Prinsipalt');
    expect(punktet[2]).toMatch(
      /punkt 34\.1\.3 tredje ledd .* kom for sent, .* Byggherren godkjenner etter dette 10 000 kr av de krevde 40 000 kr\.$/
    );
    expect(punktet[3]).toBe(`Subsidiært, hvis ${mot(MOT.varselet('34.1.3'))} ikke fører frem`);
  });

  /** Svar på vederlaget og fristen i samme brev mens forholdet er ubesvart. */
  function toSvarUtenSvarPaaForholdet() {
    const s = sak();
    s.send('TE', PAABEROPELSE);
    s.send('TE', vederlagskrav([fastSum('Ny fundamentering', 125000)]));
    s.send('TE', FRISTKRAV);
    return s.send('BH', {
      type: 'brev',
      svar: [
        vederlagssvar(s, {
          P1: { aksepterer: true, vurdering: 'delvis', godkjent_beloep: 100000 },
        }),
        svar(
          'frist',
          s.krav('frist'),
          { frist_varsel_ok: false, spesifisert_krav_ok: true, vilkar_oppfylt: true, dager: 10 },
          { resultat: 'avslaatt', godkjent_dager: 0 },
          FORBEHOLD_F
        ),
      ],
    });
  }

  it('LV-U81: brevet har ett punkt «Forbehold», sist, med forbeholdet om forholdet én gang og så byggherrens forbehold for hvert svar med navnet på kravet', () => {
    const rad = toSvarUtenSvarPaaForholdet();
    const avsnitt = tekst(rad);
    const forbehold = avsnitt.filter((a) => a.punkt === PUNKTET_FORBEHOLD);
    expect(forbehold).toHaveLength(2);
    expect(avsnitt.slice(-2)).toEqual(forbehold);
    expect(forbehold.map((a) => lest(a.laast))).toEqual([
      `${overskriftene(rad).at(-1)}\n\n${lest(FORBEHOLDET)}\n\n${FORBEHOLD_FOR.vederlag}`,
      FORBEHOLD_FOR.frist,
    ]);
    expect(forbehold.map((a) => a.utdypning)).toEqual([FORBEHOLD_V, FORBEHOLD_F]);
    expect(overskriftene(rad).filter((o) => o.endsWith('Forbehold'))).toHaveLength(1);
  });

  it('LV-U81: leseren godtar forbeholdet for et svar sist i brevet, men ikke et annet punkt i svaret etter det (LV-U70, MM-U2)', () => {
    const rad = toSvarUtenSvarPaaForholdet();
    const lesMed = (brevtekst: Avsnitt[]) =>
      lesJournal([{ ...rad, data: { ...rad.data, brevtekst } }], KJERNE.leserformat)[0]!;
    const avsnitt = tekst(rad);
    expect(lesMed(avsnitt).art).toBe('dokument');
    const vederlag = avsnitt.at(-2)!.gjelder;
    const etter = [...avsnitt]
      .reverse()
      .find((a) => a.gjelder === vederlag && a.punkt !== PUNKTET_FORBEHOLD)!;
    expect(lesMed([...avsnitt.filter((a) => a !== etter), etter])).toMatchObject({
      art: 'ukjent',
      grunn: expect.stringContaining('et avsnitt i brevteksten gjelder ikke ett element i brevet'),
    });
  });

  it('«12 A» i #2337: avslaget av forholdet fra et tidligere brev står som punktet «Forholdet» én gang, i den første delen, og den neste delen nevner det i lagslinjen', () => {
    const s = sak();
    s.send('TE', PAABEROPELSE);
    s.send('BH', {
      type: 'brev',
      svar: [
        svar('forhold', s.krav('forhold'), { resultat: 'avslaatt', grunnlag_varslet_i_tide: true }),
      ],
    });
    s.send('TE', vederlagskrav([fastSum('Ny fundamentering', 125000)]));
    s.send('TE', FRISTKRAV);
    const rad = s.send('BH', {
      type: 'brev',
      svar: [
        vederlagssvar(s, {
          P1: { aksepterer: true, vurdering: 'delvis', godkjent_beloep: 100000 },
        }),
        svar(
          'frist',
          s.krav('frist'),
          { frist_varsel_ok: true, spesifisert_krav_ok: true, vilkar_oppfylt: true, dager: 10 },
          { resultat: 'delvis_godkjent', godkjent_dager: 10 },
          FORBEHOLD_F
        ),
      ],
    });
    expect(overskriftene(rad).filter((o) => o.endsWith('Forholdet'))).toEqual(['1. Forholdet']);
    expect(overskriftene(rad).indexOf('1. Forholdet')).toBe(
      overskriftene(rad).indexOf(DELEN.vederlag) + 1
    );
    const dagene = lagslinjeneI(rad, overskriftene(rad).find((o) => o.includes('Dagene'))!);
    expect(dagene).toEqual([`Subsidiært, hvis ${MOT.forholdet} ikke fører frem`]);
  });
});
