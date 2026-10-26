/**
 * Byggherrens svar på vederlagskrav, NS 8407 § 34 og § 30.2. Port av
 * `regler/vederlag.py`; beløp regnes i hele øre (`beloep.ts`).
 */

import { beloep, BroekdelAvOere, heleOere, NULL_OERE, UgyldigBeloep, type Oere } from './beloep.ts';
import type {
  Beloepsvurdering,
  Grunnlagsresultat,
  SubsidiaerUtloser,
  Vederlagsmetode,
  Vederlagsresultat,
} from './typer.ts';
import { UgyldigVurdering } from './feil.ts';
import { erGrunnlagSubsidiaert } from './grunnlag.ts';
import type { Regelsett } from './regelsett.ts';

type Tall = number | string;

/**
 * TEs krav og grunnlagssporet. `rigg_belop` og `produktivitet_belop` er `null` når posten ikke er
 * krevd, og `hovedkrav_belop` når kravet bare har de særskilte kravene (OV-U23).
 */
export interface Vederlagskrav {
  hovedkrav_belop: Tall | null;
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
  /** VS-U5, OV-U22: beløpet byggherren godtar for posten etter begrensningen etter § 34.1.3. */
  produktivitet_begrenset_belop?: Tall | null;
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
  hovedkrav_godkjent_belop: Oere | null;
  rigg_godkjent_belop: Oere | null;
  produktivitet_godkjent_belop: Oere | null;
  produktivitet_begrenset_belop: Oere | null;
  subsidiaer_triggers: SubsidiaerUtloser[];
  subsidiaer_resultat: Vederlagsresultat | null;
  subsidiaer_godkjent_belop: Oere | null;
  preklusjon: Preklusjon;
  hele_vederlaget_subsidiaert: boolean;
}

const harHovedkrav = (krav: Vederlagskrav) => krav.hovedkrav_belop !== null;
const harRigg = (krav: Vederlagskrav) => krav.rigg_belop !== null;
const harProduktivitet = (krav: Vederlagskrav) => krav.produktivitet_belop !== null;

export function gjelderVarslingspliktenForVederlag(hovedkategori: string | null): boolean {
  return hovedkategori === 'svikt' || hovedkategori === 'andre_forhold';
}

export function kanHoldeTilbake(krav: Vederlagskrav): boolean {
  return krav.metode === 'regningsarbeid' && !krav.kostnads_overslag;
}

/** Predikatet for § 34.1.2 leses av regelsettet, som i standpunktene (#490). */
type Varslingsplikt = Pick<Regelsett, 'gjelderVarslingspliktenForVederlag'>;

export function beregnPreklusjon(
  v: Vederlagsvurdering,
  krav: Vederlagskrav,
  regler: Varslingsplikt
): Preklusjon {
  return {
    hovedkrav:
      regler.gjelderVarslingspliktenForVederlag(krav.hovedkategori) &&
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

/** En post i kravet: det krevde, det byggherren godtar uten begrensningen, og det prinsipale. */
type Post = [krevd: Oere, godkjent: Oere, prinsipalt: Oere];

/**
 * Postene med det byggherren godtar prinsipalt. VS-U5, OV-U22: en påberopelse etter § 34.1.3
 * avviser aldri hele kravet, bare utgiftsgrunnlaget for posten, som da står med beløpet etter
 * begrensningen. OV-U27: påberopelsen etter § 34.1.2 gjelder hele kravet, også de særskilte.
 * Rigg og drift (#1171) har ingen begrensning og settes til 0 ved preklusjon.
 */
function poster(v: Vederlagsvurdering, krav: Vederlagskrav, p: Preklusjon): Post[] {
  const rader: [Oere, Beloepsvurdering | null | undefined, Oere | null, Oere | null][] = [];
  if (harHovedkrav(krav))
    rader.push([
      beloep(krav.hovedkrav_belop)!,
      v.hovedkrav_vurdering,
      beloep(v.hovedkrav_godkjent_belop),
      null,
    ]);
  if (harRigg(krav))
    rader.push([
      beloep(krav.rigg_belop)!,
      v.rigg_vurdering,
      beloep(v.rigg_godkjent_belop),
      p.rigg ? NULL_OERE : null,
    ]);
  if (harProduktivitet(krav)) {
    rader.push([
      beloep(krav.produktivitet_belop)!,
      v.produktivitet_vurdering,
      beloep(v.produktivitet_godkjent_belop),
      p.produktivitet ? (beloep(v.produktivitet_begrenset_belop) ?? NULL_OERE) : null,
    ]);
  }
  return rader.map(([krevd, vurd, delvis, begrenset]) => {
    const godkjent = beregnGodkjentBeloep(vurd, krevd, delvis);
    return [krevd, godkjent, p.hovedkrav ? NULL_OERE : (begrenset ?? godkjent)];
  });
}

const sum = (verdier: Oere[]) => verdier.reduce((a, b) => a + b, NULL_OERE);

/**
 * B-13, OV-U59: beløpet er godkjent fullt når det godkjente er minst det krevde, i hele øre.
 * Gjelder beløpet alene, også når tilbudet ikke er akseptert (§ 34.2.2).
 */
export function erBeloepetGodkjentFullt(krevd: Oere, godkjent: Oere): boolean {
  return godkjent >= krevd;
}

/** B-13, HF-U5: «godkjent» bare når hele beløpet er godkjent og tilbudet akseptert (§ 34.2.2). */
function resultatAvBeloep(krevd: Oere, godkjent: Oere, metodeendring: boolean): Vederlagsresultat {
  if (godkjent === NULL_OERE) return 'avslaatt';
  if (erBeloepetGodkjentFullt(krevd, godkjent) && !metodeendring) return 'godkjent';
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

function kontroller(v: Vederlagsvurdering, krav: Vederlagskrav, regler: Varslingsplikt): void {
  const feil: Record<string, string> = {};
  /** OV-U58: beløpet parten sendte, i hele øre; ellers føres feilen for feltet. */
  const lesOere = (felt: string, verdi: Tall): Oere | null => {
    try {
      return heleOere(verdi);
    } catch (e) {
      if (!(e instanceof UgyldigBeloep)) throw e;
      feil[felt] =
        e instanceof BroekdelAvOere
          ? `${String(verdi)} har brøkdeler av øre (OV-U58)`
          : 'er ikke et tall';
      return null;
    }
  };
  const post = (
    navn: string,
    vurd: Beloepsvurdering | null | undefined,
    godkjent: Tall | null | undefined,
    krevd: Tall | null
  ) => {
    const felt = `${navn}_godkjent_belop`;
    if (vurd === null || vurd === undefined) {
      feil[`${navn}_vurdering`] = 'mangler';
      return;
    }
    if (!erKravlinjeGyldig(vurd, godkjent)) {
      feil[felt] = 'mangler ved delvis godkjenning';
      return;
    }
    if (godkjent === null || godkjent === undefined) return;
    const g = lesOere(felt, godkjent);
    if (g === null) return;
    const k = beloep(krevd) ?? NULL_OERE;
    // #1301, KA-U9: vurderingen og beløpet byggherren oppgir for posten, må si det samme.
    if (vurd === 'godkjent' && g !== k)
      feil[felt] =
        `er ${String(godkjent)}, men vurderingen «godkjent» gjelder hele det krevde beløpet, ${String(krevd)}`;
    else if (vurd === 'avslaatt' && g !== NULL_OERE)
      feil[felt] = `er ${String(godkjent)}, men vurderingen «avslått» godkjenner 0`;
    else if (vurd === 'delvis') {
      if (g < NULL_OERE) feil[felt] = 'kan ikke være negativt';
      else if (g > k) feil[felt] = 'er høyere enn det krevde beløpet';
    }
  };
  if (harHovedkrav(krav))
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
      regler.gjelderVarslingspliktenForVederlag(krav.hovedkategori),
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
  // Valg 2 i #1047: 0 ≤ beløpet etter begrensningen ≤ det byggherren godtar for posten.
  const begrenset = v.produktivitet_begrenset_belop;
  const begrenses = harProduktivitet(krav) && v.produktivitet_varslet_i_tide === false;
  if (!begrenses) {
    if (begrenset !== null && begrenset !== undefined)
      feil.produktivitet_begrenset_belop = 'gjelder bare en påberopt begrensning (§ 34.1.3)';
  } else if (begrenset === null || begrenset === undefined) {
    feil.produktivitet_begrenset_belop = 'mangler (§ 34.1.3)';
  } else {
    const b = lesOere('produktivitet_begrenset_belop', begrenset);
    if (b !== null && !feil.produktivitet_vurdering && !feil.produktivitet_godkjent_belop) {
      const krevd = beloep(krav.produktivitet_belop)!;
      const godkjent = beregnGodkjentBeloep(
        v.produktivitet_vurdering,
        krevd,
        beloep(v.produktivitet_godkjent_belop)
      );
      if (b < NULL_OERE) feil.produktivitet_begrenset_belop = 'kan ikke være negativt';
      else if (b > godkjent)
        feil.produktivitet_begrenset_belop = 'er høyere enn det byggherren godtar for posten';
    }
  }
  if (v.hold_tilbake && !kanHoldeTilbake(krav)) {
    feil.hold_tilbake = 'bare ved regningsarbeid uten kostnadsoverslag (§ 30.2)';
  }
  if (Object.keys(feil).length) throw new UgyldigVurdering(feil);
}

/** Regn ut svaret av vurderingene og kravet. Kaster `UgyldigVurdering` når svaret ikke er helt (B-13). */
export function beregnVederlag(
  krav: Vederlagskrav,
  v: Vederlagsvurdering,
  regler: Varslingsplikt
): Vederlagsberegning {
  kontroller(v, krav, regler);
  const p = beregnPreklusjon(v, krav, regler);
  const alle = poster(v, krav, p);
  const totalKrevdInklPrekludert = sum(alle.map(([k]) => k));
  const totalGodkjent = sum(alle.map(([, , pr]) => pr));
  const totalGodkjentInklPrekludert = sum(alle.map(([, g]) => g));
  const metodeendring = v.aksepterer_metode === false;
  const perPost = alle.map(([, g]) => g);
  const visSubsidiaert = p.hovedkrav || p.rigg || p.produktivitet;
  return {
    beregnings_resultat: v.hold_tilbake
      ? 'tilbakeholdelse'
      : resultatAvBeloep(totalKrevdInklPrekludert, totalGodkjent, metodeendring),
    total_godkjent_belop: totalGodkjent,
    total_krevd_belop: totalKrevdInklPrekludert,
    hovedkrav_godkjent_belop: harHovedkrav(krav) ? perPost[0] : null,
    rigg_godkjent_belop: harRigg(krav) ? perPost[Number(harHovedkrav(krav))] : null,
    produktivitet_godkjent_belop: harProduktivitet(krav) ? perPost[perPost.length - 1] : null,
    produktivitet_begrenset_belop: p.produktivitet
      ? (beloep(v.produktivitet_begrenset_belop) ?? NULL_OERE)
      : null,
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
