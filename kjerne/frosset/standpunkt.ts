/**
 * Virkningen av standpunktene i ett svar, og det som fryses av den:
 * beslutningsgrunnlaget når brevet sendes. Klienten og serveren regner med de
 * samme funksjonene; serveren sammenlikner (B-13, 2.5 i modellforslaget).
 *
 * Reglene regner virkningene bare når brevet skrives. Etter det leses de fra
 * beslutningsgrunnlaget (MM-U9). Visningen kan regne dem igjen med dagens regler
 * for å vise at regelen er endret, men ingen regel leser det.
 *
 * Svarets egne standpunkter skilles fra om hele svaret er subsidiært til
 * grunnlaget. Det siste er en relasjon mellom brevene som utledes ved lesing
 * (vedtaket 05.10), og vilkåret i enighetsgrunnlaget (GR-U7).
 */

import { beloep, tilTall } from '../regler/beloep.ts';
import { UgyldigVurdering } from '../regler/feil.ts';
import { beregnFrist, type Fristkrav } from '../regler/frist.ts';
import {
  foersteUnderkategori,
  gyldigeResultater,
  type Subsidiaergrunn,
} from '../regler/grunnlag.ts';
import type { Regelsett } from '../regler/regelsett.ts';
import { tekst } from '../format/skjema.ts';
import {
  beregnVederlag,
  gjelderVarslingspliktenForVederlag,
  type Vederlagskrav,
} from '../regler/vederlag.ts';
import type {
  Beslutningsgrunnlag,
  Enighetsgrunnlag,
  Hjemmel,
  Krav,
  Spor,
  Standpunkt,
  Standpunktsvirkning,
  Svar,
  Utfall,
} from '../typer.ts';

/** Det i et svar virkningene regnes av: sporet, standpunktene og serverens utregning. */
export type Svarinnhold = Pick<Svar, 'spor' | 'standpunkter' | 'utregning'>;

function kategori(krav: Pick<Krav, 'innhold'> | null | undefined) {
  const innhold = krav?.innhold ?? {};
  return {
    hovedkategori: tekst(innhold.hovedkategori),
    underkategori: foersteUnderkategori(innhold.underkategori as string | string[] | null),
  };
}

/** Varslingsplikten i § 32.2 gjelder kategorien i grunnlagskravet (GR-U11). */
export function gjelderVarslingsplikten(
  krav: Pick<Krav, 'innhold'> | null | undefined,
  regler: Regelsett
): boolean {
  const { hovedkategori, underkategori } = kategori(krav);
  return regler.gjelderVarslingsplikten(hovedkategori, underkategori);
}

/**
 * VS-U3: påberopelsen etter hjemmelen kan ha virkning for kravet. § 33.4 gjelder
 * alltid i fristen, § 32.2 der varslingsplikten gjelder kategorien, og § 34.1.2
 * for svikt og andre forhold byggherren har risikoen for.
 */
function hjemmelenGjelder(
  hjemmel: Hjemmel,
  grunnlagskrav: Krav | null | undefined,
  regler: Regelsett
): boolean {
  if (hjemmel === '33.4') return true;
  if (hjemmel === '34.1.2')
    return gjelderVarslingspliktenForVederlag(kategori(grunnlagskrav).hovedkategori);
  return gjelderVarslingsplikten(grunnlagskrav, regler);
}

/**
 * Virkningen av hvert standpunkt i svaret etter regelsettet, regnet når brevet
 * skrives. `grunnlagskrav` er kravet et grunnlagssvar gjelder. `innsigelse` er en
 * innsigelse etter § 5 byggherren sendte før et registrert svar uten standpunkt
 * om rettidighet: svaret leses med den (VS-U11), som en påberopelse først i
 * brevet, når rettidigheten kan ha virkning i sporet.
 */
export function virkninger(
  svar: Svarinnhold,
  grunnlagskrav: Krav | null | undefined,
  regler: Regelsett,
  innsigelse?: string
): Standpunktsvirkning[] {
  const ut: Standpunktsvirkning[] = [];
  let harGrunn = false;
  if (innsigelse !== undefined && lesesMedInnsigelse(svar, grunnlagskrav, regler)) {
    ut.push({ standpunkt: innsigelse, art: 'rettidighet', virkning: 'prinsipalt' });
    harGrunn = true;
  }
  const etterGrunn = () => (harGrunn ? 'subsidiaert' : 'prinsipalt');
  for (const s of svar.standpunkter) {
    if (s.art === 'rettidighet') {
      const virker = !s.iTide && hjemmelenGjelder(s.hjemmel, grunnlagskrav, regler);
      if (virker) harGrunn = true;
      ut.push({ standpunkt: s.id, art: s.art, virkning: virker ? 'prinsipalt' : 'uten_virkning' });
    } else if (s.art === 'hindring') {
      // Vedtaket 05.10 (#211): uten fremdriftshindring står dagene som et videre subsidiært standpunkt.
      const virkning = s.oppfylt ? 'uten_virkning' : etterGrunn();
      if (!s.oppfylt) harGrunn = true;
      ut.push({ standpunkt: s.id, art: s.art, virkning });
    } else {
      ut.push({ standpunkt: s.id, art: s.art, virkning: etterGrunn() });
    }
  }
  return ut;
}

/**
 * VS-U11: et svar uten standpunkt om rettidighet leses med byggherrens innsigelse
 * når rettidigheten har virkning i sporet: § 33.4 i fristen, § 32.2 i grunnlaget
 * der varslingsplikten gjelder (GR-U11).
 */
function lesesMedInnsigelse(
  svar: Svarinnhold,
  grunnlagskrav: Krav | null | undefined,
  regler: Regelsett
): boolean {
  if (standpunktet(svar, 'rettidighet')) return false;
  return (
    svar.spor === 'frist' ||
    (svar.spor === 'grunnlag' && gjelderVarslingsplikten(grunnlagskrav, regler))
  );
}

/** VS-U11: innsigelsen et svar er lest med, som står i det frosne brevet og ikke blant standpunktene. */
export const innsigelsenSvaretErLestMed = (svar: Svar): string | undefined =>
  svar.beslutningsgrunnlag.virkninger.find(
    (v) => !svar.standpunkter.some((p) => p.id === v.standpunkt)
  )?.standpunkt;

/**
 * VS-U11: en innsigelse kan lese et svar når den gjelder kravet svaret gjelder, eller,
 * i fristen, et registrert varsel. Frysingen velger og utledningen kontrollerer med den.
 */
export const innsigelsenGjelderSvaret = (
  gjelder: string,
  svar: Pick<Svar, 'spor' | 'gjelder'>,
  varsler: string[]
): boolean => gjelder === svar.gjelder || (svar.spor === 'frist' && varsler.includes(gjelder));

/**
 * VS-U9, VS-U11, HF-U1: parten har gitt opp innsigelsen som kunne lese et svar i `spor`, når
 * partens siste standpunkt om rettidigheten etter innsigelsen er at det kom i tide.
 * `etter` er partens svar etter innsigelsen, i rekkefølgen de ble sendt. I grunnlaget
 * teller standpunktet om kravet innsigelsen gjelder. I fristen leses innsigelsen som en
 * påberopelse etter § 33.4 (arbeidsvalget i paragrafmatrisen), og saken har ett varsel
 * (SK-12), så hvert standpunkt om varselet teller. Taushet gir den ikke opp.
 */
export function innsigelsenErOppgitt(
  gjelder: string,
  spor: Spor,
  etter: Pick<Svar, 'spor' | 'standpunkter'>[]
): boolean {
  const siste = etter
    .filter((x) => x.spor === spor)
    .flatMap((x) => x.standpunkter)
    .filter((p) => p.art === 'rettidighet' && (spor === 'frist' || p.gjelder === gjelder))
    .at(-1);
  return siste?.art === 'rettidighet' && siste.iTide;
}

export const prinsipalt = (v: Standpunktsvirkning[]) => v.find((p) => p.virkning === 'prinsipalt');
/** Et standpunkt som avviser kravet uavhengig av beløpet eller dagene. */
const AVVISENDE = new Set(['rettidighet', 'hindring']);
const avvisesPrinsipalt = (v: Standpunktsvirkning[]) => AVVISENDE.has(prinsipalt(v)?.art ?? '');

export function standpunktet<A extends Standpunkt['art']>(svar: Svarinnhold, art: A) {
  return svar.standpunkter.find((s): s is Extract<Standpunkt, { art: A }> => s.art === art);
}

/**
 * Hvorfor svarene på vederlag og frist er subsidiære til grunnlagssvaret, etter
 * standpunktene i brevet om grunnlaget (vedtaket 05.10, MM-U9). Utledningen og
 * brevteksten (A2) leser det samme.
 */
export function grunnerFraGrunnlaget(
  svar: Svarinnhold,
  virkninger: Standpunktsvirkning[]
): Subsidiaergrunn[] {
  const ut: Subsidiaergrunn[] = [];
  if (prinsipalt(virkninger)?.art === 'rettidighet') ut.push('prekludert');
  if (standpunktet(svar, 'grunnlag')?.resultat === 'avslaatt') ut.push('avslaatt');
  return ut;
}

/**
 * GR-U7: byggherren har godkjent grunnlaget uten virksom preklusjon etter § 32.2,
 * eller frafalt pålegget. Leses av standpunktene og virkningen i brevet om
 * grunnlaget, ikke av et utfall.
 */
export function grunnlagetErAvklart(svar: Svarinnhold, v: Standpunktsvirkning[]): boolean {
  const resultat = standpunktet(svar, 'grunnlag')?.resultat;
  return (
    !preklusjonPaaberopt(svar, v) && (resultat === 'godkjent' || resultat === 'paalegg_frafalt')
  );
}

/**
 * MM-U13: byggherren påberoper prinsipalt preklusjon etter § 32.2 i svaret på
 * grunnlaget, i svaret selv eller med innsigelsen svaret er lest med (VS-U11).
 * Rettidigheten i grunnlaget er alltid etter § 32.2 (`HJEMMEL`).
 */
function preklusjonPaaberopt(svar: Svarinnhold, v: Standpunktsvirkning[]): boolean {
  return (
    svar.spor === 'grunnlag' &&
    v.some((p) => p.art === 'rettidighet' && p.virkning === 'prinsipalt')
  );
}

/** Det svaret gir i sporet når standpunktene har denne virkningen. */
function utfall(svar: Svarinnhold, v: Standpunktsvirkning[]): Utfall {
  const prekludert = avvisesPrinsipalt(v);
  if (svar.spor === 'grunnlag') return {};
  if (svar.spor === 'vederlag')
    return { beloep: prekludert ? 0 : standpunktet(svar, 'beloep')!.godkjent };
  const dager = standpunktet(svar, 'dager')!;
  return { dager: prekludert || dager.resultat === 'avslaatt' ? 0 : dager.vurdert };
}

/**
 * Svaret godkjenner hele kravet i sporet, så standpunktene faller sammen
 * (GR-U7). For grunnlaget er det en godkjenning uten påberopt preklusjon
 * (GR-U10).
 */
function godkjennerHeleKravet(svar: Svarinnhold, v: Standpunktsvirkning[]): boolean {
  if (avvisesPrinsipalt(v)) return false;
  if (svar.spor === 'grunnlag') return standpunktet(svar, 'grunnlag')?.resultat === 'godkjent';
  return svar.utregning.resultat === 'godkjent';
}

/**
 * MM-U18: sammenfallet i beslutningsgrunnlaget stemmer med standpunktene og
 * virkningene i samme brev. Leses av det frosne brevet, ikke av dagens regler.
 */
export const sammenfallStemmer = (svar: Svar): boolean =>
  svar.beslutningsgrunnlag.sammenfall ===
  godkjennerHeleKravet(svar, svar.beslutningsgrunnlag.virkninger);

/**
 * Et svar på grunnlaget i et brev sendt i appen er en endringsordre etter § 32.3
 * første ledd a: svaret godkjenner hele kravet uten påberopt preklusjon
 * (sammenfall, GR-U10), og § 32.2 gjaldt kategorien (GR-U11, GR-U12). Leses av
 * det frosne beslutningsgrunnlaget.
 */
export function blirEndringsordre(b: Beslutningsgrunnlag): boolean {
  return b.sammenfall && b.varslingsplikt === true;
}

/** Enigheten om svaret slik brevet uttrykte det (KA-U10, MM-U3, MM-U9, MM-U11). */
export function enighetsgrunnlag(svar: Svar, kilde: Enighetsgrunnlag['kilde']): Enighetsgrunnlag {
  const { regelversjon, virkninger } = svar.beslutningsgrunnlag;
  return {
    spor: svar.spor,
    svar: svar.id,
    kilde,
    regelversjon,
    virkninger,
    utfall: utfall(svar, virkninger),
    vilkaar: svar.spor === 'grunnlag' ? null : 'grunnlag_avklart',
  };
}

const kroner = (n: number) => `${n.toLocaleString('nb-NO')} kr`;

/** Linjen i brevet for svaret, med den prinsipale grunnen først (vedtaket 05.10 om avslag sammen med § 32.2). */
function beslutningslinje(svar: Svarinnhold, v: Standpunktsvirkning[]): string {
  const hjemmel =
    standpunktet(svar, 'rettidighet')?.hjemmel ?? (svar.spor === 'grunnlag' ? '32.2' : '33.4');
  const grunntekst: Record<string, string> = {
    rettidighet: `prekludert (§ ${hjemmel})`,
    hindring: 'avslått uten fremdriftshindring (§ 33.1)',
  };
  const grunner = v.filter((p) => AVVISENDE.has(p.art) && p.virkning !== 'uten_virkning');
  let standpunkt: string;
  if (svar.spor === 'grunnlag') {
    standpunkt = {
      godkjent: 'godkjent',
      avslaatt: 'avslått',
      paalegg_frafalt: 'pålegget frafalt (§ 32.3 c)',
    }[standpunktet(svar, 'grunnlag')!.resultat];
  } else if (svar.spor === 'vederlag') {
    const b = standpunktet(svar, 'beloep')!;
    standpunkt = b.resultat === 'avslaatt' ? 'avslått' : `godkjent med ${kroner(b.godkjent)}`;
  } else {
    const d = standpunktet(svar, 'dager')!;
    standpunkt = d.resultat === 'avslaatt' ? 'avslått' : `godkjent med ${d.vurdert} dager`;
  }
  if (!grunner.length) return `${standpunkt[0].toUpperCase()}${standpunkt.slice(1)}.`;
  const ledd = grunner.map(
    (p, i) => `${i === 0 ? 'Prinsipalt' : 'subsidiært'} ${grunntekst[p.art]}`
  );
  return `${ledd.join(', ')}, ${grunner.length > 1 ? 'videre ' : ''}subsidiært ${standpunkt}.`;
}

/**
 * Brevet frosset når det sendes (MM-U9, MM-U11). For grunnlaget fryses også om
 * § 32.2 gjaldt kategorien i kravversjonen (GR-U12).
 */
export function beslutningsgrunnlag(
  svar: Svarinnhold,
  grunnlagskrav: Krav | null | undefined,
  regler: Regelsett,
  innsigelse?: string
): Beslutningsgrunnlag {
  const v = virkninger(svar, grunnlagskrav, regler, innsigelse);
  return {
    regelversjon: regler.versjon,
    virkninger: v,
    linje: beslutningslinje(svar, v),
    sammenfall: godkjennerHeleKravet(svar, v),
    ...(svar.spor === 'grunnlag'
      ? { varslingsplikt: gjelderVarslingsplikten(grunnlagskrav, regler) }
      : {}),
  };
}

/** Virkningen hvert standpunkt har, utenom standpunkter uten virkning. Et standpunkt som mangler, er uten virkning. */
function medVirkning(v: Standpunktsvirkning[]): Map<string, Standpunktsvirkning['virkning']> {
  return new Map(
    v.filter((p) => p.virkning !== 'uten_virkning').map((p) => [p.standpunkt, p.virkning])
  );
}

/** Et standpunkt har en annen virkning i `a` enn i `b`. Brukes bare av visningen (MM-U9). */
export function ulikeVirkninger(a: Standpunktsvirkning[], b: Standpunktsvirkning[]): boolean {
  const [x, y] = [medVirkning(a), medVirkning(b)];
  return x.size !== y.size || [...x].some(([id, virkning]) => y.get(id) !== virkning);
}

/**
 * En vurdering i svaret som kjernen ennå ikke har et standpunkt for. Den kan ikke
 * godtas og forenkles til et annet standpunkt, så kommandoen avvises. Formatet har
 * ingen art for den, så en lagret rad med den er ikke forstått (#304, review av
 * PR #306).
 */
export function utenforOmfanget(spor: Spor, v: Record<string, unknown>): string | null {
  if (spor === 'frist' && v.spesifisert_krav_ok === false)
    return 'reduksjon etter § 33.6.1 er ikke i kjernen ennå';
  if (spor === 'frist' && v.foresporsel_svar_ok === false)
    return 'svar på forespørsel etter § 33.6.2 er ikke i kjernen ennå';
  if (spor === 'vederlag') {
    if (v.aksepterer_metode === false) return 'avslått metode (§ 34.2.2) er ikke i kjernen ennå';
    if (v.hold_tilbake === true) return 'tilbakeholdelse (§ 30.2) er ikke i kjernen ennå';
    for (const felt of ['rigg_varslet_i_tide', 'produktivitet_varslet_i_tide'])
      if (v[felt] === false) return `preklusjon etter § 34.1 (${felt}) er ikke i kjernen ennå`;
    if ((v.rigg_vurdering ?? null) !== null || (v.produktivitet_vurdering ?? null) !== null)
      return 'særskilte krav (§ 34.1.3) er ikke i kjernen ennå';
  }
  return null;
}

// ---------- Utregningen av svaret (B-13) ----------

export interface Svarvurdering {
  resultat?: unknown;
  grunnlag_varslet_i_tide?: unknown;
  hovedkrav_vurdering?: unknown;
  hovedkrav_godkjent_belop?: unknown;
  hovedkrav_varslet_i_tide?: unknown;
  aksepterer_metode?: unknown;
  frist_varsel_ok?: unknown;
  spesifisert_krav_ok?: unknown;
  vilkar_oppfylt?: unknown;
  dager?: unknown;
}

/**
 * Serverens utregning av svaret, med navnene i formatet (`UTREGNING` i
 * `format.ts`). Grunnlaget har ingen utregning, bare kontrollen av
 * vurderingene. Kaster `UgyldigVurdering`.
 */
export function regnUtSvar(
  spor: Spor,
  v: Svarvurdering,
  { krav, grunnlagskrav }: { krav: Krav; grunnlagskrav: Krav | null },
  regler: Regelsett
): Record<string, unknown> {
  if (spor === 'grunnlag') {
    const { hovedkategori, underkategori } = kategori(krav);
    const feil: Record<string, string> = {};
    const resultat = v.resultat as never;
    if (!gyldigeResultater(hovedkategori, underkategori).includes(resultat))
      feil.resultat = `«${String(v.resultat)}» kan ikke velges i denne kategorien (§ 32.3 c)`;
    const iTide = v.grunnlag_varslet_i_tide;
    if (regler.gjelderVarslingsplikten(hovedkategori, underkategori)) {
      if (typeof iTide !== 'boolean') feil.grunnlag_varslet_i_tide = 'mangler (§ 32.2)';
      // #235: frafall skjer mot endringsordre og kan ikke kombineres med preklusjon.
      else if (v.resultat === 'paalegg_frafalt' && !iTide)
        feil.grunnlag_varslet_i_tide =
          'frafall kan ikke kombineres med at grunnlaget er varslet for sent';
    } else if (iTide !== undefined) {
      feil.grunnlag_varslet_i_tide = 'gjelder bare § 32.2';
    }
    if (Object.keys(feil).length) throw new UgyldigVurdering(feil);
    return {};
  }
  if (spor === 'vederlag') {
    const { hovedkategori, underkategori } = kategori(grunnlagskrav);
    const vkrav: Vederlagskrav = {
      hovedkrav_belop: (krav.innhold.beloep as number | undefined) ?? 0,
      metode: 'tilbud',
      rigg_belop: null,
      produktivitet_belop: null,
      krever_justert_ep: false,
      kostnads_overslag: null,
      hovedkategori,
      underkategori,
      grunnlag_varslet_i_tide: null,
      grunnlag_resultat: null,
    };
    if (
      v.hovedkrav_varslet_i_tide !== undefined &&
      !gjelderVarslingspliktenForVederlag(hovedkategori)
    )
      throw new UgyldigVurdering({
        hovedkrav_varslet_i_tide: 'gjelder bare svikt og andre forhold (§ 34.1.2)',
      });
    const r = beregnVederlag(vkrav, v as never);
    const ut: Record<string, unknown> = {
      resultat: r.beregnings_resultat,
      godkjent_beloep: tilTall(r.total_godkjent_belop),
    };
    // VS-U3, B-13: ved preklusjon etter § 34.1.2 står det vurderte beløpet subsidiært.
    if (r.subsidiaer_resultat !== null) {
      ut.subsidiaert_resultat = r.subsidiaer_resultat;
      ut.subsidiaert_godkjent_beloep = tilTall(r.subsidiaer_godkjent_belop!);
    }
    return ut;
  }
  const fkrav: Fristkrav = {
    krevd_dager: (krav.innhold.dager as number | undefined) ?? 0,
    varsel_type: 'spesifisert',
    er_svar_paa_foresporsel: false,
    har_innsigelse_mot_varsel: false,
    har_tidligere_varsel_i_tide: false,
    er_grunnlag_subsidiaert: false,
    er_hele_fristen_subsidiaer_pga_grunnlag: false,
  };
  const r = beregnFrist(fkrav, {
    frist_varsel_ok: v.frist_varsel_ok as boolean | undefined,
    spesifisert_krav_ok: v.spesifisert_krav_ok as boolean | undefined,
    vilkar_oppfylt: v.vilkar_oppfylt as boolean | undefined,
    godkjent_dager: v.dager,
  });
  const ut: Record<string, unknown> = {
    resultat: r.beregnings_resultat,
    godkjent_dager: r.godkjent_dager,
  };
  if (r.subsidiaer_resultat !== null) {
    ut.subsidiaert_resultat = r.subsidiaer_resultat;
    ut.subsidiaert_godkjent_dager = r.subsidiaer_godkjent_dager ?? 0;
  }
  return ut;
}

/** Feltene klienten skal ha regnet likt med serveren. Beløp sammenliknes til hele øre. */
export const SAMMENLIKNES: Record<Spor, string[]> = {
  grunnlag: [],
  vederlag: ['resultat', 'godkjent_beloep'],
  frist: ['resultat', 'godkjent_dager'],
};

export function likeResultatfelt(felt: string, klient: unknown, server: unknown): boolean {
  if (felt.endsWith('_beloep') && typeof klient === 'number' && typeof server === 'number')
    return beloep(klient) === beloep(server);
  return klient === server;
}
