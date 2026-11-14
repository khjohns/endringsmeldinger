/**
 * `utled(journal, regler)`: predikatene kjernen regner av journalen (2.6 i
 * modellforslaget). Kommandoene, handlingene og visningen leser denne
 * utledningen. Den har ingen status; statusen er en etikett i visningen.
 *
 * Det er én beregning per svar, som alle leser:
 * - brevet slik det ble sendt: virkningene i beslutningsgrunnlaget (MM-U9);
 * - en eventuell enighet: en aksept av svaret, eller sammenfall i brevet. Innholdet
 *   er brevets (KA-U10 og MM-U3, opphevet av MM-U50);
 * - predikatene av relasjonene: hva svaret `gjelder`, hva det `erstatter`, om
 *   en rettidighetsvurdering gjelder det registrerte varselet (MM-U8 (opphevet av MM-U50)), og om
 *   vilkåret for enigheten er oppfylt (GR-U7).
 *
 * Regelsettet brukes ikke til å vurdere et sendt brev på nytt. Relasjonene
 * bestemmer, ikke rekkefølgen: hver referanse leses etter lesereglene i 4.2 i
 * designnotatet, og gjeldende svar er svaret på gjeldende krav som ikke er
 * erstattet. Løses en relasjon ikke entydig, eller er en hendelse
 * ukjent, er saken ikke forstått, og ingenting utledes (MM-U2, 2.7 regel 1).
 */

import {
  datoFor,
  dokumenterI,
  erRegistrert,
  kalenderdag,
  lesJournal,
  registrertDato,
  sammeSlag,
} from '../format/leser.ts';
import { harProduktivitetspost } from '../spor/vederlag/format.ts';
import { KONTROLLER_I_VEDERLAGET } from '../spor/vederlag/utledning.ts';
import { KONTROLLER_I_FRISTEN } from '../spor/frist/utledning.ts';
import type { Regelsett } from '../regler/regelsett.ts';
import type { Subsidiaergrunn } from '../regler/forhold.ts';
import { enighetsgrunnlag, sammenfallStemmer } from '../frosset/standpunkt.ts';
import { iSporet, kravetErDokumentasjon } from '../frosset/byggeklosser.ts';
import { svarPaaForesporsler, type ForesporselOgSvar } from '../spor/frist/frysing.ts';
import {
  KRAVSPOR,
  SPOR,
  VARSELSPOR,
  erKravpostvarselhjemmel,
  erVarselhjemmel,
  type Dokument,
  type Domenehendelse,
  type Enighetsgrunnlag,
  type Journalrad,
  type Krav,
  type Kravspor,
  type LestOpplysning,
  type LestUtsagn,
  type OppgittDatofelt,
  type Opplysningsslag,
  type Part,
  type Spor,
  type Standpunkt,
  type Standpunktsvirkning,
  type Svar,
  type Kravpostvarselhjemmel,
  type Varselhjemmel,
  type Vedlegg,
} from '../typer.ts';
import type { Kjerne } from '../versjon.ts';
import { grunnerFraForholdet } from '../spor/forhold/frysing.ts';
import {
  erRegistrertEndringsordre,
  forholdssvaretsVirkning,
  KONTROLLER_I_FORHOLDET,
  kontrollerEndringsordrene,
  kontrollerKorrigeringene,
  opplysningerOmDatoen,
} from '../spor/forhold/utledning.ts';

export type LestVarsel = Extract<LestUtsagn, { art: 'varsel' }>;
/** Hjemlene saken har høyst ett varsel etter (SK-12). */
export type Enkeltvarselhjemmel = Exclude<Varselhjemmel, Kravpostvarselhjemmel>;

export interface Svarberegning {
  svar: Svar;
  /** Virkningen standpunktene hadde slik brevet uttrykte dem (MM-U9). */
  virkninger: Standpunktsvirkning[];
  /**
   * Standpunktene etter § 33.4 og § 34.1.2 som gjelder et annet varsel enn det som er
   * registrert nå.
   * Svaret står med sin virkning (OV-U5), og bare visningen leser dette.
   */
  gjaldtEtAnnetVarsel: string[];
  /**
   * Designdelen i samlevedtaket for retting av sendt brev (MM-U55): TEs opplysning om datoen
   * etter VS-U26 som var TEs siste da svaret på grunnlaget ble gitt (`Datoopplysning.id`).
   * `null` i de andre sporene og når TE ikke hadde oppgitt datoen.
   */
  datoopplysning: string | null;
  /**
   * Svaret på forholdet hvis grunner brevet satte foran sporet, som frysingen regnet dem:
   * svaret på forholdet i samme dokument, ellers svaret på påberopelsesversjonen svaret ble
   * regnet mot som gjaldt før dokumentet (OV-U32, OV-U33, svaret i #1199). Et svar på
   * påberopelsen revidert etter brevet endrer ikke det brevet sa. `null` for forholdet og når
   * brevet ikke hadde noe svar på forholdet foran seg.
   */
  forholdssvaret: string | null;
}

/**
 * Punkt 10 i samlevedtaket for retting av sendt brev (MM-U55): én opplysning fra TE om datoen
 * etter VS-U26, i grunnlagskravet eller i en korrigering. En ny kravversjon som gjengir TEs
 * siste opplysning, er ikke en ny opplysning.
 */
export interface Datoopplysning {
  /** Kravet eller korrigeringen med opplysningen. */
  id: string;
  /** Dokumentet opplysningen står i. */
  dokument: string;
  felt: OppgittDatofelt;
  dato: string;
  korrigering: boolean;
}

export interface Enighet {
  grunnlag: Enighetsgrunnlag;
  /** Hendelsen som holder enighetsgrunnlaget: aksepten, eller svaret ved sammenfall. */
  holder: string;
}

export interface Sporutledning {
  krav: Krav[];
  gjeldendeKrav: Krav | null;
  svar: Svar[];
  gjeldendeSvar: Svar | null;
  /** Enigheten om gjeldende svar (2.5). Om den har virkning, avgjør `enighetHarVirkning`. */
  enighet: Enighet | null;
  /** TE har trukket kravet, eller forholdet som bærer det (GR-U5, SD-02). */
  trukket: boolean;
  /** TE har sagt at det ikke kreves noe i sporet (KA-U12). */
  ingenKrav: boolean;
  /**
   * De registrerte varslene i sporet, ett per hjemmel (SK-12): § 32.2 i forholdet (VS-U34),
   * § 33.4 i fristen, § 34.1.2 og § 34.1.3 i vederlaget (OV-U5, OV-U25).
   */
  varsler: Partial<Record<Enkeltvarselhjemmel, LestVarsel>>;
  /**
   * Varslene etter § 34.3.3 første ledd og § 34.4, sendt eller registrert, i rekkefølgen i
   * journalen. Saken kan ha flere (VS-U48, VS-U52); bare vederlaget har dem.
   */
  kravpostvarsler: LestVarsel[];
  /** § 33.6.2: forespørslene og det som svarte på dem; bare fristen. */
  foresporsler: ForesporselOgSvar[];
  /** Hvorfor hele svaret i sporet er subsidiært til forholdet; tomt for forholdet. */
  subsidiaer: Subsidiaergrunn[];
}

/** Hvem som sa et element, i hvilken hendelse, og hva elementet er (4.2). */
export interface Element {
  hendelse: string;
  part: Part;
  art: 'dokument' | 'krav' | 'svar' | 'standpunkt' | 'opplysning' | LestUtsagn['art'];
  /**
   * En innsigelse etter § 5: utsagnet, eller et standpunkt om rettidighet der parten
   * sier at varselet kom for sent (VS-U9).
   */
  innsigelse?: boolean;
  /** Et registrert dokument med et krav eller svar. */
  registrertBrev?: boolean;
}

/** Det en innsigelse kan gjelde (VS-U1). */
export const KAN_FAA_INNSIGELSE: ReadonlySet<Element['art']> = new Set([
  'krav',
  'svar',
  'varsel',
  'foresporselssvar',
]);

/** VS-U1, VS-U14: en innsigelse gjelder et varsel, krav eller svar fra motparten. */
export const kanFaaInnsigelse = (maal: Element | undefined, part: Part): boolean =>
  maal !== undefined && maal.part !== part && KAN_FAA_INNSIGELSE.has(maal.art);

/**
 * VS-U1, MP-U6: en protest gjelder en innsigelse fra motparten, påberopelsen i et
 * svar, eller et dokument fra motparten med innsigelser, og da alle innsigelsene i det.
 */
export function kanFaaProtest(id: string, part: Part, elementer: Record<string, Element>): boolean {
  const maal = elementer[id];
  return (
    maal !== undefined &&
    maal.part !== part &&
    (maal.innsigelse === true ||
      (maal.art === 'dokument' &&
        Object.values(elementer).some((e) => e.hendelse === id && e.innsigelse === true)))
  );
}

/** Et utsagn som viser til et annet element: innsigelse, protest eller påberopt passivitet. */
export interface Paaberopelse {
  id: string;
  part: Part;
  gjelder: string;
  hendelse: string;
}

export interface Bestridelse {
  part: Part;
  hva: Opplysningsslag;
  /** Hendelsen bestridelsen står i. */
  hendelse: string;
}

/**
 * OV-U4, OV-U16: et brev registrert som dokumentasjon, slik den som registrerte oppga det.
 * Appen utleder ingenting av det. `rettetAv` er rettingen etter OV-U17 eller OV-U18.
 */
export interface RegistrertBrev {
  dokument: string;
  avsender: Part;
  sendt: string;
  beskrivelse: string;
  spor: Spor[];
  dokumentasjon: Vedlegg[];
  rettetAv: string | null;
}

export interface Utledning {
  versjon: number;
  regelversjon: number;
  forstaatt: boolean;
  begrensninger: { hendelse: string; grunn: string }[];
  journal: Domenehendelse[];
  svar: Record<string, Svarberegning>;
  /** Opplysningene, med bestridelsene. */
  opplysninger: {
    opplysning: LestOpplysning;
    bestridelser: Bestridelse[];
  }[];
  /** Hvert element i saken, også de uten virkning. */
  elementer: Record<string, Element>;
  /** § 5 tredje ledd: innsigelsene (VS-U1, VS-U9, VS-U14). Uten virkning på utfallet. */
  innsigelser: Paaberopelse[];
  /** Protestene mot en innsigelse (VS-U1, MP-U6). Uten virkning på utfallet. */
  protester: Paaberopelse[];
  /** VS-U12: TEs påberopelse av byggherrens passivitet etter § 32.3 annet ledd. */
  passivitet: Paaberopelse[];
  /**
   * Punkt 10 i samlevedtaket for retting av sendt brev (MM-U55): TEs opplysninger om datoen
   * etter VS-U26, i rekkefølgen i journalen. Den siste med et felt er TEs siste opplysning om
   * den datoen, og de andre er de tidligere (designdelen). Løsningen avgjør ikke hvilken som er
   * riktig (punkt 11).
   */
  datoopplysninger: Datoopplysning[];
  /**
   * MM-U43 punkt 9: elementer i et registrert brev
   * som strider mot en enighet eller mot at saken er lukket. Brevet bevares og
   * vises, elementet har ingen virkning på utfallet, og ingenting sperres. Det er
   * appens vurdering, atskilt fra det parten sa (HF-U2, MM-U12 (opphevet av MM-U50)).
   */
  utenVirkning: { element: string; hendelse: string; grunn: string }[];
  spor: Record<Spor, Sporutledning>;
  /**
   * GR-U7: byggherren har godkjent forholdet uten virksom preklusjon etter
   * § 32.2, eller frafalt pålegget, etter brevet eller enigheten om det. Venter en ny
   * påberopelsesversjon på svar, og var det siste svaret sendt fra appen et frafall, er
   * forholdet avklart ved frafallet (GR-U23).
   */
  forholdAvklart: boolean;
  /** SK-01, #213, MM-U13: TE har godtatt et svar på påberopelsen som ikke avklarer forholdet etter GR-U7. */
  forholdAvvist: boolean;
  /**
   * GR-U3, GR-U9: byggherren har frafalt pålegget (§ 32.3 c). Er ikke en enighet. Gjelder
   * også mens en ny påberopelsesversjon venter på svar etter et frafall (GR-U23).
   */
  frafalt: boolean;
  /**
   * Om byggherren har godkjent forholdet i et svar som er en endringsordre etter
   * § 32.3 første ledd a med § 31.3 (GR-U10, GR-U12, GR-U13): godkjent uten påberopt
   * preklusjon i en kategori § 32.2 gjaldt for, i et brev sendt fra appen. Det gjelder
   * også når svaret er erstattet eller kravet har fått en ny versjon (EO-U12). En
   * registrert endringsordre etter OV-U6 er `nei`: opplysningen fra byggherren
   * vises, men gir ingen egen virkning i appen.
   */
  endringsordre: 'ja' | 'nei';
  /**
   * OV-U4, OV-U16: brevene registrert som dokumentasjon, også når saken ikke er forstått.
   * Ingen regel leser dem; visningen viser dem.
   */
  registrerteBrev: RegistrertBrev[];
  /** OV-U19, OV-U21: de registrerte brevene appen ikke vurderer innholdet i. Leses av visningen. */
  ikkeVurderteBrev: string[];
}

const tomtSpor = (): Sporutledning => ({
  krav: [],
  gjeldendeKrav: null,
  svar: [],
  gjeldendeSvar: null,
  enighet: null,
  trukket: false,
  ingenKrav: false,
  varsler: {},
  kravpostvarsler: [],
  foresporsler: [],
  subsidiaer: [],
});

const tommeSpor = (): Record<Spor, Sporutledning> => ({
  forhold: tomtSpor(),
  vederlag: tomtSpor(),
  frist: tomtSpor(),
});

function tom(
  journal: Domenehendelse[],
  regler: Regelsett,
  begrensninger: Utledning['begrensninger']
): Utledning {
  return {
    versjon: journal.at(-1)?.versjon ?? 0,
    regelversjon: regler.versjon,
    forstaatt: false,
    begrensninger,
    journal,
    svar: {},
    opplysninger: [],
    elementer: {},
    innsigelser: [],
    protester: [],
    passivitet: [],
    datoopplysninger: [],
    utenVirkning: [],
    spor: tommeSpor(),
    forholdAvklart: false,
    forholdAvvist: false,
    frafalt: false,
    endringsordre: 'nei',
    registrerteBrev: registreringer(journal).brev,
    ikkeVurderteBrev: [],
  };
}

/**
 * OV-U44: kilden til det en journalpost sier. Et brev sendt herfra er `sendt_herfra`. Et
 * registrert brev er `partens_opplysning` når det har elementer og alle har virkning etter
 * OV-U5 og OV-U6, ellers `dokumentasjon` (OV-U4, HF-U13). Mens saken ikke er forstått, er
 * hvert registrert brev dokumentasjon (MM-U2, OV-U21). En rettet registrering beholder
 * kilden (arbeidsvalget 30.10 i #1045, svar 2A). Rettingen som sier at et brev ikke hører
 * til saken, gjelder dokumentasjonen og er dokumentasjon selv (OV-U18).
 */
export type Kilde = 'dokumentasjon' | 'partens_opplysning' | 'sendt_herfra';

export function kilden(d: Dokument, forstaatt: boolean): Kilde {
  if (d.ikkeISaken) return 'dokumentasjon';
  if (!erRegistrert(d.opplysninger)) return 'sendt_herfra';
  const elementer = d.krav.length + d.svar.length + d.utsagn.length;
  return forstaatt && elementer > 0 && dokumentasjonIBrevet(d).size === 0
    ? 'partens_opplysning'
    : 'dokumentasjon';
}

/**
 * OV-U19, HF-U13: de registrerte brevene som ikke er rettet (OV-U17, OV-U18), og som kjernen
 * ikke vurderer innholdet i: kilden er dokumentasjon. Et varsel eller en endringsordre uten
 * virkning vurderer kjernen (MM-U43 punkt 9).
 */
function ikkeVurderte(
  journal: Domenehendelse[],
  brev: RegistrertBrev[],
  forstaatt: boolean
): string[] {
  const rettet = new Set(brev.filter((b) => b.rettetAv !== null).map((b) => b.dokument));
  return [...dokumenterI(journal)]
    .filter((d) => erRegistrert(d.opplysninger) && !rettet.has(d.id))
    .filter((d) => kilden(d, forstaatt) === 'dokumentasjon')
    .map((d) => d.id);
}

/**
 * OV-U17, OV-U18: brevene registrert som dokumentasjon, og rettingene av dem. En retting
 * viser til en registrering tidligere i saken, fra samme side, som ikke alt er rettet;
 * en retting av en retting retter den siste i kjeden. Originalen står (#276 punkt 12).
 */
function registreringer(journal: Domenehendelse[]): {
  brev: RegistrertBrev[];
  feil: Utledning['begrensninger'];
} {
  const brev: RegistrertBrev[] = [];
  const feil: Utledning['begrensninger'] = [];
  for (const d of dokumenterI(journal)) {
    if (d.retter !== null) {
      const rettet = brev.find((b) => b.dokument === d.retter);
      if (!rettet || rettet.avsender !== d.avsender || rettet.rettetAv !== null) {
        feil.push({
          hendelse: d.id,
          grunn: 'rettingen viser ikke til en gjeldende registrering fra samme side (OV-U17)',
        });
        continue;
      }
      rettet.rettetAv = d.id;
    }
    const sendt = d.opplysninger[0];
    if (d.beskrivelse !== null && sendt?.hva === 'sendt')
      brev.push({
        dokument: d.id,
        avsender: d.avsender,
        sendt: sendt.dato,
        beskrivelse: d.beskrivelse,
        spor: d.spor,
        dokumentasjon: d.dokumentasjon,
        rettetAv: null,
      });
  }
  return { brev, feil };
}

/** Svarene på kravet som ikke er erstattet. Flere enn ett er en tvetydig relasjon. */
function ikkeErstattet(svar: Svar[], kravId: string): Svar[] {
  const paaKravet = svar.filter((s) => s.gjelder === kravId);
  const erstattet = new Set(paaKravet.map((s) => s.erstatter).filter((e) => e !== null));
  return paaKravet.filter((s) => !erstattet.has(s.id));
}

/** Elementene i et dokument som kan endre utfallet (KA-U11). Andre utsagn har ingen virkning på det. */
const ENDRER_UTFALLET = new Set<string>(['aksept', 'trekk', 'ingen_krav', 'varsel']);

/**
 * Dokumentet kan stride mot journalen før det: det har et krav, et svar eller et utsagn
 * som kan endre utfallet. Andre utsagn utleder ikke prefikset på nytt (#400).
 */
const kanStride = (d: Dokument): boolean =>
  d.krav.length > 0 || d.svar.length > 0 || d.utsagn.some((x) => ENDRER_UTFALLET.has(x.art));

interface Strid {
  element: string;
  grunn: string;
}

/**
 * OV-U4, HF-U13: alt i et registrert brev er dokumentasjon og får ingen virkning, unntatt et
 * varsel med datoen parten oppgir (OV-U5) og byggherrens endringsordre (OV-U6). Kilden og
 * brevene kjernen ikke vurderer, leser regelen fra denne funksjonen (punkt 4 i #1167).
 */
function dokumentasjonIBrevet(d: Dokument): Set<string> {
  const krav = kravetErDokumentasjon(d) ? d.krav.map((k) => k.id) : [];
  if (!erRegistrert(d.opplysninger)) return new Set(krav);
  return new Set([
    ...krav,
    ...d.svar.filter((s) => !erRegistrertEndringsordre(s, d)).map((s) => s.id),
    ...d.utsagn.filter((x) => x.art !== 'varsel').map((x) => x.id),
  ]);
}

/**
 * MM-U43 punkt 6: elementene i dokumentet som ikke kan forstås i samsvar med journalen før
 * det og vedtakene om enighet og lukking: en ny kravversjon i et trukket spor eller et spor
 * med «ingen krav» (GR-U5, KA-U12), et svar eller en aksept i et trukket spor,
 * en aksept av et frafall (GR-U9) eller av et svar med registrert enighet
 * (GR-U8), noe som endrer utfallet etter at TE har godtatt et svar som avslår forholdet
 * eller påberoper preklusjon (GR-U27), og det som viser til et element uten virkning.
 * Kontrollen gjelder bare disse vedtakene, ikke vilkårene for å sende, så en strengere
 * forutsetning senere gjør ikke et eldre brev uforstått.
 */
function strid(d: Dokument, u: Utledning, uten: Map<string, unknown>): Strid[] {
  // Et krav havner aldri i `uten`: kravene i et registrert brev er dokumentasjon (OV-U4),
  // og en strid utenfor et registrert brev stopper utledningen. Bare svar og utsagn
  // kontrolleres derfor mot `uten` (#669).
  const utenVirkning = (id: string | null) => id !== null && uten.has(id);
  const med = (element: string, grunn: string | null): Strid[] =>
    grunn ? [{ element, grunn }] : [];
  return [
    ...d.krav.flatMap((k) => med(k.id, kravetStrider(k, u))),
    ...d.svar.flatMap((s) => med(s.id, svaretStrider(s, u, utenVirkning))),
    ...d.utsagn.flatMap((x) => med(x.id, utsagnetStrider(x, u, utenVirkning))),
  ];
}

/** Hvorfor det som kan endre utfallet, avvises: saken er lukket etter GR-U27. */
const lukket = (u: Utledning): string | null =>
  u.forholdAvvist
    ? 'TE har godtatt svaret på grunnlaget, som avslår det eller påberoper preklusjon (GR-U27)'
    : null;

/** Hvorfor kravversjonen strider mot journalen før den, eller `null`. */
function kravetStrider(k: Krav, u: Utledning): string | null {
  const l = lukket(u);
  if (l) return `en kravversjon etter at ${l}`;
  if (u.spor[k.spor].trukket) return 'en kravversjon etter at kravet er trukket (GR-U5)';
  if (u.spor[k.spor].ingenKrav) return 'en kravversjon i et spor med «ingen krav» (KA-U12)';
  const poster = kontrollerI(k.spor).kravet(k, u.spor[k.spor].krav);
  return poster ? `en kravversjon som ${poster}` : null;
}

/** Hvorfor svaret strider mot journalen før det, eller `null`. */
function svaretStrider(
  s: Svar,
  u: Utledning,
  utenVirkning: (id: string | null) => boolean
): string | null {
  const l = lukket(u);
  if (l) return `et svar etter at ${l}`;
  if (utenVirkning(s.erstatter)) return 'svaret viser til et element uten virkning';
  if (u.spor[s.spor].trukket) return 'et svar på et krav etter at det er trukket (MM-U43, GR-U5)';
  return null;
}

/** Hvorfor utsagnet strider mot journalen før det, eller `null`. */
function utsagnetStrider(
  x: LestUtsagn,
  u: Utledning,
  utenVirkning: (id: string | null) => boolean
): string | null {
  if (!ENDRER_UTFALLET.has(x.art)) return null;
  const gjelder = 'gjelder' in x ? x.gjelder : null;
  /** Sporet med svaret en aksept gjelder. */
  const sporet =
    x.art === 'aksept'
      ? SPOR.find((n) => u.spor[n].svar.some((s) => s.id === x.gjelder))
      : undefined;
  const l = lukket(u);
  if (l) return `${x.art} etter at ${l}`;
  if (utenVirkning(gjelder)) return `${x.art} viser til et element uten virkning`;
  if (sporet && u.spor[sporet].trukket)
    return 'en aksept av et svar i et spor etter at kravet er trukket (MM-U43, GR-U5)';
  if (x.art === 'aksept' && x.gjelder === u.spor.forhold.gjeldendeSvar?.id && u.frafalt)
    return 'en aksept av et frafall (GR-U9)';
  if (sporet && u.spor[sporet].enighet && u.spor[sporet].gjeldendeSvar?.id === gjelder)
    return 'en aksept av et svar med registrert enighet (GR-U8)';
  return null;
}

/**
 * Utledningen av journalen. Hvert dokument kontrolleres mot journalen før det
 * (MM-U43 punkt 6 og 9, `strid`): en strid i en hendelse som ikke er et registrert brev, gjør
 * saken ikke forstått, og i et registrert brev får elementet ingen virkning.
 */
export function utled(journal: Domenehendelse[], regler: Regelsett): Utledning {
  const uten = new Map<string, { hendelse: string; grunn: string }>();
  const konflikter: Utledning['begrensninger'] = [];
  const dokumenter: Dokument[] = [];
  for (const [i, h] of journal.entries()) {
    if (h.art !== 'dokument') continue;
    const kan = kanStride(h.dokument);
    dokumenter.push(h.dokument);
    if (!kan) continue;
    // Kontrollen trenger saken slik den var før dokumentet, så prefikset utledes for
    // hvert dokument som kan endre utfallet. Kostnaden er målt i #400.
    const foer = utledSporene(journal.slice(0, i), regler, uten);
    if (!foer.forstaatt) break;
    const registrert = erRegistrert(h.dokument.opplysninger);
    const dokumentasjon = dokumentasjonIBrevet(h.dokument);
    const stridene = strid(h.dokument, foer, uten);
    for (const x of stridene) {
      if (!registrert) konflikter.push({ hendelse: h.id, grunn: x.grunn });
      else if (!dokumentasjon.has(x.element))
        uten.set(x.element, { hendelse: h.id, grunn: x.grunn });
    }
    if (konflikter.length) break;
  }
  const u = utledSporene(journal, regler, uten);
  const ut = konflikter.length ? tom(journal, regler, [...u.begrensninger, ...konflikter]) : u;
  ut.ikkeVurderteBrev = ikkeVurderte(journal, ut.registrerteBrev, ut.forstaatt);
  return ut;
}

export type Utsagn<A extends LestUtsagn['art']> = Extract<LestUtsagn, { art: A }>;
export type Henvisning = Utsagn<
  'innsigelse' | 'protest' | 'passivitet' | 'begrunnelse' | 'foresporselssvar'
>;
/** Fører en begrensning for elementet `id` etter lesereglene i 4.2. */
export type Ugyldig = (id: string, grunn: string) => void;
/** `fra` viser til `til` med lavere saksversjon. */
export type Bakover = (fra: string, til: string) => boolean;

/**
 * Lesereglene i 4.2 som er sporets egne, og det utledningen ellers leser av sporet. Hver
 * leseregel gir en begrensning med `ugyldig`, eller `null` for kravversjonen.
 */
export interface Sporskontroller {
  /** Hvorfor kravversjonen `k` strider mot de tidligere versjonene i sporet, etter «som». */
  kravet(k: Krav, tidligere: readonly Krav[]): string | null;
  /** Kravversjonene i sporet mot varslene og dokumentene de står i. */
  kravene(
    krav: readonly Krav[],
    varsler: readonly LestVarsel[],
    bakover: Bakover,
    dokumentetTil: (id: string) => Dokument | undefined,
    ugyldig: Ugyldig
  ): void;
  /** Svaret `s` mot kravversjonen det gjelder. */
  svaret(s: Svar, krav: Krav, ugyldig: Ugyldig): void;
  /** En passivitet kan gjelde et krav i sporet (`kanGjelde`). */
  kanFaaPassivitet: boolean;
  /** Svaret leser TEs opplysning om datoen (`Svarberegning.datoopplysning`). */
  leserDatoen: boolean;
  /** TE kan godta byggherrens gjeldende svar i sporet (`svarIkkeGodtatt`). */
  svaretKanGodtas(u: Utledning): boolean;
  /** Lesereglene i 4.2 for utsagnene i saken som er sporets egne, som forespørselen i fristen. */
  saken(s: Saksutsagn, bakover: Bakover, ugyldig: Ugyldig): void;
}

/** Utsagnene i saken en kontroll i sporet (`Sporskontroller.saken`) kan lese. */
export interface Saksutsagn {
  /** Dokumentet i hver hendelse i journalen, i rekkefølge. */
  dokumenter: readonly Dokument[];
  foresporsler: readonly Utsagn<'foresporsel'>[];
  henvisninger: readonly Henvisning[];
  elementer: Record<string, Element>;
  /** Hvert krav i saken, også de uten virkning (MM-U43 punkt 9). */
  kravMedUten: ReadonlyMap<string, Krav>;
  besvart: readonly ForesporselOgSvar[];
}

/** Kontrollene i hvert spor. */
const KONTROLLER: Record<Spor, Sporskontroller> = {
  forhold: KONTROLLER_I_FORHOLDET,
  vederlag: KONTROLLER_I_VEDERLAGET,
  frist: KONTROLLER_I_FRISTEN,
};

/** Kontrollene i sporet (`iSporet`). */
const kontrollerI = (spor: Spor): Sporskontroller => iSporet(KONTROLLER, spor);

/** Utledningen av journalen i lagret form, lest med kjernens leserformat og regelsett. */
export function utledJournal(journal: Journalrad[], kjerne: Kjerne): Utledning {
  return utled(lesJournal(journal, kjerne.leserformat), kjerne.regler);
}

/**
 * Utledningen med elementene i `uten` og dokumentasjonen i registrerte brev uten virkning:
 * de plasseres, men leses ikke inn i sporene.
 */
function utledSporene(
  journal: Domenehendelse[],
  regler: Regelsett,
  uten: Map<string, { hendelse: string; grunn: string }>
): Utledning {
  const begrensninger: Utledning['begrensninger'] = [];
  const spor = tommeSpor();
  /** Hendelsen og saksversjonen hvert element står i. */
  const plass = new Map<string, { hendelse: string; versjon: number }>();
  const elementer: Record<string, Element> = {};
  const aksepter: Utsagn<'aksept'>[] = [];
  const trekk: Utsagn<'trekk'>[] = [];
  const bestridelser: Utsagn<'bestridelse'>[] = [];
  const ingenKrav: Utsagn<'ingen_krav'>[] = [];
  const varsler: LestVarsel[] = [];
  const henvisninger: Henvisning[] = [];
  const foresporsler: Utsagn<'foresporsel'>[] = [];
  const korrigeringer: Utsagn<'korrigering'>[] = [];
  const opplysninger: LestOpplysning[] = [];
  /** Hvert krav i saken, også de uten virkning (MM-U43 punkt 9). */
  const kravMedUten = new Map<string, Krav>();
  const dobbelt = new Set<string>();
  const plasser = (id: string, h: { id: string; versjon: number }) => {
    if (plass.has(id)) dobbelt.add(id);
    plass.set(id, { hendelse: h.id, versjon: h.versjon });
  };
  const registrer = (id: string, h: { id: string }, part: Part, art: Element['art']) =>
    (elementer[id] = { hendelse: h.id, part, art });

  /** Legger utsagnet med virkning i lista for arten. */
  const sorter = (u: LestUtsagn) => {
    switch (u.art) {
      case 'aksept':
        return aksepter.push(u);
      case 'trekk':
        return trekk.push(u);
      case 'bestridelse':
        return bestridelser.push(u);
      case 'ingen_krav':
        return ingenKrav.push(u);
      case 'varsel':
        return varsler.push(u);
      case 'foresporsel':
        return foresporsler.push(u);
      case 'korrigering':
        return korrigeringer.push(u);
      default:
        return henvisninger.push(u);
    }
  };

  /** Plasserer elementene i dokumentet, og leser dem med virkning inn i sporene etter arten. */
  const lesDokumentet = (h: Extract<Domenehendelse, { art: 'dokument' }>) => {
    const d = h.dokument;
    const dokumentasjon = dokumentasjonIBrevet(d);
    const harVirkning = (id: string) => !uten.has(id) && !dokumentasjon.has(id);
    registrer(h.id, h, d.avsender, 'dokument');
    if (erRegistrert(d.opplysninger) && (d.krav.length || d.svar.length))
      elementer[h.id].registrertBrev = true;
    for (const k of d.krav) {
      plasser(k.id, h);
      registrer(k.id, h, d.avsender, 'krav');
      kravMedUten.set(k.id, k);
      if (harVirkning(k.id)) spor[k.spor].krav.push(k);
    }
    for (const s of d.svar) {
      plasser(s.id, h);
      registrer(s.id, h, d.avsender, 'svar');
      for (const p of s.standpunkter) {
        plasser(p.id, h);
        registrer(p.id, h, d.avsender, 'standpunkt');
        if (p.art === 'rettidighet' && !p.iTide) elementer[p.id].innsigelse = true;
      }
      if (harVirkning(s.id)) spor[s.spor].svar.push(s);
    }
    for (const u of d.utsagn) {
      plasser(u.id, h);
      registrer(u.id, h, d.avsender, u.art);
      if (u.art === 'innsigelse') elementer[u.id].innsigelse = true;
      if (harVirkning(u.id)) sorter(u);
    }
    for (const o of d.opplysninger) {
      plasser(o.id, h);
      registrer(o.id, h, d.avsender, 'opplysning');
    }
    opplysninger.push(...d.opplysninger);
  };

  for (const h of journal) {
    if (h.art === 'ukjent') {
      begrensninger.push({ hendelse: h.id, grunn: h.grunn });
      continue;
    }
    plasser(h.id, h);
    if (h.art !== 'sak') lesDokumentet(h);
  }

  // Lesereglene i 4.2: hver referanse finnes i saken, har riktig art og spor, og
  // peker på en rad med lavere saksversjon. Ingen referanse løses etter plassen i
  // journalen.
  const alleSvar = new Map(SPOR.flatMap((n) => spor[n].svar).map((s) => [s.id, s]));
  const alleKrav = new Map(SPOR.flatMap((n) => spor[n].krav).map((k) => [k.id, k]));
  const alleOpplysninger = new Map(opplysninger.map((o) => [o.id, o]));
  const ugyldig: Ugyldig = (id, grunn) =>
    begrensninger.push({ hendelse: plass.get(id)?.hendelse ?? id, grunn });
  const bakover: Bakover = (fra, til) =>
    (plass.get(til)?.versjon ?? Infinity) < (plass.get(fra)?.versjon ?? -Infinity);
  for (const id of dobbelt) ugyldig(id, 'to elementer i saken har samme ID');
  const dokumenter = new Map(
    journal.flatMap((h) => (h.art === 'dokument' ? [[h.id, h.dokument] as const] : []))
  );
  // VS-U17, VS-U19: hver forespørsel og det som svarte på den.
  const besvart = svarPaaForesporsler(dokumenter.values());
  /** Avsenderen av dokumentet elementet står i. */
  const avsenderAv = (id: string): Part | undefined =>
    dokumenter.get(plass.get(id)?.hendelse ?? '')?.avsender;

  kontrollerKravkjedene(spor, ugyldig);
  for (const n of SPOR)
    kontrollerI(n).kravene(
      spor[n].krav,
      varsler,
      bakover,
      (id) => dokumenter.get(plass.get(id)?.hendelse ?? ''),
      ugyldig
    );
  // Lesingen kaster ikke for en dato den ikke kan lese; uten dato gjelder det egne varselet.
  const dokumentet = new Map([...dokumenter.values()].map((d) => [d.id, d]));
  const sendt = (v: Pick<Krav, 'id' | 'dokument'>): string | null => {
    const d = dokumentet.get(v.dokument);
    if (!d) return null;
    const oppgitt = datoFor(v, 'sendt', d.opplysninger);
    return kalenderdag(oppgitt ? oppgitt.dato : d.registrert);
  };
  kontrollerSvarene(alleSvar, alleKrav, spor, varsler, besvart, bakover, sendt, ugyldig);
  kontrollerSvarkjedene(spor, ugyldig);
  kontrollerAksepter(aksepter, alleSvar, bakover, ugyldig);
  kontrollerTrekk(trekk, alleKrav, spor, bakover, ugyldig);
  kontrollerEndringsordrene(opplysninger, dokumenter, ugyldig);
  kontrollerHenvisningene(henvisninger, elementer, kravMedUten, besvart, bakover, ugyldig);
  const saken: Saksutsagn = {
    dokumenter: journal.flatMap((h) => (h.art === 'dokument' ? [h.dokument] : [])),
    foresporsler,
    henvisninger,
    elementer,
    kravMedUten,
    besvart,
  };
  for (const n of SPOR) kontrollerI(n).saken(saken, bakover, ugyldig);
  kontrollerBestridelsene(bestridelser, alleOpplysninger, avsenderAv, bakover, ugyldig);
  kontrollerIngenKrav(ingenKrav, spor, bakover, ugyldig);
  kontrollerVarslene(varsler, ugyldig);
  kontrollerKorrigeringene(korrigeringer, kravMedUten, elementer, bakover, ugyldig);

  begrensninger.push(...registreringer(journal).feil);
  if (begrensninger.length) return tom(journal, regler, begrensninger);

  fyllSporene(spor, varsler, besvart, trekk, ingenKrav, alleKrav);
  const datoopplysninger = opplysningerOmDatoen(journal, spor.forhold.krav, korrigeringer);
  const svar = svarberegninger(alleSvar, spor);
  settDatoopplysningene(svar, datoopplysninger, (id) => plass.get(id)!.versjon);
  settForholdssvarene(svar, spor.forhold.svar, (id) => plass.get(id)!.versjon);
  settEnighetene(spor, aksepter, (id) => plass.get(id)!.hendelse);
  settSubsidiaer(spor, svar);
  return {
    ...tom(journal, regler, begrensninger),
    forstaatt: true,
    svar,
    elementer,
    innsigelser: paaberopelser(henvisninger, elementer, 'innsigelse'),
    protester: paaberopelser(henvisninger, elementer, 'protest'),
    passivitet: paaberopelser(henvisninger, elementer, 'passivitet'),
    datoopplysninger,
    utenVirkning: [...uten].map(([element, x]) => ({ element, ...x })),
    opplysninger: opplysninger.map((o) => ({
      opplysning: o,
      bestridelser: bestridelser
        .filter((b) => b.gjelder === o.id)
        .map((b) => ({
          part: avsenderAv(b.id)!,
          hva: b.hva,
          hendelse: plass.get(b.id)!.hendelse,
        })),
    })),
    spor,
    ...forholdssvaretsVirkning(spor, elementer, svar, dokumenter),
  };
}

/**
 * Kravversjonene i hvert spor er én kjede: den første erstatter ingenting, og hver
 * neste erstatter den forrige (KA-U2).
 */
function kontrollerKravkjedene(spor: Record<Spor, Sporutledning>, ugyldig: Ugyldig): void {
  for (const n of SPOR) {
    spor[n].krav.forEach((k, i) => {
      const forrige = spor[n].krav[i - 1]?.id ?? null;
      if (k.erstatter !== forrige)
        ugyldig(k.id, 'kravversjonene i sporet er ikke én kjede der hver erstatter den forrige');
    });
  }
}

/** Hvert svar viser bakover til kravet, svaret det reviderer og påberopelsesversjonen. */
function kontrollerSvarene(
  alleSvar: Map<string, Svar>,
  alleKrav: Map<string, Krav>,
  spor: Record<Spor, Sporutledning>,
  varsler: readonly LestVarsel[],
  besvart: readonly ForesporselOgSvar[],
  bakover: Bakover,
  sendt: (v: Pick<Krav, 'id' | 'dokument'>) => string | null,
  ugyldig: Ugyldig
): void {
  for (const s of alleSvar.values()) {
    if (alleKrav.get(s.gjelder)?.spor !== s.spor || !bakover(s.id, s.gjelder))
      ugyldig(s.id, 'svaret viser til et krav som ikke står før det i sporet');
    if (s.erstatter !== null) {
      const forrige = alleSvar.get(s.erstatter);
      if (!forrige || forrige.gjelder !== s.gjelder || !bakover(s.id, s.erstatter))
        ugyldig(s.id, 'revisjonen erstatter et svar som ikke står før den på samme krav');
    }
    // #342, HF-U1: et svar på vederlag eller frist viser til påberopelsesversjonen det ble regnet mot.
    if (
      (s.spor === 'forhold') !== (s.paaberopelse === null) ||
      (s.paaberopelse !== null &&
        (alleKrav.get(s.paaberopelse)?.spor !== 'forhold' || !bakover(s.id, s.paaberopelse)))
    )
      ugyldig(s.id, 'svaret viser ikke til en grunnlagsversjon før det');
    // MM-U43 punkt 8: sammenfallet er appens vurdering av samme brev og må stemme med standpunktene.
    if (!sammenfallStemmer(s))
      ugyldig(
        s.id,
        'sammenfallet stemmer ikke med standpunktene i brevet (GR-U10, MM-U18 (opphevet av MM-U43))'
      );
    for (const p of s.standpunkter)
      kontrollerStandpunktet(s, p, spor, varsler, besvart, bakover, sendt, ugyldig);
    const krav = alleKrav.get(s.gjelder);
    if (krav?.spor === s.spor) kontrollerI(s.spor).svaret(s, krav, ugyldig);
  }
}

/** Spesifiseringen og rettidigheten i svaret `s` viser til det de kan gjelde. */
function kontrollerStandpunktet(
  s: Svar,
  p: Standpunkt,
  spor: Record<Spor, Sporutledning>,
  varsler: readonly LestVarsel[],
  besvart: readonly ForesporselOgSvar[],
  bakover: Bakover,
  sendt: (v: Pick<Krav, 'id' | 'dokument'>) => string | null,
  ugyldig: Ugyldig
): void {
  // HF-U1, VS-U4: spesifiseringen gjelder kravversjonen svaret gjelder.
  if (p.art === 'spesifisering' && p.gjelder !== s.gjelder)
    ugyldig(s.id, 'spesifiseringen viser ikke til kravet svaret gjelder');
  if (p.art !== 'rettidighet') return;
  // VS-U17, VS-U29: rettidigheten av svaret på en forespørsel gjelder kravet eller begrunnelsen som svarte.
  if (p.hjemmel === '33.6.2') {
    if (!besvart.some((f) => f.svar === p.gjelder) || !bakover(s.id, p.gjelder))
      ugyldig(
        s.id,
        'påberopelsen etter § 33.6.2 viser ikke til et svar på en forespørsel før svaret'
      );
    return;
  }
  // VS-U43 punkt 6 og 10: påberopelsen gjelder varselet `varseletFoerSvaret` gir, og en senere
  // versjon er ikke et nytt varsel. Et svar sendt før VS-U70 viser til det egne varselet,
  // og står med det (MM-U50). Etter § 34.3.3 og § 34.4 gjelder den kravposten (`kontrollerPostene`).
  if (erVarselhjemmel(p.hjemmel) && !erKravpostvarselhjemmel(p.hjemmel)) {
    const n = VARSELSPOR[p.hjemmel];
    const varslene = varsler.filter((v) => v.hjemmel === p.hjemmel);
    const krav = kravSomVarsler(p.hjemmel, spor[n].krav);
    const foer = (v: string) => bakover(s.id, v);
    const tidligste = varseletFoerSvaret(p.hjemmel, varslene, krav, foer, sendt);
    const egetFoerst = varseletFoerSvaret(p.hjemmel, varslene, krav, foer, () => null);
    if (p.gjelder !== tidligste && p.gjelder !== egetFoerst)
      ugyldig(
        s.id,
        `påberopelsen etter § ${p.hjemmel} viser til ${p.gjelder}, men varselet før svaret er ${tidligste ?? 'ikke i saken'}`
      );
  }
}

/**
 * Svarene på én kravversjon er én kjede: ett første svar, og hver revisjon
 * erstatter det forrige. To første svar eller en forgrening gjør det tvetydig
 * hvilket svar som gjelder.
 */
function kontrollerSvarkjedene(spor: Record<Spor, Sporutledning>, ugyldig: Ugyldig): void {
  for (const n of SPOR) {
    for (const k of spor[n].krav) {
      const paaKravet = spor[n].svar.filter((s) => s.gjelder === k.id);
      if (!paaKravet.length) continue;
      const foerste = paaKravet.filter((s) => s.erstatter === null);
      const kjede = new Set<string>();
      let neste: Svar[] = foerste.length === 1 ? foerste : [];
      while (neste.length === 1 && !kjede.has(neste[0].id)) {
        kjede.add(neste[0].id);
        const forrige = neste[0].id;
        neste = paaKravet.filter((s) => s.erstatter === forrige);
      }
      if (neste.length > 0 || kjede.size !== paaKravet.length)
        ugyldig(
          paaKravet.at(-1)!.id,
          'svarene på kravversjonen er ikke én kjede der hver revisjon erstatter det forrige'
        );
    }
  }
}

function kontrollerAksepter(
  aksepter: readonly Utsagn<'aksept'>[],
  alleSvar: Map<string, Svar>,
  bakover: Bakover,
  ugyldig: Ugyldig
): void {
  for (const a of aksepter) {
    if (!alleSvar.has(a.gjelder) || !bakover(a.id, a.gjelder))
      ugyldig(a.id, 'aksepten viser til et svar som ikke står før den');
    // GR-U8: et svar som godkjenner hele kravet, kan ikke godtas, og to aksepter av samme
    // svar er tvetydige.
    else if (alleSvar.get(a.gjelder)!.beslutningsgrunnlag.sammenfall)
      ugyldig(a.id, 'aksepten gjelder et svar partene alt er enige om ved sammenfall');
    else if (aksepter.filter((x) => x.gjelder === a.gjelder).length > 1)
      ugyldig(a.id, 'svaret er godtatt to ganger');
  }
}

/** Trekket gjelder sporets gjeldende kravversjon da det ble registrert. */
function kontrollerTrekk(
  trekk: readonly Utsagn<'trekk'>[],
  alleKrav: Map<string, Krav>,
  spor: Record<Spor, Sporutledning>,
  bakover: Bakover,
  ugyldig: Ugyldig
): void {
  for (const t of trekk) {
    const k = alleKrav.get(t.gjelder);
    const gjeldende = k && spor[k.spor].krav.filter((x) => bakover(t.id, x.id)).at(-1);
    if (!k || gjeldende?.id !== k.id)
      ugyldig(t.id, 'trekket viser ikke til gjeldende kravversjon i sporet');
  }
}

/**
 * § 5 og VS-U12: hvert utsagn som viser til et annet, viser bakover til noe det kan
 * gjelde. Innsigelsen og protesten gjelder motparten (VS-U1, VS-U14, MP-U6).
 * Et element uten virkning er bevart og vist (MM-U43 punkt 9), så et utsagn kan vise til det,
 * med samme krav til art og part.
 */
function kontrollerHenvisningene(
  henvisninger: readonly Henvisning[],
  elementer: Record<string, Element>,
  kravMedUten: Map<string, Krav>,
  besvart: readonly ForesporselOgSvar[],
  bakover: Bakover,
  ugyldig: Ugyldig
): void {
  for (const x of henvisninger) {
    const maal = elementer[x.gjelder];
    if (
      !maal ||
      !bakover(x.id, x.gjelder) ||
      !kanGjelde(x.art, maal, elementer[x.id].part, x.gjelder, elementer, kravMedUten)
    )
      ugyldig(x.id, `${x.art} viser ikke til noe den kan gjelde før den`);
    // VS-U29: standpunktet om at et svar ikke er et svar etter § 33.6.2 annet ledd gjelder begrunnelsen.
    else if (x.art === 'innsigelse' && x.grunn !== undefined && maal.art !== 'foresporselssvar')
      ugyldig(
        x.id,
        'innsigelsen om at noe ikke er et svar etter § 33.6.2, gjelder ikke en begrunnelse'
      );
    // KA-U1: én begrunnelse per forespørsel, og ikke etter at et krav har svart.
    else if (x.art === 'foresporselssvar' && !besvart.some((f) => f.svar === x.id))
      ugyldig(x.id, 'begrunnelsen svarer på en forespørsel som alt er besvart');
  }
}

/** Det utsagnet kan gjelde, etter arten. */
function kanGjelde(
  art: Henvisning['art'],
  maal: Element,
  part: Part,
  id: string,
  elementer: Record<string, Element>,
  kravMedUten: Map<string, Krav>
) {
  switch (art) {
    case 'innsigelse':
      return kanFaaInnsigelse(maal, part);
    case 'protest':
      return kanFaaProtest(id, part, elementer);
    case 'passivitet': {
      const krav = kravMedUten.get(id);
      return maal.art === 'krav' && krav !== undefined && kontrollerI(krav.spor).kanFaaPassivitet;
    }
    case 'begrunnelse':
      // KA-U34: et svar. Begrunnelsen og svaret er begge fra BH (format/leser.ts).
      return maal.art === 'svar';
    case 'foresporselssvar':
      // VS-U27: en forespørsel fra appen. Forespørselen er fra BH og svaret fra TE (format/leser.ts).
      return maal.art === 'foresporsel';
  }
}

function kontrollerBestridelsene(
  bestridelser: readonly Utsagn<'bestridelse'>[],
  alleOpplysninger: Map<string, LestOpplysning>,
  avsenderAv: (id: string) => Part | undefined,
  bakover: Bakover,
  ugyldig: Ugyldig
): void {
  for (const b of bestridelser) {
    const o = alleOpplysninger.get(b.gjelder);
    if (
      !o ||
      !bakover(b.id, b.gjelder) ||
      avsenderAv(b.id) === undefined ||
      o.oppgittAv === avsenderAv(b.id) ||
      !sammeSlag(o.hva, b.hva)
    )
      ugyldig(
        b.id,
        'bestridelsen viser ikke til en opplysning av samme slag fra motparten før den'
      );
  }
}

/**
 * KA-U12: «ingen krav» står i et spor uten kravversjon, og bare én gang.
 * KA-U15: forholdet må være sendt, som for et krav.
 */
function kontrollerIngenKrav(
  ingenKrav: readonly Utsagn<'ingen_krav'>[],
  spor: Record<Spor, Sporutledning>,
  bakover: Bakover,
  ugyldig: Ugyldig
): void {
  for (const i of ingenKrav)
    if (
      spor[i.spor].krav.length ||
      ingenKrav.filter((x) => x.spor === i.spor).length > 1 ||
      !spor.forhold.krav.some((k) => bakover(i.id, k.id))
    )
      ugyldig(
        i.id,
        '«ingen krav» står i et spor med en kravversjon eller et annet «ingen krav», eller før grunnlaget er sendt'
      );
}

/** SK-12: høyst ett varsel per hjemmel, utenom § 34.3.3 og § 34.4 (VS-U48, VS-U52). */
function kontrollerVarslene(varsler: readonly LestVarsel[], ugyldig: Ugyldig): void {
  for (const hjemmel of Object.keys(VARSELSPOR) as Varselhjemmel[]) {
    if (erKravpostvarselhjemmel(hjemmel)) continue;
    const andre = varsler.filter((v) => v.hjemmel === hjemmel)[1];
    if (andre) ugyldig(andre.id, `saken har to varsler etter § ${hjemmel} (SK-12)`);
  }
}

/** Varslene, forespørslene, gjeldende krav og svar, og om sporet er trukket eller uten krav. */
function fyllSporene(
  spor: Record<Spor, Sporutledning>,
  varsler: readonly LestVarsel[],
  besvart: ForesporselOgSvar[],
  trekk: readonly Utsagn<'trekk'>[],
  ingenKrav: readonly Utsagn<'ingen_krav'>[],
  alleKrav: Map<string, Krav>
): void {
  for (const v of varsler)
    if (erKravpostvarselhjemmel(v.hjemmel)) spor[VARSELSPOR[v.hjemmel]].kravpostvarsler.push(v);
    else spor[VARSELSPOR[v.hjemmel]].varsler[v.hjemmel] = v;
  spor.frist.foresporsler = besvart;
  for (const n of SPOR) {
    const sp = spor[n];
    sp.gjeldendeKrav = sp.krav.at(-1) ?? null;
    sp.gjeldendeSvar = sp.gjeldendeKrav
      ? (ikkeErstattet(sp.svar, sp.gjeldendeKrav.id)[0] ?? null)
      : null;
    sp.trukket = trekk.some((t) => alleKrav.get(t.gjelder)?.spor === n);
    sp.ingenKrav = ingenKrav.some((i) => i.spor === n);
  }
  for (const n of KRAVSPOR) spor[n].trukket ||= spor.forhold.trukket;
}

/**
 * OV-U5, HF-U1, VS-U43 punkt 10: et svar står med virkningen det hadde, også når TE senere
 * har registrert et annet varsel enn det påberopelsen etter § 32.2, § 33.4, § 34.1.2 eller
 * § 34.1.3 gjaldt. Visningen sier det.
 */
function svarberegninger(
  alleSvar: Map<string, Svar>,
  spor: Record<Spor, Sporutledning>
): Record<string, Svarberegning> {
  const annetVarsel = (p: Standpunkt) => {
    if (
      p.art !== 'rettidighet' ||
      !erVarselhjemmel(p.hjemmel) ||
      erKravpostvarselhjemmel(p.hjemmel)
    )
      return false;
    const varsel = spor[VARSELSPOR[p.hjemmel]].varsler[p.hjemmel];
    return varsel !== undefined && p.gjelder !== varsel.id;
  };
  const svar: Record<string, Svarberegning> = {};
  for (const s of alleSvar.values()) {
    svar[s.id] = {
      svar: s,
      virkninger: s.beslutningsgrunnlag.virkninger,
      gjaldtEtAnnetVarsel: s.standpunkter.filter(annetVarsel).map((p) => p.id),
      datoopplysning: null,
      forholdssvaret: null,
    };
  }
  return svar;
}

/**
 * Designdelen i samlevedtaket for retting av sendt brev (MM-U55): opplysningen om datoen som var
 * TEs siste da svaret på grunnlaget ble gitt.
 */
function settDatoopplysningene(
  svar: Record<string, Svarberegning>,
  datoopplysninger: readonly Datoopplysning[],
  versjonen: (id: string) => number
): void {
  for (const b of Object.values(svar))
    if (kontrollerI(b.svar.spor).leserDatoen)
      b.datoopplysning =
        datoopplysninger.filter((o) => versjonen(o.id) < versjonen(b.svar.id)).at(-1)?.id ?? null;
}

/** `Svarberegning.forholdssvaret` for hvert svar på vederlag og frist. */
function settForholdssvarene(
  svar: Record<string, Svarberegning>,
  forhold: Svar[],
  versjonen: (id: string) => number
): void {
  for (const b of Object.values(svar)) {
    const s = b.svar;
    if (s.spor === 'forhold') continue;
    const kilde =
      forhold.find((g) => g.dokument === s.dokument) ??
      (s.paaberopelse === null
        ? undefined
        : ikkeErstattet(
            forhold.filter((g) => versjonen(g.id) < versjonen(s.id)),
            s.paaberopelse
          )[0]);
    b.forholdssvaret = kilde?.id ?? null;
  }
}

/** Enigheten i hvert spor: en aksept av gjeldende svar, eller sammenfall i svaret. */
function settEnighetene(
  spor: Record<Spor, Sporutledning>,
  aksepter: readonly Utsagn<'aksept'>[],
  hendelsen: (id: string) => string
): void {
  for (const n of SPOR) {
    const g = spor[n].gjeldendeSvar;
    if (!g) continue;
    const aksept = aksepter.find((a) => a.gjelder === g.id);
    if (aksept)
      spor[n].enighet = { grunnlag: enighetsgrunnlag(g, 'aksept'), holder: hendelsen(aksept.id) };
    else if (g.beslutningsgrunnlag.sammenfall)
      spor[n].enighet = { grunnlag: enighetsgrunnlag(g, 'sammenfall'), holder: g.id };
  }
}

/**
 * GR-U1, GR-U26, #342: svaret i sporet er subsidiært til gjeldende svar på
 * forholdet. Venter forholdet på svar på en ny versjon, forblir det subsidiært
 * til svaret på påberopelsen som sist gjaldt: svaret på den seneste besvarte versjonen i
 * kravkjeden, fra og med versjonen det ble regnet mot, også når det svaret er
 * revidert. Relasjonen leses av `påberopelse` og kravkjeden, ikke av rekkefølgen.
 */
function settSubsidiaer(
  spor: Record<Spor, Sporutledning>,
  svar: Record<string, Svarberegning>
): void {
  const gSvar = spor.forhold.gjeldendeSvar;
  const paaberopelseskjede = spor.forhold.krav;
  for (const n of KRAVSPOR) {
    const sistBesvart = [...spor[n].krav]
      .reverse()
      .map((k) => ikkeErstattet(spor[n].svar, k.id)[0])
      .find((x) => x !== undefined);
    const fra = paaberopelseskjede.findIndex((k) => k.id === sistBesvart?.paaberopelse);
    const kilde =
      gSvar ??
      (fra < 0
        ? null
        : (paaberopelseskjede
            .slice(fra)
            .reverse()
            .map((k) => ikkeErstattet(spor.forhold.svar, k.id)[0])
            .find((x) => x !== undefined) ?? null));
    spor[n].subsidiaer = kilde
      ? grunnerFraForholdet(svar[kilde.id].svar, svar[kilde.id].virkninger)
      : [];
  }
}

function paaberopelser(
  henvisninger: readonly Henvisning[],
  elementer: Record<string, Element>,
  art: 'innsigelse' | 'protest' | 'passivitet'
): Paaberopelse[] {
  return henvisninger
    .filter((x) => x.art === art)
    .map((x) => ({
      id: x.id,
      part: elementer[x.id].part,
      gjelder: x.gjelder,
      hendelse: elementer[x.id].hendelse,
    }));
}

/**
 * Om enigheten i sporet har virkning (GR-U7, MM-U3 (opphevet av MM-U50)): `betinget` til vilkåret
 * er oppfylt, `virksom` når det er det, og `uten_virkning` når forholdet er
 * avvist ved enighet eller kravet er trukket (KA-U6). `null` uten enighet.
 */
export function enighetensVirkning(
  u: Utledning,
  spor: Spor
): 'betinget' | 'virksom' | 'uten_virkning' | null {
  const e = u.spor[spor].enighet;
  if (!e) return null;
  if (spor !== 'forhold' && (u.forholdAvvist || u.spor[spor].trukket)) return 'uten_virkning';
  return e.grunnlag.vilkaar === null || u.forholdAvklart ? 'virksom' : 'betinget';
}

/**
 * OV-U3: kravene er avgjort når forholdet er avklart etter GR-U7, TE har sendt minst
 * ett vederlags- eller fristkrav, og hvert vederlags- og fristkrav TE har sendt, er
 * trukket eller har en virksom enighet. Et spor uten krav hindrer ikke; et varsel er
 * ikke et krav (KA-U2). «Ingen krav» i begge sporene (KA-U12) avgjør kravene til det
 * tas ut (#493). Predikatet leses av utsagnene og relasjonene, ikke av en status:
 * `enighetensVirkning` er selv et predikat av enigheten, forholdet og trekkene. Det er
 * en opplysning i visningen, og ingen regel sperrer etter det (MM-U34 punkt 12).
 */
export function kraveneErAvgjort(u: Utledning): boolean {
  const sendt = (n: Kravspor) => u.spor[n].krav.length > 0;
  return (
    u.forholdAvklart &&
    (KRAVSPOR.some(sendt) || KRAVSPOR.every((n) => u.spor[n].ingenKrav)) &&
    KRAVSPOR.every((n) => !sendt(n) || u.spor[n].trukket || enighetensVirkning(u, n) === 'virksom')
  );
}

/**
 * Dagen kravet eller varselet ble sendt: datoen parten oppga for et registrert krav eller
 * varsel (OV-U80, OV-U5), ellers dagen dokumentet ble registrert i løsningen (VS-U8). `null`
 * når den oppgitte datoen ikke kan leses.
 */
export function datoenDetBleSendt(
  u: Pick<Utledning, 'journal'>,
  utsagn: Pick<Krav, 'id' | 'dokument'>
): string | null {
  for (const d of dokumenterI(u.journal)) {
    if (d.id !== utsagn.dokument) continue;
    const sendt = datoFor(utsagn, 'sendt', d.opplysninger);
    return sendt ? kalenderdag(sendt.dato) : registrertDato(d);
  }
  throw new Error(`${utsagn.id} står ikke i et dokument i journalen.`);
}

/**
 * Påberopelsen et svar vurderes mot: kravet et svar på påberopelsen gjelder, ellers
 * påberopelsesversjonen svaret viser til (#342), eller gjeldende påberopelse for
 * et svar som ennå ikke er skrevet.
 */
export function paaberopelseFor(
  svar: Pick<Svar, 'spor' | 'gjelder'> & { paaberopelse?: string | null },
  u: Utledning
): Krav | null | undefined {
  if (svar.spor === 'forhold') return u.spor.forhold.krav.find((k) => k.id === svar.gjelder);
  if (svar.paaberopelse) return u.spor.forhold.krav.find((k) => k.id === svar.paaberopelse);
  return u.spor.forhold.gjeldendeKrav;
}

/**
 * GR-U27: TE har godtatt et svar som avslår forholdet eller påberoper preklusjon, så saken
 * er lukket, og et svar eller en aksept i sporet avvises (`strid`). Et trukket forhold
 * lukker hvert spor gjennom `trukket` (GR-U5).
 */
export const sporetErLukket = (u: Utledning): boolean => u.forholdAvvist;

/**
 * Svaret er registrert korrespondanse. Beslutningsgrunnlaget er da appens vurdering
 * etter reglene ved registreringen, ikke da brevet ble sendt (MM-U17, MM-U50).
 */
export function vurdertVedRegistreringen(u: Utledning, svarId: string): boolean {
  const dokument = u.svar[svarId].svar.dokument;
  return erRegistrert(
    u.opplysninger.filter((o) => o.opplysning.dokument === dokument).map((o) => o.opplysning)
  );
}

/**
 * Sporet har et krav byggherren ikke har svart på, kravet er ikke trukket, og saken er
 * ikke lukket, så et svar ville blitt godtatt (GR-U27). En ny påberopelsesversjon etter et
 * frafall venter på svar (GR-U23).
 */
export function venterPaaSvar(u: Utledning, spor: Spor): boolean {
  const s = u.spor[spor];
  return s.gjeldendeKrav !== null && s.gjeldendeSvar === null && !s.trukket && !sporetErLukket(u);
}

/**
 * MM-U24, MM-U30: byggherrens gjeldende svar i sporet står uten enighet, kravet er ikke trukket,
 * og sporet er ikke lukket, så TE kan fortsatt godta det, og svaret er et TE kan godta
 * (`Sporskontroller.svaretKanGodtas`).
 */
export function svarIkkeGodtatt(u: Utledning, spor: Spor): boolean {
  const s = u.spor[spor];
  return (
    s.gjeldendeSvar !== null &&
    s.enighet === null &&
    !s.trukket &&
    !sporetErLukket(u) &&
    kontrollerI(spor).svaretKanGodtas(u)
  );
}

/**
 * MM-U9: standpunktet i sporets gjeldende svar er subsidiært, fordi svaret på
 * forholdet avviser ansvaret (`subsidiaer`), eller fordi brevet selv ga standpunktet
 * et lag etter det første (OV-U32). Virkningen leses slik brevet sa den. Er forholdet
 * avvist, er også et standpunkt ingen påberopelse i sporet rammer, betinget av ansvaret
 * (OV-U33).
 */
export function standpunktetErSubsidiaert(
  u: Utledning,
  spor: Kravspor,
  standpunkt: string
): boolean {
  const s = u.spor[spor];
  return (
    s.subsidiaer.length > 0 ||
    (s.gjeldendeSvar !== null &&
      s.gjeldendeSvar.beslutningsgrunnlag.virkninger.some(
        (v) => v.standpunkt === standpunkt && typeof v.virkning === 'number' && v.virkning > 1
      ))
  );
}

/**
 * OV-U5, OV-U24: kravversjonene som kan være det første varselet appen kjenner etter
 * hjemmelen. Etter § 34.1.3 er det bare versjonene som krever posten etter annet ledd.
 */
export const kravSomVarsler = (
  hjemmel: Enkeltvarselhjemmel,
  krav: readonly Krav[]
): readonly Krav[] => (hjemmel === '34.1.3' ? krav.filter(harProduktivitetspost) : krav);

/**
 * VS-U20, OV-U5, HF-U1, VS-U43 punkt 6: varselet en påberopelse etter § 32.2, § 33.4, § 34.1.2
 * eller § 34.1.3 gjelder: varselet etter hjemmelen som var registrert da svaret ble sendt,
 * ellers det første kravet som varsler (`kravSomVarsler`), som er det første varselet appen
 * kjenner (arbeidsvalgene i #309 og #479, OV-U24). Etter § 33.4, § 34.1.2 og § 34.1.3 gjelder
 * påberopelsen det av dem som ble sendt først (VS-U70, VS-U66); med samme dato, eller uten
 * en dato for kravet, det egne varselet. Vilkåret i E3 om en tidligere dato for § 32.2 er ikke
 * bygget (#1600).
 * `foerSvaret` sier om et varsel står før svaret, og `sendt` datoen et varsel eller krav ble
 * sendt. Skriveren og valideringen leser det herfra (#496).
 */
export function varseletFoerSvaret(
  hjemmel: Enkeltvarselhjemmel,
  varsler: readonly Pick<LestVarsel, 'id' | 'dokument'>[],
  krav: readonly Pick<Krav, 'id' | 'dokument'>[],
  foerSvaret: (varsel: string) => boolean,
  sendt: (v: Pick<Krav, 'id' | 'dokument'>) => string | null
): string | undefined {
  const eget = varsler.find((v) => foerSvaret(v.id));
  const [kravet] = krav;
  if (!eget || !kravet || hjemmel === '32.2') return eget?.id ?? kravet?.id;
  const [varselet, kravetSendt] = [sendt(eget), sendt(kravet)];
  if (kravetSendt === null) return eget.id;
  return varselet === null || kravetSendt < varselet ? kravet.id : eget.id;
}

/**
 * Varselet en påberopelse etter hjemmelen gjelder i et svar som skrives nå: hvert varsel
 * står før svaret, og saken har høyst ett per hjemmel (SK-12). Skriveren leser det herfra,
 * så regelen står ett sted (#766).
 */
export function varseletForNyttSvar(
  u: Pick<Utledning, 'spor' | 'journal'>,
  hjemmel: Enkeltvarselhjemmel
): string {
  const varsel = varseletFoerBrevet(u, hjemmel);
  if (varsel === undefined)
    throw new Error(`Et svar kan ikke påberope § ${hjemmel} uten varsel eller krav som varsler.`);
  return varsel;
}

/**
 * Varselet etter hjemmelen saken har før et nytt brev, slik `varseletForNyttSvar` leser det, eller
 * `undefined` når saken ikke har noe. Brevteksten for vederlagskravet viser til det (#1824).
 */
export function varseletFoerBrevet(
  u: Pick<Utledning, 'spor' | 'journal'>,
  hjemmel: Enkeltvarselhjemmel
): string | undefined {
  const s = u.spor[VARSELSPOR[hjemmel]];
  const registrert = s.varsler[hjemmel];
  const krav = kravSomVarsler(hjemmel, s.krav);
  return varseletFoerSvaret(
    hjemmel,
    registrert ? [registrert] : [],
    krav,
    () => true,
    (v) => datoenDetBleSendt(u, v)
  );
}
