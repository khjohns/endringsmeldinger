/**
 * Det siden for vederlaget viser i kortet «Kravet og svaret» (BF-44, U-2–U-4, U-13, U-14), lest
 * av kjernens utledning og av svaret slik det ble sendt (MM-U50, D-1 og D-2): kravet som
 * gjelder med postene, det byggherren godkjenner i hvert lag med vilkåret og det laget bygger
 * på, oversiktstabellen slik brevet har den (OV-U73) og forbeholdet etter GR-U34 (D-3).
 * Modulen avgjør ingenting selv.
 */

import { cellene, OVERSIKTEN } from '$kjerne/frosset/tekst';
import { beloep, tilTall, type Oere } from '$kjerne/regler/beloep';
import { beloepeneILagene, krevdSamlet } from '$kjerne/spor/vederlag/format';
import { posteneIOversikten } from '$kjerne/spor/vederlag/tekst';
import type { Krav, Kravpost, Oppgjoersform } from '$kjerne/typer';
import type { Utledning } from '$kjerne/utledning/utled';
import { varseletFoerKravet } from '$lib/kjernesak/vederlagskrav';
import { underOverskriften, type Brevet } from './lesing';
import { lageneISvaret, medForbehold, type Svarlaget } from './svarlagene';

/** Et lag i byggherrens svar, med beløpet byggherren godkjenner (U-2). */
export interface Laget extends Svarlaget {
  /** Summen byggherren godkjenner i laget, og `null` i et lag med en grunn fra forholdet. */
  beloep: number | null;
}

/** En post i kravet som gjelder, med oppgjørsformen og det krevde beløpet (U-4). */
export interface Posten {
  /** Navnet raden har i oversiktstabellen (`posteneIOversikten`). */
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

const somTall = (oere: Oere | null) => (oere === null ? null : tilTall(oere));

/** Postene i kravet med navnene oversiktstabellen gir dem (`posteneIOversikten`). */
const postene = (krav: Krav): Posten[] =>
  posteneIOversikten(krav).map((p) => ({
    navn: p.navn,
    oppgjoersform: p.kravpost?.oppgjoersform ?? null,
    krevd: somTall(p.krevd),
    kravpost: p.kravpost,
  }));

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

  // Laget i sporet er laget i brevet uten grunnene fra forholdet foran (OV-U73, HF-U34).
  const iLagene = [...beloepeneILagene(svar.utregning).values()];
  const sporlag = Math.max(0, ...iLagene.map((l) => l.length));
  // I et lag står postens siste beløp i laget eller før, også over et lag uten beløp (KA-U72), og
  // 0 kr før det første, som i tabellen i brevet (OV-U73, LV-U33). Summen regnes i hele øre.
  const iLaget = (lag: number) =>
    somTall(
      iLagene.reduce(
        (sum, l) => sum + (beloep(l.slice(0, lag).findLast((x) => x !== null) ?? 0) ?? 0n),
        0n
      )
    );
  const lagene: Laget[] = lageneISvaret(u, svar, alle, sporlag, 'beloep').map((l) => ({
    ...l,
    beloep: l.iSporet < 1 ? null : iLaget(l.iSporet),
  }));
  const oversikten = svarbrev.avsnitt?.find((a) => a.punkt === OVERSIKTEN);
  return {
    ...ut,
    lagene,
    // Brevet viser hvert avsnitt i punktet som en tabell; punktet har én (`Brev.svelte`).
    tabell: oversikten ? cellene(underOverskriften(oversikten)[0] ?? '') : null,
    forbehold: medForbehold(u, svar, svarbrev),
  };
}

/** Posten en rad i oversiktstabellen gjelder, etter navnet tabellen gir den. */
export const postIRaden = (poster: Posten[], navn: string): Posten | undefined =>
  poster.find((p) => p.navn === navn);

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
 * Hjemlene et krav i vederlaget også er varselet etter, etter brevet med kravet (U-12): kravet er
 * brevet kjernen leser som varselet etter hjemmelen (`varseletFoerKravet`, OV-U5), og brevet har
 * punktet for varselet, som det får der varslingsplikten gjelder (VS-U3, OV-U15). Et brev uten
 * punktet sier ikke at det varsler, og står uten hjemmelen.
 */
export function varsleneIKravene(u: Utledning, alle: Brevet[]): Map<string, string[]> {
  const ut = new Map<string, string[]>();
  for (const hjemmel of ['34.1.2', '34.1.3'] as const) {
    const id = varseletFoerKravet(u, hjemmel);
    const brev = alle.find((b) => b.id === id);
    if (!brev || !u.spor.vederlag.krav.some((k) => k.dokument === brev.id)) continue;
    if (!brev.avsnitt?.some((a) => a.punkt === hjemmel)) continue;
    ut.set(brev.id, [...(ut.get(brev.id) ?? []), hjemmel]);
  }
  return ut;
}
