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
import type { Regelsett } from '#kjerne/regler/regelsett.ts';
import type { Svarutkast } from '#kjerne/kommandoer/kommando.ts';
import type { Krav, Kravpost, Oppgjoersform, Spor } from '#kjerne/typer.ts';
import { KRAVINNHOLD } from '#kjerne/format/format.ts';
import { oppgittDato } from '#kjerne/spor/forhold/format.ts';
import type { Utledning } from '#kjerne/utledning/utled.ts';
import { lesKroner } from '#lib/utils/belop.ts';
import { justerteEnhetspriser, kravposterI } from '#kjerne/spor/vederlag/format.ts';

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
   * Standpunktet til varselet etter § 34.3.3 eller § 34.4 for kravposten (KA-U64). For § 34.4
   * brukes bare `false` (VS-U63).
   */
  varsletITide: boolean | null;
  /** Om BH godtar justeringen av enhetsprisene etter § 34.3.2 (KA-U68). */
  godtarJustering: boolean | null;
}

/**
 * Det BH har valgt i skjemaet. `null` er ikke besvart; ingenting er forhåndsvalgt. Svaret på
 * hver kravpost står under betegnelsen, som er unik i kravet (KA-U53).
 */
export interface Svarvalg {
  iTide: boolean | null;
  poster: Record<string, Postvalg>;
  /** Begrunnelsen per punkt i brevet, med punktet som nøkkel (KA-U46, LV-U71). */
  begrunnelser: Record<string, string>;
  /** Byggherrens tekst for hele svaret, under «Forbehold» sist i brevet (KA-U49 punkt 1). */
  forbehold: string;
}

export const tomPost = (): Postvalg => ({
  form: null,
  beloep: null,
  delbeloep: '',
  kreverTilbud: false,
  varsletITide: null,
  godtarJustering: null,
});

export const tomtSvar = (): Svarvalg => ({
  iTide: null,
  poster: {},
  begrunnelser: {},
  forbehold: '',
});

/** Valgene for kravposten med betegnelsen, eller en ubesvart post. */
export const postvalget = (v: Svarvalg, betegnelse: string): Postvalg =>
  v.poster[betegnelse] ?? tomPost();

/** Beregningsregelen kravposten følger, eller `null` for en kravpost med fast sum. */
export const regelen = (post: Kravpost): Regel | null =>
  post.oppgjoersform === 'tilbud' ? null : post.oppgjoersform;

/** Kravposten følger en beregningsregel, enhetspriser eller regningsarbeid, og har ikke et krevd beløp (KA-U66). */
export const etterRegel = (post: Kravpost): boolean => regelen(post) !== null;

/**
 * Skjemaet spør om beløpet bare for en kravpost med fast sum, og bare når BH ikke mener en annen
 * oppgjørsform (KA-U66, KA-U72). Valget for beløpet står likevel, så det er der igjen om BH
 * godkjenner fast sum.
 */
export const spoerOmBeloepet = (p: Postvalg, post: Kravpost): boolean =>
  !etterRegel(post) && p.form !== 'enhetspriser' && p.form !== 'regningsarbeid';

/** Valget for beløpet, eller `null` når det ikke er besvart eller skjemaet ikke spør (KA-U72). */
export const beloepsvalget = (p: Postvalg, post: Kravpost): Beloepsvalg | null =>
  spoerOmBeloepet(p, post) ? p.beloep : null;

/**
 * Skjemaet spør om kravet om tilbud når BH ikke godtar beregningsregelen (KA-U69, KA-U71). Valget
 * står likevel, så det er der igjen om BH endrer standpunktet til oppgjørsformen.
 */
export const spoerOmTilbud = (p: Postvalg, post: Kravpost): boolean =>
  etterRegel(post) && p.form !== 'godtar';

/**
 * Skjemaet spør om varselet etter § 34.3.3 for justerte enhetspriser, også subsidiært når BH ikke
 * godtar beregningsregelen (VS-U56), og om varselet etter § 34.4 når BH godtar regningsarbeid
 * (KA-U64, VS-U63).
 */
export const spoerOmVarselet = (p: Postvalg, post: Kravpost): boolean =>
  justerteEnhetspriser(post) || (post.oppgjoersform === 'regningsarbeid' && p.form === 'godtar');

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

export const definert = <T extends object>(felt: T): T =>
  Object.fromEntries(Object.entries(felt).filter(([, x]) => x !== undefined)) as T;

/**
 * Svaret på én kravpost. Et felt skjemaet ikke spør om i valgene, sendes ikke, så et valg som
 * står igjen etter et endret standpunkt, ikke gir et svar kjernen avviser (KA-U71, KA-U72).
 */
function kravpostsvaret(post: Kravpost, p: Postvalg) {
  const beloep = beloepsvalget(p, post);
  const kreverTilbud = spoerOmTilbud(p, post) && p.kreverTilbud;
  const varslet = spoerOmVarselet(p, post) ? p.varsletITide : null;
  return definert({
    gjelder: post.id,
    vurdering: beloep ? VURDERING[beloep] : undefined,
    godkjent_beloep:
      beloep === 'hele'
        ? post.beloep
        : beloep === 'ingenting'
          ? 0
          : beloep === 'deler'
            ? beloepet(p.delbeloep)
            : undefined,
    aksepterer: p.form === 'godtar' ? true : p.form !== null || kreverTilbud ? false : undefined,
    oensket_oppgjoersform: p.form === null || p.form === 'godtar' ? undefined : p.form,
    krever_tilbud: kreverTilbud || undefined,
    // VS-U63.
    varslet_i_tide:
      varslet === null || (post.oppgjoersform === 'regningsarbeid' && varslet)
        ? undefined
        : varslet,
    godtar_justering: justerteEnhetspriser(post) ? (p.godtarJustering ?? undefined) : undefined,
  });
}

/** Om BH tar stilling til varselet etter § 34.1.2 (OV-U15), med kjernens predikat. */
export const spoerOmHovedvarselet = (u: Utledning, regler: Regelsett): boolean =>
  hjemmelenGjelder('34.1.2', u.spor.forhold.gjeldendeKrav, regler);

/** Ett svar per kravpost (KA-U57). */
function vurderingene(v: Svarvalg, krav: Krav, hovedvarselet: boolean): Svarvurdering {
  const poster = kravposterI(krav);
  return definert({
    hovedkrav_varslet_i_tide: hovedvarselet ? (v.iTide ?? undefined) : undefined,
    kravposter: poster.length
      ? poster.map((post) => kravpostsvaret(post, postvalget(v, post.betegnelse)))
      : undefined,
  });
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
  const utdypning = tekster.forbehold.trim();
  const utdypninger = Object.fromEntries(
    Object.entries(tekster.begrunnelser)
      .map(([punkt, tekst]) => [punkt, tekst.trim()] as const)
      .filter(([punkt, tekst]) => tekst && punktene.includes(punkt))
  );
  return {
    type: 'brev',
    svar: [
      {
        spor,
        gjelder: krav.id,
        regelversjon: regler.versjon,
        vurderinger,
        resultat,
        ...(utdypning ? { utdypning } : {}),
        ...(Object.keys(utdypninger).length ? { utdypninger } : {}),
      },
    ],
  };
}

/** BHs svar på gjeldende vederlagskrav, eller `null` når saken ikke har et krav (`svarbrevet`). */
export function vederlagssvaret(
  v: Svarvalg,
  u: Utledning,
  regler: Regelsett,
  punktene: readonly string[] = []
): { type: 'brev'; svar: Svarutkast[] } | null {
  const krav = u.spor.vederlag.gjeldendeKrav;
  if (!krav) return null;
  return svarbrevet(
    'vederlag',
    krav,
    vurderingene(v, krav, spoerOmHovedvarselet(u, regler)),
    { paaberopelse: u.spor.forhold.gjeldendeKrav },
    v,
    regler,
    punktene
  );
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
 * TEs korrigering av opplysningen om datoen (MM-U55 punkt 10), i feltet opplysningen har. Den
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
 * TEs nye versjon av påberopelsen (BF-10, KA-U52): kategoriene og endringsordren står som i
 * gjeldende versjon (GR-U40 punkt 7), datoen er TEs siste opplysning, også etter en korrigering
 * (MM-U55 punkt 10, #1617), og teksten er utdypningen (S-3 i BF-10). Kjernen avviser en annen
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
