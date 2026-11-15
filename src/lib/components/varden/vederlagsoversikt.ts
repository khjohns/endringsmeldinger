/**
 * Det siden for vederlaget viser i kortet «Kravet og svaret» (BF-44, U-2–U-4, U-13, U-14), lest
 * av kjernens utledning og av svaret slik det ble sendt (MM-U50, D-1 og D-2): kravet som
 * gjelder med postene, det byggherren godkjenner i hvert lag med vilkåret og det laget bygger
 * på, oversiktstabellen slik brevet har den (OV-U73) og forbeholdet etter GR-U34 (D-3).
 * Modulen avgjør ingenting selv.
 */

import { grunnerFraForholdet } from '$kjerne/spor/forhold/frysing';
import { etikett, plassene } from '$kjerne/frosset/byggeklosser';
import { cellene, OVERSIKTEN } from '$kjerne/frosset/tekst';
import { beloep, tilTall, type Oere } from '$kjerne/regler/beloep';
import {
  beloepeneILagene,
  krevdIKravposten,
  krevdProduktivitet,
  krevdSamlet,
  kravposterI,
} from '$kjerne/spor/vederlag/format';
import type { Subsidiaergrunn } from '$kjerne/regler/forhold';
import type { Krav, Kravpost, Oppgjoersform, Standpunkt } from '$kjerne/typer';
import type { Utledning } from '$kjerne/utledning/utled';
import type { Brevet } from './lesing';

/** Et lag i byggherrens svar, med beløpet og det laget bygger på (U-2). */
export interface Laget {
  lag: number;
  /** «prinsipalt», «subsidiært» eller «videre subsidiært», og `null` når svaret har ett lag. */
  etikett: string | null;
  /** Summen byggherren godkjenner i laget, og `null` i et lag med en grunn fra forholdet. */
  beloep: number | null;
  /** Innsigelsene i laget foran, som laget gjelder hvis ikke fører frem (OV-U32). */
  vilkaar: Innsigelsen[];
  /** Grunnene fra svaret på forholdet i laget (OV-U33), med brevet de står i. */
  grunner: { grunn: Subsidiaergrunn; brev: Brevet }[];
  /** Standpunktene i laget utenom beløpene, med brevet med varselet en påberopelse gjelder. */
  standpunkter: { standpunkt: Standpunkt; brev: Brevet | null }[];
}

/** En innsigelse et senere lag bygger på: en grunn fra forholdet eller en påberopt hjemmel. */
export type Innsigelsen =
  | { art: 'grunn'; grunn: Subsidiaergrunn; brev: Brevet }
  | { art: 'varsel'; hjemmel: string };

/** En post i kravet som gjelder, med oppgjørsformen og det krevde beløpet (U-4). */
export interface Posten {
  /** «Vederlagsjustering», betegnelsen når kravet har flere, eller «Særskilt vederlagsjustering». */
  navn: string;
  oppgjoersform: Oppgjoersform | null;
  krevd: number | null;
  kravpost: Kravpost | null;
}

export interface KravetOgSvaret {
  kravbrev: Brevet;
  /** Brevet med svaret på kravet som gjelder, eller `null` før byggherren har svart på det. */
  svarbrev: Brevet | null;
  /** Summen av de faste beløpene i kravet, og `null` uten et fast beløp (OV-U73). */
  krevd: number | null;
  poster: Posten[];
  lagene: Laget[];
  /** Oversiktstabellen slik brevet har den, med kolonnene først og summen sist (U-14). */
  tabell: string[][] | null;
  /** Svaret ble gitt mens forholdet ikke var besvart, så forbeholdet gjelder (GR-U34, D-3). */
  forbehold: boolean;
}

const SAERSKILT = 'Særskilt vederlagsjustering';
const somTall = (oere: Oere | null) => (oere === null ? null : tilTall(oere));

/** Postene i kravet med navnene oversiktstabellen gir dem (`kjerne/spor/vederlag/tekst.ts`). */
function postene(krav: Krav): Posten[] {
  const kravposter = kravposterI(krav);
  const produktivitet = krevdProduktivitet(krav);
  return [
    ...kravposter.map(
      (p): Posten => ({
        navn: kravposter.length > 1 ? p.betegnelse : 'Vederlagsjustering',
        oppgjoersform: p.oppgjoersform,
        krevd: somTall(krevdIKravposten(krav, p)),
        kravpost: p,
      })
    ),
    ...(produktivitet === null
      ? []
      : [{ navn: SAERSKILT, oppgjoersform: null, krevd: tilTall(produktivitet), kravpost: null }]),
  ];
}

/**
 * Kravet som gjelder i vederlaget og byggherrens svar på det, eller `null` uten krav. `alle` er
 * brevene i saken (`brevene(u)`).
 */
export function kravetOgSvaret(u: Utledning, alle: Brevet[]): KravetOgSvaret | null {
  const s = u.spor.vederlag;
  const krav = s.gjeldendeKrav;
  if (!krav) return null;
  const brev = (id: string) => alle.find((b) => b.id === id) ?? null;
  const kravbrev = brev(krav.dokument);
  if (!kravbrev) return null;
  const samlet = krevdSamlet(krav);
  const svar = s.gjeldendeSvar?.gjelder === krav.id ? s.gjeldendeSvar : null;
  const svarbrev = svar ? brev(svar.dokument) : null;
  const ut: KravetOgSvaret = {
    kravbrev,
    svarbrev,
    krevd: samlet > 0n ? tilTall(samlet) : null,
    poster: postene(krav),
    lagene: [],
    tabell: null,
    forbehold: false,
  };
  if (!svar || !svarbrev) return ut;

  const beregning = u.svar[svar.id];
  const g = beregning?.forholdssvaret ? u.svar[beregning.forholdssvaret].svar : null;
  const grunner = g ? grunnerFraForholdet(g, g.beslutningsgrunnlag.virkninger) : [];
  const grunnbrev = g ? brev(g.dokument) : null;
  const plass = plassene(svar, svar.beslutningsgrunnlag.virkninger, grunner.length);
  // Laget i sporet er laget i brevet uten grunnene fra forholdet foran (OV-U73, HF-U34).
  const iLagene = [...beloepeneILagene(svar.utregning).values()];
  const sporlag = Math.max(0, ...iLagene.map((l) => l.length));
  const antall = Math.max(
    grunner.length + sporlag,
    ...svar.standpunkter.map((x) => plass.standpunkt(x.id).lag ?? 0)
  );
  const kravbrevet = (gjelder: string | undefined) => {
    const k = s.krav.find((x) => x.id === gjelder);
    return k ? brev(k.dokument) : null;
  };
  const lagene: Laget[] = Array.from({ length: antall }, (_, i) => {
    const lag = i + 1;
    const iSporet = lag - grunner.length;
    return {
      lag,
      etikett: antall > 1 ? etikett(lag) : null,
      // Summen i laget regnes i hele øre (B-13, OV-U59); en post med færre lag har sitt siste beløp.
      beloep:
        iSporet < 1
          ? null
          : somTall(
              iLagene.reduce(
                (sum, l) => sum + (beloep(l[Math.min(iSporet, l.length) - 1] ?? 0) ?? 0n),
                0n
              )
            ),
      vilkaar: [],
      grunner: iSporet < 1 && grunnbrev ? [{ grunn: grunner[i]!, brev: grunnbrev }] : [],
      standpunkter: svar.standpunkter
        .filter((x) => x.art !== 'beloep' && plass.standpunkt(x.id).lag === lag)
        .map((x) => ({
          standpunkt: x,
          brev: x.art === 'rettidighet' && 'gjelder' in x ? kravbrevet(x.gjelder) : null,
        })),
    };
  });
  for (const l of lagene.slice(1)) {
    const foran = lagene[l.lag - 2]!;
    l.vilkaar = [
      ...foran.grunner.map((x): Innsigelsen => ({ art: 'grunn', ...x })),
      ...foran.standpunkter.flatMap(({ standpunkt: x }): Innsigelsen[] =>
        x.art === 'rettidighet' && !x.iTide ? [{ art: 'varsel', hjemmel: x.hjemmel }] : []
      ),
    ];
  }
  const oversikten = svarbrev.avsnitt?.find((a) => a.punkt === OVERSIKTEN);
  return {
    ...ut,
    lagene,
    tabell: oversikten ? cellene(utenOverskrift(oversikten)) : null,
    // GR-U34: brevet hadde ikke noe svar på forholdet foran seg og har punktet med forbeholdet.
    forbehold:
      beregning?.forholdssvaret === null &&
      svar.paaberopelse !== null &&
      !!svarbrev.avsnitt?.some((a) => a.punkt === 'forbehold'),
  };
}

/** Tabellen i punktet, uten overskriften som står først i den låste delen (`Brev.svelte`). */
function utenOverskrift(a: { laast: string; overskrift?: string }): string {
  const tekst =
    a.overskrift && a.laast.startsWith(a.overskrift)
      ? a.laast.slice(a.overskrift.length).trimStart()
      : a.laast;
  return tekst.split('\n\n').find((del) => del.includes('\t')) ?? tekst;
}

/** Posten en rad i oversiktstabellen gjelder, etter navnet tabellen gir den. */
export const postIRaden = (poster: Posten[], navn: string): Posten | undefined =>
  poster.find((p) => p.navn === navn);

/** De runde trinnene på målestokken for beløpet `stoerst`: fire trinn eller færre. */
export function trinnene(stoerst: number): number[] {
  if (stoerst <= 0) return [0];
  const raa = stoerst / 4;
  const grunn = 10 ** Math.floor(Math.log10(raa));
  const steg = [1, 2, 2.5, 5, 10].map((f) => f * grunn).find((x) => x >= raa)!;
  // Trinnet ved enden av skalaen står ikke, så tallet ikke går ut over målestokken.
  return Array.from({ length: Math.ceil(stoerst / steg) }, (_, i) => i * steg);
}

/** Summen av de faste beløpene i hvert krav i vederlaget, etter brevet med kravet (U-12). */
export function kravbeloepene(u: Utledning): Map<string, number> {
  return new Map(
    u.spor.vederlag.krav.flatMap((k) => {
      const sum = krevdSamlet(k);
      return sum > 0n ? [[k.dokument, tilTall(sum)] as const] : [];
    })
  );
}

/**
 * Akseptfristen i byggherrens gjeldende svar i sporet, med brevet, så lenge svaret ikke er godtatt
 * (U-11 i BF-44, HF-U23 punkt 4), og ellers `null`.
 */
export function akseptfristen(u: Utledning, spor: 'vederlag' | 'frist') {
  const s = u.spor[spor].gjeldendeSvar;
  return s?.akseptfrist && !u.spor[spor].enighet ? { brev: s.dokument, dato: s.akseptfrist } : null;
}
