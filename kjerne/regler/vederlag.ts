/**
 * Byggherrens svar på vederlagskravet, NS 8407 § 34, over postene i kravet. Beløp regnes i
 * hele øre (`beloep.ts`).
 */

import { beloep, BroekdelAvOere, heleOere, NULL_OERE, UgyldigBeloep, type Oere } from './beloep.ts';
import { BELOEPSVURDERINGER, type Beloepsvurdering, type Vederlagsresultat } from './typer.ts';
import { UgyldigVurdering } from './feil.ts';
import { METODER } from '../spor/vederlag/format.ts';
import type { Oppgjoersform } from '../typer.ts';
import type { Regelsett } from './regelsett.ts';

type Tall = number | string;

/** Byggherrens vurdering av beløpet i én post, og det krevde beløpet (KA-U57 (c)). */
interface Postbeloep {
  krevd: Tall;
  vurdering?: Beloepsvurdering | null;
  godkjent_beloep?: Tall | null;
}

/**
 * En kravpost. `gjelder` er kravpostens `id`; `aksepterer` er standpunktet etter § 34.2.2
 * (KA-U57 (d)). Uten aksept står kravposten uten vurdering av beløpet (KA-U72).
 */
export interface Kravpostsvar extends Postbeloep {
  gjelder: string;
  aksepterer?: boolean | null;
  /**
   * Kravposten følger en beregningsregel, og svaret tar ikke stilling til et beløp (OV-U95
   * punkt 5). `varselForSent` er innsigelsen etter § 34.3.3 første ledd (VS-U4, VS-U56), og
   * `justering` standpunktet etter § 34.3.2, `null` uten standpunkt (KA-U68).
   */
  beregningsregel?: { varselForSent: boolean; justering: boolean | null };
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

/**
 * Det byggherren godtar for posten i ett lag i sporet, fra 1 (OV-U32). `beloep` er `null` når
 * posten ikke har et fast beløp i laget, fordi byggherren ikke aksepterer tilbudet (KA-U72).
 */
export interface Postlag {
  lag: number;
  beloep: Oere | null;
}

/** Det byggherren godtar for én post, i øre. */
export interface Postresultat {
  post: Postsvar;
  krevd: Oere;
  /**
   * Ett element per lag i sporet, i rekkefølge. Det siste er det byggherren godtar uten
   * begrensningen etter § 34.1.3 (OV-U26). Arbeidsvalg 1 i spørsmålsfila 09.11 for #1663.
   * Uten beløp for en kravpost der tilbudet ikke er akseptert (KA-U72).
   */
  lag: Postlag[];
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

const erProduktivitet = (p: Postsvar): p is Produktivitetssvar =>
  'saerskilt' in p && p.saerskilt === 'produktivitet';

const produktivitetsposten = (svar: Vederlagssvar): Produktivitetssvar | undefined =>
  svar.poster.find(erProduktivitet);

export function beregnPreklusjon(svar: Vederlagssvar, regler: Varslingsplikt): Preklusjon {
  return {
    hovedkrav:
      regler.gjelderVarslingspliktenForVederlag(svar.hovedkategori) &&
      svar.varslet_i_tide === false,
    produktivitet: produktivitetsposten(svar)?.varslet_i_tide === false,
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

/** Byggherren aksepterer ikke tilbudet for kravposten (§ 34.2.2, KA-U57 (d)). */
const ikkeAkseptert = (p: Postsvar): boolean => 'gjelder' in p && p.aksepterer === false;

const regelen = (p: Postsvar) => ('gjelder' in p ? p.beregningsregel : undefined);

/** Standpunktene for en kravpost etter en beregningsregel som kan åpne et lag (KA-U64, KA-U68). */
export interface Kravpostinnsigelser {
  /** Byggherren godtar beregningsregelen (§ 34.3, § 34.4). */
  godtarRegelen: boolean;
  /** Innsigelsen etter § 34.3.3 første ledd (VS-U4, VS-U56). */
  varselForSent: boolean;
  /** Byggherren tar stilling til justeringen etter § 34.3.2. */
  justering: boolean;
}

/** Laget hvert standpunkt for kravposten står i, `null` uten virkning, og laget for beløpet. */
export interface LagIKravposten {
  regelen: number | null;
  varselet: number | null;
  justeringen: number | null;
  beloepet: number;
}

/**
 * Lagene standpunktene for en kravpost etter en beregningsregel står i, fra `foerste`, det første
 * laget etter § 34.1.2 (arbeidsvalg 1 punkt 4 i spørsmålsfila 09.11 for #1663): beregningsregelen
 * byggherren ikke godtar og innsigelsen etter § 34.3.3 åpner hvert sitt lag for standpunktene
 * etter dem, i rekkefølgen leseren krever, og beløpet står i laget til det siste (VS-U4,
 * VS-U56). Varselet etter § 34.4 åpner ikke et lag (KA-U64). `null` når ingen av dem åpner et
 * lag: da står standpunktene som de andre. Utregningen, virkningene og forutsetningene i
 * skjemaet leser lagene herfra (#1774).
 */
export function lagIKravposten(k: Kravpostinnsigelser, foerste: number): LagIKravposten | null {
  if (k.godtarRegelen && !k.varselForSent) return null;
  let lag = foerste;
  const regelen = k.godtarRegelen ? null : lag++;
  const varselet = k.varselForSent ? lag++ : null;
  const justeringen = k.justering ? lag : null;
  return { regelen, varselet, justeringen, beloepet: justeringen ?? lag - 1 };
}

/**
 * Lagene i sporet: § 34.1.2 først, så begrensningen etter § 34.1.3 (KA-U64) og standpunktene
 * for en kravpost etter en beregningsregel, som bare rammer posten de gjelder (arbeidsvalg 1).
 * Gir antallet lag og det første laget etter § 34.1.2. Et tilbud som ikke er akseptert, gir ikke
 * et eget lag (KA-U72).
 */
function lagene(p: Preklusjon, svar: Vederlagssvar): { foerste: number; antall: number } {
  const foerste = p.hovedkrav ? 2 : 1;
  const regler = svar.poster.map((post) => {
    const r = regelen(post);
    const lag = r
      ? lagIKravposten(
          {
            godtarRegelen: !ikkeAkseptert(post),
            varselForSent: r.varselForSent,
            justering: r.justering !== null,
          },
          0
        )
      : null;
    return lag?.beloepet ?? 0;
  });
  return { foerste, antall: foerste + Math.max(Number(p.produktivitet), ...regler) };
}

/**
 * Postene med det byggherren godtar i hvert lag. OV-U27: påberopelsen etter § 34.1.2 gjelder
 * hele kravet, også de særskilte, og står i det første laget. VS-U5, OV-U22: en påberopelse
 * etter § 34.1.3 avviser aldri hele kravet; den særskilte posten står med beløpet etter
 * begrensningen i laget for begrensningen. KA-U72: uten aksept av tilbudet har kravposten
 * ikke et beløp i noe lag etter § 34.1.2.
 * Arbeidsvalg 1.1: en post som ingen innsigelse i laget rammer, har samme verdi som i laget før.
 * Rigg og drift har ingen særskilt varslingsplikt (OV-U25, OV-U35).
 */
function postresultater(svar: Vederlagssvar, p: Preklusjon): Postresultat[] {
  const { foerste, antall } = lagene(p, svar);
  return svar.poster.map((post) => {
    const krevd = beloep(post.krevd)!;
    const godkjent =
      ikkeAkseptert(post) || regelen(post)
        ? null
        : beregnGodkjentBeloep(post.vurdering, krevd, beloep(post.godkjent_beloep));
    const iFoerste =
      erProduktivitet(post) && p.produktivitet
        ? (beloep(post.begrenset_beloep) ?? NULL_OERE)
        : godkjent;
    const lag: Postlag[] = Array.from({ length: antall }, (_, i) => ({
      lag: i + 1,
      beloep: i + 1 < foerste ? NULL_OERE : i + 1 === foerste ? iFoerste : godkjent,
    }));
    return { post, krevd, lag };
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

/**
 * B-13, HF-U5: «godkjent» bare når hele beløpet er godkjent og tilbudet akseptert (§ 34.2.2).
 * Et lag der en kravpost ikke har et fast beløp, avslår ikke kravet, også når summen er 0
 * (OV-U73, KA-U72).
 */
function resultatAvBeloep(
  krevd: Oere,
  godkjent: Oere,
  metodeendring: boolean,
  utenFastBeloep = false
): Vederlagsresultat {
  if (godkjent === NULL_OERE && !utenFastBeloep) return 'avslaatt';
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
    if (regelen(p)) {
      const grunn =
        'kravposten følger en beregningsregel, og svaret godkjenner ikke noe beløp for den (OV-U95 punkt 5)';
      if (vurd !== null && vurd !== undefined) feil[`${navn}.vurdering`] = grunn;
      if (godkjent !== null && godkjent !== undefined) feil[felt] = grunn;
      return;
    }
    if (ikkeAkseptert(p)) {
      const ikkeAkseptertMen = 'byggherren aksepterer ikke tilbudet, men tar stilling til beløpet';
      if (vurd !== null && vurd !== undefined)
        feil[`${navn}.vurdering`] = `${ikkeAkseptertMen} (KA-U72)`;
      if (godkjent !== null && godkjent !== undefined) feil[felt] = `${ikkeAkseptertMen} (KA-U72)`;
      return;
    }
    if (vurd === null || vurd === undefined) {
      feil[`${navn}.vurdering`] = 'mangler';
      return;
    }
    if (!BELOEPSVURDERINGER.includes(vurd)) {
      feil[`${navn}.vurdering`] = `${String(vurd)} er ikke en vurdering av beløpet`;
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
      feil[`${navn}.varslet_i_tide`] = 'mangler (punkt 34.1.3)';
    if (p.varslet_i_tide !== false) {
      if (begrenset !== null && begrenset !== undefined)
        feil[felt] = 'gjelder bare en påberopt begrensning (punkt 34.1.3)';
      return;
    }
    if (begrenset === null || begrenset === undefined) {
      feil[felt] = 'mangler (punkt 34.1.3)';
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
    feil.varslet_i_tide = 'mangler (punkt 34.1.2)';
  for (const p of svar.poster) {
    const navn = postnoekkel(p);
    kontrollerBeloepet(navn, p);
    if ('gjelder' in p) {
      if (p.aksepterer === null || p.aksepterer === undefined)
        feil[`${navn}.aksepterer`] = 'mangler (punkt 34.2.2)';
    } else if (p.saerskilt === 'produktivitet') kontrollerBegrensningen(navn, p);
    // OV-U89 punkt 9: påberopelsen etter § 34.1.3 gjelder bare kravet etter annet ledd.
    else if (p.varslet_i_tide !== null && p.varslet_i_tide !== undefined)
      feil[`${navn}.varslet_i_tide`] =
        'påberopelsen etter punkt 34.1.3 gjelder bare kravet om nedsatt produktivitet og forstyrrelser';
  }
  if (Object.keys(feil).length) throw new UgyldigVurdering(feil);
}

/** Regn ut svaret av postene. Kaster `UgyldigVurdering` når svaret ikke er helt (B-13). */
export function beregnVederlag(svar: Vederlagssvar, regler: Varslingsplikt): Vederlagsberegning {
  kontroller(svar, regler);
  const p = beregnPreklusjon(svar, regler);
  const alle = postresultater(svar, p);
  const krevd = sum(alle.map((r) => r.krevd));
  // OV-U31, OV-U73: det første og det siste laget; en post uten fast beløp regnes ikke med.
  const iLaget = (i: number) => alle.map((r) => r.lag.at(i)!.beloep);
  const [foerste, siste] = [iLaget(0), iLaget(-1)];
  const totalGodkjent = sum(foerste.map((b) => b ?? NULL_OERE));
  // HF-U5: ikke «godkjent» når byggherren ikke aksepterer oppgjørsformen, bestrider justeringen
  // eller gjør gjeldende at varselet etter § 34.3.3 kom for sent (arbeidsvalg 2 og 3 i
  // spørsmålsfilene 09.11 og 10.11 for #1663).
  const metodeendring = svar.poster.some((post) => {
    const r = regelen(post);
    return ikkeAkseptert(post) || (r !== undefined && (r.varselForSent || r.justering === false));
  });
  const visSubsidiaert = lagene(p, svar).antall > 1;
  const uten = sum(siste.map((b) => b ?? NULL_OERE));
  return {
    beregnings_resultat: resultatAvBeloep(
      krevd,
      totalGodkjent,
      metodeendring,
      foerste.includes(null)
    ),
    total_godkjent_beloep: totalGodkjent,
    total_krevd_beloep: krevd,
    poster: alle,
    subsidiaer_resultat: visSubsidiaert
      ? resultatAvBeloep(krevd, uten, metodeendring, siste.includes(null))
      : null,
    subsidiaer_godkjent_beloep: visSubsidiaert ? uten : null,
    preklusjon: p,
  };
}

/** § 34.1.2: innsigelsen mot varselet gjelder bare kategoriene der varslingsplikten gjelder. */
export function kontrollerVarseletForVederlag(
  v: { hovedkrav_varslet_i_tide?: unknown },
  hovedkategori: string | null,
  regler: Regelsett
): void {
  if (
    v.hovedkrav_varslet_i_tide != null &&
    !regler.gjelderVarslingspliktenForVederlag(hovedkategori)
  )
    throw new UgyldigVurdering({
      hovedkrav_varslet_i_tide: 'gjelder bare svikt og andre forhold (punkt 34.1.2)',
    });
}

/**
 * Standpunktet til oppgjørsformen for kravposten `navn` (KA-U57 (d), KA-U54), kravet om tilbud
 * (KA-U69, KA-U71), varselet etter § 34.3.3 eller § 34.4 (KA-U64) og justeringen (KA-U68),
 * mot TEs oppgjørsform for posten. Feilene står på `<navn>.<felt>`.
 */
export function kontrollerOppgjoersformen(
  navn: string,
  p: {
    aksepterer?: unknown;
    oensket_oppgjoersform?: unknown;
    krever_tilbud?: unknown;
    varslet_i_tide?: unknown;
    godtar_justering?: unknown;
  },
  post: { oppgjoersform: Oppgjoersform; justert?: boolean }
): void {
  const feil: Record<string, string> = {};
  const felt = `${navn}.oensket_oppgjoersform`;
  const regel = post.oppgjoersform !== 'tilbud';
  const kreverTilbud = p.krever_tilbud === true;
  const hva = regel ? 'beregningsregelen ikke godtas' : 'tilbudet ikke aksepteres (punkt 34.2.2)';
  // Arbeidsvalget i #479: uten aksept oppgir byggherren oppgjørsformen, ellers ikke. Svar 3 A
  // 10.11 for #1663: med kravet om tilbud er den valgfri.
  if (p.oensket_oppgjoersform != null && !METODER.includes(p.oensket_oppgjoersform as never))
    feil[felt] = `${String(p.oensket_oppgjoersform)} er ikke en oppgjørsform byggherren kan mene`;
  else if (p.aksepterer === false && p.oensket_oppgjoersform == null && !kreverTilbud)
    feil[felt] = `mangler når ${hva}`;
  else if (p.aksepterer !== false && p.oensket_oppgjoersform != null)
    feil[felt] = `gjelder bare når ${hva}`;
  // OV-U95 punkt 1 og 5: byggherren mener ikke den beregningsregelen TE krever.
  else if (regel && p.oensket_oppgjoersform === post.oppgjoersform)
    feil[felt] = 'er oppgjørsformen totalentreprenøren krever';
  if (p.krever_tilbud != null && typeof p.krever_tilbud !== 'boolean')
    feil[`${navn}.krever_tilbud`] = 'er verken true eller false';
  else if (kreverTilbud && !regel)
    feil[`${navn}.krever_tilbud`] =
      'gjelder bare en kravpost etter en beregningsregel (punkt 34.2.1)';
  // KA-U71: kravet om tilbud og en godtatt beregningsregel utelukker hverandre.
  else if (kreverTilbud && p.aksepterer !== false)
    feil[`${navn}.krever_tilbud`] =
      'kan ikke stå når byggherren godtar beregningsregelen for kravposten (KA-U71)';
  const justert = post.oppgjoersform === 'enhetspriser' && post.justert === true;
  // KA-U64: varselet etter § 34.3.3 gjelder justerte enhetspriser, og § 34.4 regningsarbeid.
  const trengerVarsel = post.oppgjoersform === 'regningsarbeid' || justert;
  if (p.varslet_i_tide != null && typeof p.varslet_i_tide !== 'boolean')
    feil[`${navn}.varslet_i_tide`] = 'er verken true eller false';
  else if (p.varslet_i_tide != null && !trengerVarsel)
    feil[`${navn}.varslet_i_tide`] =
      'gjelder bare varselet etter punkt 34.3.3 for justerte enhetspriser og punkt 34.4 for regningsarbeid';
  // KA-U68: justeringen gjelder justerte enhetspriser, og byggherren tar stilling til den når
  // beregningsregelen godtas. Uten aksept står den subsidiært og er valgfri (VS-U56).
  if (p.godtar_justering != null && typeof p.godtar_justering !== 'boolean')
    feil[`${navn}.godtar_justering`] = 'er verken true eller false';
  else if (p.godtar_justering != null && !justert)
    feil[`${navn}.godtar_justering`] = 'gjelder bare en kravpost med justerte enhetspriser';
  else if (justert && p.aksepterer === true && p.godtar_justering == null)
    feil[`${navn}.godtar_justering`] =
      'mangler når byggherren godtar beregningsregelen (punkt 34.3.2)';
  if (Object.keys(feil).length) throw new UgyldigVurdering(feil);
}
