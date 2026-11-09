/**
 * Byggherrens svar på vederlagskravet, NS 8407 § 34, over postene i kravet. Beløp regnes i
 * hele øre (`beloep.ts`).
 */

import { beloep, BroekdelAvOere, heleOere, NULL_OERE, UgyldigBeloep, type Oere } from './beloep.ts';
import type { Beloepsvurdering, Vederlagsresultat } from './typer.ts';
import { UgyldigVurdering } from './feil.ts';
import type { Regelsett } from './regelsett.ts';

type Tall = number | string;

/** Byggherrens vurdering av beløpet i én post, og det krevde beløpet (KA-U57 (c)). */
interface Postbeloep {
  krevd: Tall;
  vurdering?: Beloepsvurdering | null;
  godkjent_beloep?: Tall | null;
}

/** En kravpost. `gjelder` er kravpostens `id`; `aksepterer` er standpunktet etter § 34.2.2 (KA-U57 (d)). */
export interface Kravpostsvar extends Postbeloep {
  gjelder: string;
  aksepterer?: boolean | null;
}

/** Posten etter § 34.1.3 annet ledd, med påberopelsen etter § 34.1.3 og beløpet etter begrensningen (VS-U5, OV-U22). */
export interface Produktivitetssvar extends Postbeloep {
  saerskilt: 'produktivitet';
  varslet_i_tide?: boolean | null;
  begrenset_beloep?: Tall | null;
}

/** Rigg og drift. `varslet_i_tide` avvises, se `kontroller` (OV-U89 punkt 9). */
export interface RiggOgDriftsvar extends Postbeloep {
  saerskilt: 'rigg_og_drift';
  varslet_i_tide?: unknown;
}

export type Postsvar = Kravpostsvar | Produktivitetssvar | RiggOgDriftsvar;

/**
 * Byggherrens svar på vederlagskravet, én post per post i kravet (OV-U23, KA-U57 (c)).
 * `hovedkategori` er kategorien i påberopelsen, og `varslet_i_tide` er påberopelsen etter
 * § 34.1.2, som gjelder hele kravet (OV-U27).
 */
export interface Vederlagssvar {
  hovedkategori: string | null;
  varslet_i_tide?: boolean | null;
  poster: Postsvar[];
}

/** Feltene i en feil: `<post>.<felt>`, der posten er `gjelder` eller `saerskilt`. */
export const postnoekkel = (p: Postsvar): string => ('gjelder' in p ? p.gjelder : p.saerskilt);

/** Det byggherren godtar for én post, i øre. */
export interface Postresultat {
  post: Postsvar;
  krevd: Oere;
  /** Det byggherren godtar uten begrensningen etter § 34.1.3 (OV-U26). */
  godkjent: Oere;
  /** Det byggherren godtar prinsipalt. */
  prinsipalt: Oere;
}

export interface Vederlagsberegning {
  beregnings_resultat: Vederlagsresultat;
  total_godkjent_beloep: Oere;
  total_krevd_beloep: Oere;
  poster: Postresultat[];
  subsidiaer_resultat: Vederlagsresultat | null;
  subsidiaer_godkjent_beloep: Oere | null;
  /** § 34.1.2 og § 34.1.3 påberopt med virkning. */
  preklusjon: Preklusjon;
}

export interface Preklusjon {
  hovedkrav: boolean;
  produktivitet: boolean;
}

export function gjelderVarslingspliktenForVederlag(hovedkategori: string | null): boolean {
  return hovedkategori === 'svikt' || hovedkategori === 'andre_forhold';
}

/** Predikatet for § 34.1.2 leses av regelsettet, som i standpunktene (#490). */
type Varslingsplikt = Pick<Regelsett, 'gjelderVarslingspliktenForVederlag'>;

const produktivitetIn = (svar: Vederlagssvar): Produktivitetssvar | undefined =>
  svar.poster.find(
    (p): p is Produktivitetssvar => 'saerskilt' in p && p.saerskilt === 'produktivitet'
  );

export function beregnPreklusjon(svar: Vederlagssvar, regler: Varslingsplikt): Preklusjon {
  return {
    hovedkrav:
      regler.gjelderVarslingspliktenForVederlag(svar.hovedkategori) &&
      svar.varslet_i_tide === false,
    produktivitet: produktivitetIn(svar)?.varslet_i_tide === false,
  };
}

export function beregnGodkjentBeloep(
  vurdering: Beloepsvurdering | null | undefined,
  krevd: Oere,
  delvis: Oere | null
): Oere {
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

/**
 * Postene med det byggherren godtar prinsipalt. VS-U5, OV-U22: en påberopelse etter § 34.1.3
 * avviser aldri hele kravet, bare utgiftsgrunnlaget for posten, som da står med beløpet etter
 * begrensningen. OV-U27: påberopelsen etter § 34.1.2 gjelder hele kravet, også de særskilte.
 * Rigg og drift har ingen særskilt varslingsplikt (OV-U25, OV-U35), og står med det
 * byggherren godtar, så sant påberopelsen etter § 34.1.2 ikke fører fram.
 */
function postresultater(svar: Vederlagssvar, p: Preklusjon): Postresultat[] {
  return svar.poster.map((post) => {
    const krevd = beloep(post.krevd)!;
    const godkjent = beregnGodkjentBeloep(post.vurdering, krevd, beloep(post.godkjent_beloep));
    const begrenset =
      'saerskilt' in post && post.saerskilt === 'produktivitet' && p.produktivitet
        ? (beloep(post.begrenset_beloep) ?? NULL_OERE)
        : null;
    return { post, krevd, godkjent, prinsipalt: p.hovedkrav ? NULL_OERE : (begrenset ?? godkjent) };
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

function kontroller(svar: Vederlagssvar, regler: Varslingsplikt): void {
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
  const kontrollerBeloepet = (navn: string, p: Postsvar) => {
    const { vurdering: vurd, godkjent_beloep: godkjent, krevd } = p;
    const felt = `${navn}.godkjent_beloep`;
    if (vurd === null || vurd === undefined) {
      feil[`${navn}.vurdering`] = 'mangler';
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
    // #1301, KA-U9, KA-U42: vurderingen og beløpet byggherren oppgir for posten, må si det samme.
    if (vurd === 'godkjent' && g !== k)
      feil[felt] =
        `er ${String(godkjent)}, men vurderingen «godkjent» gjelder hele det krevde beløpet, ${String(krevd)}`;
    else if (vurd === 'avslaatt' && g !== NULL_OERE)
      feil[felt] = `er ${String(godkjent)}, men vurderingen «avslått» godkjenner 0`;
    else if (vurd === 'delvis') {
      if (g < NULL_OERE) feil[felt] = 'kan ikke være negativt';
      else if (g > k) feil[felt] = 'er høyere enn det krevde beløpet';
      // KA-U42: for et positivt tilleggskrav er «delvis» mer enn 0 og mindre enn det krevde.
      else if (k > NULL_OERE && (g === k || g === NULL_OERE))
        feil[felt] =
          `er ${String(godkjent)}, men vurderingen «delvis» gjelder mer enn 0 og mindre enn det krevde beløpet, ${String(krevd)}`;
    }
  };
  // Valg 2 i #1047: 0 ≤ beløpet etter begrensningen ≤ det byggherren godtar for posten.
  const kontrollerBegrensningen = (navn: string, p: Produktivitetssvar) => {
    const felt = `${navn}.begrenset_beloep`;
    const begrenset = p.begrenset_beloep;
    if (p.varslet_i_tide === null || p.varslet_i_tide === undefined)
      feil[`${navn}.varslet_i_tide`] = 'mangler (§ 34.1.3)';
    if (p.varslet_i_tide !== false) {
      if (begrenset !== null && begrenset !== undefined)
        feil[felt] = 'gjelder bare en påberopt begrensning (§ 34.1.3)';
      return;
    }
    if (begrenset === null || begrenset === undefined) {
      feil[felt] = 'mangler (§ 34.1.3)';
      return;
    }
    const b = lesOere(felt, begrenset);
    if (b !== null && !feil[`${navn}.vurdering`] && !feil[`${navn}.godkjent_beloep`]) {
      const krevd = beloep(p.krevd)!;
      const godkjent = beregnGodkjentBeloep(p.vurdering, krevd, beloep(p.godkjent_beloep));
      if (b < NULL_OERE) feil[felt] = 'kan ikke være negativt';
      else if (b > godkjent) feil[felt] = 'er høyere enn det byggherren godtar for posten';
    }
  };
  if (
    regler.gjelderVarslingspliktenForVederlag(svar.hovedkategori) &&
    (svar.varslet_i_tide === null || svar.varslet_i_tide === undefined)
  )
    feil.varslet_i_tide = 'mangler (§ 34.1.2)';
  for (const p of svar.poster) {
    const navn = postnoekkel(p);
    kontrollerBeloepet(navn, p);
    if ('gjelder' in p) {
      if (p.aksepterer === null || p.aksepterer === undefined)
        feil[`${navn}.aksepterer`] = 'mangler (§ 34.2.2)';
    } else if (p.saerskilt === 'produktivitet') kontrollerBegrensningen(navn, p);
    // OV-U89 punkt 9: påberopelsen etter § 34.1.3 gjelder bare kravet etter annet ledd.
    else if (p.varslet_i_tide !== null && p.varslet_i_tide !== undefined)
      feil[`${navn}.varslet_i_tide`] =
        'påberopelsen etter § 34.1.3 gjelder bare kravet om nedsatt produktivitet og forstyrrelser';
  }
  if (Object.keys(feil).length) throw new UgyldigVurdering(feil);
}

/** Regn ut svaret av postene. Kaster `UgyldigVurdering` når svaret ikke er helt (B-13). */
export function beregnVederlag(svar: Vederlagssvar, regler: Varslingsplikt): Vederlagsberegning {
  kontroller(svar, regler);
  const p = beregnPreklusjon(svar, regler);
  const alle = postresultater(svar, p);
  const krevd = sum(alle.map((r) => r.krevd));
  const totalGodkjent = sum(alle.map((r) => r.prinsipalt));
  const uten = sum(alle.map((r) => r.godkjent));
  const metodeendring = svar.poster.some((post) => 'gjelder' in post && post.aksepterer === false);
  const visSubsidiaert = p.hovedkrav || p.produktivitet;
  return {
    beregnings_resultat: resultatAvBeloep(krevd, totalGodkjent, metodeendring),
    total_godkjent_beloep: totalGodkjent,
    total_krevd_beloep: krevd,
    poster: alle,
    subsidiaer_resultat: visSubsidiaert ? resultatAvBeloep(krevd, uten, metodeendring) : null,
    subsidiaer_godkjent_beloep: visSubsidiaert ? uten : null,
    preklusjon: p,
  };
}
