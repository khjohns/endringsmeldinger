/**
 * Virkningen av utsagnene i ett svar, og det som fryses av den:
 * beslutningsgrunnlaget når brevet sendes og enighetsgrunnlaget når enigheten
 * oppstår. Klienten og serveren regner med de samme funksjonene; serveren
 * sammenlikner (B-13, 2.5 i modellforslaget).
 *
 * Reglene regner standpunktene bare når brevet skrives. Etter det leses
 * virkningen fra beslutningsgrunnlaget (MM-U9). Visningen kan regne dem igjen
 * med dagens regler for å vise at regelen er endret, men ingen regel leser det.
 *
 * Svarets egne standpunkter skilles fra om hele svaret er subsidiært til
 * grunnlaget. Det siste er en relasjon mellom brevene som utledes ved lesing
 * (vedtaket 05.10), og vilkåret i enighetsgrunnlaget (GR-U7).
 */

import { beloep, tilTall } from './regler/beloep.ts';
import { UgyldigVurdering } from './regler/feil.ts';
import { beregnFrist, type Fristkrav } from './regler/frist.ts';
import { foersteUnderkategori, gyldigeResultater } from './regler/grunnlag.ts';
import type { Regelsett } from './regler/regelsett.ts';
import { tekst } from './skjema.ts';
import { beregnVederlag, type Vederlagskrav } from './regler/vederlag.ts';
import type {
  Beslutningsgrunnlag,
  Enighetsgrunnlag,
  Krav,
  Spor,
  Standpunkt,
  Svar,
  Utfall,
  Utsagn,
} from './typer.ts';

/** Det i et svar standpunktene regnes av: sporet, utsagnene og serverens utregning. */
export type Svarinnhold = Pick<Svar, 'spor' | 'utsagn' | 'utregning'>;

function kategori(krav: Krav | null | undefined) {
  const innhold = krav?.innhold ?? {};
  return {
    hovedkategori: tekst(innhold.hovedkategori),
    underkategori: foersteUnderkategori(innhold.underkategori as string | string[] | null),
  };
}

/**
 * Standpunktene i svaret etter regelsettet, regnet når brevet skrives.
 * `grunnlagskrav` er kravet et grunnlagssvar gjelder.
 */
export function standpunkter(
  svar: Svarinnhold,
  grunnlagskrav: Krav | null | undefined,
  regler: Regelsett
): Standpunkt[] {
  const ut: Standpunkt[] = [];
  let harGrunn = false;
  const etterGrunn = () => (harGrunn ? 'subsidiaer' : 'hovedgrunn');
  for (const u of svar.utsagn) {
    if (u.art === 'rettidighet') {
      const { hovedkategori, underkategori } = kategori(grunnlagskrav);
      const virker =
        !u.iTide &&
        (u.hjemmel === '33.4' || regler.gjelderVarslingsplikten(hovedkategori, underkategori));
      if (virker) harGrunn = true;
      ut.push({ utsagn: u.id, art: u.art, virkning: virker ? 'hovedgrunn' : 'uten_virkning' });
    } else if (u.art === 'hindring') {
      // Vedtaket 05.10 (#211): uten fremdriftshindring står dagene som et videre subsidiært standpunkt.
      const virkning = u.oppfylt ? 'uten_virkning' : etterGrunn();
      if (!u.oppfylt) harGrunn = true;
      ut.push({ utsagn: u.id, art: u.art, virkning });
    } else {
      ut.push({ utsagn: u.id, art: u.art, virkning: etterGrunn() });
    }
  }
  return ut;
}

export const hovedgrunn = (s: Standpunkt[]) => s.find((p) => p.virkning === 'hovedgrunn');
/** Et standpunkt som avviser kravet uavhengig av beløpet eller dagene. */
const AVVISENDE = new Set(['rettidighet', 'hindring']);
const avvisendeHovedgrunn = (s: Standpunkt[]) => AVVISENDE.has(hovedgrunn(s)?.art ?? '');

export function utsagnet<A extends Utsagn['art']>(svar: Svarinnhold, art: A) {
  return svar.utsagn.find((u): u is Extract<Utsagn, { art: A }> => u.art === art);
}

/** Det svaret gir i sporet når standpunktene har denne virkningen. */
export function utfall(svar: Svarinnhold, s: Standpunkt[]): Utfall {
  const prekludert = avvisendeHovedgrunn(s);
  if (svar.spor === 'grunnlag') {
    const ansvar = utsagnet(svar, 'ansvar')!;
    return { grunnlag: prekludert || ansvar.resultat === 'avslatt' ? 'avvist' : 'avklart' };
  }
  if (svar.spor === 'vederlag') return { beloep: utsagnet(svar, 'beloep')!.godkjent };
  const dager = utsagnet(svar, 'dager')!;
  return { dager: prekludert || dager.resultat === 'avslatt' ? 0 : dager.vurdert };
}

/**
 * Svaret godkjenner hele kravet i sporet, så standpunktene faller sammen
 * (GR-U7). For grunnlaget er det en godkjenning uten påberopt preklusjon
 * (GR-U10).
 */
function godkjennerHeleKravet(svar: Svarinnhold, s: Standpunkt[]): boolean {
  if (avvisendeHovedgrunn(s)) return false;
  if (svar.spor === 'grunnlag') return utsagnet(svar, 'ansvar')?.resultat === 'godkjent';
  return svar.utregning.beregnings_resultat === 'godkjent';
}

/** Enigheten om svaret slik brevet uttrykte det (KA-U10, MM-U3, MM-U9). */
export function enighetsgrunnlag(svar: Svar, kilde: Enighetsgrunnlag['kilde']): Enighetsgrunnlag {
  const { regelversjon, standpunkter, utfall, vilkaar } = svar.beslutningsgrunnlag;
  return {
    spor: svar.spor,
    svar: svar.id,
    kilde,
    regelversjon,
    standpunkter,
    utfall,
    vilkaar: vilkaar ?? null,
  };
}

const kroner = (n: number) => `${n.toLocaleString('nb-NO')} kr`;

/** Linjen i brevet for svaret, med hovedgrunnen først (vedtaket 05.10 om avslag sammen med § 32.2). */
function beslutningslinje(svar: Svarinnhold, s: Standpunkt[]): string {
  const hjemmel = svar.spor === 'grunnlag' ? '§ 32.2' : '§ 33.4';
  const grunntekst: Record<string, string> = {
    rettidighet: `prekludert (${hjemmel})`,
    hindring: 'avslått uten fremdriftshindring (§ 33.1)',
  };
  const grunner = s.filter((p) => AVVISENDE.has(p.art) && p.virkning !== 'uten_virkning');
  let standpunkt: string;
  if (svar.spor === 'grunnlag') {
    standpunkt = { godkjent: 'godkjent', avslatt: 'avslått', frafalt: 'frafalt (§ 32.3 c)' }[
      utsagnet(svar, 'ansvar')!.resultat
    ];
  } else if (svar.spor === 'vederlag') {
    const b = utsagnet(svar, 'beloep')!;
    standpunkt = b.resultat === 'avslatt' ? 'avslått' : `godkjent med ${kroner(b.godkjent)}`;
  } else {
    const d = utsagnet(svar, 'dager')!;
    standpunkt = d.resultat === 'avslatt' ? 'avslått' : `godkjent med ${d.vurdert} dager`;
  }
  if (!grunner.length) return `${standpunkt[0].toUpperCase()}${standpunkt.slice(1)}.`;
  const ledd = grunner.map(
    (p, i) => `${i === 0 ? 'Prinsipalt' : 'subsidiært'} ${grunntekst[p.art]}`
  );
  return `${ledd.join(', ')}, ${grunner.length > 1 ? 'videre ' : ''}subsidiært ${standpunkt}.`;
}

export function beslutningsgrunnlag(
  svar: Svarinnhold,
  s: Standpunkt[],
  regler: Regelsett
): Beslutningsgrunnlag {
  return {
    regelversjon: regler.versjon,
    standpunkter: s,
    linje: beslutningslinje(svar, s),
    sammenfall: godkjennerHeleKravet(svar, s),
    utfall: utfall(svar, s),
    ...(svar.spor === 'grunnlag' ? {} : { vilkaar: 'grunnlag_avklart' as const }),
  };
}

/** Virkningen hvert utsagn har, utenom utsagn uten virkning. Et utsagn som mangler, er uten virkning. */
function medVirkning(s: Standpunkt[]): Map<string, Standpunkt['virkning']> {
  return new Map(
    s.filter((p) => p.virkning !== 'uten_virkning').map((p) => [p.utsagn, p.virkning])
  );
}

/** Et standpunkt har en annen virkning i `a` enn i `b`. Brukes bare av visningen (MM-U9). */
export function ulikeVirkninger(a: Standpunkt[], b: Standpunkt[]): boolean {
  const [x, y] = [medVirkning(a), medVirkning(b)];
  return x.size !== y.size || [...x].some(([utsagn, virkning]) => y.get(utsagn) !== virkning);
}

/**
 * En vurdering i svaret som kjernen ennå ikke har et utsagn for. Den kan ikke godtas
 * og forenkles til et annet standpunkt, så kommandoen avvises og en lagret rad
 * leses som ikke forstått (#304, review av PR #306).
 */
export function utenforOmfanget(spor: Spor, v: Record<string, unknown>): string | null {
  if (spor === 'frist' && v.spesifisert_krav_ok === false)
    return 'reduksjon etter § 33.6.1 er ikke i kjernen ennå';
  if (spor === 'frist' && v.foresporsel_svar_ok === false)
    return 'svar på forespørsel etter § 33.6.2 er ikke i kjernen ennå';
  if (spor === 'vederlag') {
    if (v.aksepterer_metode === false) return 'avslått metode (§ 34.2.2) er ikke i kjernen ennå';
    if (v.hold_tilbake === true) return 'tilbakeholdelse (§ 30.2) er ikke i kjernen ennå';
    for (const felt of [
      'hovedkrav_varslet_i_tide',
      'rigg_varslet_i_tide',
      'produktivitet_varslet_i_tide',
    ])
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
  aksepterer_metode?: unknown;
  frist_varsel_ok?: unknown;
  spesifisert_krav_ok?: unknown;
  vilkar_oppfylt?: unknown;
  dager?: unknown;
}

/** Feltene i svaret som er regnet av vurderingene og kravet. Kaster `UgyldigVurdering`. */
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
      else if (v.resultat === 'frafalt' && !iTide)
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
      hovedkrav_belop: (krav.innhold.belop_direkte as number | undefined) ?? 0,
      metode: 'FASTPRIS_TILBUD',
      rigg_belop: null,
      produktivitet_belop: null,
      krever_justert_ep: false,
      kostnads_overslag: null,
      hovedkategori,
      underkategori,
      grunnlag_varslet_i_tide: null,
      grunnlag_resultat: null,
    };
    const r = beregnVederlag(vkrav, v as never);
    return {
      beregnings_resultat: r.beregnings_resultat,
      total_godkjent_belop: tilTall(r.total_godkjent_belop),
      total_krevd_belop: tilTall(r.total_krevd_belop),
      hovedkrav_godkjent_belop: tilTall(r.hovedkrav_godkjent_belop),
    };
  }
  const fkrav: Fristkrav = {
    krevd_dager: (krav.innhold.antall_dager as number | undefined) ?? 0,
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
    beregnings_resultat: r.beregnings_resultat,
    godkjent_dager: r.godkjent_dager,
  };
  if (r.subsidiaer_resultat !== null) {
    ut.subsidiaer_resultat = r.subsidiaer_resultat;
    ut.subsidiaer_godkjent_dager = r.subsidiaer_godkjent_dager;
  }
  return ut;
}

/** Feltene klienten skal ha regnet likt med serveren. Beløp sammenliknes til hele øre. */
export const SAMMENLIKNES: Record<Spor, string[]> = {
  grunnlag: [],
  vederlag: ['beregnings_resultat', 'total_godkjent_belop'],
  frist: ['beregnings_resultat', 'godkjent_dager'],
};

export function likeResultatfelt(felt: string, klient: unknown, server: unknown): boolean {
  if (felt.endsWith('_belop') && typeof klient === 'number' && typeof server === 'number')
    return beloep(klient) === beloep(server);
  return klient === server;
}
