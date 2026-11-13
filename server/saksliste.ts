/**
 * Sakslisten i prosjektet (#1022): sakene TS-kjernen har skrevet, med krav, svar og
 * enighet per spor regnet av kjernen ved lesing (MM-U28 (opphevet av MM-U37)) og det som foreligger
 * (MM-U29 (opphevet av MM-U40)). Saken har ingen samlet status, bare en betegnelse i de fire tilfellene
 * i MM-U22. Ingenting i lista er lagret som oppsummering (AGENTS.md, «Kontrakten
 * først»). Feltnavnene er kontrakter (B-17); betydningen står i domenetabellen.
 */

import type { Fristresultat, Forholdsresultat, Vederlagsresultat } from '../kjerne/regler/typer.ts';
import type { Dokument, Journalrad, Part, Spor } from '../kjerne/typer.ts';
import { kalenderdag, registrertDato } from '../kjerne/format/leser.ts';
import type { Kjerne } from '../kjerne/versjon.ts';
import { utledJournal } from '../kjerne/kommandoer/skriving.ts';
import { innholdIFristen } from '../kjerne/format/kravinnhold.ts';
import {
  fasteBeloepIKravet,
  fasteBeloepISvaret,
  kravposterI,
  type FasteBeloep,
} from '../kjerne/spor/vederlag/format.ts';
import { tilTall } from '../kjerne/regler/beloep.ts';
import {
  betegnelse,
  harVarsel,
  kravetStaar,
  harIkkeVurdertBrev,
  saksbetegnelse,
  type Betegnelse,
  type Saksbetegnelse,
} from '../kjerne/utledning/visning.ts';
import {
  enighetensVirkning,
  standpunktetErSubsidiaert,
  svarIkkeGodtatt,
  venterPaaSvar,
  type Utledning,
} from '../kjerne/utledning/utled.ts';
import type { Avhengigheter, Prosjektforespoersel, Rute, Svar } from './rutetyper.ts';
import { lesekontekst } from './autorisasjon.ts';
import { transaksjon, type Kontekst, type Pool } from './datalag.ts';
import { skrevetAvKjernen } from './lager.ts';
import { innholdIForholdet } from '../kjerne/spor/forhold/format.ts';

interface Listerad {
  sak_id: string;
  sakstype: string;
  opprettet: Date;
  kode: 'koe' | 'eo' | null;
  loepenummer: number | null;
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
  /** Sakens kode og løpenummer fra `koe.sak_kode`, eller `null` før sakens første brev fra løsningen (LV-U47). */
  sakskode: { kode: 'koe' | 'eo'; loepenummer: number } | null;
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
        sakskode:
          r.kode !== null && r.loepenummer !== null
            ? { kode: r.kode, loepenummer: r.loepenummer }
            : null,
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

const tekst = (v: unknown): string | null => (typeof v === 'string' ? v : null);

type Virkning = 'betinget' | 'virksom' | 'uten_virkning';

interface Foreligger {
  /** Sporets betegnelse fra den faste lista (`betegnelse`, MM-U30). */
  betegnelse: Betegnelse | null;
  /** Kravet venter på byggherrens svar (`venterPaaSvar`, MM-U29). */
  venter_paa_svar: boolean;
  /** Byggherrens gjeldende svar står, og TE kan fortsatt godta det (`svarIkkeGodtatt`, MM-U29). */
  svar_ikke_godtatt: boolean;
}

export interface Forholdslinje extends Foreligger {
  svar: { resultat: Forholdsresultat } | null;
}

/**
 * Kravet står: saken er forstått og ikke avsluttet, og kravet er ikke trukket (svar 2 fra
 * oppdragsgiver 20.10 i #1029). Nøkkeltallene og frontenden leser flagget (#1068).
 */
interface Staaende {
  kravet_staar: boolean;
  /**
   * Sporet har et varsel løsningen kjenner (OV-U5), uavhengig av betegnelsen, som kan være
   * en annen når et varsel foreligger (MM-U30). Lista viser «Varslet» av flagget (MM-U37).
   */
  har_varsel: boolean;
  /** TE har sagt at det ikke kreves noe i sporet (KA-U12), uavhengig av betegnelsen. */
  ingen_krav: boolean;
}

/**
 * `beloep` er summen av de faste beløpene i kroner, eller `null` når ingen post har et fast
 * beløp, og `antall_uten_fast_beloep` er kravpostene summen ikke regner med (`FasteBeloep`,
 * arbeidsvalget 12.11 i #1779).
 */
interface Beloepene {
  beloep: number | null;
  antall_uten_fast_beloep: number;
}

export interface Vederlagslinje extends Foreligger, Staaende {
  krav: Beloepene | null;
  /** Beløpet er det byggherren godtar om ingen påberopelse fører fram (OV-U31). */
  svar: (Beloepene & { resultat: Vederlagsresultat; subsidiaert: boolean }) | null;
  /**
   * `uten_fast_beloep` er betegnelsene på kravpostene uten fast beløp i det første laget, som
   * `beloep` ikke regner med (OV-U73, svar 6 A i #1663).
   */
  enighet: { beloep: number | null; uten_fast_beloep: string[]; virkning: Virkning } | null;
}

export interface Fristlinje extends Foreligger, Staaende {
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
  /**
   * Sakens kode, `koe` eller `eo`, og løpenummeret for koden i prosjektet (LV-U44, LV-U46).
   * Begge er `null` til sakens første brev fra løsningen er sendt (LV-U47). Visningen setter
   * sammen «KOE-17».
   */
  kode: 'koe' | 'eo' | null;
  loepenummer: number | null;
  /** Tidsstempelet på den siste hendelsen i journalen, ikke brevets dato. */
  siste_hendelse: string;
  /**
   * Sakens siste brev, med avsenderen og brevets dato (ÅÅÅÅ-MM-DD), se `brevetsDato`. `null`
   * når saken ikke har noe brev, og når kjernen ikke forstår saken (MM-U2): da kan ikke
   * lista vite om det ukjente er et brev.
   */
  siste_brev: { avsender: Part; dato: string } | null;
  hovedkategori: string | null;
  /** Forholdet TE påberoper, med kjernens kode, så lista kan vise henvisningen (arbeidsvalg 03.11 i #1450). */
  underkategori: string | null;
  forstaatt: boolean;
  saksbetegnelse: Saksbetegnelse | null;
  /** Saken har registrert korrespondanse, som tillegget til «kravene avgjort» i OV-U10. */
  brev_utenfor_appen: boolean;
  forhold: Forholdslinje;
  vederlag: Vederlagslinje;
  frist: Fristlinje;
}

const INGENTING: Foreligger = {
  betegnelse: null,
  venter_paa_svar: false,
  svar_ikke_godtatt: false,
};

function foreligger(u: Utledning, spor: Spor): Foreligger {
  return {
    betegnelse: betegnelse(u, spor),
    venter_paa_svar: venterPaaSvar(u, spor),
    svar_ikke_godtatt: svarIkkeGodtatt(u, spor),
  };
}

/**
 * Standpunktet om dagene i fristens gjeldende svar, og om det er subsidiært
 * (`standpunktetErSubsidiaert`); leseren fyller da tallet med det subsidiære (MM-U28).
 */
function fristsvaret(u: Utledning) {
  const st = u.spor.frist.gjeldendeSvar?.standpunkter.find((p) => p.art === 'dager');
  if (!st) return null;
  return { st, subsidiaert: standpunktetErSubsidiaert(u, 'frist', st.id) };
}

const beloepene = (b: FasteBeloep): Beloepene => ({
  beloep: b.sum === null ? null : tilTall(b.sum),
  antall_uten_fast_beloep: b.utenFastBeloep,
});

/**
 * Byggherrens gjeldende svar på vederlaget, med resultatet i det første standpunktet til et
 * beløp. Subsidiært når et av standpunktene til beløpene er det (`standpunktetErSubsidiaert`).
 */
function vederlagssvaret(u: Utledning): Vederlagslinje['svar'] {
  const svar = u.spor.vederlag.gjeldendeSvar;
  const poster = (svar?.standpunkter ?? []).filter((p) => p.art === 'beloep');
  if (!svar || !poster.length) return null;
  return {
    resultat: poster[0]!.resultat,
    ...beloepene(fasteBeloepISvaret(svar)),
    subsidiaert: poster.some((p) => standpunktetErSubsidiaert(u, 'vederlag', p.id)),
  };
}

function vederlag(u: Utledning): Vederlagslinje {
  const s = u.spor.vederlag;
  const virkning = enighetensVirkning(u, 'vederlag');
  return {
    ...foreligger(u, 'vederlag'),
    kravet_staar: kravetStaar(u, 'vederlag'),
    har_varsel: harVarsel(u, 'vederlag'),
    ingen_krav: s.ingenKrav,
    krav: s.gjeldendeKrav ? beloepene(fasteBeloepIKravet(s.gjeldendeKrav)) : null,
    svar: vederlagssvaret(u),
    enighet:
      s.enighet && virkning
        ? {
            beloep: s.enighet.grunnlag.utfall.beloep ?? null,
            uten_fast_beloep: (s.enighet.grunnlag.utfall.uten_fast_beloep ?? []).map(
              (id) =>
                s.krav.flatMap((k) => kravposterI(k)).find((p) => p.id === id)?.betegnelse ?? id
            ),
            virkning,
          }
        : null,
  };
}

function frist(u: Utledning): Fristlinje {
  const s = u.spor.frist;
  const krav = s.gjeldendeKrav;
  const sv = fristsvaret(u);
  const virkning = enighetensVirkning(u, 'frist');
  return {
    ...foreligger(u, 'frist'),
    kravet_staar: kravetStaar(u, 'frist'),
    har_varsel: harVarsel(u, 'frist'),
    ingen_krav: s.ingenKrav,
    krav: krav ? { dager: innholdIFristen(krav).dager } : null,
    svar:
      sv?.st.art === 'dager'
        ? { resultat: sv.st.resultat, dager: sv.st.vurdert, subsidiaert: sv.subsidiaert }
        : null,
    enighet:
      s.enighet && virkning ? { dager: s.enighet.grunnlag.utfall.dager ?? null, virkning } : null,
  };
}

/**
 * Brevets dato: for et registrert brev datoen parten oppga at det ble sendt, ellers mottatt
 * (OV-U80), og ellers dagen det ble registrert i løsningen (VS-U8). Oppdragsgiver 03.11 i
 * #1450. En oppgitt dato som ikke kan leses, gir registreringsdagen.
 */
function brevetsDato(d: Dokument): string {
  const om = (hva: string) =>
    d.opplysninger.find((o) => o.hva === hva && !('gjelder' in o && o.gjelder));
  const oppgitt = om('sendt') ?? om('mottatt');
  const dag = oppgitt && 'dato' in oppgitt ? kalenderdag(oppgitt.dato) : null;
  return dag ?? registrertDato(d);
}

/**
 * Brevet i saken med den seneste datoen, og ved samme dag det siste i journalen. En retting
 * registrerer brevet på nytt, så det er den siste registreringen i kjeden som gjelder, ikke den
 * den retter (OV-U17). En retting som sier at brevet ikke hører til saken, har ingen
 * registrering etter seg, så da er brevet ikke med (OV-U18). En sak med en ugyldig retting er
 * ikke forstått og kommer ikke hit.
 */
function sisteBrev(u: Utledning): Sakslinje['siste_brev'] {
  const dokumenter = u.journal.flatMap((h) => (h.art === 'dokument' ? [h.dokument] : []));
  const rettet = new Set(dokumenter.map((d) => d.retter).filter((id) => id !== null));
  const brev = dokumenter.filter((d) => !rettet.has(d.id) && !d.ikkeISaken);
  let siste: Sakslinje['siste_brev'] = null;
  for (const d of brev) {
    const dato = brevetsDato(d);
    if (!siste || dato >= siste.dato) siste = { avsender: d.avsender, dato };
  }
  return siste;
}

/**
 * Linja for saken. En sak kjernen ikke forstår (MM-U2), har bare betegnelsen og
 * ingen krav, svar eller enighet, som visningen av saken.
 */
export function sakslinje(sak: LestSak, kjerne: Kjerne): Sakslinje {
  const u = utledJournal(sak.journal, kjerne);
  const felles = {
    sak_id: sak.sakId,
    sakstype: sak.sakstype,
    sakstittel: tekst(sak.journal[0]!.data.sakstittel),
    opprettet: sak.opprettet,
    kode: sak.sakskode?.kode ?? null,
    loepenummer: sak.sakskode?.loepenummer ?? null,
    siste_hendelse: sak.journal.at(-1)!.tidsstempel,
    forstaatt: u.forstaatt,
    saksbetegnelse: saksbetegnelse(u),
    brev_utenfor_appen: harIkkeVurdertBrev(u),
  };
  if (!u.forstaatt)
    return {
      ...felles,
      siste_brev: null,
      hovedkategori: null,
      underkategori: null,
      forhold: { ...INGENTING, svar: null },
      vederlag: {
        ...INGENTING,
        kravet_staar: false,
        har_varsel: false,
        ingen_krav: false,
        krav: null,
        svar: null,
        enighet: null,
      },
      frist: {
        ...INGENTING,
        kravet_staar: false,
        har_varsel: false,
        ingen_krav: false,
        krav: null,
        svar: null,
        enighet: null,
      },
    };
  const g = u.spor.forhold.gjeldendeSvar?.standpunkter.find((p) => p.art === 'forhold');
  const paaberopt = innholdIForholdet(u.spor.forhold.gjeldendeKrav);
  return {
    ...felles,
    siste_brev: sisteBrev(u),
    hovedkategori: paaberopt.hovedkategori,
    underkategori: tekst(paaberopt.underkategori),
    forhold: {
      ...foreligger(u, 'forhold'),
      svar: g?.art === 'forhold' ? { resultat: g.resultat } : null,
    },
    vederlag: vederlag(u),
    frist: frist(u),
  };
}

/**
 * Nøkkeltallene over lista, regnet i serveren. Krav og virksom enighet summeres hver
 * for seg, og betingede og subsidiære tall står for seg (MM-U28). Kravene og de subsidiære
 * beløpene telles bare når kravet står (`kravet_staar`; svar 2 fra oppdragsgiver 20.10 i
 * #1029, svar 3 22.10 i #1052). Et subsidiært beløp TE har godtatt, telles bare som
 * betinget enighet («Subsidiært» 22.10 i #1052). En sak kjernen ikke forstår,
 * og en enighet uten beløp, telles og summeres ikke: ukjent er ikke 0. En enighet uten
 * virkning telles ikke (svar 2 og 3 fra oppdragsgiver 20.10 i #1029). Fristdagene
 * summeres ikke på tvers av saker.
 */
export interface Noekkeltall {
  saker: number;
  ikke_forstaatt: number;
  vederlag: {
    krav_antall: number;
    krav_sum: number;
    /** Krav som står, uten fast beløp: ukjent er ikke 0 (OV-U43). */
    krav_uten_beloep: number;
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
      krav_uten_beloep: 0,
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
    if (v.krav && v.kravet_staar) {
      if (v.krav.beloep === null) n.vederlag.krav_uten_beloep += 1;
      else {
        n.vederlag.krav_antall += 1;
        n.vederlag.krav_sum += v.krav.beloep;
      }
    }
    if (v.venter_paa_svar) n.vederlag.venter_paa_svar += 1;
    if (v.svar?.subsidiaert && v.svar.beloep !== null && v.kravet_staar && !v.enighet)
      n.vederlag.svar_subsidiaert_sum += v.svar.beloep;
    const e = v.enighet;
    if (e && e.virkning !== 'uten_virkning') {
      if (e.beloep === null) n.vederlag.enighet_uten_beloep += 1;
      else if (e.virkning === 'virksom') n.vederlag.enighet_virksom_sum += e.beloep;
      else n.vederlag.enighet_betinget_sum += e.beloep;
    }
    if (l.frist.krav && l.frist.kravet_staar) n.frist.krav_antall += 1;
    if (l.frist.venter_paa_svar) n.frist.venter_paa_svar += 1;
  }
  return n;
}

async function sakslisten(
  { bruker, prosjekt, side }: Prosjektforespoersel,
  avh: Required<Avhengigheter>
): Promise<Svar> {
  const saker = await lesSakslisten(avh.datalag, lesekontekst(bruker, prosjekt.prosjektId, side));
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
      kontraktsrolle: 'lesing',
    },
    behandle: sakslisten,
  },
];
