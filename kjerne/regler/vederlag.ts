/**
 * Byggherrens svar på vederlagskrav, NS 8407 § 34 og § 30.2. Port av
 * `regler/vederlag.py`; beløp regnes i hele øre (`beloep.ts`).
 */

import { beloep, erEndelig, NULL_OERE, tilKrone, type Oere } from './beloep.ts';
import type {
  Beloepsvurdering,
  Grunnlagsresultat,
  SubsidiaerUtloser,
  Vederlagsmetode,
  Vederlagsresultat,
} from './typer.ts';
import { UgyldigVurdering } from './feil.ts';
import { erGrunnlagSubsidiaert } from './grunnlag.ts';

type Tall = number | string;

/** TEs krav og grunnlagssporet. `rigg_belop` og `produktivitet_belop` er `null` når posten ikke er krevd. */
export interface Vederlagskrav {
  hovedkrav_belop: Tall;
  metode: Vederlagsmetode | null;
  rigg_belop: Tall | null;
  produktivitet_belop: Tall | null;
  krever_justert_ep: boolean;
  kostnads_overslag: Tall | null;
  hovedkategori: string | null;
  underkategori: string | null;
  grunnlag_varslet_i_tide: boolean | null;
  grunnlag_resultat: Grunnlagsresultat | null;
}

/** Byggherrens vurderinger. Feltnavnene er de i kommandoen. */
export interface Vederlagsvurdering {
  hovedkrav_vurdering?: Beloepsvurdering | null;
  hovedkrav_godkjent_belop?: Tall | null;
  rigg_vurdering?: Beloepsvurdering | null;
  rigg_godkjent_belop?: Tall | null;
  produktivitet_vurdering?: Beloepsvurdering | null;
  produktivitet_godkjent_belop?: Tall | null;
  hovedkrav_varslet_i_tide?: boolean | null;
  rigg_varslet_i_tide?: boolean | null;
  produktivitet_varslet_i_tide?: boolean | null;
  aksepterer_metode?: boolean | null;
  varsel_justert_ep_ok?: boolean | null;
  hold_tilbake?: boolean;
}

export interface Preklusjon {
  hovedkrav: boolean;
  rigg: boolean;
  produktivitet: boolean;
}

export interface Vederlagsberegning {
  beregnings_resultat: Vederlagsresultat;
  total_godkjent_belop: Oere;
  total_krevd_belop: Oere;
  hovedkrav_godkjent_belop: Oere;
  rigg_godkjent_belop: Oere | null;
  produktivitet_godkjent_belop: Oere | null;
  subsidiaer_triggers: SubsidiaerUtloser[];
  subsidiaer_resultat: Vederlagsresultat | null;
  subsidiaer_godkjent_belop: Oere | null;
  preklusjon: Preklusjon;
  hele_vederlaget_subsidiaert: boolean;
}

const harRigg = (krav: Vederlagskrav) => krav.rigg_belop !== null;
const harProduktivitet = (krav: Vederlagskrav) => krav.produktivitet_belop !== null;

export function gjelderVarslingspliktenForVederlag(hovedkategori: string | null): boolean {
  return hovedkategori === 'svikt' || hovedkategori === 'andre_forhold';
}

export function kanHoldeTilbake(krav: Vederlagskrav): boolean {
  return krav.metode === 'regningsarbeid' && !krav.kostnads_overslag;
}

export function beregnPreklusjon(v: Vederlagsvurdering, krav: Vederlagskrav): Preklusjon {
  return {
    hovedkrav:
      gjelderVarslingspliktenForVederlag(krav.hovedkategori) &&
      v.hovedkrav_varslet_i_tide === false,
    rigg: harRigg(krav) && v.rigg_varslet_i_tide === false,
    produktivitet: harProduktivitet(krav) && v.produktivitet_varslet_i_tide === false,
  };
}

export function beregnGodkjentBeloep(
  vurdering: Beloepsvurdering | null | undefined,
  krevd: Oere,
  delvis: Oere | null,
  prekludert = false
): Oere {
  if (prekludert) return NULL_OERE;
  if (vurdering === 'godkjent') return krevd;
  if (vurdering === 'delvis') return delvis ?? NULL_OERE;
  return NULL_OERE;
}

export function erKravlinjeGyldig(
  vurdering: Beloepsvurdering | null | undefined,
  godkjent: unknown
): boolean {
  if (vurdering === null || vurdering === undefined) return false;
  return !(vurdering === 'delvis' && (godkjent === null || godkjent === undefined));
}

type Post = [krevd: Oere, godkjent: Oere, prekludert: boolean];

function poster(v: Vederlagsvurdering, krav: Vederlagskrav, p: Preklusjon): Post[] {
  const rader: [Oere, Beloepsvurdering | null | undefined, Oere | null, boolean][] = [
    [
      beloep(krav.hovedkrav_belop) ?? NULL_OERE,
      v.hovedkrav_vurdering,
      beloep(v.hovedkrav_godkjent_belop),
      p.hovedkrav,
    ],
  ];
  if (harRigg(krav))
    rader.push([beloep(krav.rigg_belop)!, v.rigg_vurdering, beloep(v.rigg_godkjent_belop), p.rigg]);
  if (harProduktivitet(krav)) {
    rader.push([
      beloep(krav.produktivitet_belop)!,
      v.produktivitet_vurdering,
      beloep(v.produktivitet_godkjent_belop),
      p.produktivitet,
    ]);
  }
  return rader.map(([krevd, vurd, delvis, prekl]) => [
    krevd,
    beregnGodkjentBeloep(vurd, krevd, delvis),
    prekl,
  ]);
}

const sum = (verdier: Oere[]) => verdier.reduce((a, b) => a + b, NULL_OERE);

/** B-13 (24.09): «godkjent» bare når hele kravet er godkjent, til nærmeste krone. */
function resultatAvBeloep(krevd: Oere, godkjent: Oere, metodeendring: boolean): Vederlagsresultat {
  if (godkjent === NULL_OERE) return 'avslaatt';
  if (tilKrone(godkjent) >= tilKrone(krevd) && !metodeendring) return 'godkjent';
  return 'delvis_godkjent';
}

export function subsidiaerTriggers(
  v: Vederlagsvurdering,
  krav: Vederlagskrav,
  p: Preklusjon
): SubsidiaerUtloser[] {
  const kandidater: [boolean, SubsidiaerUtloser][] = [
    [p.hovedkrav, 'preklusjon_hovedkrav'],
    [p.rigg, 'preklusjon_rigg'],
    [p.produktivitet, 'preklusjon_produktivitet'],
    [krav.krever_justert_ep && v.varsel_justert_ep_ok === false, 'reduksjon_ep_justering'],
    [v.aksepterer_metode === false, 'metode_avslaatt'],
  ];
  return kandidater.filter(([gjelder]) => gjelder).map(([, t]) => t);
}

function kontroller(v: Vederlagsvurdering, krav: Vederlagskrav): void {
  const feil: Record<string, string> = {};
  const post = (
    navn: string,
    vurd: Beloepsvurdering | null | undefined,
    godkjent: Tall | null | undefined,
    krevd: Tall | null
  ) => {
    if (vurd === null || vurd === undefined) {
      feil[`${navn}_vurdering`] = 'mangler';
      return;
    }
    if (!erKravlinjeGyldig(vurd, godkjent)) {
      feil[`${navn}_godkjent_belop`] = 'mangler ved delvis godkjenning';
      return;
    }
    if (vurd === 'delvis') {
      if (!erEndelig(godkjent)) {
        feil[`${navn}_godkjent_belop`] = 'er ikke et tall';
        return;
      }
      const g = beloep(godkjent as Tall)!;
      if (g < NULL_OERE) feil[`${navn}_godkjent_belop`] = 'kan ikke være negativt';
      else if (g > (beloep(krevd) ?? NULL_OERE))
        feil[`${navn}_godkjent_belop`] = 'er høyere enn det krevde beløpet';
    }
  };
  post('hovedkrav', v.hovedkrav_vurdering, v.hovedkrav_godkjent_belop, krav.hovedkrav_belop);
  if (harRigg(krav)) post('rigg', v.rigg_vurdering, v.rigg_godkjent_belop, krav.rigg_belop);
  if (harProduktivitet(krav)) {
    post(
      'produktivitet',
      v.produktivitet_vurdering,
      v.produktivitet_godkjent_belop,
      krav.produktivitet_belop
    );
  }
  const spoersmaal: [boolean, keyof Vederlagsvurdering, string][] = [
    [
      gjelderVarslingspliktenForVederlag(krav.hovedkategori),
      'hovedkrav_varslet_i_tide',
      '§ 34.1.2',
    ],
    [harRigg(krav), 'rigg_varslet_i_tide', '§ 34.1.3'],
    [harProduktivitet(krav), 'produktivitet_varslet_i_tide', '§ 34.1.3'],
    [true, 'aksepterer_metode', '§ 34.2.2'],
  ];
  for (const [gjelder, felt, hjemmel] of spoersmaal) {
    if (gjelder && (v[felt] === null || v[felt] === undefined)) feil[felt] = `mangler (${hjemmel})`;
  }
  if (v.hold_tilbake && !kanHoldeTilbake(krav)) {
    feil.hold_tilbake = 'bare ved regningsarbeid uten kostnadsoverslag (§ 30.2)';
  }
  if (Object.keys(feil).length) throw new UgyldigVurdering(feil);
}

/** Regn ut svaret av vurderingene og kravet. Kaster `UgyldigVurdering` når svaret ikke er helt (B-13). */
export function beregnVederlag(krav: Vederlagskrav, v: Vederlagsvurdering): Vederlagsberegning {
  kontroller(v, krav);
  const p = beregnPreklusjon(v, krav);
  const alle = poster(v, krav, p);
  const totalKrevdInklPrekludert = sum(alle.map(([k]) => k));
  const totalGodkjent = sum(alle.filter(([, , pr]) => !pr).map(([, g]) => g));
  const totalGodkjentInklPrekludert = sum(alle.map(([, g]) => g));
  const metodeendring = v.aksepterer_metode === false;
  const perPost = poster(v, krav, { hovedkrav: false, rigg: false, produktivitet: false }).map(
    ([, g]) => g
  );
  const visSubsidiaert = p.hovedkrav || p.rigg || p.produktivitet;
  return {
    beregnings_resultat: v.hold_tilbake
      ? 'tilbakeholdelse'
      : resultatAvBeloep(totalKrevdInklPrekludert, totalGodkjent, metodeendring),
    total_godkjent_belop: totalGodkjent,
    total_krevd_belop: totalKrevdInklPrekludert,
    hovedkrav_godkjent_belop: perPost[0],
    rigg_godkjent_belop: harRigg(krav) ? perPost[1] : null,
    produktivitet_godkjent_belop: harProduktivitet(krav) ? perPost[perPost.length - 1] : null,
    subsidiaer_triggers: subsidiaerTriggers(v, krav, p),
    subsidiaer_resultat: visSubsidiaert
      ? resultatAvBeloep(totalKrevdInklPrekludert, totalGodkjentInklPrekludert, metodeendring)
      : null,
    subsidiaer_godkjent_belop: visSubsidiaert ? totalGodkjentInklPrekludert : null,
    preklusjon: p,
    hele_vederlaget_subsidiaert: erGrunnlagSubsidiaert(
      krav.grunnlag_resultat,
      krav.hovedkategori,
      krav.underkategori,
      krav.grunnlag_varslet_i_tide
    ),
  };
}
