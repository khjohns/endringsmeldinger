/**
 * Virkningen av utsagnene i ett svar, og det som fryses av den:
 * beslutningsgrunnlaget når brevet sendes og enighetsgrunnlaget når enigheten
 * oppstår. Klienten og serveren regner med de samme funksjonene; serveren
 * sammenlikner (B-13, 2.5 i modellforslaget).
 *
 * Svarets egne standpunkter skilles fra om hele svaret er subsidiært til
 * grunnlaget. Det siste avhenger av grunnlaget, ikke av svaret, og er vilkåret i
 * enighetsgrunnlaget (GR-U7). Ellers ville et svar på vederlaget avvike fra
 * brevet hver gang grunnlaget ble besvart, og MM-U4 ville hindret aksepten
 * GR-U7 tillater.
 */

import { belop, tilTall } from '../../kjerne/belop.ts';
import { forsteUnderkategori, gyldigeResultater } from '../../kjerne/regler/grunnlag.ts';
import { UgyldigVurdering } from '../../kjerne/regler/feil.ts';
import { beregnFrist, type Fristkrav } from '../../kjerne/regler/frist.ts';
import { beregnVederlag, type Vederlagskrav } from '../../kjerne/regler/vederlag.ts';
import type { Regelsett } from './regelsett.ts';
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

const tekst = (v: unknown) => (typeof v === 'string' ? v : null);

export function kategori(krav: Krav | null | undefined) {
  const innhold = krav?.innhold ?? {};
  return {
    hovedkategori: tekst(innhold.hovedkategori),
    underkategori: forsteUnderkategori(innhold.underkategori as string | string[] | null),
  };
}

/**
 * Standpunktene i svaret etter regelsettet. `grunnlagskrav` er kravet et
 * grunnlagssvar gjelder; `varsel` er varselet en rettidighetsvurdering etter
 * § 33.4 må gjelde for å ha virkning nå (MM-U1).
 */
export function standpunkter(
  svar: Svar,
  { grunnlagskrav, varsel }: { grunnlagskrav?: Krav | null; varsel?: string },
  regler: Regelsett
): Standpunkt[] {
  const ut: Standpunkt[] = [];
  let grunn: 'ingen' | 'hovedgrunn' | 'uavklart' = 'ingen';
  const etterGrunn = () => (grunn === 'ingen' ? 'hovedgrunn' : 'subsidiaer');
  for (const u of svar.utsagn) {
    if (u.art === 'rettidighet') {
      let virkning: Standpunkt['virkning'];
      if (u.hjemmel === '32.2') {
        const { hovedkategori, underkategori } = kategori(grunnlagskrav);
        virkning =
          !u.iTide && regler.gjelder32_2(hovedkategori, underkategori)
            ? 'hovedgrunn'
            : 'uten_virkning';
      } else if (u.gjelder !== varsel) {
        virkning = 'uavklart';
      } else {
        virkning = u.iTide ? 'uten_virkning' : 'hovedgrunn';
      }
      if (virkning === 'hovedgrunn' || virkning === 'uavklart') grunn = virkning;
      ut.push({ utsagn: u.id, art: u.art, virkning });
    } else if (u.art === 'hindring') {
      // Vedtaket 05.10 (#211): uten fremdriftshindring står dagene som et videre subsidiært standpunkt.
      const virkning = u.oppfylt ? 'uten_virkning' : etterGrunn();
      if (!u.oppfylt && grunn === 'ingen') grunn = 'hovedgrunn';
      ut.push({ utsagn: u.id, art: u.art, virkning });
    } else {
      ut.push({ utsagn: u.id, art: u.art, virkning: etterGrunn() });
    }
  }
  return ut;
}

const hovedgrunn = (s: Standpunkt[]) => s.find((p) => p.virkning === 'hovedgrunn');
/** Et standpunkt som avviser kravet uavhengig av beløpet eller dagene. */
const AVVISENDE = new Set(['rettidighet', 'hindring']);
const avvisendeHovedgrunn = (s: Standpunkt[]) => AVVISENDE.has(hovedgrunn(s)?.art ?? '');

function utsagnet<A extends Utsagn['art']>(svar: Svar, art: A) {
  return svar.utsagn.find((u): u is Extract<Utsagn, { art: A }> => u.art === art);
}

/** Det svaret gir i sporet når standpunktene har denne virkningen. */
export function utfall(svar: Svar, s: Standpunkt[]): Utfall {
  const prekludert = avvisendeHovedgrunn(s);
  if (svar.spor === 'grunnlag') {
    const ansvar = utsagnet(svar, 'ansvar')!;
    return { grunnlag: prekludert || ansvar.resultat === 'avslatt' ? 'avvist' : 'avklart' };
  }
  if (svar.spor === 'vederlag') return { belop: utsagnet(svar, 'belop')!.godkjent };
  const dager = utsagnet(svar, 'dager')!;
  return { dager: prekludert || dager.resultat === 'avslatt' ? 0 : dager.vurdert };
}

export const uavklart = (s: Standpunkt[]) => s.some((p) => p.virkning === 'uavklart');

/** Svaret godkjenner hele kravet i sporet, så standpunktene faller sammen (GR-U7). */
export function godkjennerHeleKravet(svar: Svar, s: Standpunkt[]): boolean {
  return (
    svar.spor !== 'grunnlag' &&
    !uavklart(s) &&
    !avvisendeHovedgrunn(s) &&
    svar.utregning.beregnings_resultat === 'godkjent'
  );
}

export function enighetsgrunnlag(
  svar: Svar,
  kilde: Enighetsgrunnlag['kilde'],
  s: Standpunkt[],
  regler: Regelsett
): Enighetsgrunnlag {
  return {
    spor: svar.spor,
    svar: svar.id,
    kilde,
    regelversjon: regler.versjon,
    standpunkter: s,
    utfall: utfall(svar, s),
    vilkar: svar.spor === 'grunnlag' ? null : 'grunnlag_avklart',
  };
}

const kroner = (n: number) => `${n.toLocaleString('nb-NO')} kr`;

/** Linjen i brevet for svaret, med hovedgrunnen først (vedtaket 05.10 om avslag sammen med § 32.2). */
export function beslutningslinje(svar: Svar, s: Standpunkt[]): string {
  const hjemmel = svar.spor === 'grunnlag' ? '§ 32.2' : '§ 33.4';
  const grunntekst: Record<string, string> = {
    rettidighet: `prekludert (${hjemmel})`,
    hindring: 'avslått uten fremdriftshindring (§ 33.1)',
  };
  const grunner = s.filter(
    (p) => AVVISENDE.has(p.art) && (p.virkning === 'hovedgrunn' || p.virkning === 'subsidiaer')
  );
  let standpunkt: string;
  if (svar.spor === 'grunnlag') {
    standpunkt = { godkjent: 'godkjent', avslatt: 'avslått', frafalt: 'frafalt (§ 32.3 c)' }[
      utsagnet(svar, 'ansvar')!.resultat
    ];
  } else if (svar.spor === 'vederlag') {
    const b = utsagnet(svar, 'belop')!;
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
  svar: Svar,
  s: Standpunkt[],
  regler: Regelsett
): Beslutningsgrunnlag {
  return { regelversjon: regler.versjon, standpunkter: s, linje: beslutningslinje(svar, s) };
}

/** Brevet avviker fra dagens utledning: et standpunkt har fått en annen virkning (MM-U4). `null` uten lagret beslutningsgrunnlag. */
export function avviker(svar: Svar, s: Standpunkt[]): boolean | null {
  const frosset = svar.beslutningsgrunnlag?.standpunkter;
  if (!frosset) return null;
  const na = new Map(s.map((p) => [p.utsagn, p.virkning]));
  return frosset.length !== s.length || frosset.some((p) => na.get(p.utsagn) !== p.virkning);
}

/**
 * En vurdering i svaret som prøven ikke har et utsagn for. Den kan ikke godtas
 * og forenkles til et annet standpunkt, så kommandoen avvises og en lagret rad
 * leses som ikke forstått (#304, review av PR #306).
 */
export function utenforProven(spor: Spor, v: Record<string, unknown>): string | null {
  if (spor === 'frist' && v.spesifisert_krav_ok === false)
    return 'reduksjon etter § 33.6.1 er ikke i prøven';
  if (spor === 'frist' && v.foresporsel_svar_ok === false)
    return 'svar på forespørsel etter § 33.6.2 er ikke i prøven';
  if (spor === 'vederlag') {
    if (v.aksepterer_metode === false) return 'avslått metode (§ 34.2.2) er ikke i prøven';
    if (v.hold_tilbake === true) return 'tilbakeholdelse (§ 30.2) er ikke i prøven';
    for (const felt of [
      'hovedkrav_varslet_i_tide',
      'rigg_varslet_i_tide',
      'produktivitet_varslet_i_tide',
    ])
      if (v[felt] === false) return `preklusjon etter § 34.1 (${felt}) er ikke i prøven`;
    if (v.rigg_vurdering !== undefined || v.produktivitet_vurdering !== undefined)
      return 'særskilte krav (§ 34.1.3) er ikke i prøven';
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
    if (regler.gjelder32_2(hovedkategori, underkategori)) {
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
    return belop(klient) === belop(server);
  return klient === server;
}
