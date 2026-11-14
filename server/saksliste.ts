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
import { betegnelsen, innholdIFristen, type FristIKravet } from '../kjerne/spor/frist/format.ts';
import { fristeneISporet } from '../kjerne/spor/frist/utledning.ts';
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
import { transaksjon, type Foresp, type Kontekst, type Pool } from './datalag.ts';
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
  return transaksjon(pool, kontekst, lesSakene);
}

/** Det samme som `lesSakslisten`, i en transaksjon som alt har konteksten. */
export async function lesSakene(foresp: Foresp): Promise<LestSak[]> {
  const rader = (await foresp().execute<Listerad>('koe_api.saksliste')).recordset;
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
 * oppdragsgiver 20.10 i #1029). Nøkkeltallene i Varden leser flagget (#1068, #1861).
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

/** Én frist i kravet, svaret eller enigheten, med betegnelsen i kontrakten (U-1, KA-U74). */
export interface Fristdager {
  betegnelse: string;
  dager: number;
}

/** Dagene står per frist og legges ikke sammen (KA-U74). */
export interface Fristlinje extends Foreligger, Staaende {
  krav: { frister: Fristdager[] } | null;
  /**
   * `resultat` gjelder hele svaret, `antall_godkjent` er fristene som har fått alle dagene
   * (`resultatForSvaret`), og `subsidiaert` sier at et av standpunktene om dagene er subsidiært,
   * som i vederlaget. Ingen regel leser dem.
   */
  svar: {
    resultat: Fristresultat;
    antall_godkjent: number;
    subsidiaert: boolean;
    frister: (Fristdager & { resultat: Fristresultat; subsidiaert: boolean })[];
  } | null;
  enighet: { frister: Fristdager[]; virkning: Virkning } | null;
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

/** Betegnelsen i kontrakten for fristen med `id`, i den siste formen den hadde i sporet. */
function betegnelseFor(sist: ReadonlyMap<string, FristIKravet>, id: string): string {
  const f = sist.get(id);
  return f ? betegnelsen(f) : id;
}

/**
 * Resultatet for hele svaret på fristen, som etikett i sakslisten (HF-U7, KA-U79): godkjent når hver
 * frist har fått alle dagene, avslått når ingen frist har fått dager, og ellers delvis godkjent.
 */
function resultatForSvaret(resultater: readonly Fristresultat[]): Fristresultat {
  if (resultater.every((r) => r === 'godkjent')) return 'godkjent';
  if (resultater.every((r) => r === 'avslaatt')) return 'avslaatt';
  return 'delvis_godkjent';
}

/**
 * Byggherrens gjeldende svar på fristen: dagene og resultatet for hver frist, og om
 * standpunktet er subsidiært (`standpunktetErSubsidiaert`, MM-U28), med resultatet for hele
 * svaret og hvor mange frister som har fått alle dagene.
 */
function fristsvaret(u: Utledning, sist: ReadonlyMap<string, FristIKravet>): Fristlinje['svar'] {
  const frister = (u.spor.frist.gjeldendeSvar?.standpunkter ?? []).flatMap((st) =>
    st.art === 'dager'
      ? [
          {
            betegnelse: betegnelseFor(sist, st.gjelder),
            resultat: st.resultat,
            dager: st.vurdert,
            subsidiaert: standpunktetErSubsidiaert(u, 'frist', st.id),
          },
        ]
      : []
  );
  if (!frister.length) return null;
  const resultater = frister.map((f) => f.resultat);
  return {
    resultat: resultatForSvaret(resultater),
    antall_godkjent: resultater.filter((r) => r === 'godkjent').length,
    subsidiaert: frister.some((f) => f.subsidiaert),
    frister,
  };
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
  const { sist } = fristeneISporet(s.krav);
  const krav = s.gjeldendeKrav;
  const virkning = enighetensVirkning(u, 'frist');
  return {
    ...foreligger(u, 'frist'),
    kravet_staar: kravetStaar(u, 'frist'),
    har_varsel: harVarsel(u, 'frist'),
    ingen_krav: s.ingenKrav,
    krav: krav
      ? {
          frister: innholdIFristen(krav).frister.map((f) => ({
            betegnelse: betegnelsen(f),
            dager: f.dager,
          })),
        }
      : null,
    svar: fristsvaret(u, sist),
    enighet:
      s.enighet && virkning
        ? {
            frister: (s.enighet.grunnlag.utfall.frister ?? []).map((f) => ({
              betegnelse: betegnelseFor(sist, f.gjelder),
              dager: f.dager,
            })),
            virkning,
          }
        : null,
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
