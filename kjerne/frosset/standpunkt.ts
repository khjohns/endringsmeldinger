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
import { type Svarinnhold, type Svarsfrysing, iSporet } from './byggeklosser.ts';
import { FRYSING_I_FORHOLDET } from '../spor/forhold/frysing.ts';
import { FRYSING_I_VEDERLAGET } from '../spor/vederlag/frysing.ts';
import { FRYSING_I_FRISTEN } from '../spor/frist/frysing.ts';
import { HJEMMEL } from '../format/format.ts';
import { erRegistrert } from '../format/leser.ts';
import { erKravpostvarselhjemmel } from '../typer.ts';
import type {
  Dokument,
  Enighetsgrunnlag,
  Hjemmel,
  Utsagn,
  Kravpostvarselhjemmel,
  Krav,
  Kravpost,
  Spor,
  Standpunkt,
  Standpunktsvirkning,
  Svar,
  Utfall,
} from '../typer.ts';

/**
 * Virkningen av hvert standpunkt i svaret etter regelsettet, regnet når brevet
 * skrives. `påberopelse` er kravet et svar på påberopelsen gjelder. Laget er et nummer fra 1.
 * Hver grunn med virkning åpner et nytt lag for standpunktene etter den (OV-U32), også
 * påberopelsene av rettidighet i fristen (KA-U85). `forskyvning` er lagene
 * svaret på forholdet opptar foran sporet (`lagFraForholdet`).
 */
export function virkninger(
  svar: Svarinnhold,
  paaberopelse: Krav | null | undefined,
  regler: Regelsett,
  forskyvning = 0
): Standpunktsvirkning[] {
  return frysingI(svar.spor).virkninger(svar, paaberopelse, regler, forskyvning);
}

/** VS-U29, OV-U104: en innsigelse som påberoper at noe kom for sent. */
export const erPaaberopelse = (x: Utsagn): x is Extract<Utsagn, { art: 'innsigelse' }> =>
  x.art === 'innsigelse' && x.grunn === undefined;

/**
 * VS-U24: en egen innsigelse er en påberopelse etter én bestemmelse bare når det den
 * gjelder, bare kan komme for sent etter den: varselet etter § 33.4 i fristen, varselet
 * etter § 34.1.2 i vederlaget (VS-U24, OV-U5), og TEs
 * varsel etter § 32.2 i forholdet, som er påberopelsen når § 32.2 gjelder kategorien
 * i det (GR-U11). Varselet etter § 32.2 er det samme i hver påberopelsesversjon
 * (arbeidsvalget 15.10 i #500). Svaret i sporet gjentar den eller gir den opp. Mot et
 * annet krav eller et svar er den uten virkning. Et krav lagt til med kravskjemaet har samme
 * virkning som et krav sendt fra løsningen (OV-U80). Kommandoene, utledningen og
 * brevteksten finner det innsigelsen gjelder, i `dokumenter` her (#536). `varslingsplikt`
 * sier om § 32.2 gjelder kategorien: brevteksten spør regelsettet når brevet skrives,
 * utledningen leser det som er frosset (MM-U43 punkt 8, #776).
 */
export function innsigelsenPaaberoper(
  gjelder: string,
  dokumenter: Iterable<Pick<Dokument, 'krav' | 'utsagn' | 'opplysninger'>>,
  varslingsplikt: (krav: Krav) => boolean
): Hjemmel | Kravpostvarselhjemmel | null {
  for (const d of dokumenter) {
    const utsagn = d.utsagn.find((x) => x.id === gjelder);
    // VS-U29: begrunnelsen etter § 33.6.2 annet ledd b kan bare komme for sent etter § 33.6.2.
    if (utsagn)
      return utsagn.art === 'varsel'
        ? utsagn.hjemmel
        : utsagn.art === 'foresporselssvar'
          ? '33.6.2'
          : null;
    const krav = d.krav.find((k) => k.id === gjelder);
    if (krav) return krav.spor === 'forhold' && varslingsplikt(krav) ? '32.2' : null;
  }
  return null;
}

/**
 * VS-U24, VS-U29: et svar i sporet gjentar eller gir opp en påberopelse etter `hjemmel`: hjemmelen
 * for sporet, og påberopelsene sporet også nevner (`ogsaaInnsigelserEtter`). Brevteksten og
 * utledningen leser det herfra (#2050).
 */
export const svaretGjelderPaaberopelsen = (
  spor: Spor,
  hjemmel: Hjemmel | Kravpostvarselhjemmel | null
): hjemmel is Hjemmel =>
  hjemmel !== null &&
  (hjemmel === HJEMMEL[spor] ||
    frysingI(spor).ogsaaInnsigelserEtter.some((h: Hjemmel) => h === hjemmel));

/**
 * Partens påberopelser i dokumentet som et senere svar fra parten gjentar eller gir opp. En
 * påberopelse i et brev lagt til er dokumentasjon (OV-U98). En påberopelse uten virkning, eller
 * mot et element uten virkning, gjentas ikke (MM-U43 punkt 9). Brevteksten og utledningen leser
 * dem herfra (#2050).
 */
export function paaberopelserIDokumentet(
  d: Pick<Dokument, 'utsagn' | 'opplysninger'>,
  utenVirkning: (id: string) => boolean
): Extract<Utsagn, { art: 'innsigelse' }>[] {
  if (erRegistrert(d.opplysninger)) return [];
  return d.utsagn.filter(
    (x): x is Extract<Utsagn, { art: 'innsigelse' }> =>
      erPaaberopelse(x) && !utenVirkning(x.id) && !utenVirkning(x.gjelder)
  );
}

/** Byggherrens siste standpunkt til varselet for en kravpost i svarene på vederlaget. */
export interface StandpunktTilVarselet {
  gjelder: string;
  hjemmel: Kravpostvarselhjemmel;
  iTide: boolean;
  /** Brevet standpunktet står i. */
  dokument: string;
}

/**
 * Byggherrens siste standpunkt til varselet etter § 34.3.3 eller § 34.4 for hver kravpost i
 * `svarene`: svarene på vederlaget med virkning, med dagen hvert ble sendt og om brevet er lagt
 * til. Svarene leses i rekkefølgen de ble sendt (VS-U77 punkt 8–12, 30 og 31, OV-U103–OV-U105).
 * `dokument` er brevet innsigelsen først ble gjort gjeldende i (punkt 6). Et standpunkt i svaret
 * på et varsel som står alene, gjelder varselet og hver kravpost i `poster` som viser til det
 * (punkt 34, VS-U79). Kommandoen og brevteksten leser dem herfra.
 */
export function sisteStandpunktTilVarslene(
  svarene: { s: Pick<Svar, 'dokument' | 'standpunkter'>; dag: string; lagtTil: boolean }[],
  poster: readonly Pick<Kravpost, 'id' | 'varsel'>[]
): StandpunktTilVarselet[] {
  const siste = new Map<string, StandpunktTilVarselet & { dag: string; lagtTil: boolean }>();
  const sendt = [...svarene].sort((a, b) => (a.dag < b.dag ? -1 : a.dag > b.dag ? 1 : 0));
  for (const { s, dag, lagtTil } of sendt)
    for (const p of s.standpunkter) {
      if (p.art !== 'rettidighet' || !erKravpostvarselhjemmel(p.hjemmel)) continue;
      const gjelder = [p.gjelder, ...poster.flatMap((x) => (x.varsel === p.gjelder ? [x.id] : []))];
      for (const g of gjelder) {
        const noekkel = `${p.hjemmel} ${g}`;
        const foer = siste.get(noekkel);
        if (foer && !foer.iTide && foer.dag === dag && (foer.lagtTil || lagtTil)) continue;
        // VS-U77 punkt 6.
        const gjentatt = foer && !foer.iTide && !p.iTide;
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
 * VS-U9, VS-U11, HF-U4: parten har gitt opp sin påberopelse i en egen innsigelse når et
 * senere svar fra parten i sporet sier at varselet kom i tide. I fristen gir hvert «i tide»
 * etter § 33.4 den opp, fordi parten er bundet av det (VS-U20, arbeidsvalget 15.10 i #309).
 * I forholdet teller partens siste standpunkt etter § 32.2, også om en annen
 * påberopelsesversjon (arbeidsvalget 15.10 i #500). `etter` er partens svar etter
 * innsigelsen, i rekkefølgen de ble sendt. Taushet gir den ikke opp. Etter § 33.6.2 har
 * saken én forespørsel (VS-U31), så standpunktet gjelder begrunnelsen innsigelsen gjelder
 * (VS-U29, HF-U4).
 */
export function innsigelsenErOppgitt(
  spor: Spor,
  etter: Pick<Svar, 'spor' | 'standpunkter'>[],
  hjemmel: Hjemmel = HJEMMEL[spor]
): boolean {
  const standpunkter = etter
    .filter((x) => x.spor === spor)
    .flatMap((x) => x.standpunkter)
    .filter(
      (p): p is Extract<Standpunkt, { art: 'rettidighet' }> =>
        p.art === 'rettidighet' && p.hjemmel === hjemmel
    );
  if (frysingI(spor).hvertITideGirOppInnsigelsen) return standpunkter.some((p) => p.iTide);
  return standpunkter.at(-1)?.iTide === true;
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
 * Sammenfallet i svaret, også med innsigelsene i svarene før (`foer`) for et varsel svaret ikke
 * sier noe om (VS-U77 punkt 9 og 12, OV-U115 punkt 25, #2316).
 */
export function sammenfallet(
  svar: Svarinnhold,
  v: Standpunktsvirkning[],
  krav: Krav | null | undefined,
  foer: readonly StandpunktFoer[]
): boolean {
  if (!godkjennerHeleKravet(svar, v)) return false;
  const taus = krav ? (frysingI(svar.spor).tausOmVarselet?.(svar, krav) ?? []) : [];
  return !taus.some((t) =>
    foer.some((x) => !x.iTide && x.gjelder === t.gjelder && x.hjemmel === t.hjemmel)
  );
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
