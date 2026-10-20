/**
 * Sakslisten i prosjektet (#1022): sakene TS-kjernen har skrevet, med krav, svar og
 * enighet per spor regnet av kjernen ved lesing (MM-U28) og det som foreligger
 * (MM-U29). Saken har ingen samlet status, bare en betegnelse i de fire tilfellene
 * i MM-U22. Ingenting i lista er lagret som oppsummering (AGENTS.md, «Kontrakten
 * først»). Feltnavnene er kontrakter (B-17); betydningen står i domenetabellen.
 */

import type {
  Fristresultat,
  Grunnlagsresultat,
  Vederlagsresultat,
} from '../kjerne/regler/typer.ts';
import type { Journalrad, Kravspor, Part, Spor } from '../kjerne/typer.ts';
import type { Kjerne } from '../kjerne/versjon.ts';
import { utledJournal } from '../kjerne/kommandoer/skriving.ts';
import { visning } from '../kjerne/utledning/visning.ts';
import {
  enighetensVirkning,
  kraveneErAvgjort,
  venterPaaSvar,
  type Utledning,
} from '../kjerne/utledning/utled.ts';
import type { Avhengigheter, Prosjektforespoersel, Rute, Svar } from './app.ts';
import { lesKontraktsside } from './autorisasjon.ts';
import { transaksjon, type Kontekst, type Pool } from './datalag.ts';
import { skrevetAvKjernen } from './lager.ts';

interface Listerad {
  sak_id: string;
  sakstype: string;
  opprettet: Date;
  event_id: string;
  event_type: string;
  versjon: number;
  tidsstempel: Date;
  aktor_id: string;
  aktor_rolle: Part;
  aktor_team_id: string | null;
  refererer_til_event_id: string | null;
  format: number | null;
  data: string;
}

export interface LestSak {
  sakId: string;
  sakstype: string;
  opprettet: string;
  journal: Journalrad[];
}

/**
 * Sakene i prosjektet i konteksten, med journalen, fra `koe_api.saksliste`.
 * Radsikkerheten avgrenser til prosjektet. En sak TS-kjernen ikke har skrevet,
 * er ikke med, som i `lesSaken`.
 */
export async function lesSakslisten(pool: Pool, kontekst: Kontekst): Promise<LestSak[]> {
  const rader = await transaksjon(pool, kontekst, async (foresp) => {
    const svar = await foresp().execute<Listerad>('koe_api.saksliste');
    return svar.recordset;
  });
  const saker = new Map<string, LestSak>();
  for (const r of rader) {
    let sak = saker.get(r.sak_id);
    if (!sak) {
      sak = {
        sakId: r.sak_id,
        sakstype: r.sakstype,
        opprettet: r.opprettet.toISOString(),
        journal: [],
      };
      saker.set(r.sak_id, sak);
    }
    sak.journal.push({
      event_id: r.event_id,
      sak_id: r.sak_id,
      event_type: r.event_type,
      versjon: r.versjon,
      tidsstempel: r.tidsstempel.toISOString(),
      aktor_id: r.aktor_id.toLowerCase(),
      aktor_rolle: r.aktor_rolle,
      aktor_team_id: r.aktor_team_id,
      refererer_til_event_id: r.refererer_til_event_id,
      format: r.format,
      data: JSON.parse(r.data) as Record<string, unknown>,
    });
  }
  return [...saker.values()].filter((s) => skrevetAvKjernen(s.journal));
}

const tall = (v: unknown): number | null => (typeof v === 'number' ? v : null);
const tekst = (v: unknown): string | null => (typeof v === 'string' ? v : null);

/** De fire tilfellene der saken har en samlet betegnelse (MM-U22). */
export type Saksbetegnelse =
  | 'ikke_forstaatt'
  | 'avslaget_paa_grunnlaget_godtatt'
  | 'grunnlaget_trukket'
  | 'kravene_avgjort';

type Virkning = 'betinget' | 'virksom' | 'uten_virkning';

interface Foreligger {
  /** Kjernens etiketter for sporet i visningen; erstattes av den faste lista i MM-U22 (#1043). */
  etiketter: string[];
  /** Kravet venter på byggherrens svar (`venterPaaSvar`, MM-U29). */
  venter_paa_svar: boolean;
  /** Byggherrens gjeldende svar står uten enighet, og kravet er ikke trukket (MM-U29). */
  svar_ikke_godtatt: boolean;
}

export interface Grunnlagslinje extends Foreligger {
  svar: { resultat: Grunnlagsresultat } | null;
}

export interface Vederlagslinje extends Foreligger {
  krav: { beloep: number; metode: string } | null;
  svar: { resultat: Vederlagsresultat; beloep: number; subsidiaert: boolean } | null;
  enighet: { beloep: number | null; virkning: Virkning } | null;
}

export interface Fristlinje extends Foreligger {
  krav: { dager: number } | null;
  svar: { resultat: Fristresultat; dager: number; subsidiaert: boolean } | null;
  enighet: { dager: number | null; virkning: Virkning } | null;
}

/** Én linje i sakslisten. */
export interface Sakslinje {
  sak_id: string;
  sakstype: string;
  sakstittel: string | null;
  opprettet: string;
  /** Tidsstempelet på den siste hendelsen i journalen, ikke brevets dato. */
  siste_hendelse: string;
  hovedkategori: string | null;
  forstaatt: boolean;
  saksbetegnelse: Saksbetegnelse | null;
  grunnlag: Grunnlagslinje;
  vederlag: Vederlagslinje;
  frist: Fristlinje;
}

/** I samme rekkefølge som statusen i visningen av saken. */
function saksbetegnelse(u: Utledning): Saksbetegnelse | null {
  if (!u.forstaatt) return 'ikke_forstaatt';
  if (u.grunnlagAvvist) return 'avslaget_paa_grunnlaget_godtatt';
  if (u.spor.grunnlag.trukket) return 'grunnlaget_trukket';
  if (kraveneErAvgjort(u)) return 'kravene_avgjort';
  return null;
}

const INGENTING: Foreligger = { etiketter: [], venter_paa_svar: false, svar_ikke_godtatt: false };

function foreligger(u: Utledning, spor: Spor, etiketter: string[]): Foreligger {
  const s = u.spor[spor];
  return {
    etiketter,
    venter_paa_svar: venterPaaSvar(u, spor),
    svar_ikke_godtatt: s.gjeldendeSvar !== null && s.enighet === null && !s.trukket,
  };
}

/**
 * Standpunktet om tallet i sporets gjeldende svar. Tallet er subsidiært når svaret
 * på grunnlaget avviser ansvaret (`subsidiaer`, som etiketten i visningen), eller når
 * brevet selv ga standpunktet subsidiær virkning; leseren fyller da tallet med det
 * subsidiære (MM-U9, MM-U28).
 */
function svaret(u: Utledning, spor: Kravspor) {
  const s = u.spor[spor];
  const g = s.gjeldendeSvar;
  const art = spor === 'vederlag' ? 'beloep' : 'dager';
  const st = g?.standpunkter.find((p) => p.art === art);
  if (!g || !st) return null;
  const subsidiaert =
    s.subsidiaer.length > 0 ||
    g.beslutningsgrunnlag.virkninger.some(
      (v) => v.standpunkt === st.id && v.virkning === 'subsidiaert'
    );
  return { st, subsidiaert };
}

function vederlag(u: Utledning, etiketter: string[]): Vederlagslinje {
  const s = u.spor.vederlag;
  const innhold = s.gjeldendeKrav?.innhold;
  const sv = svaret(u, 'vederlag');
  const virkning = enighetensVirkning(u, 'vederlag');
  return {
    ...foreligger(u, 'vederlag', etiketter),
    krav: innhold ? { beloep: tall(innhold.beloep)!, metode: tekst(innhold.metode)! } : null,
    svar:
      sv?.st.art === 'beloep'
        ? { resultat: sv.st.resultat, beloep: sv.st.godkjent, subsidiaert: sv.subsidiaert }
        : null,
    enighet:
      s.enighet && virkning ? { beloep: s.enighet.grunnlag.utfall.beloep ?? null, virkning } : null,
  };
}

function frist(u: Utledning, etiketter: string[]): Fristlinje {
  const s = u.spor.frist;
  const innhold = s.gjeldendeKrav?.innhold;
  const sv = svaret(u, 'frist');
  const virkning = enighetensVirkning(u, 'frist');
  return {
    ...foreligger(u, 'frist', etiketter),
    krav: innhold ? { dager: tall(innhold.dager)! } : null,
    svar:
      sv?.st.art === 'dager'
        ? { resultat: sv.st.resultat, dager: sv.st.vurdert, subsidiaert: sv.subsidiaert }
        : null,
    enighet:
      s.enighet && virkning ? { dager: s.enighet.grunnlag.utfall.dager ?? null, virkning } : null,
  };
}

/**
 * Linja for saken. En sak kjernen ikke forstår (MM-U2), har bare betegnelsen og
 * ingen krav, svar eller enighet, som visningen av saken.
 */
export function sakslinje(sak: LestSak, kjerne: Kjerne): Sakslinje {
  const u = utledJournal(sak.journal, kjerne);
  const v = visning(u, kjerne.regler);
  const felles = {
    sak_id: sak.sakId,
    sakstype: sak.sakstype,
    sakstittel: tekst(sak.journal[0]!.data.sakstittel),
    opprettet: sak.opprettet,
    siste_hendelse: sak.journal.at(-1)!.tidsstempel,
    forstaatt: u.forstaatt,
    saksbetegnelse: saksbetegnelse(u),
  };
  if (!u.forstaatt)
    return {
      ...felles,
      hovedkategori: null,
      grunnlag: { ...INGENTING, svar: null },
      vederlag: { ...INGENTING, krav: null, svar: null, enighet: null },
      frist: { ...INGENTING, krav: null, svar: null, enighet: null },
    };
  const g = u.spor.grunnlag.gjeldendeSvar?.standpunkter.find((p) => p.art === 'grunnlag');
  return {
    ...felles,
    hovedkategori: tekst(u.spor.grunnlag.gjeldendeKrav?.innhold.hovedkategori),
    grunnlag: {
      ...foreligger(u, 'grunnlag', v.spor.grunnlag.etiketter),
      svar: g?.art === 'grunnlag' ? { resultat: g.resultat } : null,
    },
    vederlag: vederlag(u, v.spor.vederlag.etiketter),
    frist: frist(u, v.spor.frist.etiketter),
  };
}

/**
 * Nøkkeltallene over lista, regnet i serveren. Krav og virksom enighet summeres hver
 * for seg, og betingede og subsidiære tall står for seg (MM-U28). En sak kjernen ikke
 * forstår, og en enighet uten beløp, telles og summeres ikke: ukjent er ikke 0.
 * Fristdagene summeres ikke på tvers av saker.
 */
export interface Noekkeltall {
  saker: number;
  ikke_forstaatt: number;
  vederlag: {
    krav_antall: number;
    krav_sum: number;
    venter_paa_svar: number;
    svar_subsidiaert_sum: number;
    enighet_virksom_sum: number;
    enighet_betinget_sum: number;
    enighet_uten_beloep: number;
  };
  frist: { krav_antall: number; venter_paa_svar: number };
}

export function noekkeltall(linjer: readonly Sakslinje[]): Noekkeltall {
  const n: Noekkeltall = {
    saker: linjer.length,
    ikke_forstaatt: 0,
    vederlag: {
      krav_antall: 0,
      krav_sum: 0,
      venter_paa_svar: 0,
      svar_subsidiaert_sum: 0,
      enighet_virksom_sum: 0,
      enighet_betinget_sum: 0,
      enighet_uten_beloep: 0,
    },
    frist: { krav_antall: 0, venter_paa_svar: 0 },
  };
  for (const l of linjer) {
    if (!l.forstaatt) {
      n.ikke_forstaatt += 1;
      continue;
    }
    const v = l.vederlag;
    if (v.krav) {
      n.vederlag.krav_antall += 1;
      n.vederlag.krav_sum += v.krav.beloep;
    }
    if (v.venter_paa_svar) n.vederlag.venter_paa_svar += 1;
    if (v.svar?.subsidiaert) n.vederlag.svar_subsidiaert_sum += v.svar.beloep;
    if (v.enighet && v.enighet.beloep === null) n.vederlag.enighet_uten_beloep += 1;
    else if (v.enighet?.virkning === 'virksom') n.vederlag.enighet_virksom_sum += v.enighet.beloep!;
    else if (v.enighet?.virkning === 'betinget')
      n.vederlag.enighet_betinget_sum += v.enighet.beloep!;
    if (l.frist.krav) n.frist.krav_antall += 1;
    if (l.frist.venter_paa_svar) n.frist.venter_paa_svar += 1;
  }
  return n;
}

async function sakslisten(
  { bruker, prosjekt }: Prosjektforespoersel,
  avh: Required<Avhengigheter>
): Promise<Svar> {
  const [saker, side] = await Promise.all([
    lesSakslisten(avh.datalag, { aktor: bruker.id, prosjekt: prosjekt.prosjektId }),
    lesKontraktsside(avh.datalag, avh.catenda, prosjekt),
  ]);
  const linjer = saker.map((s) => sakslinje(s, avh.kjerne));
  return [
    200,
    {
      success: true,
      part: side?.rolle ?? null,
      saker: linjer,
      noekkeltall: noekkeltall(linjer),
    },
  ];
}

export const SAKSLISTERUTER: readonly Rute[] = [
  {
    metode: 'GET',
    sti: /^\/api\/projects\/([^/]+)\/saker$/,
    eksempel: (p) => `/api/projects/${p}/saker`,
    tilgang: {
      prosjektrolle: 'viewer',
      utenSak: 'Lista over sakene i prosjektet; den gjelder prosjektet, ikke én sak.',
    },
    behandle: sakslisten,
  },
];
