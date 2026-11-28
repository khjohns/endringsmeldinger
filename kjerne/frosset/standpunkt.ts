/**
 * Virkningen av standpunktene i ett svar. `frysing.ts` setter sammen
 * beslutningsgrunnlaget av virkningene når brevet sendes. Klienten og serveren regner med de
 * samme funksjonene; serveren sammenlikner (B-13, 2.5 i modellforslaget).
 *
 * Reglene regner virkningene bare når brevet skrives. Etter det leses de fra
 * beslutningsgrunnlaget (MM-U9). Visningen kan regne dem igjen med dagens regler
 * for å vise at regelen er endret, men ingen regel leser det.
 *
 * Svarets egne standpunkter skilles fra om hele svaret er subsidiært til
 * forholdet. Det siste er en relasjon mellom brevene som utledes ved lesing
 * (vedtaket 05.10), og vilkåret i enighetsgrunnlaget (GR-U7).
 */

import type { Regelsett } from '../regler/regelsett.ts';
import {
  type Svarinnhold,
  type Svarsfrysing,
  type VarselIKravet,
  iSporet,
} from './byggeklosser.ts';
import { FRYSING_I_FORHOLDET } from '../spor/forhold/frysing.ts';
import { FRYSING_I_VEDERLAGET } from '../spor/vederlag/frysing.ts';
import { FRYSING_I_FRISTEN } from '../spor/frist/frysing.ts';
import { erKravpostvarselhjemmel, erVederlagsvarselhjemmel } from '../typer.ts';
import type {
  Enighetsgrunnlag,
  Kravpostvarselhjemmel,
  Krav,
  Kravpost,
  Spor,
  Standpunkt,
  Standpunktsvirkning,
  Svar,
  Utfall,
  Vederlagsvarselhjemmel,
} from '../typer.ts';

/**
 * Virkningen av hvert standpunkt i svaret etter regelsettet, regnet når brevet
 * skrives. `påberopelse` er kravet et svar på påberopelsen gjelder. Laget er et nummer fra 1.
 * Hver grunn med virkning åpner et nytt lag for standpunktene etter den (OV-U32), også
 * påberopelsene av rettidighet i fristen (KA-U85). `forskyvning` er lagene
 * svaret på forholdet opptar foran sporet (`lagFraForholdet`). `staar` er innsigelsene fra
 * svarene før som svaret leses med (`innsigelserSvaretLesesMed`, VS-U81).
 */
export function virkninger(
  svar: Svarinnhold,
  paaberopelse: Krav | null | undefined,
  regler: Regelsett,
  forskyvning: number,
  staar: readonly VarselIKravet[]
): Standpunktsvirkning[] {
  return frysingI(svar.spor).virkninger(svar, paaberopelse, regler, forskyvning, staar);
}

/**
 * Byggherrens siste standpunkt til et varsel i svarene på vederlaget: varselet for en kravpost, eller
 * varselet etter § 34.1.2 eller § 34.1.3 (`gjelder` er varselet).
 */
export interface StandpunktTilVarselet {
  gjelder: string;
  hjemmel: Vederlagsvarselhjemmel;
  iTide: boolean;
  /** Brevet standpunktet står i. */
  dokument: string;
}

/** OV-U120: kravposten `gjelder` har det eldre kravet i dokumentet `dokument` som varsel. */
export interface VarselIEtEldreKrav {
  gjelder: string;
  hjemmel: Kravpostvarselhjemmel;
  dokument: string;
}

/**
 * Svaret `s` uten standpunktene til varselet for kravpostene i `varsler` når svaret står før det
 * eldre kravet i journalen (OV-U120 andre ledd). `plass` er plassen til hvert dokument i journalen.
 * `vedSvaret` er de eldre kravene da svaret ble sendt, før en senere retting. Står standpunktet mot
 * varselet etter dem, står det også mot varselet etter rettingen (MM-U64).
 */
export function utenStandpunkterForanEldreKrav<T extends Pick<Svar, 'dokument' | 'standpunkter'>>(
  s: T,
  varsler: readonly VarselIEtEldreKrav[],
  plass: ReadonlyMap<string, number>,
  vedSvaret?: readonly VarselIEtEldreKrav[]
): T {
  const foran = (liste: readonly VarselIEtEldreKrav[], p: Standpunkt) =>
    p.art === 'rettidighet' &&
    liste.some(
      (v) =>
        v.gjelder === p.gjelder &&
        v.hjemmel === p.hjemmel &&
        plass.get(s.dokument)! < plass.get(v.dokument)!
    );
  const gjelderIkke = (p: Standpunkt) =>
    foran(varsler, p) && (vedSvaret === undefined || foran(vedSvaret, p));
  return s.standpunkter.some(gjelderIkke)
    ? { ...s, standpunkter: s.standpunkter.filter((p) => !gjelderIkke(p)) }
    : s;
}

/**
 * Byggherrens siste standpunkt til varselet etter § 34.3.3 eller § 34.4 for hver kravpost, og til
 * varselet etter § 34.1.2 og § 34.1.3, i `svarene`: svarene på vederlaget med virkning, med dagen
 * hvert ble sendt, om brevet er lagt til og om svaret gjelder et varsel som står alene. Svarene
 * leses i rekkefølgen de ble sendt (VS-U87 punkt 8–12, 30–34, OV-U103–OV-U105). `dokument` er
 * brevet innsigelsen først ble gjort gjeldende i (punkt 6). Et standpunkt i svaret på et varsel som
 * står alene, gjelder varselet og hver kravpost i `poster` som viser til det (punkt 34, VS-U79).
 * Etter § 34.1.2 og § 34.1.3 leses bare en innsigelse som først står i svaret på varselet (punkt
 * 34 og E11). Kommandoen og brevteksten leser dem herfra.
 */
export function sisteStandpunktTilVarslene(
  svarene: {
    s: Pick<Svar, 'dokument' | 'standpunkter'>;
    dag: string;
    lagtTil: boolean;
    paaVarselet: boolean;
  }[],
  poster: readonly Pick<Kravpost, 'id' | 'varsel'>[]
): StandpunktTilVarselet[] {
  const siste = new Map<string, StandpunktTilVarselet & { dag: string; lagtTil: boolean }>();
  const sendt = [...svarene].sort((a, b) => (a.dag < b.dag ? -1 : a.dag > b.dag ? 1 : 0));
  for (const { s, dag, lagtTil, paaVarselet } of sendt)
    for (const p of s.standpunkter) {
      if (p.art !== 'rettidighet' || !erVederlagsvarselhjemmel(p.hjemmel)) continue;
      const kravpost = erKravpostvarselhjemmel(p.hjemmel);
      const gjelder = [
        p.gjelder,
        ...(kravpost
          ? poster.flatMap((x) =>
              x.varsel?.art === 'gitt' && x.varsel.varsel === p.gjelder ? [x.id] : []
            )
          : []),
      ];
      for (const g of gjelder) {
        const noekkel = `${p.hjemmel} ${g}`;
        const foer = siste.get(noekkel);
        if (foer && !foer.iTide && foer.dag === dag && (foer.lagtTil || lagtTil)) continue;
        // VS-U77 punkt 6.
        const gjentatt = foer && !foer.iTide && !p.iTide;
        if (!kravpost && !paaVarselet && !p.iTide && !gjentatt) continue;
        siste.set(noekkel, {
          gjelder: g,
          hjemmel: p.hjemmel,
          iTide: p.iTide,
          dokument: gjentatt ? foer.dokument : s.dokument,
          dag,
          lagtTil,
        });
      }
    }
  return [...siste.values()].map(({ gjelder, hjemmel, iTide, dokument }) => ({
    gjelder,
    hjemmel,
    iTide,
    dokument,
  }));
}

/**
 * Et standpunkt i første lag avviser kravet uavhengig av beløpet eller dagene: en preklusjon
 * eller «ingen hindring». En begrensning etter § 34.1.3 avviser aldri hele kravet (VS-U5).
 */
function avvisesPrinsipalt(svar: Svarinnhold, v: Standpunktsvirkning[]): boolean {
  return v.some((p) => {
    if (p.virkning !== 1) return false;
    const s = svar.standpunkter.find((x) => x.id === p.standpunkt);
    // Innsigelsene etter § 34.3.3 og § 34.4 rammer bare kravposten (KA-U64, VS-U56).
    return (
      (s?.art === 'hindring' && !s.oppfylt) ||
      (s?.art === 'rettidighet' &&
        !s.iTide &&
        (s.hjemmel === '34.1.2' || !s.hjemmel.startsWith('34')))
    );
  });
}

/** Det svaret gir i sporet når standpunktene har denne virkningen. */
function utfall(svar: Svarinnhold, v: Standpunktsvirkning[]): Utfall {
  return frysingI(svar.spor).utfall(svar, v, avvisesPrinsipalt(svar, v));
}

/**
 * Svaret godkjenner hele kravet i sporet, så standpunktene faller sammen
 * (GR-U7). For forholdet er det en godkjenning uten påberopt preklusjon
 * (GR-U10).
 */
export function godkjennerHeleKravet(svar: Svarinnhold, v: Standpunktsvirkning[]): boolean {
  if (avvisesPrinsipalt(svar, v)) return false;
  return frysingI(svar.spor).godkjennerHeleKravet(svar, v);
}

/** Frysingen i sporet (`iSporet`). */
const frysingI = (spor: Spor): Svarsfrysing => iSporet(FRYSING, spor);

/** Frysingen i hvert spor. */
const FRYSING: Record<Spor, Svarsfrysing> = {
  forhold: FRYSING_I_FORHOLDET,
  vederlag: FRYSING_I_VEDERLAGET,
  frist: FRYSING_I_FRISTEN,
};

/** Partens standpunkt til et varsel i et tidligere svar (`sisteStandpunktTilVarslene`). */
export type StandpunktFoer = Pick<StandpunktTilVarselet, 'gjelder' | 'hjemmel' | 'iTide'>;

/**
 * VS-U80, VS-U81: varslene svaret ikke sier noe om, der byggherrens innsigelse fra svarene før
 * (`foer`) står. Svaret leses med dem, og virkningen fryses med svaret. `krav` er kravet svaret
 * gjelder, og mangler for et svar på et varsel som står alene.
 */
export function innsigelserSvaretLesesMed(
  svar: Svarinnhold,
  krav: Krav | null | undefined,
  foer: readonly StandpunktFoer[]
): VarselIKravet[] {
  return (frysingI(svar.spor).tausOmVarselet?.(svar, krav) ?? []).filter((t) =>
    foer.some((x) => !x.iTide && x.gjelder === t.gjelder && x.hjemmel === t.hjemmel)
  );
}

/**
 * Sammenfallet i svaret, også med innsigelsene fra svarene før som svaret leses med (`staar`,
 * VS-U77 punkt 9 og 12, OV-U115 punkt 25, VS-U81).
 */
export function sammenfallet(
  svar: Svarinnhold,
  v: Standpunktsvirkning[],
  staar: readonly VarselIKravet[]
): boolean {
  return godkjennerHeleKravet(svar, v) && staar.length === 0;
}

/**
 * MM-U43 punkt 8: sammenfallet i beslutningsgrunnlaget stemmer med standpunktene og
 * virkningene i samme brev. Leses av det frosne brevet, ikke av dagens regler, og ikke av
 * svarene før: et svar uten sammenfall som godkjenner hele kravet, godtas når det ikke sier
 * noe om et varsel i `krav` (#2316).
 */
export function sammenfallStemmer(svar: Svar, krav: Krav | undefined): boolean {
  const { sammenfall, virkninger } = svar.beslutningsgrunnlag;
  const godkjenner = godkjennerHeleKravet(svar, virkninger);
  if (sammenfall || !godkjenner) return sammenfall === godkjenner;
  return krav !== undefined && (frysingI(svar.spor).tausOmVarselet?.(svar, krav) ?? []).length > 0;
}

/** Enigheten om svaret slik brevet uttrykte det (MM-U9; KA-U10, MM-U3 og MM-U11, opphevet av MM-U50). */
export function enighetsgrunnlag(svar: Svar, kilde: Enighetsgrunnlag['kilde']): Enighetsgrunnlag {
  const { regelversjon, virkninger } = svar.beslutningsgrunnlag;
  return {
    spor: svar.spor,
    svar: svar.id,
    kilde,
    regelversjon,
    virkninger,
    utfall: utfall(svar, virkninger),
    vilkaar: frysingI(svar.spor).vilkaar,
  };
}

/**
 * Virkningen hvert standpunkt har, utenom standpunkter uten virkning. Et standpunkt som
 * mangler, er uten virkning. Et upåvirket standpunkt har samme virkning som et i første lag:
 * ingen innsigelse i sporet rammer det (OV-U32, OV-U33).
 */
function medVirkning(v: Standpunktsvirkning[]): Map<string, number> {
  return new Map(
    v.flatMap((p) =>
      p.virkning === 'uten_virkning'
        ? []
        : [[p.standpunkt, p.virkning === 'upaavirket' ? 1 : p.virkning] as const]
    )
  );
}

/** Et standpunkt har en annen virkning i `a` enn i `b`. Brukes bare av visningen (MM-U9). */
export function ulikeVirkninger(a: Standpunktsvirkning[], b: Standpunktsvirkning[]): boolean {
  const [x, y] = [medVirkning(a), medVirkning(b)];
  return x.size !== y.size || [...x].some(([id, virkning]) => y.get(id) !== virkning);
}
