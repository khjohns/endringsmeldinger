/**
 * Serverens utregning av svaret og kontrollen av byggherrens vurderinger (B-13). Klienten
 * regner med de samme funksjonene, og serveren sammenlikner feltene i `SAMMENLIKNES`.
 */

import { beloep, tilTall, type Oere } from '../regler/beloep.ts';
import { UgyldigVurdering } from '../regler/feil.ts';
import { beregnFrist, resultatAvDager, type Fristkrav } from '../regler/frist.ts';
import type { Regelsett } from '../regler/regelsett.ts';
import type { Beloepsvurdering } from '../regler/typer.ts';
import {
  beregnGodkjentBeloep,
  beregnVederlag,
  type Vederlagsberegning,
  type Postsvar,
  type Vederlagssvar,
} from '../regler/vederlag.ts';
import {
  kontrollerForholdet,
  kontrollerOppgjoersformen,
  kontrollerSpesifiseringen,
  kontrollerVarseletForVederlag,
} from '../regler/svarkontroll.ts';
import {
  innholdIFristen,
  kategori,
  krevdIKravposten,
  krevdProduktivitet,
  kravposterI,
} from './kravinnhold.ts';
import type { Foresporselsrelasjon } from './standpunkt.ts';
import type { Krav, Kravpost, Spor } from '../typer.ts';

/**
 * En vurdering i svaret som kjernen ennå ikke har et standpunkt for. Den kan ikke
 * godtas og forenkles til et annet standpunkt, så kommandoen avvises. Formatet har
 * ingen art for den, så en lagret rad med den er ikke forstått (#304, review av
 * PR #306).
 */
export function utenforOmfanget(spor: Spor, v: Record<string, unknown>): string | null {
  if (spor === 'vederlag') {
    if (v.hold_tilbake === true) return 'tilbakeholdelse (§ 30.2) er ikke i kjernen ennå';
    // MM-U2: en annen verdi enn et tomt felt eller `false` forenkles ikke til «ingen tilbakeholdelse».
    if ((v.hold_tilbake ?? false) !== false) return 'hold_tilbake er verken true eller false';
    // Rigg og drift etter § 34.1.3 første ledd er ikke i kjernens svar ennå (#1663).
    if ((v.rigg_vurdering ?? null) !== null)
      return 'kravet om rigg og drift (§ 34.1.3 første ledd) er ikke i kjernen ennå';
  }
  return null;
}

// ---------- Utregningen av svaret (B-13) ----------

export interface Svarvurdering {
  resultat?: unknown;
  grunnlag_varslet_i_tide?: unknown;
  hovedkrav_varslet_i_tide?: unknown;
  /** Svaret på hver kravpost, som en liste med `Kravpostvurdering` (KA-U57 (c) og (d), KA-U59). */
  kravposter?: unknown;
  produktivitet_vurdering?: unknown;
  produktivitet_godkjent_beloep?: unknown;
  produktivitet_varslet_i_tide?: unknown;
  produktivitet_begrenset_beloep?: unknown;
  rigg_vurdering?: unknown;
  rigg_varslet_i_tide?: unknown;
  hold_tilbake?: unknown;
  frist_varsel_ok?: unknown;
  spesifisert_krav_ok?: unknown;
  foresporsel_svar_ok?: unknown;
  dager_maatte_forstaa?: unknown;
  vilkar_oppfylt?: unknown;
  dager?: unknown;
}

/**
 * Serverens utregning av svaret, med navnene i formatet (`UTREGNING` i
 * `format.ts`). Forholdet har ingen utregning, bare kontrollen av
 * vurderingene. Kaster `UgyldigVurdering`, og `UgyldigBeloep` for et beløp i
 * vurderingene som ikke er et tall. Et krevd beløp som ikke kan leses, kaster `Error`.
 */
export function regnUtSvar(
  spor: Spor,
  v: Svarvurdering,
  {
    krav,
    paaberopelse,
    foresporsel = null,
  }: { krav: Krav; paaberopelse: Krav | null; foresporsel?: Foresporselsrelasjon | null },
  regler: Regelsett
): Record<string, unknown> {
  if (spor === 'forhold') return regnUtForhold(v, krav, regler);
  if (spor === 'vederlag') return regnUtVederlag(v, krav, paaberopelse, regler);
  return regnUtFrist(v, krav, foresporsel);
}

/** Forholdet har ingen utregning, bare kontrollen av vurderingene (§ 32.2 og § 32.3). */
function regnUtForhold(v: Svarvurdering, krav: Krav, regler: Regelsett): Record<string, unknown> {
  const { hovedkategori, underkategori } = kategori(krav);
  kontrollerForholdet(v, hovedkategori, underkategori, regler);
  return {};
}

/**
 * Feltene kjernen leser i vurderingene i svaret på vederlaget. Et annet felt ville blitt godtatt
 * uten virkning, så det avvises (MM-U2; kravet i #1663).
 */
const VEDERLAGSVURDERINGER = new Set<string>([
  'hovedkrav_varslet_i_tide',
  'kravposter',
  'produktivitet_vurdering',
  'produktivitet_godkjent_beloep',
  'produktivitet_varslet_i_tide',
  'produktivitet_begrenset_beloep',
  // Avvises med egne meldinger: `utenforOmfanget` og OV-U89 punkt 9 i `regler/vederlag.ts`.
  'hold_tilbake',
  'rigg_vurdering',
  'rigg_varslet_i_tide',
]);

/** Byggherrens svar på én kravpost i kommandoen. `gjelder` er kravpostens `id`. */
export interface Kravpostvurdering {
  gjelder?: unknown;
  vurdering?: unknown;
  godkjent_beloep?: unknown;
  /** Standpunktet etter § 34.2.2 (KA-U57 (d)). */
  aksepterer?: unknown;
  oensket_oppgjoersform?: unknown;
}

const KRAVPOSTVURDERINGER = new Set<string>([
  'gjelder',
  'vurdering',
  'godkjent_beloep',
  'aksepterer',
  'oensket_oppgjoersform',
]);

/**
 * Svaret på hver kravpost i kravet, i kravets rekkefølge. En kravpost uten svar får en tom
 * vurdering, så regelen sier hva som mangler. Feilene står på `kravposter`, eller på
 * `<betegnelse>.<felt>` for kravposten. Kaster `UgyldigVurdering` for et svar på en kravpost
 * kravet ikke har (OV-U23), et svar på samme kravpost to ganger og et felt kjernen ikke leser
 * (MM-U2).
 */
export function kravpostvurderinger(
  v: Svarvurdering,
  krav: Krav
): { post: Kravpost; svar: Kravpostvurdering }[] {
  const poster = kravposterI(krav);
  if (v.kravposter == null) return poster.map((post) => ({ post, svar: {} }));
  if (!Array.isArray(v.kravposter) || v.kravposter.some((p) => typeof p !== 'object' || !p))
    throw new UgyldigVurdering({ kravposter: 'er ikke en liste med svar på kravpostene' });
  const svarene = new Map<unknown, Kravpostvurdering>();
  for (const p of v.kravposter as Kravpostvurdering[]) {
    const post = poster.find((k) => k.id === p.gjelder);
    if (!post) throw new UgyldigVurdering({ kravposter: 'kravet har ikke denne posten (OV-U23)' });
    if (svarene.has(post.id))
      throw new UgyldigVurdering({ [post.betegnelse]: 'er besvart mer enn én gang' });
    const ukjent = Object.keys(p).find((felt) => !KRAVPOSTVURDERINGER.has(felt));
    if (ukjent)
      throw new UgyldigVurdering({
        [`${post.betegnelse}.${ukjent}`]: 'kjernen leser ikke feltet i svaret på kravposten',
      });
    svarene.set(post.id, p);
  }
  return poster.map((post) => ({ post, svar: svarene.get(post.id) ?? {} }));
}

/** Feltene i kommandoen for posten etter § 34.1.3 annet ledd; feilene fra regelen føres tilbake til dem. */
const PRODUKTIVITETSFELT = {
  vurdering: 'produktivitet_vurdering',
  godkjent_beloep: 'produktivitet_godkjent_beloep',
  varslet_i_tide: 'produktivitet_varslet_i_tide',
  begrenset_beloep: 'produktivitet_begrenset_beloep',
} as const;

/** Svaret i kommandoen som postene regelen regner over, og feltet i kommandoen for hver feil. */
function vederlagssvaret(
  v: Svarvurdering,
  krav: Krav,
  hovedkategori: string | null
): { svar: Vederlagssvar; felt: Map<string, string> } {
  const felt = new Map<string, string>([['varslet_i_tide', 'hovedkrav_varslet_i_tide']]);
  const poster: Postsvar[] = [];
  const knytt = (navn: string, felter: Record<string, string>) => {
    for (const [i, ut] of Object.entries(felter)) felt.set(`${navn}.${i}`, ut);
  };
  for (const { post, svar } of kravpostvurderinger(v, krav)) {
    for (const f of ['vurdering', 'godkjent_beloep', 'aksepterer'])
      felt.set(`${post.id}.${f}`, `${post.betegnelse}.${f}`);
    const krevd = krevdIKravposten(krav, post);
    if (krevd === null) throw new Error(`Kravposten ${post.betegnelse} har ikke et krevd beløp.`);
    poster.push({
      gjelder: post.id,
      krevd: tilTall(krevd),
      vurdering: svar.vurdering as Beloepsvurdering | undefined,
      godkjent_beloep: svar.godkjent_beloep as number | undefined,
      aksepterer: svar.aksepterer as boolean | undefined,
    });
  }
  const produktivitet = krevdProduktivitet(krav);
  if (produktivitet !== null) {
    knytt('produktivitet', PRODUKTIVITETSFELT);
    poster.push({
      saerskilt: 'produktivitet',
      krevd: tilTall(produktivitet),
      vurdering: v.produktivitet_vurdering as Beloepsvurdering | undefined,
      godkjent_beloep: v.produktivitet_godkjent_beloep as number | undefined,
      varslet_i_tide: v.produktivitet_varslet_i_tide as boolean | undefined,
      begrenset_beloep: v.produktivitet_begrenset_beloep as number | undefined,
    });
  }
  // OV-U89 punkt 9: rigg og drift er ikke i kjernens svar (`utenforOmfanget`), men en
  // påberopelse etter § 34.1.3 mot den avvises i regelen. Regelen kaster alltid for posten,
  // så beløpet og vurderingen her når aldri utregningen.
  if (v.rigg_varslet_i_tide != null) {
    knytt('rigg_og_drift', { varslet_i_tide: 'rigg_varslet_i_tide' });
    poster.push({
      saerskilt: 'rigg_og_drift',
      krevd: 0,
      vurdering: 'avslaatt',
      varslet_i_tide: v.rigg_varslet_i_tide,
    });
  }
  return {
    svar: {
      hovedkategori,
      varslet_i_tide: v.hovedkrav_varslet_i_tide as boolean | undefined,
      poster,
    },
    felt,
  };
}

/** Utregningen av vederlaget av postene i kravet (§ 34). */
function regnUtVederlag(
  v: Svarvurdering,
  krav: Krav,
  paaberopelse: Krav | null,
  regler: Regelsett
): Record<string, unknown> {
  const ukjente = Object.keys(v).filter((felt) => !VEDERLAGSVURDERINGER.has(felt));
  if (ukjente.length)
    throw new UgyldigVurdering(
      Object.fromEntries(
        ukjente.map((felt) => [felt, 'kjernen leser ikke feltet i svaret på vederlaget'])
      )
    );
  const tilbakeholdelse = utenforOmfanget('vederlag', { hold_tilbake: v.hold_tilbake });
  if (tilbakeholdelse) throw new UgyldigVurdering({ hold_tilbake: tilbakeholdelse });
  // OV-U23, OV-U26: byggherren tar stilling til postene kravet har, og bare dem (#520), og
  // til oppgjørsformen bare for en kravpost (KA-U57 (d)), i `kravpostvurderinger`.
  const produktivitet: (keyof Svarvurdering)[] = [
    'produktivitet_vurdering',
    'produktivitet_godkjent_beloep',
    'produktivitet_varslet_i_tide',
    'produktivitet_begrenset_beloep',
  ];
  if (krevdProduktivitet(krav) === null)
    for (const felt of produktivitet)
      if (v[felt] != null)
        throw new UgyldigVurdering({ [felt]: 'kravet har ikke denne posten (OV-U23)' });
  const { hovedkategori } = kategori(paaberopelse);
  kontrollerVarseletForVederlag(v, hovedkategori, regler);
  for (const { post, svar } of kravpostvurderinger(v, krav))
    kontrollerOppgjoersformen(post.betegnelse, svar);
  const { svar, felt } = vederlagssvaret(v, krav, hovedkategori);
  let r: Vederlagsberegning;
  try {
    r = beregnVederlag(svar, regler);
  } catch (e) {
    if (!(e instanceof UgyldigVurdering)) throw e;
    throw new UgyldigVurdering({
      ...Object.fromEntries(Object.entries(e.feil).map(([k, grunn]) => [felt.get(k) ?? k, grunn])),
    });
  }
  const ut: Record<string, unknown> = {
    resultat: r.beregnings_resultat,
    godkjent_beloep: tilTall(r.total_godkjent_beloep),
    // OV-U31, KA-U57 (e): beløpet for hver post i hvert lag, uten beløp når posten ikke har et
    // fast beløp i laget (KA-U58). Totalene over er summen av det første og det siste laget.
    poster: r.poster.map(({ post, lag }) => ({
      ...('gjelder' in post ? { gjelder: post.gjelder } : { saerskilt: post.saerskilt }),
      lag: lag.map((l) => ({
        lag: l.lag,
        ...(l.beloep === null ? {} : { beloep: tilTall(l.beloep) }),
      })),
    })),
  };
  // VS-U3, B-13: ved preklusjon etter § 34.1.2, ved begrensningen etter § 34.1.3 (VS-U5) og
  // når tilbudet ikke er akseptert (KA-U60), står det vurderte beløpet subsidiært.
  if (r.subsidiaer_resultat !== null) {
    ut.subsidiaert_resultat = r.subsidiaer_resultat;
    ut.subsidiaert_godkjent_beloep = tilTall(r.subsidiaer_godkjent_beloep!);
  }
  return ut;
}

/** Utregningen av fristen (§ 33). */
function regnUtFrist(
  v: Svarvurdering,
  krav: Krav,
  foresporsel: Foresporselsrelasjon | null
): Record<string, unknown> {
  const fkrav: Fristkrav = {
    krevd_dager: innholdIFristen(krav).dager,
    varsel_type: 'spesifisert',
    er_svar_paa_foresporsel: foresporsel?.art === 'svar',
    har_begrunnelse_etter_b: foresporsel?.art === 'begrunnelse',
    // § 33.4 vurderes også når kravet svarer på forespørselen, som uten den.
    har_innsigelse_mot_varsel: true,
    har_tidligere_varsel_i_tide: false,
    er_grunnlag_subsidiaert: false,
    er_hele_fristen_subsidiaer_pga_grunnlag: false,
  };
  const r = beregnFrist(fkrav, {
    frist_varsel_ok: v.frist_varsel_ok as boolean | undefined,
    spesifisert_krav_ok: v.spesifisert_krav_ok as boolean | undefined,
    foresporsel_svar_ok: v.foresporsel_svar_ok as boolean | undefined,
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
  const maatteForstaa = kontrollerSpesifiseringen(v);
  // VS-U4, rekkefølgen i #479: uten preklusjon og med hindring er dagene byggherren måtte
  // forstå at TE hadde krav på det prinsipale, og de vurderte dagene står subsidiært.
  if (maatteForstaa !== null && r.subsidiaer_resultat === null) {
    ut.resultat = resultatAvDager(true, fkrav.krevd_dager, maatteForstaa);
    ut.godkjent_dager = maatteForstaa;
    ut.subsidiaert_resultat = r.beregnings_resultat;
    ut.subsidiaert_godkjent_dager = r.godkjent_dager;
  }
  return ut;
}

/**
 * OV-U26, OV-U31: beløpet byggherren godtar for hver post i vederlagskravet uten
 * begrensningen etter § 34.1.3, i rekkefølgen brevet lagrer dem: kravpostene (`gjelder`), med
 * svaret på hver, og posten etter annet ledd (`saerskilt`). Regnet med regelsettet som utregningen.
 */
export function vederlagsposter(
  v: Svarvurdering,
  krav: Krav
): (
  | { godkjent: number; gjelder: string; svar: Kravpostvurdering }
  | { godkjent: number; saerskilt: 'produktivitet' }
)[] {
  const post = (vurdering: unknown, krevd: Oere, delvis: unknown) =>
    tilTall(
      beregnGodkjentBeloep(
        vurdering as Beloepsvurdering,
        krevd,
        beloep(delvis as number | null | undefined)
      )
    );
  const produktivitet = krevdProduktivitet(krav);
  return [
    ...kravpostvurderinger(v, krav).map(({ post: k, svar }) => ({
      godkjent: post(svar.vurdering, krevdIKravposten(krav, k)!, svar.godkjent_beloep),
      gjelder: k.id,
      svar,
    })),
    ...(produktivitet === null
      ? []
      : [
          {
            godkjent: post(
              v.produktivitet_vurdering,
              produktivitet,
              v.produktivitet_godkjent_beloep
            ),
            saerskilt: 'produktivitet' as const,
          },
        ]),
  ];
}

/** Feltene klienten skal ha regnet likt med serveren. Beløp sammenliknes til hele øre. */
export const SAMMENLIKNES: Record<Spor, string[]> = {
  forhold: [],
  vederlag: ['resultat', 'godkjent_beloep'],
  frist: ['resultat', 'godkjent_dager'],
};

export function likeResultatfelt(felt: string, klient: unknown, server: unknown): boolean {
  if (felt.endsWith('_beloep') && typeof klient === 'number' && typeof server === 'number')
    return beloep(klient) === beloep(server);
  return klient === server;
}
