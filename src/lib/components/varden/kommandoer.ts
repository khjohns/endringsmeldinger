/**
 * Kommandoene Varden sender (#1331), i kjernens format. Svaret på vederlagskravet har
 * vurderingene BH har valgt i skjemaet, og resultatet regnes av kjernen (`regnUtSvar`), som
 * i dagens skjema (#1301). Er vurderingene ufullstendige, er resultatet tomt, og kjernen
 * avviser kommandoen med sin egen melding før brevet vises.
 */

import { regnUtSvar } from '#kjerne/frosset/utregning.ts';
import { hjemmelenGjelder, type Svarvurdering } from '#kjerne/frosset/byggeklosser.ts';
import { UgyldigBeloep } from '#kjerne/regler/beloep.ts';
import { UgyldigVurdering } from '#kjerne/regler/feil.ts';
import {
  beloepetStilles,
  stiltIKravposten,
  type SpoersmaalIKravposten,
} from '#kjerne/regler/vederlag.ts';
import type { Regelsett } from '#kjerne/regler/regelsett.ts';
import type { Svarutkast } from '#kjerne/kommandoer/kommando.ts';
import type { Kjernevedlegg } from './nysak';
import {
  VARSELSPOR,
  type Krav,
  type Kravpost,
  type Oppgjoersform,
  type Spor,
  type Standpunkt,
  type Svar,
  type SvarbarVarselhjemmel,
} from '#kjerne/typer.ts';
import { KRAVINNHOLD } from '#kjerne/format/format.ts';
import { oppgittDato } from '#kjerne/spor/forhold/format.ts';
import type { Utledning } from '#kjerne/utledning/utled.ts';
import { kravversjonenPaaDagen } from '#lib/kjernesak/kontekst.svelte.ts';
import { lesKroner, visKroner } from '#lib/utils/belop.ts';
import { kroner } from '#kjerne/frosset/tekst.ts';
import { KRAVSKJEMA } from './tekster';
import { innholdIVederlaget, kravposterI } from '#kjerne/spor/vederlag/format.ts';
import {
  innsigelseneSomStaar,
  standpunktTilHovedvarseletFoer,
  varselhjemmelFor,
  type VarseletAlene,
  type VarseletIPosten,
  type VarsleneIVederlagskravet,
} from '#lib/kjernesak/vederlagskrav.ts';

export type Beloepsvalg = 'hele' | 'deler' | 'ingenting';

/** En beregningsregel for en kravpost (§ 34.3 og § 34.4): oppgjørsformene utenom fast sum. */
export type Regel = Exclude<Oppgjoersform, 'tilbud'>;

/**
 * Standpunktet til oppgjørsformen TE krever for kravposten: `godtar` den, eller mener en annen
 * (§ 34.2.2, KA-U57 (d)). For en kravpost etter en beregningsregel kan BH ikke mene fast sum
 * (OV-U115 punkt 1 og 5).
 */
export type Formvalg = 'godtar' | 'enhetspriser' | 'regningsarbeid';

/** Det BH har valgt for én kravpost. `null` er ikke besvart. */
export interface Postvalg {
  form: Formvalg | null;
  beloep: Beloepsvalg | null;
  /** Teksten BH skrev i beløpsfeltet, lest med `lesKroner` (OV-U58). */
  delbeloep: string;
  /** Kravet om spesifisert tilbud for en kravpost etter en beregningsregel (KA-U69, KA-U71). */
  kreverTilbud: boolean;
  /**
   * Standpunktet til varselet etter § 34.3.3 eller § 34.4 for kravposten (KA-U64). For § 34.4 er
   * `true` bare oppgivelsen av en innsigelse som står (VS-U63, `varseletFoer`).
   */
  varsletITide: boolean | null;
  /**
   * U-7 i BF-49: et svar lagt til sier ikke noe om varselet der byggherrens innsigelse står, og
   * leses med innsigelsen (VS-U77 punkt 9 og 12, VS-U80). Velges bare i et svar lagt til.
   */
  tausOmVarselet: boolean;
  /** Om BH godtar justeringen av enhetsprisene etter § 34.3.2 (KA-U68). */
  godtarJustering: boolean | null;
}

/**
 * Det BH har valgt for posten etter § 34.1.3 annet ledd (VS-U5). `null` er ikke besvart. Beløpet
 * etter begrensningen gjelder bare når BH gjør gjeldende at varselet kom for sent.
 */
export interface Saerskiltvalg {
  varsletITide: boolean | null;
  /** Teksten BH skrev i feltet for beløpet etter begrensningen, lest med `lesKroner`. */
  begrenset: string;
  beloep: Beloepsvalg | null;
  delbeloep: string;
}

/**
 * Det BH har valgt i skjemaet. `null` er ikke besvart. Bare en innsigelse mot varselet for en kravpost som står, gjentas uten et valg (`varseletIValgene`). Svaret på
 * hver kravpost står under betegnelsen, som er unik i kravet (KA-U53).
 */
export interface Svarvalg {
  iTide: boolean | null;
  poster: Record<string, Postvalg>;
  /** Svaret på posten etter § 34.1.3 annet ledd. Sendes bare når kravet har posten. */
  saerskilt?: Saerskiltvalg;
  /** Begrunnelsen per punkt i brevet, med punktet som nøkkel (KA-U46, LV-U71). */
  begrunnelser: Record<string, string>;
  /** Byggherrens tekst for hele svaret, under «Forbehold» sist i brevet (KA-U87 punkt 1). */
  forbehold: string;
  /**
   * Svaret et nytt svar ble fylt ut fra og erstatter (`valgFraSvaret`). Kjernen avviser
   * revisjonen når det ikke lenger er det gjeldende svaret (`FEIL_SVARREFERANSE`).
   */
  erstatter?: string;
}

export const tomPost = (): Postvalg => ({
  form: null,
  beloep: null,
  delbeloep: '',
  kreverTilbud: false,
  varsletITide: null,
  tausOmVarselet: false,
  godtarJustering: null,
});

export const tomtSaerskilt = (): Saerskiltvalg => ({
  varsletITide: null,
  begrenset: '',
  beloep: null,
  delbeloep: '',
});

export const tomtSvar = (): Svarvalg => ({
  iTide: null,
  poster: {},
  begrunnelser: {},
  forbehold: '',
});

/**
 * Standpunktet til varselet for kravposten i svaret, regnet av valget og saken slik den er nå:
 * en innsigelse som står, gjentas når byggherren ikke har valgt noe (VS-U77 punkt 9), og etter
 * § 34.4 er «i tide» bare oppgivelsen av en innsigelse som står (VS-U63). Utgangspunktet lagres
 * ikke i valgene, så det følger ikke med til et annet varsel når kravposten skifter
 * oppgjørsform (VS-U77 punkt 14). Et svar lagt til, sendt `sendt`, leser innsigelsen på dagen og
 * gjentar den ikke uten et valg: det kan si ingenting om varselet (`tausOmVarselet`, U-7 i BF-49).
 */
export const varseletIValgene = (
  u: Utledning,
  post: Kravpost,
  v: Postvalg,
  sendt: string | null = null,
  innsigelsene = innsigelseneSomStaar(u, sendt)
): boolean | null => {
  const staar = innsigelsenStaar(innsigelsene, post);
  if (sendt !== null && staar) return v.tausOmVarselet ? null : v.varsletITide;
  return standpunktetIValget(v.varsletITide, staar, regelen(post) === 'regningsarbeid');
};

/**
 * Byggherrens innsigelse mot varselet for kravposten står blant `innsigelsene` svaret leses med
 * (`innsigelseneSomStaar`, VS-U80).
 */
export const innsigelsenStaar = (
  innsigelsene: readonly { gjelder: string; hjemmel: string }[],
  post: Kravpost
) => innsigelsene.some((x) => x.gjelder === post.id && x.hjemmel === varselhjemmelFor(post));

/**
 * Standpunktet til et varsel etter § 34.3.3 eller § 34.4 i valget: en innsigelse som `staar`,
 * gjentas uten et valg (VS-U77 punkt 9), og etter § 34.4 er «i tide» bare oppgivelsen av den
 * (VS-U77 punkt 31).
 */
function standpunktetIValget(valgt: boolean | null, staar: boolean, etter344: boolean) {
  if (valgt === null) return staar ? false : null;
  if (valgt === true && etter344 && !staar) return null;
  return valgt;
}

/** Valgene for kravposten med betegnelsen, eller en ubesvart post. */
export const postvalget = (v: Svarvalg, betegnelse: string): Postvalg =>
  v.poster[betegnelse] ?? tomPost();

/** Beregningsregelen kravposten følger, eller `null` for en kravpost med fast sum. */
export const regelen = (post: Kravpost): Regel | null =>
  post.oppgjoersform === 'tilbud' ? null : post.oppgjoersform;

/** Kravposten følger en beregningsregel, enhetspriser eller regningsarbeid, og har ikke et krevd beløp (KA-U66). */
export const etterRegel = (post: Kravpost): boolean => regelen(post) !== null;

/** Kravet i kravposten i kortform, i kolonnen «Kravet»: oppgjørsformen eller beløpet. */
export const kravetIKortform = (post: Kravpost): string =>
  etterRegel(post) ? KRAVSKJEMA.formnavn[post.oppgjoersform] : kroner(post.beloep ?? 0);

/** Aksepten av tilbudet eller beregningsregelen slik valget for oppgjørsformen gir den. */
const akseptIValget = (p: Postvalg): boolean | undefined =>
  p.form === 'godtar' ? true : p.form !== null ? false : undefined;

/**
 * Valget for beløpet, eller `null` når det ikke er besvart eller kjernen ikke spør om beløpet
 * (`beloepetStilles`, KA-U66, KA-U72). Valget står likevel, så det er der igjen om BH godkjenner
 * fast sum.
 */
export const beloepsvalget = (p: Postvalg, post: Kravpost): Beloepsvalg | null =>
  beloepetStilles(etterRegel(post), akseptIValget(p)) ? p.beloep : null;

/**
 * Spørsmålene om oppgjørsformen kjernen stiller for kravposten med valgene så langt
 * (`stiltIKravposten`, #2171), så svaret sendes uten et svar på et spørsmål som ikke stilles.
 * Et valg står likevel, så det er der igjen om BH endrer standpunktet til oppgjørsformen.
 */
const stiltIPosten = (p: Postvalg, post: Kravpost): SpoersmaalIKravposten[] =>
  stiltIKravposten({ aksepterer: akseptIValget(p) }, post);

const VURDERING: Record<Beloepsvalg, string> = {
  hele: 'godkjent',
  deler: 'delvis',
  ingenting: 'avslaatt',
};

/** Beløpet i et beløpsfelt i kroner, eller `undefined` når det er tomt eller ikke kan leses. */
export const beloepet = (tekst: string) => {
  const lest = lesKroner(tekst);
  return 'verdi' in lest ? lest.verdi : undefined;
};

/** Beløpet BH godkjenner med valget, av det krevde og teksten i beløpsfeltet. */
const godkjentIValget = (valg: Beloepsvalg, krevd: number | undefined, delbeloep: string) =>
  valg === 'hele' ? krevd : valg === 'ingenting' ? 0 : beloepet(delbeloep);

/** Valget for beløpet BH godkjente i et svar, med det krevde beløpet. */
const valgetFor = (godkjent: number, krevd: number | null | undefined): Beloepsvalg =>
  godkjent === 0 ? 'ingenting' : godkjent === krevd ? 'hele' : 'deler';

export const definert = <T extends object>(felt: T): T =>
  Object.fromEntries(Object.entries(felt).filter(([, x]) => x !== undefined)) as T;

/**
 * Svaret på én kravpost. Et felt skjemaet ikke spør om i valgene, sendes ikke, så et valg som
 * står igjen etter et endret standpunkt, ikke gir et svar kjernen avviser (KA-U71, KA-U72).
 */
function kravpostsvaret(
  post: Kravpost,
  p: Postvalg,
  u: Utledning,
  sendt: string | null,
  innsigelsene: ReturnType<typeof innsigelseneSomStaar>
) {
  const beloep = beloepsvalget(p, post);
  const stilt = stiltIPosten(p, post);
  const kreverTilbud = stilt.includes('krever_tilbud') && p.kreverTilbud;
  const varslet = stilt.includes('varslet_i_tide')
    ? varseletIValgene(u, post, p, sendt, innsigelsene)
    : null;
  return definert({
    gjelder: post.id,
    vurdering: beloep ? VURDERING[beloep] : undefined,
    godkjent_beloep: beloep ? godkjentIValget(beloep, post.beloep, p.delbeloep) : undefined,
    aksepterer: akseptIValget(p) ?? (kreverTilbud ? false : undefined),
    oensket_oppgjoersform: p.form === null || p.form === 'godtar' ? undefined : p.form,
    krever_tilbud: kreverTilbud || undefined,
    varslet_i_tide: varslet ?? undefined,
    godtar_justering: stilt.includes('godtar_justering')
      ? (p.godtarJustering ?? undefined)
      : undefined,
  });
}

/** Det krevde beløpet for posten etter § 34.1.3 annet ledd, eller `null` når kravet ikke har den. */
export const krevdSaerskilt = (krav: Krav): number | null =>
  innholdIVederlaget(krav).saerskilt.produktivitet?.beloep ?? null;

/**
 * Svaret på posten etter § 34.1.3 annet ledd (VS-U5, valg 2 i #1047), med feltene kjernen leser
 * (`PRODUKTIVITETSFELT`). Beløpet etter begrensningen sendes bare med innsigelsen mot varselet.
 */
function saerskiltsvaret(s: Saerskiltvalg, krevd: number) {
  return {
    produktivitet_varslet_i_tide: s.varsletITide ?? undefined,
    produktivitet_begrenset_beloep: s.varsletITide === false ? beloepet(s.begrenset) : undefined,
    produktivitet_vurdering: s.beloep ? VURDERING[s.beloep] : undefined,
    produktivitet_godkjent_beloep: s.beloep
      ? godkjentIValget(s.beloep, krevd, s.delbeloep)
      : undefined,
  };
}

/** Om BH tar stilling til varselet etter § 34.1.2 (OV-U15), med kjernens predikat. */
export const spoerOmHovedvarselet = (
  u: Utledning,
  regler: Regelsett,
  paaberopelse = u.spor.forhold.gjeldendeKrav
): boolean => hjemmelenGjelder('34.1.2', paaberopelse, regler);

/**
 * Kravversjonen og påberopelsen svaret gjelder: de gjeldende for et svar fra løsningen, og de som
 * var gjeldende på dagen `sendt` for et svar lagt til (OV-U98, D-7 i BF-49).
 */
export const kravetSvaretGjelder = (
  u: Utledning,
  spor: 'vederlag' | 'frist',
  sendt: string | null
) =>
  sendt === null
    ? { krav: u.spor[spor].gjeldendeKrav, paaberopelse: u.spor.forhold.gjeldendeKrav }
    : {
        krav: kravversjonenPaaDagen(u, spor, sendt),
        paaberopelse: kravversjonenPaaDagen(u, 'forhold', sendt),
      };

/** Ett svar per kravpost (KA-U57). */
function vurderingene(
  v: Svarvalg,
  krav: Krav,
  hovedvarselet: boolean,
  u: Utledning,
  sendt: string | null,
  innsigelsene: ReturnType<typeof innsigelseneSomStaar>
): Svarvurdering {
  const poster = kravposterI(krav);
  const krevd = krevdSaerskilt(krav);
  const innsigelsenStaar =
    hovedvarselet && sendt === null && standpunktTilHovedvarseletFoer(u, sendt)?.iTide === false;
  return definert({
    hovedkrav_varslet_i_tide: hovedvarselet
      ? (v.iTide ?? (innsigelsenStaar ? false : undefined))
      : undefined,
    ...(krevd === null ? {} : saerskiltsvaret(v.saerskilt ?? tomtSaerskilt(), krevd)),
    kravposter: poster.length
      ? poster.map((post) =>
          kravpostsvaret(post, postvalget(v, post.betegnelse), u, sendt, innsigelsene)
        )
      : undefined,
  });
}

/** Forbeholdet og begrunnelsene for `punktene` brevet har, uten tomme tekster. */
function utdypningene(
  tekster: { begrunnelser: Record<string, string>; forbehold: string },
  punktene: readonly string[]
) {
  const utdypning = tekster.forbehold.trim();
  const utdypninger = Object.fromEntries(
    Object.entries(tekster.begrunnelser)
      .map(([punkt, tekst]) => [punkt, tekst.trim()] as const)
      .filter(([punkt, tekst]) => tekst && punktene.includes(punkt))
  );
  return {
    ...(utdypning ? { utdypning } : {}),
    ...(Object.keys(utdypninger).length ? { utdypninger } : {}),
  };
}

/**
 * Brevet med BHs svar på kravet i sporet. Resultatet regnes av kjernen, og er tomt når
 * vurderingene ikke kan regnes ut, så kjernen avviser kommandoen med sin egen melding. Begrunnelsen
 * står bare for `punktene` brevet har, så en tekst for et punkt som er falt bort, ikke stopper
 * brevet, og forbeholdet er utdypningen for hele svaret.
 */
export function svarbrevet(
  spor: Spor,
  krav: Krav,
  vurderinger: Svarvurdering,
  kontekst: Omit<Parameters<typeof regnUtSvar>[2], 'krav'>,
  tekster: { begrunnelser: Record<string, string>; forbehold: string },
  regler: Regelsett,
  punktene: readonly string[]
): { type: 'brev'; svar: Svarutkast[] } {
  let resultat: Record<string, unknown> = {};
  try {
    resultat = regnUtSvar(spor, vurderinger, { ...kontekst, krav }, regler);
  } catch (feil) {
    if (!(feil instanceof UgyldigVurdering || feil instanceof UgyldigBeloep)) throw feil;
  }
  return {
    type: 'brev',
    svar: [
      {
        spor,
        gjelder: krav.id,
        regelversjon: regler.versjon,
        vurderinger,
        resultat,
        ...utdypningene(tekster, punktene),
      },
    ],
  };
}

/** Brevet som revisjon av svaret `erstatter`, når valgene er et nytt svar (HF-U29). */
export function somNyttSvar(
  brev: { type: 'brev'; svar: Svarutkast[] },
  erstatter: string | undefined
):
  | { type: 'brev'; svar: Svarutkast[] }
  | { type: 'revisjon'; erstatter: string; svar: Svarutkast } {
  return erstatter ? { type: 'revisjon', erstatter, svar: brev.svar[0] } : brev;
}

/** Det første standpunktet av arten `art` i svaret som `hvis` gjelder for, med typen for arten. */
export const standpunktet = <A extends Standpunkt['art']>(
  svar: Svar,
  art: A,
  hvis: (s: Extract<Standpunkt, { art: A }>) => boolean = () => true
): Extract<Standpunkt, { art: A }> | undefined =>
  svar.standpunkter.filter((s): s is Extract<Standpunkt, { art: A }> => s.art === art).find(hvis);

/**
 * Valgene i skjemaet for et nytt svar, fylt ut med standpunktene i svaret det erstatter, så
 * byggherren endrer det byggherren vil (HF-U29). Svaret på varselet for kravposten fylles ut som
 * det ble sendt; en innsigelse som står, gjentas uansett (`varseletIValgene`). Begrunnelsene og
 * forbeholdet skrives på nytt.
 */
export function valgFraSvaret(svar: Svar, krav: Krav): Svarvalg {
  const finn = <A extends Standpunkt['art']>(
    art: A,
    hvis: (s: Extract<Standpunkt, { art: A }>) => boolean
  ) => standpunktet(svar, art, hvis);
  const varselet = (hjemmel: string, gjelder?: string) =>
    finn(
      'rettidighet',
      (s) => s.hjemmel === hjemmel && (gjelder === undefined || s.gjelder === gjelder)
    )?.iTide ?? null;
  const postvalg = (post: Kravpost): Postvalg => {
    const form = finn('oppgjoersform', (s) => s.gjelder === post.id);
    const godkjent = finn('beloep', (s) => !s.saerskilt && s.gjelder === post.id)?.godkjent;
    const hjemmel = varselhjemmelFor(post);
    const beloep = godkjent === undefined ? null : valgetFor(godkjent, post.beloep);
    return {
      form: form ? (form.aksepterer ? 'godtar' : (form.oensket ?? null)) : null,
      beloep,
      delbeloep: beloep === 'deler' ? visKroner(godkjent) : '',
      kreverTilbud: !!form?.kreverTilbud,
      varsletITide: hjemmel ? varselet(hjemmel, post.id) : null,
      tausOmVarselet: false,
      godtarJustering: finn('justering', (s) => s.gjelder === post.id)?.godtar ?? null,
    };
  };
  const krevd = krevdSaerskilt(krav);
  const saerskilt = (): Saerskiltvalg => {
    const godkjent = finn('beloep', (s) => s.saerskilt === 'produktivitet')?.godkjent;
    const begrenset = finn('rettidighet', (s) => s.hjemmel === '34.1.3')?.begrenset;
    const beloep = godkjent === undefined ? null : valgetFor(godkjent, krevd);
    return {
      varsletITide: varselet('34.1.3'),
      begrenset: begrenset === undefined ? '' : visKroner(begrenset),
      beloep,
      delbeloep: beloep === 'deler' ? visKroner(godkjent) : '',
    };
  };
  return {
    ...tomtSvar(),
    erstatter: svar.id,
    iTide: varselet('34.1.2'),
    ...(krevd === null ? {} : { saerskilt: saerskilt() }),
    poster: Object.fromEntries(kravposterI(krav).map((p) => [p.betegnelse, postvalg(p)])),
  };
}

/**
 * BHs svar på gjeldende vederlagskrav, eller `null` når saken ikke har et krav (`svarbrevet`). Et
 * svar lagt til, sendt `sendt`, gjelder kravversjonen og påberopelsen på dagen
 * (`kravetSvaretGjelder`). Resultatet regnes med innsigelsene svaret leses med, som kjernen
 * regner det (VS-U80, VS-U81).
 */
export function vederlagssvaret(
  v: Svarvalg,
  u: Utledning,
  regler: Regelsett,
  punktene: readonly string[] = [],
  sendt: string | null = null
): { type: 'brev'; svar: Svarutkast[] } | null {
  const { krav, paaberopelse } = kravetSvaretGjelder(u, 'vederlag', sendt);
  if (!krav) return null;
  const staar = innsigelseneSomStaar(u, sendt);
  return svarbrevet(
    'vederlag',
    krav,
    vurderingene(v, krav, spoerOmHovedvarselet(u, regler, paaberopelse), u, sendt, staar),
    { paaberopelse, staar },
    v,
    regler,
    punktene
  );
}

/** Det BH har valgt i svaret på et varsel som står alene (VS-U79, VS-U96 punkt 32). */
export interface Varselsvalg {
  varsletITide: boolean | null;
  hovedvarseletITide?: boolean | null;
  /** Bare for varselet etter § 34.3.3 (VS-U77 punkt 30). */
  godtarJustering: boolean | null;
  begrunnelser: Record<string, string>;
  forbehold: string;
}

export const tomtVarselsvar = (): Varselsvalg => ({
  varsletITide: null,
  godtarJustering: null,
  begrunnelser: {},
  forbehold: '',
});

/**
 * Valgene med et ubesvart varsel som innsigelse og en ubesvart justering som bestridt, som i
 * utfyllingen for kravposten (`lagIVederlaget`), så kjernen leser det varselet og justeringen
 * gjelder hvis før de er besvart (OV-U32, VS-U4). Standpunktet etter § 34.4 har ikke noe lag
 * (KA-U64), så valgene står.
 */
export const utfyltVarselsvalg = (v: Varselsvalg, hjemmel: SvarbarVarselhjemmel): Varselsvalg =>
  hjemmel === '34.4'
    ? v
    : { ...v, varsletITide: v.varsletITide ?? false, godtarJustering: v.godtarJustering ?? false };

/** Standpunktet til varselet i svaret på det, regnet som for kravposten (`varseletIValgene`). */
export const varseletISvaret = (v: Varselsvalg, varselet: VarseletAlene): boolean | null =>
  standpunktetIValget(v.varsletITide, varselet.foer?.iTide === false, varselet.hjemmel === '34.4');

const hovedvarseletISvaret = (
  v: { hovedvarseletITide?: boolean | null },
  foer: VarseletAlene['hovedvarseletFoer']
): boolean | undefined =>
  foer === undefined
    ? undefined
    : (v.hovedvarseletITide ?? (foer?.iTide === false ? false : undefined));

/**
 * BHs svar på et varsel som står alene, eller et nytt svar som erstatter det forrige (VS-U79,
 * VS-U96 punkt 32 og 33), i sporet varselet står i. Svaret har ingen kravposter og ikke noe
 * resultat (arbeidsvalg 1 A i #2177). Begrunnelsen står bare for `punktene` brevet har, som i
 * `svarbrevet`.
 */
export const varselsvaret = (
  v: Varselsvalg,
  varselet: VarseletAlene,
  regler: Regelsett,
  punktene: readonly string[] = []
):
  | { type: 'brev'; svar: Svarutkast[] }
  | { type: 'revisjon'; erstatter: string; svar: Svarutkast } =>
  brevEllerRevisjon(svaretPaaVarselet(v, varselet, regler, punktene), varselet.forrigeSvar);

/** Svaret på varselet i `varselsvaret` og `varselbrevsvaret`. */
function svaretPaaVarselet(
  v: Varselsvalg,
  varselet: VarseletAlene,
  regler: Regelsett,
  punktene: readonly string[]
): Svarutkast {
  return {
    spor: VARSELSPOR[varselet.hjemmel],
    gjelder: varselet.kravversjon ?? varselet.id,
    // VS-U96 punkt 38: svaret bare på varselet i kravversjonen.
    ...(varselet.kravversjon ? { bare_varselet: true as const } : {}),
    regelversjon: regler.versjon,
    // Vurderingene i svaret på varselet står ikke i `Svarvurdering` (`standpunkterPaaVarselet` og
    // `standpunkterPaaFristvarselet`).
    vurderinger: definert({
      varslet_i_tide: varseletISvaret(v, varselet) ?? undefined,
      hovedkrav_varslet_i_tide: hovedvarseletISvaret(v, varselet.hovedvarseletFoer),
      godtar_justering:
        varselet.hjemmel === '34.3.3' ? (v.godtarJustering ?? undefined) : undefined,
    }) as Svarvurdering,
    resultat: {},
    ...utdypningene(v, punktene),
  };
}

/** Det BH har valgt i svaret på varslene i et brev, per varsel (M-5 og U-8 i BF-37, #2451). */
export type Varselbrevvalg = Record<string, Varselsvalg>;

export const varselvalget = (v: Varselbrevvalg, varsel: string): Varselsvalg =>
  v[varsel] ?? tomtVarselsvar();

/** Om BH har tatt stilling til varselet i svaret på varslene i brevet. */
export const harStandpunkt = (v: Varselsvalg, varselet: VarseletAlene): boolean =>
  varseletISvaret(v, varselet) !== null ||
  (varselet.hovedvarseletFoer !== undefined && v.hovedvarseletITide != null) ||
  (varselet.hjemmel === '34.3.3' && v.godtarJustering !== null);

/**
 * BHs svar på varslene i et brev som står alene, ett svar per varsel BH har tatt stilling til
 * (svaret 27.11 i #2451, VS-U96 punkt 32). Begrunnelsen
 * for et varsel står bare for punktene svaret på det har i brevet (`punktene`), som i
 * `svarbrevet`.
 */
export function varselbrevsvaret(
  v: Varselbrevvalg,
  varslene: readonly VarseletAlene[],
  regler: Regelsett,
  punktene: (varsel: string) => readonly string[] = () => []
): { type: 'brev'; svar: Svarutkast[] } {
  return {
    type: 'brev',
    svar: varslene
      .filter((x) => harStandpunkt(varselvalget(v, x.id), x))
      .map((x) => svaretPaaVarselet(varselvalget(v, x.id), x, regler, punktene(x.id))),
  };
}

/** Svaret i et nytt brev, eller som revisjon av det forrige svaret i kjeden (VS-U96 punkt 33). */
const brevEllerRevisjon = (
  svar: Svarutkast,
  forrigeSvar: string | null
):
  | { type: 'brev'; svar: Svarutkast[] }
  | { type: 'revisjon'; erstatter: string; svar: Svarutkast } =>
  forrigeSvar ? { type: 'revisjon', erstatter: forrigeSvar, svar } : { type: 'brev', svar: [svar] };

/** Valgene uten begrunnelsene og forbeholdet, så svaret ikke regnes på nytt for hvert tegn (#1925). */
export const utenTekster = <V extends { begrunnelser: Record<string, string>; forbehold: string }>(
  v: V
): V => ({ ...v, begrunnelser: {}, forbehold: '' });

/** Det BH har valgt for varselet i én kravpost i svaret bare på varslene (VS-U96 punkt 38). */
export interface Postvarselvalg {
  varsletITide: boolean | null;
  /** Bare for varselet etter § 34.3.3 (VS-U96 punkt 30). */
  godtarJustering: boolean | null;
}

/** Det BH har valgt i svaret bare på varslene i vederlagskravet, per kravpost (VS-U96 punkt 38). */
export interface Varslenesvalg {
  poster: Record<string, Postvarselvalg>;
  hovedvarseletITide?: boolean | null;
  begrunnelser: Record<string, string>;
  forbehold: string;
}

export const tomtVarslenesvar = (): Varslenesvalg => ({
  poster: {},
  begrunnelser: {},
  forbehold: '',
});

export const postvarselvalget = (v: Varslenesvalg, post: string): Postvarselvalg =>
  v.poster[post] ?? { varsletITide: null, godtarJustering: null };

/** Standpunktet til varselet for kravposten i valget, regnet som for kravposten i svaret på kravet. */
export const varseletIPosten = (v: Varslenesvalg, p: VarseletIPosten): boolean | null =>
  standpunktetIValget(
    postvarselvalget(v, p.post.id).varsletITide,
    p.foer?.iTide === false,
    p.hjemmel === '34.4'
  );

const justeringIPosten = (v: Varslenesvalg, p: VarseletIPosten): boolean | null =>
  p.hjemmel === '34.3.3' ? postvarselvalget(v, p.post.id).godtarJustering : null;

/** Kravpostene svaret har et standpunkt til, i rekkefølgen i kravet. */
export const besvartePoster = (v: Varslenesvalg, poster: readonly VarseletIPosten[]) =>
  poster.filter((p) => varseletIPosten(v, p) !== null || justeringIPosten(v, p) !== null);

/**
 * Postene tittelen på svaret gjelder, som kjernen leser dem av standpunktene (`svaretGjelder`):
 * postene svaret har et standpunkt til, eller alle før byggherren har valgt.
 */
export const postenITittelen = (v: Varslenesvalg, poster: readonly VarseletIPosten[]) => {
  const besvart = besvartePoster(v, poster);
  return (besvart.length ? besvart : poster).map((p) => ({ id: p.post.id, hjemmel: p.hjemmel }));
};

/**
 * BHs svar bare på varslene i vederlagskravet der kravet selv er varselet, eller et nytt svar som
 * erstatter det forrige (VS-U96 punkt 33 og 38, svaret på spørsmål 3 i #2456): kravversjonen i
 * `gjelder`, `bare_varselet` og standpunktet til hver kravpost BH har tatt stilling til. Svaret har
 * ikke noe resultat. Begrunnelsen står bare for `punktene` brevet har, som i `svarbrevet`.
 */
export function varslenesvaret(
  v: Varslenesvalg,
  varslene: VarsleneIVederlagskravet,
  regler: Regelsett,
  punktene: readonly string[] = []
):
  | { type: 'brev'; svar: Svarutkast[] }
  | { type: 'revisjon'; erstatter: string; svar: Svarutkast } {
  const kravposter = besvartePoster(v, varslene.poster).map((p) =>
    definert({
      gjelder: p.post.id,
      varslet_i_tide: varseletIPosten(v, p) ?? undefined,
      godtar_justering: justeringIPosten(v, p) ?? undefined,
    })
  );
  const svar: Svarutkast = {
    spor: 'vederlag',
    gjelder: varslene.kravversjon,
    bare_varselet: true,
    regelversjon: regler.versjon,
    vurderinger: definert({
      kravposter,
      hovedkrav_varslet_i_tide: hovedvarseletISvaret(v, varslene.hovedvarseletFoer),
    }) as unknown as Svarvurdering,
    resultat: {},
    ...utdypningene(v, punktene),
  };
  return brevEllerRevisjon(svar, varslene.forrigeSvar);
}

/** TEs aksept av svaret `svar`, med regelversjonen brevet forhåndsvises med (KA-U10, MM-U50). */
export const aksepten = (spor: Spor, svar: string, regelversjon: number) => ({
  type: 'aksept' as const,
  spor,
  svar,
  regelversjon,
});

/** Det TE har skrevet i skjemaet for korrigeringen av datoen. */
export interface Korrigeringsvalg {
  /** «2026-09-20», tom før TE har skrevet den. */
  dato: string;
  forklaring: string;
}

/**
 * TEs korrigering av opplysningen om datoen (MM-U59 punkt 10), i feltet opplysningen har. Den
 * valgfrie forklaringen er `utdypning` (MM-U53). Kjernen avviser en uendret dato og en dato
 * etter brevets dato.
 */
export function korrigeringen(
  v: Korrigeringsvalg,
  opplysning: { id: string; hva: 'paalegg_mottatt' | 'klar_over_forholdet' }
) {
  const utdypning = v.forklaring.trim();
  return {
    type: 'korrigering' as const,
    gjelder: opplysning.id,
    [opplysning.hva]: v.dato,
    ...(utdypning ? { utdypning } : {}),
  } as {
    type: 'korrigering';
    gjelder: string;
    paalegg_mottatt?: string;
    klar_over_forholdet?: string;
    utdypning?: string;
  };
}

/**
 * TEs egne brev med datoen TE ble klar over at utgiftene etter § 34.1.3 annet ledd ville påløpe
 * (VS-U86 punkt 14, VS-U82). `gjelder` er varselet kjernen tilbyr handlingen for, og den valgfrie
 * forklaringen er `utdypning` (D-5 i BF-48). Kjernen avviser en uendret dato og en dato etter
 * brevets dato.
 */
export function kunnskapsdatoen(v: Korrigeringsvalg, gjelder: string) {
  const utdypning = v.forklaring.trim();
  return {
    type: 'kunnskapsdato' as const,
    gjelder,
    klar_over_utgiftene: v.dato,
    ...(utdypning ? { utdypning } : {}),
  };
}

/**
 * TEs retting av datoen for et varsel eller et krav lagt til som korrespondanse (MM-U59 punkt 8 og
 * 18, MM-U63). `gjelder` er varselet eller kravet kjernen tilbyr handlingen for
 * (`rette_datoen:<id>`), og den valgfrie forklaringen er `utdypning` (D-9 i BF-50).
 */
export function rettingen(v: Korrigeringsvalg, gjelder: string) {
  const utdypning = v.forklaring.trim();
  return {
    type: 'retting' as const,
    gjelder,
    dato: v.dato,
    ...(utdypning ? { utdypning } : {}),
  };
}

/**
 * TEs nye versjon av påberopelsen (BF-10, KA-U52): kategoriene og endringsordren står som i
 * gjeldende versjon (GR-U40 punkt 7), datoen er TEs siste opplysning, også etter en korrigering
 * (MM-U59 punkt 10, #1617), og teksten er utdypningen (S-3 i BF-10). Kjernen avviser en annen
 * dato og en annen kategori.
 */
export function nyVersjonAvPaaberopelsen(u: Utledning, tekst: string) {
  const gjeldende = u.spor.forhold.gjeldendeKrav?.innhold ?? {};
  const innhold: Record<string, unknown> = Object.fromEntries(
    Object.entries(gjeldende).filter(([felt]) =>
      Object.hasOwn(KRAVINNHOLD.forhold.properties, felt)
    )
  );
  const felt = oppgittDato(gjeldende.hovedkategori, gjeldende.underkategori);
  // TEs siste opplysning i feltet, som `sisteDatoopplysning` i kjernen (lesepunktet er `#lib/kjernesak/`).
  const siste = felt === null ? null : u.datoopplysninger.findLast((o) => o.felt === felt);
  if (felt !== null && siste) innhold[felt] = siste.dato;
  const utdypning = tekst.trim();
  return {
    type: 'krav' as const,
    spor: 'forhold' as const,
    innhold,
    ...(utdypning ? { utdypning } : {}),
  };
}

/** Innlegget parten skriver (BF-03). Det står mens parten går til brevkontrollen og tilbake (G-3). */
export interface Innleggsvalg {
  /** Brevet innlegget viser til (MM-U47 punkt 2). */
  gjelder: string;
  tittel: string;
  tekst: string;
  vedlegg: Kjernevedlegg[];
}

/**
 * Innlegget i fritekst (MM-U47 punkt 1–2, G-1 i BF-03): brevet det viser til, tittelen, teksten
 * som følger henvisningen, og vedleggene (G-6). Kjernen avviser et brev som ikke er i saken.
 */
export const innlegget = (v: Innleggsvalg) => ({
  type: 'innlegg' as const,
  gjelder: v.gjelder,
  tittel: v.tittel.trim(),
  utdypning: v.tekst.trim(),
  ...(v.vedlegg.length ? { dokumentasjon: v.vedlegg.map((x) => x.vedlegg_id) } : {}),
});
