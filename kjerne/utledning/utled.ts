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
  datoForDokumentet,
  dokumenterI,
  erRegistrert,
  foerDagen,
  kalenderdag,
  lesJournal,
  dagenSendt,
} from '../format/leser.ts';
import { harProduktivitetspost } from '../spor/vederlag/format.ts';
import {
  KONTROLLER_I_VEDERLAGET,
  kontrollerKunnskapsdatoene,
  opplysningerOmKunnskapsdatoen,
  sisteKunnskapsdato,
  varseletForKravposten,
} from '../spor/vederlag/utledning.ts';
import { KONTROLLER_I_FRISTEN } from '../spor/frist/utledning.ts';
import type { Regelsett } from '../regler/regelsett.ts';
import type { Subsidiaergrunn } from '../regler/forhold.ts';
import { varslerOgsaaEtter3412 } from '../regler/vederlag.ts';
import { enighetsgrunnlag, sammenfallStemmer } from '../frosset/standpunkt.ts';
import { hjemmelenGjelder, iSporet } from '../frosset/byggeklosser.ts';
import { svarPaaForesporsler, type ForesporselOgSvar } from '../spor/frist/frysing.ts';
import {
  KRAVSPOR,
  SPOR,
  VARSELSPOR,
  erKravpostvarselhjemmel,
  erSvarbarVarselhjemmel,
  erVarselhjemmel,
  type Dokument,
  type Domenehendelse,
  type Enighetsgrunnlag,
  type Journalrad,
  type Krav,
  type Kravspor,
  type Opplysning,
  type Utsagn as Utsagnet,
  type OppgittDatofelt,
  type Part,
  type Spor,
  type Standpunkt,
  type Standpunktsvirkning,
  type Svar,
  type Kravpostvarselhjemmel,
  type Varselhjemmel,
  type Vedlegg,
  type IkkeFyltUt,
} from '../typer.ts';
import type { Kjerne } from '../versjon.ts';
import {
  datoEtterRettingene,
  medRettingeneTil,
  sisteRettingFor,
  type Retting,
} from './rettingen.ts';
import { grunnerFraForholdet } from '../spor/forhold/frysing.ts';
import {
  forholdetErAvvistVedEnighet,
  forholdssvaretsVirkning,
  frafaller,
  KONTROLLER_I_FORHOLDET,
  kontrollerEndringsordrene,
  kontrollerKorrigeringene,
  opplysningerOmDatoen,
} from '../spor/forhold/utledning.ts';

export type LestVarsel = Extract<Utsagnet, { art: 'varsel' }>;
/** Hjemlene saken har høyst ett varsel etter (SK-12). */
export type Enkeltvarselhjemmel = Exclude<Varselhjemmel, Kravpostvarselhjemmel>;
const REGELVERSJON_VS_U98 = 152;

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
   * Designdelen i samlevedtaket for retting av sendt brev (MM-U59): TEs opplysning om datoen
   * etter VS-U26 som var TEs siste da svaret på grunnlaget ble gitt (`Datoopplysning.id`).
   * `null` i de andre sporene og når TE ikke hadde oppgitt datoen.
   */
  datoopplysning: string | null;
  /**
   * TEs opplysning om datoen TE ble klar over at utgiftene etter § 34.1.3 annet ledd ville påløpe,
   * som var TEs siste da svaret i vederlaget ble gitt (`Kunnskapsopplysning.id`, VS-U86 punkt
   * 15, U-8 i BF-48). `null` i de andre sporene og når TE ikke hadde oppgitt datoen.
   */
  kunnskapsdato: string | null;
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
 * Punkt 10 i samlevedtaket for retting av sendt brev (MM-U59): én opplysning fra TE om datoen
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

/**
 * VS-U86 punkt 12–14 (VS-U82, VS-U85): én opplysning fra TE om datoen TE ble klar over at økte
 * utgifter etter § 34.1.3 annet ledd ville påløpe, i varselet etter § 34.1.3, i vederlagskravet
 * eller i det egne utsagnet.
 */
export interface Kunnskapsopplysning {
  /** Varselet, kravet eller utsagnet med opplysningen. */
  id: string;
  /** Dokumentet opplysningen står i. */
  dokument: string;
  dato: string;
  /**
   * Opplysningen ble TEs siste da den ble gitt: den første i løsningen og hvert eget utsagn.
   * Datoen i et varsel lagt til etter det står som opplysningen i det brevet (VS-U85).
   */
  blirSiste: boolean;
}

export interface Enighet {
  grunnlag: Enighetsgrunnlag;
  /** Hendelsen som holder enighetsgrunnlaget: aksepten, eller svaret ved sammenfall. */
  holder: string;
}

export interface Sporutledning {
  krav: Krav[];
  /**
   * OV-U102: kravene sendt før totalentreprenørens siste krav i sporet, i rekkefølgen de ble lagt
   * til. De blir ikke gjeldende, men datoen regnes med for hvilket varsel som kom først
   * (`kravSomVarsler`).
   */
  kravUtenforRekken: Krav[];
  gjeldendeKrav: Krav | null;
  svar: Svar[];
  /**
   * OV-U103: byggherrens svar sendt før det gjeldende svaret på samme kravversjon, i rekkefølgen
   * de ble lagt til. De blir ikke gjeldende og erstatter ikke det nyere svaret.
   */
  svarUtenforRekken: Svar[];
  gjeldendeSvar: Svar | null;
  /** Enigheten om gjeldende svar (2.5). Om den har virkning, avgjør `enighetHarVirkning`. */
  enighet: Enighet | null;
  /**
   * OV-U110, KA-U52 punkt 5, OV-U103: enighetene om byggherrens svar som ikke er det gjeldende, i
   * rekkefølgen svarene ble lagt til. Bare visningen leser dem; utledningen av sporet bygger på
   * `enighet`.
   */
  enigheterOmEldreSvar: Enighet[];
  /** TE har trukket kravet, eller forholdet som bærer det (GR-U5, SD-02). */
  trukket: boolean;
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
  /**
   * Byggherrens svar på et varsel i vederlaget som står alene, i rekkefølgen i journalen.
   * `gjelder` er varselet (VS-U87 punkt 30–35, VS-U79). Svarene på hvert
   * varsel er én kjede, som svarene på en kravversjon. Bare vederlaget har dem, og de står ikke i
   * `svar`.
   */
  svarPaaVarsler: Svar[];
  /** § 33.6.2: forespørslene og det som svarte på dem; bare fristen. */
  foresporsler: ForesporselOgSvar[];
  /** Hvorfor hele svaret i sporet er subsidiært til forholdet; tomt for forholdet. */
  subsidiaer: Subsidiaergrunn[];
}

/** Hvem som sa et element, i hvilken hendelse, og hva elementet er (4.2). */
export interface Element {
  hendelse: string;
  part: Part;
  art: 'dokument' | 'krav' | 'svar' | 'standpunkt' | 'opplysning' | Utsagnet['art'];
}

/**
 * Svaret gjelder et varsel, ikke en kravversjon (VS-U79), eller bare varselet i kravversjonen
 * (VS-U96 punkt 38 og 39). At varselet kan besvares alene, kontrollerer `kontrollerSvarPaaVarselet`
 * og `Sporskontroller.svaretBarePaaVarselet`.
 */
/**
 * Kjeden et svar står i: kravversjonen eller varselet det gjelder, og for svarene bare på varselet i
 * et spor én kjede på tvers av kravversjonene, fordi varselet er det samme (VS-U96 punkt 33 og 38).
 */
export const svarkjeden = (s: Pick<Svar, 'spor' | 'gjelder' | 'bareVarselet'>): string =>
  s.bareVarselet ? `bare_varselet ${s.spor}` : s.gjelder;

const erSvarPaaVarselet = (
  s: Pick<Svar, 'gjelder' | 'bareVarselet'>,
  elementer: Record<string, Element>
) => s.bareVarselet || elementer[s.gjelder]?.art === 'varsel';

/**
 * OV-U4, OV-U16: et brev registrert som dokumentasjon, slik den som registrerte oppga det.
 * Appen utleder ingenting av det. `rettetAv` er rettingen etter OV-U17 eller OV-U18.
 */
export interface RegistrertBrev {
  dokument: string;
  /** Parten som sendte brevet (OV-U79). */
  avsender: Part;
  /** Parten som la til brevet og kan rette registreringen (OV-U17). */
  lagtTilAv: Part;
  sendt: string;
  beskrivelse: string;
  spor: Spor[];
  dokumentasjon: Vedlegg[];
  rettetAv: string | null;
  /** D-12 i BF-49: skjemaet parten avbrøt, for merket i visningen. Ingen regel leser det. */
  ikkeFyltUt: IkkeFyltUt | null;
}

export interface DatoVedSvar {
  gjelder: string;
  dato: string;
  dokument: string;
}

export interface Utledning {
  versjon: number;
  regelversjon: number;
  forstaatt: boolean;
  begrensninger: { hendelse: string; grunn: string }[];
  journal: Domenehendelse[];
  svar: Record<string, Svarberegning>;
  /** Opplysningene om dokumentene. */
  opplysninger: { opplysning: Opplysning }[];
  /** Hvert element i saken, også de uten virkning. */
  elementer: Record<string, Element>;
  /**
   * Punkt 10 i samlevedtaket for retting av sendt brev (MM-U59): TEs opplysninger om datoen
   * etter VS-U26, i rekkefølgen i journalen. Den siste med et felt er TEs siste opplysning om
   * den datoen, og de andre er de tidligere (designdelen). Løsningen avgjør ikke hvilken som er
   * riktig (punkt 11).
   */
  datoopplysninger: Datoopplysning[];
  /**
   * VS-U86 punkt 12–14 og designdelen: TEs opplysninger om datoen TE ble klar over at utgiftene
   * etter § 34.1.3 annet ledd ville påløpe, i rekkefølgen i journalen. Den siste som `blirSiste`,
   * er TEs siste opplysning (`sisteKunnskapsdato`). Løsningen avgjør ikke hvilken som er riktig
   * (punkt 16).
   */
  kunnskapsdatoer: Kunnskapsopplysning[];
  /**
   * Punkt 8 og 18 i samlevedtaket for retting av sendt brev (MM-U59): TEs rettinger av datoen
   * for et varsel eller et krav lagt til som korrespondanse, i rekkefølgen i journalen. Datoen
   * som gjelder, står i `datoenSomGjelder`.
   */
  rettinger: Retting[];
  /** U-7 i BF-50: dato og kilde ved svarbrevet, når datoen ble rettet etter svaret. */
  datoerVedSvar: Record<string, DatoVedSvar[]>;
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
   * påberopelsesversjon på svar, og var det siste svaret et frafall, er
   * forholdet avklart ved frafallet (GR-U23).
   */
  forholdAvklart: boolean;
  /**
   * HF-U35 punkt 9, HF-U37: TE har godtatt et svar på påberopelsen som avslår forholdet, også
   * subsidiært til en påberopt preklusjon. Saken er lukket.
   */
  forholdAvvist: boolean;
  /**
   * HF-U35 punkt 10, MM-U13: TE har godtatt et svar på påberopelsen som prinsipalt påberoper
   * preklusjon etter § 32.2. Saken er ikke lukket når svaret godkjenner forholdet subsidiært.
   */
  preklusjonGodtatt: boolean;
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
  /**
   * OV-U104: et element i et brev lagt til med datoen det ble sendt, som utledningen sammenliknet
   * med et element sendt samme dag (`med`). Rekkefølgen innen dagen er ukjent.
   */
  sendtSammeDag: { element: string; med: string }[];
  /**
   * OV-U89 punkt 13, OV-U15: påberopelsesversjonene der saken gjelder en endring, så § 34.1.2 ikke
   * krever varsel (`hjemmelenGjelder`). Leses gjennom `varselEtter3412KrevesIkke`.
   */
  paaberopelserUtenVarsel3412: string[];
}

const tomtSpor = (): Sporutledning => ({
  krav: [],
  kravUtenforRekken: [],
  svarUtenforRekken: [],
  gjeldendeKrav: null,
  svar: [],
  gjeldendeSvar: null,
  enighet: null,
  enigheterOmEldreSvar: [],
  trukket: false,
  varsler: {},
  kravpostvarsler: [],
  svarPaaVarsler: [],
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
    datoopplysninger: [],
    kunnskapsdatoer: [],
    rettinger: [],
    datoerVedSvar: {},
    utenVirkning: [],
    spor: tommeSpor(),
    forholdAvklart: false,
    forholdAvvist: false,
    preklusjonGodtatt: false,
    paaberopelserUtenVarsel3412: [],
    frafalt: false,
    endringsordre: 'nei',
    registrerteBrev: registreringer(journal).brev,
    ikkeVurderteBrev: [],
    sendtSammeDag: [],
  };
}

/**
 * OV-U44: kilden til det en journalpost sier. Et brev sendt herfra er `sendt_herfra`. Et
 * registrert brev er `partens_opplysning` når det har elementer og ingen av dem er
 * dokumentasjon etter `dokumentasjonIBrevet`, ellers `dokumentasjon`. Mens saken ikke er forstått, er
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
  const rettet = rettedeBrev(brev);
  return [...dokumenterI(journal)]
    .filter((d) => erRegistrert(d.opplysninger) && !rettet.has(d.id))
    .filter((d) => kilden(d, forstaatt) === 'dokumentasjon')
    .map((d) => d.id);
}

/** OV-U17, OV-U18: de registrerte brevene en gjeldende retting har rettet. */
export const rettedeBrev = (brev: readonly RegistrertBrev[]): Set<string> =>
  new Set(brev.flatMap((b) => (b.rettetAv !== null ? [b.dokument] : [])));

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
      if (!rettet || rettet.lagtTilAv !== d.lagtTilAv || rettet.rettetAv !== null) {
        feil.push({
          hendelse: d.id,
          grunn: 'rettingen viser ikke til en gjeldende registrering fra samme side (OV-U17)',
        });
        continue;
      }
      rettet.rettetAv = d.id;
    }
    const sendt = datoForDokumentet(d.opplysninger, 'sendt');
    // OV-U4, OV-U16: dokumentasjon har bare beskrivelsen, datoen og vedlegget (`leser.ts`).
    const dokumentasjon = !d.krav.length && !d.svar.length && !d.utsagn.length;
    if (dokumentasjon && d.beskrivelse !== null && sendt)
      brev.push({
        dokument: d.id,
        avsender: d.avsender,
        lagtTilAv: d.lagtTilAv,
        sendt: sendt.dato,
        beskrivelse: d.beskrivelse,
        spor: d.spor,
        dokumentasjon: d.dokumentasjon,
        rettetAv: null,
        ikkeFyltUt: d.ikkeFyltUt,
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
const ENDRER_UTFALLET = new Set<string>(['aksept', 'trekk', 'varsel']);

/**
 * Dokumentet kan stride mot journalen før det: det har et krav, et svar eller et utsagn
 * som kan endre utfallet. Andre utsagn utleder ikke prefikset på nytt (#400).
 */
const kanStride = (d: Dokument): boolean =>
  d.krav.length > 0 || d.svar.length > 0 || d.utsagn.some((x) => ENDRER_UTFALLET.has(x.art));

interface Strid {
  element: string;
  grunn: string;
  /**
   * OV-U102, OV-U103: kravet står utenfor rekken av kravversjoner, eller svaret utenfor rekken av
   * svar, og datoen har virkning.
   */
  utenforRekken?: true;
}

/**
 * Utsagnene i et registrert brev som har virkning med datoen avsenderen oppgir: varselet
 * (OV-U5) og aksepten (OV-U98). Et svar har det alltid (OV-U80, OV-U98).
 */
const REGISTRERT_MED_VIRKNING = new Set<string>(['varsel', 'aksept']);

/**
 * OV-U80, OV-U98: et brev sendt utenfor løsningen har virkning som varsel, krav, svar (også
 * byggherrens endringsordre, OV-U6) eller aksept, med datoen avsenderen oppgir. Resten er
 * dokumentasjon (OV-U4, HF-U13). Kilden og brevene kjernen ikke vurderer, leser regelen fra
 * denne funksjonen (punkt 4 i #1167).
 */
function dokumentasjonIBrevet(d: Dokument): Set<string> {
  if (!erRegistrert(d.opplysninger)) return new Set();
  return new Set([...d.utsagn.filter((x) => !REGISTRERT_MED_VIRKNING.has(x.art)).map((x) => x.id)]);
}

/**
 * MM-U43 punkt 6: elementene i dokumentet som ikke kan forstås i samsvar med journalen før
 * det og vedtakene om enighet og lukking: en ny kravversjon i et trukket spor (GR-U5), et
 * svar eller en aksept i et trukket spor,
 * en aksept av et frafall (GR-U9) eller av et svar med registrert enighet
 * (GR-U8), noe som endrer utfallet etter at TE har godtatt et svar som avslår forholdet
 * (HF-U35 punkt 9, HF-U37), og det som viser til et element uten virkning.
 * Kontrollen gjelder bare disse vedtakene, ikke vilkårene for å sende, så en strengere
 * forutsetning senere gjør ikke et eldre brev uforstått.
 */
function strid(d: Dokument, u: Utledning, uten: Map<string, unknown>, samme: SammeDag): Strid[] {
  // En strid utenfor et registrert brev stopper utledningen, og et krav viser ikke til et
  // annet element enn kravversjonen det erstatter. Bare svar og utsagn kontrolleres derfor
  // mot `uten` (#669).
  const utenVirkning = (id: string | null) => id !== null && uten.has(id);
  const med = (element: string, grunn: string | null): Strid[] =>
    grunn ? [{ element, grunn }] : [];
  return [
    ...d.krav.flatMap((k) => med(k.id, kravetStrider(k, u, d, samme))),
    ...d.svar.flatMap((s) => med(s.id, svaretStrider(s, u, utenVirkning))),
    ...d.utsagn.flatMap((x) => med(x.id, utsagnetStrider(x, u, utenVirkning))),
    ...(erRegistrert(d.opplysninger) ? registreringenStrider(d, u, samme) : []),
  ];
}

/** Hvorfor det som kan endre utfallet, avvises: saken er lukket etter HF-U35 punkt 9. */
const lukket = (u: Utledning): string | null =>
  u.forholdAvvist
    ? 'totalentreprenøren har godtatt svaret på påberopelsen, som avslår forholdet (HF-U35 punkt 9)'
    : null;

/** OV-U104: elementet ble sammenliknet med `med`, sendt samme dag. */
type SammeDag = (element: string, med: string) => void;

/**
 * OV-U102: et krav sendt på dagen `dag` er sendt før totalentreprenørens siste krav i sporet.
 * Kommandoen og `registreringenStrider` leser regelen herfra. `samme` får det siste kravet når
 * de er sendt samme dag (OV-U104).
 */
export function sendtFoerSisteKrav(
  u: Utledning,
  spor: Spor,
  dag: string | null,
  samme: (siste: string) => void = () => {}
): boolean {
  const siste = u.spor[spor].gjeldendeKrav;
  return siste !== null && foerDagen(dag, datoenDetBleSendt(u, siste), () => samme(siste.id));
}

/**
 * OV-U118, OV-U119: kravversjonene i sporet et krav sendt på dagen `dag` prøves mot (`tidligere`), i
 * rekkefølgen de ble sendt, og resten (`andre`). For et krav sendt før det siste er `tidligere` de
 * sendt til og med `dag`, også utenfor rekken (OV-U104); ellers er det rekken. Kommandoen og
 * `kravetStrider` leser regelen herfra. `samme` får hver kravversjon sendt samme dag.
 */
export function kravversjoneneKravetProevesMot(
  u: Utledning,
  spor: Spor,
  dag: string | null,
  samme: (med: string) => void = () => {}
): { tidligere: readonly Krav[]; andre: readonly Krav[] } {
  const { krav, kravUtenforRekken } = u.spor[spor];
  if (!sendtFoerSisteKrav(u, spor, dag)) return { tidligere: krav, andre: kravUtenforRekken };
  const foer: { k: Krav; sendt: string }[] = [];
  const andre: Krav[] = [];
  for (const k of [...krav, ...kravUtenforRekken]) {
    const sendt = datoenDetBleSendt(u, k);
    if (sendt !== null && !foerDagen(dag, sendt, () => samme(k.id))) foer.push({ k, sendt });
    else andre.push(k);
  }
  foer.sort((a, b) => a.sendt.localeCompare(b.sendt));
  return { tidligere: foer.map((x) => x.k), andre };
}

/**
 * OV-U103: et svar sendt på dagen `dag` er sendt før byggherrens gjeldende svar på kravversjonen
 * `krav`. Kommandoen og `registreringenStrider` leser regelen herfra. `samme` får det gjeldende
 * svaret når de er sendt samme dag (OV-U104).
 */
export function sendtFoerGjeldendeSvar(
  u: Utledning,
  spor: Spor,
  krav: string,
  dag: string | null,
  samme: (gjeldende: string) => void = () => {}
): boolean {
  const [gjeldende] = ikkeErstattet(u.spor[spor].svar, krav);
  return (
    gjeldende !== undefined &&
    foerDagen(dag, datoenDetBleSendt(u, gjeldende), () => samme(gjeldende.id))
  );
}

/**
 * OV-U98: kravversjonen i rekken som var gjeldende på dagen `dag`, etter `kravversjonenGjaldt`, og
 * den siste av dem når to var det samme dag (OV-U104). Uten dag, for et brev fra løsningen, er det
 * den gjeldende kravversjonen. Et svar lagt til regnes mot påberopelsen slik den var da (#2011).
 */
export function kravversjonenPaaDagen(u: Utledning, spor: Spor, dag: string | null): Krav | null {
  if (dag === null) return u.spor[spor].gjeldendeKrav;
  return u.spor[spor].krav.filter((k) => kravversjonenGjaldt(u, k, dag, () => {})).at(-1) ?? null;
}

/**
 * OV-U89 punkt 13: saken gjelder en endring i påberopelsen som gjaldt på dagen `dag`, eller den
 * gjeldende uten dag, så § 34.1.2 ikke krever varsel. Svaret på varselet tilbys ikke og avvises
 * (`hindrerSvaretPaaVarselet`), og vederlaget har etiketten `varsel_kreves_ikke` (OV-U15).
 */
export function varselEtter3412KrevesIkke(u: Utledning, dag: string | null): boolean {
  const paaberopelse = kravversjonenPaaDagen(u, 'forhold', dag);
  return paaberopelse !== null && u.paaberopelserUtenVarsel3412.includes(paaberopelse.id);
}

/**
 * OV-U32, OV-U98, OV-U103: svaret på forholdet et svar på vederlag eller frist sendt på dagen `dag`
 * regnes med: byggherrens svar på påberopelsen som var gjeldende den dagen (`svaretStod`), også
 * et svar utenfor rekken. Var flere gjeldende den dagen (OV-U104), regnes det sist sendte med.
 * Uten dag, for et svar fra løsningen, det siste i rekken. Frysingen og visningen leser
 * det herfra (#2057, arbeidsvalget 16.11 i #2090).
 */
export function forholdssvaretPaaDagen(
  rekken: readonly Svar[],
  utenforRekken: readonly Svar[],
  paaberopelse: string,
  dag: string | null,
  sendt: (s: Svar) => string | null,
  samme: (forholdssvaret: string) => void = () => {}
): Svar | null {
  if (dag === null) return ikkeErstattet([...rekken], paaberopelse)[0] ?? null;
  const sto = [...rekken, ...utenforRekken].filter(
    (g) => g.gjelder === paaberopelse && svaretStod(g, rekken, utenforRekken, dag, sendt, samme)
  );
  // Svar som sto samme dag, er i samme kjede, og rekken har dem i rekkefølgen de ble sendt.
  const dagen = new Map(sto.map((g) => [g, sendt(g) ?? '']));
  return (
    sto
      .sort((a, b) => (dagen.get(a)! < dagen.get(b)! ? -1 : dagen.get(a)! > dagen.get(b)! ? 1 : 0))
      .at(-1) ?? null
  );
}

/**
 * Svaret på forholdet et svar sendt på dagen `dag` fryses med (`forholdssvaretPaaDagen`), mot
 * påberopelsen som var gjeldende den dagen. Uten dag er det det gjeldende svaret. Frysingen,
 * forhåndsvisningen og `registreringenStrider` leser det herfra; `samme` får hvert svar på
 * forholdet sendt samme dag (OV-U104).
 */
export function svaretPaaForholdetPaaDagen(
  u: Utledning,
  dag: string | null,
  samme: (forholdssvaret: string) => void = () => {}
): Svar | null {
  if (dag === null) return u.spor.forhold.gjeldendeSvar;
  const krav = kravversjonenPaaDagen(u, 'forhold', dag);
  return krav
    ? forholdssvaretPaaDagen(
        u.spor.forhold.svar,
        u.spor.forhold.svarUtenforRekken,
        krav.id,
        dag,
        (g) => datoenDetBleSendt(u, g),
        samme
      )
    : null;
}

/**
 * OV-U98: kravversjonen `k` var gjeldende på dagen `dag`: den var sendt, og versjonen som
 * erstattet den, var ikke sendt før den dagen. Leses av journalen før dokumentet som legges til.
 */
function kravversjonenGjaldt(
  u: Utledning,
  k: Krav,
  dag: string,
  samme: (med: string) => void
): boolean {
  const kjede = u.spor[k.spor].krav;
  const i = kjede.findIndex((x) => x.id === k.id);
  if (i < 0) return false;
  const sendt = datoenDetBleSendt(u, k);
  const neste = kjede[i + 1];
  return (
    sendt !== null &&
    !foerDagen(dag, sendt, () => samme(k.id)) &&
    (neste === undefined || !foerDagen(datoenDetBleSendt(u, neste), dag, () => samme(neste.id)))
  );
}

/**
 * OV-U98: svaret `s` var byggherrens gjeldende svar på dagen `dag`: det gjaldt en kravversjon som
 * var gjeldende den dagen, og svaret sto da (`svaretStod`). Visningen tilbyr en aksept lagt til
 * bare for et slikt svar (G-7 i BF-49). `samme` får elementet som ble sendt samme dag (OV-U104).
 */
export function svaretGjaldt(
  u: Utledning,
  s: Svar,
  dag: string,
  samme: (med: string) => void = () => {}
): boolean {
  const { krav: kjede, svar: rekken, svarUtenforRekken: utenforRekken } = u.spor[s.spor];
  const krav = kjede.find((k) => k.id === s.gjelder);
  return (
    krav !== undefined &&
    kravversjonenGjaldt(u, krav, dag, samme) &&
    svaretStod(s, rekken, utenforRekken, dag, (x) => datoenDetBleSendt(u, x), samme)
  );
}

/**
 * OV-U98, OV-U103: svaret `s` sto på dagen `dag`: det var sendt, og et svar som erstattet det, var
 * ikke sendt før. Det er revisjonen og hvert svar utenfor rekken på kravversjonen sendt etter det,
 * og for et svar utenfor rekken også svarene i rekken sendt etter det.
 */
function svaretStod(
  s: Svar,
  rekken: readonly Svar[],
  utenforRekken: readonly Svar[],
  dag: string,
  sendt: (x: Svar) => string | null,
  samme: (med: string) => void
): boolean {
  const utenfor = utenforRekken.includes(s);
  const sendtS = sendt(s);
  const sendtEtter = (r: Svar) => r.gjelder === s.gjelder && foerDagen(sendtS, sendt(r));
  const senere = [
    ...rekken.filter((r) => r.erstatter === s.id || (utenfor && sendtEtter(r))),
    ...utenforRekken.filter(sendtEtter),
  ];
  return (
    !foerDagen(dag, sendt(s), () => samme(s.id)) &&
    senere.every((r) => !foerDagen(sendt(r), dag, () => samme(r.id)))
  );
}

/**
 * OV-U98: et krav, et svar eller en aksept i et registrert brev prøves mot journalen før det,
 * på dagen avsenderen oppgir at brevet ble sendt. Hva som var gjeldende, avgjøres da, så en
 * senere retting av datoen endrer det ikke.
 */
function registreringenStrider(d: Dokument, u: Utledning, samme: SammeDag): Strid[] {
  const dag = (id: string) => {
    const oppgitt = datoFor({ id, dokument: d.id }, 'sendt', d.opplysninger);
    return oppgitt ? kalenderdag(oppgitt.dato) : null;
  };
  const strider: Strid[] = [];
  for (const k of d.krav) {
    if (sendtFoerSisteKrav(u, k.spor, dag(k.id), (siste) => samme(k.id, siste))) {
      strider.push({
        element: k.id,
        grunn: 'et krav sendt før totalentreprenørens siste krav i sporet (OV-U98, OV-U102)',
        utenforRekken: true,
      });
      // OV-U102: datoen sammenliknes med det egne varselet (`varseletFoerSvaret`).
      for (const v of egneVarsler(u, k))
        foerDagen(dag(k.id), datoenDetBleSendt(u, v), () => samme(k.id, v.id));
    }
    // OV-U109: datoen sammenliknes med forespørselen etter § 33.6.2 (`svarPaaForesporsler` og
    // `foresporselenKravetSvarerPaa`).
    if (k.spor === 'frist')
      for (const f of u.spor.frist.foresporsler)
        if (f.kravFoer === null) foerDagen(dag(k.id), f.sendt, () => samme(k.id, f.foresporsel));
  }
  for (const v of d.utsagn) {
    if (v.art !== 'varsel') continue;
    for (const k of u.spor[VARSELSPOR[v.hjemmel]].kravUtenforRekken)
      if (sammenliknesMedVarselet(v.hjemmel, k, u))
        foerDagen(dag(v.id), datoenDetBleSendt(u, k), () => samme(v.id, k.id));
  }
  const forholdIBrevet = d.svar.some((x) => x.spor === 'forhold');
  for (const s of d.svar) {
    const { krav: kjede, kravUtenforRekken } = u.spor[s.spor];
    const krav = [...kjede, ...kravUtenforRekken].find((k) => k.id === s.gjelder);
    const sendt = dag(s.id);
    const medSvaret = (med: string) => samme(s.id, med);
    // OV-U32, OV-U104: dagen sammenliknes med svarene på forholdet lagene regnes fra (#2057).
    // Med svaret på forholdet i samme brev regnes lagene fra det, uten å sammenlikne dagene (OV-U32).
    if (s.spor !== 'forhold' && !forholdIBrevet) svaretPaaForholdetPaaDagen(u, sendt, medSvaret);
    if (krav && (sendt === null || !kravversjonenGjaldt(u, krav, sendt, medSvaret)))
      strider.push({
        element: s.id,
        grunn: 'et svar på en kravversjon som ikke var gjeldende da svaret ble sendt (OV-U98)',
      });
    else if (sendtFoerGjeldendeSvar(u, s.spor, s.gjelder, sendt, medSvaret))
      strider.push({
        element: s.id,
        grunn: 'et svar sendt før byggherrens gjeldende svar på kravversjonen (OV-U103)',
        utenforRekken: true,
      });
  }
  for (const x of d.utsagn) {
    if (x.art !== 'aksept') continue;
    const svar = u.svar[x.gjelder]?.svar;
    const sendt = dag(x.id);
    if (svar && (sendt === null || !svaretGjaldt(u, svar, sendt, (med) => samme(x.id, med))))
      strider.push({
        element: x.id,
        grunn:
          'en aksept av et svar som ikke var byggherrens gjeldende svar da aksepten ble sendt (OV-U98)',
      });
  }
  return strider;
}

/**
 * OV-U102 og VS-U98: de registrerte varslene som et krav utenfor rekken sammenliknes med
 * for å finne det første varselet.
 */
function egneVarsler(u: Utledning, k: Krav): LestVarsel[] {
  const s = u.spor[k.spor];
  return [...Object.values(s.varsler), ...s.kravpostvarsler].filter(
    (v): v is LestVarsel => v !== undefined && sammenliknesMedVarselet(v.hjemmel, k, u)
  );
}

const sammenliknesMedVarselet = (hjemmel: Varselhjemmel, k: Krav, u: Utledning): boolean =>
  (datoenSammenliknes(hjemmel) && !erKravpostvarselhjemmel(hjemmel) && varslerEtter(hjemmel, k)) ||
  (k.spor === 'vederlag' && varslerOgsaaEtter3412(hjemmel) && !varselEtter3412KrevesIkke(u, null));

/** Etter § 32.2 gjelder det registrerte varselet til #1600 er bygget, uten å sammenlikne datoene. */
const datoenSammenliknes = (hjemmel: Varselhjemmel): boolean => hjemmel !== '32.2';

/** Etter § 34.1.3 varsler bare et krav som krever posten etter annet ledd (OV-U24). */
const varslerEtter = (hjemmel: Varselhjemmel, k: Krav): boolean =>
  hjemmel !== '34.1.3' || harProduktivitetspost(k);

/**
 * Hvorfor kravversjonen strider mot journalen før den, eller `null`. Et krav lagt til prøves mot
 * kravversjonene på dagen det ble sendt (`kravversjoneneKravetProevesMot`).
 */
function kravetStrider(k: Krav, u: Utledning, d: Dokument, samme: SammeDag): string | null {
  const l = lukket(u);
  if (l) return `en kravversjon etter at ${l}`;
  if (u.spor[k.spor].trukket) return 'en kravversjon etter at kravet er trukket (GR-U5)';
  const { tidligere, andre } = kravversjoneneKravetProevesMot(
    u,
    k.spor,
    erRegistrert(d.opplysninger) ? dagenSendt(k, d) : null,
    (med) => samme(k.id, med)
  );
  const poster = kontrollerI(k.spor).kravet(k, tidligere, andre);
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
  x: Utsagnet,
  u: Utledning,
  utenVirkning: (id: string | null) => boolean
): string | null {
  if (!ENDRER_UTFALLET.has(x.art)) return null;
  const gjelder = 'gjelder' in x ? x.gjelder : null;
  /** Svaret en aksept gjelder, også et svar utenfor rekken (OV-U103). */
  const svaret = x.art === 'aksept' ? u.svar[x.gjelder]?.svar : undefined;
  const l = lukket(u);
  if (l) return `${x.art} etter at ${l}`;
  if (utenVirkning(gjelder)) return `${x.art} viser til et element uten virkning`;
  return akseptenStrider(svaret, gjelder, u, utenVirkning);
}

/**
 * Hvorfor en aksept av svaret strider mot journalen, eller `null`. Tilbudet av en aksept lagt
 * til leser det samme (`tilbudteLagtTil`, D-9 i BF-49).
 */
export function akseptenStrider(
  svaret: Svar | undefined,
  gjelder: string | null,
  u: Utledning,
  utenVirkning: (id: string | null) => boolean
): string | null {
  const sporet = svaret?.spor;
  if (sporet && u.spor[sporet].trukket)
    return 'en aksept av et svar i et spor etter at kravet er trukket (MM-U43, GR-U5)';
  // GR-U9 også for et frafall i et svar som ikke lenger er gjeldende (#2022 punkt 3).
  if (svaret?.spor === 'forhold' && frafaller(svaret)) return 'en aksept av et frafall (GR-U9)';
  if (sporet && u.spor[sporet].enighet && u.spor[sporet].gjeldendeSvar?.id === gjelder)
    return 'en aksept av et svar med registrert enighet (GR-U8)';
  // GR-U8 for et svar som ikke lenger er gjeldende: en aksept lagt til med datoen den ble sendt,
  // kan gjelde et eldre svar (OV-U98), og leseren godtar ingen av disse (`kontrollerAksepter`).
  if (svaret?.beslutningsgrunnlag.sammenfall)
    return 'en aksept av et svar partene er enige om ved sammenfall (GR-U8)';
  if (
    sporet &&
    [...dokumenterI(u.journal)].some((d) =>
      d.utsagn.some((a) => a.art === 'aksept' && a.gjelder === gjelder && !utenVirkning(a.id))
    )
  )
    return 'en aksept av et svar totalentreprenøren alt har godtatt (GR-U8)';
  return null;
}

/**
 * Utledningen av journalen. Hvert dokument kontrolleres mot journalen før det
 * (MM-U43 punkt 6 og 9, `strid`): en strid i en hendelse som ikke er et registrert brev, gjør
 * saken ikke forstått, og i et registrert brev får elementet ingen virkning.
 */
export function utled(journal: Domenehendelse[], regler: Regelsett): Utledning {
  const uten = new Map<string, { hendelse: string; grunn: string }>();
  const utenforRekken = new Set<string>();
  const sendtSammeDag: Utledning['sendtSammeDag'] = [];
  const konflikter: Utledning['begrensninger'] = [];
  const dokumenter: Dokument[] = [];
  for (const [i, h] of journal.entries()) {
    if (h.art !== 'dokument') continue;
    const kan = kanStride(h.dokument);
    dokumenter.push(h.dokument);
    if (!kan) continue;
    // Kontrollen trenger saken slik den var før dokumentet, så prefikset utledes for
    // hvert dokument som kan endre utfallet. Kostnaden er målt i #400.
    const foer = utledSporene(journal.slice(0, i), regler, uten, utenforRekken);
    if (!foer.forstaatt) break;
    const registrert = erRegistrert(h.dokument.opplysninger);
    const dokumentasjon = dokumentasjonIBrevet(h.dokument);
    const stridene = strid(h.dokument, foer, uten, (element, med) => {
      if (!sendtSammeDag.some((x) => x.element === element && x.med === med))
        sendtSammeDag.push({ element, med });
    });
    for (const x of stridene) {
      if (!registrert) konflikter.push({ hendelse: h.id, grunn: x.grunn });
      else if (dokumentasjon.has(x.element)) continue;
      else if (x.utenforRekken) utenforRekken.add(x.element);
      else uten.set(x.element, { hendelse: h.id, grunn: x.grunn });
    }
    if (konflikter.length) break;
  }
  const u = utledSporene(journal, regler, uten, utenforRekken);
  const ut = konflikter.length ? tom(journal, regler, [...u.begrensninger, ...konflikter]) : u;
  ut.ikkeVurderteBrev = ikkeVurderte(journal, ut.registrerteBrev, ut.forstaatt);
  if (ut.forstaatt) ut.sendtSammeDag = sendtSammeDag;
  return ut;
}

export type Utsagn<A extends Utsagnet['art']> = Extract<Utsagnet, { art: A }>;
export type Henvisning = Utsagn<'foresporselssvar' | 'innlegg'>;
/** Fører en begrensning for elementet `id` etter lesereglene i 4.2. */
export type Ugyldig = (id: string, grunn: string) => void;
/** `fra` viser til `til` med lavere saksversjon. */
export type Bakover = (fra: string, til: string) => boolean;
/** Dagen som gjaldt for varselet eller kravet `v` da svaret `svar` ble sendt (`datoEtterRettingene`). */
type GjaldtVedSvaret = (
  v: Pick<Krav, 'id' | 'dokument'>,
  svar: Pick<Krav, 'id' | 'dokument'>
) => string | null;

/**
 * Lesereglene i 4.2 som er sporets egne, og det utledningen ellers leser av sporet. Hver
 * leseregel gir en begrensning med `ugyldig`, eller `null` for kravversjonen.
 */
export interface Sporskontroller {
  /**
   * Hvorfor kravversjonen `k` strider mot de tidligere versjonene i sporet, etter «som». `andre` er
   * de andre kravversjonene i sporet (`kravversjoneneKravetProevesMot`).
   */
  kravet(k: Krav, tidligere: readonly Krav[], andre: readonly Krav[]): string | null;
  /**
   * Kravversjonene i sporet mot varslene. `eldre` gir kravene utenfor rekken sendt før
   * kravversjonen og lagt til før den, i rekkefølgen de ble sendt.
   */
  kravene(
    krav: readonly Krav[],
    varsler: readonly LestVarsel[],
    bakover: Bakover,
    ugyldig: Ugyldig,
    eldre: (k: Krav) => readonly Krav[]
  ): void;
  /** Svaret `s` mot kravversjonen det gjelder. */
  svaret(s: Svar, krav: Krav, ugyldig: Ugyldig): void;
  /**
   * Svaret `s` bare på varselet i kravversjonen det gjelder (VS-U96 punkt 38): standpunktene
   * gjelder bare varselet, som i svaret på kravet.
   */
  svaretBarePaaVarselet(s: Svar, krav: Krav, ugyldig: Ugyldig): void;
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
 * de plasseres, men leses ikke inn i sporene. Kravene og svarene i `utenforRekken` leses inn
 * utenfor rekken av kravversjoner (OV-U102) og svar (OV-U103).
 */
function utledSporene(
  journal: Domenehendelse[],
  regler: Regelsett,
  uten: Map<string, { hendelse: string; grunn: string }>,
  utenforRekken: ReadonlySet<string>
): Utledning {
  const begrensninger: Utledning['begrensninger'] = [];
  const spor = tommeSpor();
  /** Hendelsen og saksversjonen hvert element står i. */
  const plass = new Map<string, { hendelse: string; versjon: number }>();
  const elementer: Record<string, Element> = {};
  const aksepter: Utsagn<'aksept'>[] = [];
  const trekk: Utsagn<'trekk'>[] = [];
  const varsler: LestVarsel[] = [];
  const henvisninger: Henvisning[] = [];
  const foresporsler: Utsagn<'foresporsel'>[] = [];
  const korrigeringer: Utsagn<'korrigering'>[] = [];
  const kunnskapsdatoer: Utsagn<'kunnskapsdato'>[] = [];
  const rettinger: Utsagn<'retting'>[] = [];
  const opplysninger: Opplysning[] = [];
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
  const sorter = (u: Utsagnet) => {
    switch (u.art) {
      case 'aksept':
        return aksepter.push(u);
      case 'trekk':
        return trekk.push(u);
      case 'varsel':
        return varsler.push(u);
      case 'foresporsel':
        return foresporsler.push(u);
      case 'korrigering':
        return korrigeringer.push(u);
      case 'kunnskapsdato':
        return kunnskapsdatoer.push(u);
      case 'retting':
        return rettinger.push(u);
      default:
        return henvisninger.push(u);
    }
  };

  /** Plasserer elementene i dokumentet, og leser dem med virkning inn i sporene etter arten. */
  const lesDokumentet = (h: Extract<Domenehendelse, { art: 'dokument' }>) => {
    const d = h.dokument;
    const dokumentasjon = dokumentasjonIBrevet(d);
    const harVirkning = (id: string) => !uten.has(id) && !dokumentasjon.has(id);
    registrer(h.id, h, d.lagtTilAv, 'dokument');
    for (const k of d.krav) {
      plasser(k.id, h);
      registrer(k.id, h, d.avsender, 'krav');
      kravMedUten.set(k.id, k);
      // En annen strid enn OV-U102 gir kravet ingen virkning (`uten`).
      if (harVirkning(k.id))
        (utenforRekken.has(k.id) ? spor[k.spor].kravUtenforRekken : spor[k.spor].krav).push(k);
    }
    for (const s of d.svar) {
      plasser(s.id, h);
      registrer(s.id, h, d.avsender, 'svar');
      for (const p of s.standpunkter) {
        plasser(p.id, h);
        registrer(p.id, h, d.avsender, 'standpunkt');
      }
      if (harVirkning(s.id))
        (erSvarPaaVarselet(s, elementer)
          ? spor[s.spor].svarPaaVarsler
          : utenforRekken.has(s.id)
            ? spor[s.spor].svarUtenforRekken
            : spor[s.spor].svar
        ).push(s);
    }
    for (const u of d.utsagn) {
      plasser(u.id, h);
      registrer(u.id, h, d.avsender, u.art);
      if (harVirkning(u.id)) sorter(u);
    }
    for (const o of d.opplysninger) {
      plasser(o.id, h);
      registrer(o.id, h, d.lagtTilAv, 'opplysning');
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
  const alleSvar = new Map(
    SPOR.flatMap((n) => [...spor[n].svar, ...spor[n].svarUtenforRekken]).map((s) => [s.id, s])
  );
  // VS-U79: også svarene på varslene viser bakover til det de gjelder.
  const svareneSomKontrolleres = new Map([
    ...alleSvar,
    ...SPOR.flatMap((n) => spor[n].svarPaaVarsler).map((s) => [s.id, s] as const),
  ]);
  const alleKrav = new Map(SPOR.flatMap((n) => spor[n].krav).map((k) => [k.id, k]));
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

  kontrollerKravkjedene(spor, ugyldig);
  // Lesingen kaster ikke for en dato den ikke kan lese; uten dato gjelder det egne varselet.
  const dokumentet = new Map([...dokumenter.values()].map((d) => [d.id, d]));
  const sendt = (v: Pick<Krav, 'id' | 'dokument'>): string | null => {
    const d = dokumentet.get(v.dokument);
    if (!d) return null;
    const oppgitt = datoFor(v, 'sendt', d.opplysninger);
    return kalenderdag(oppgitt ? oppgitt.dato : d.registrert);
  };
  const rettingene: Retting[] = rettinger.map((x) => ({
    id: x.id,
    dokument: elementer[x.id].hendelse,
    gjelder: x.gjelder,
    dato: x.dato,
    sendt: sendt({ id: x.id, dokument: elementer[x.id].hendelse }),
  }));
  // Punkt 19 i samlevedtaket for retting av sendt brev (MM-U59): svaret står med datoen som gjaldt
  // da det ble sendt. Et svar lagt til leser rettingene sendt til og med dagen det oppgir (OV-U98).
  // Også for hva som var gjeldende da et krav ble sendt (A1 i #2509).
  const rettingVedSvaret = (gjelder: string, svar: Pick<Svar, 'id' | 'dokument'>) =>
    sisteRettingFor(
      rettingene,
      gjelder,
      (r) => bakover(svar.id, r.id) && !foerDagen(sendt(svar), r.sendt)
    );
  const gjaldtVedSvaret: GjaldtVedSvaret = (v, svar) =>
    rettingVedSvaret(v.id, svar)?.dato ?? sendt(v);
  for (const n of SPOR) {
    const eldre = (k: Krav) =>
      spor[n].kravUtenforRekken
        .filter((e) => bakover(k.id, e.id) && foerDagen(gjaldtVedSvaret(e, k), sendt(k)))
        .sort((a, b) => (gjaldtVedSvaret(a, k) ?? '').localeCompare(gjaldtVedSvaret(b, k) ?? ''));
    kontrollerI(n).kravene(spor[n].krav, varsler, bakover, ugyldig, eldre);
  }
  kontrollerSvarene(
    svareneSomKontrolleres,
    alleKrav,
    spor,
    varsler,
    besvart,
    bakover,
    gjaldtVedSvaret,
    regler,
    ugyldig
  );
  kontrollerSvarkjedene(spor, ugyldig);
  kontrollerAksepter(aksepter, alleSvar, bakover, ugyldig);
  kontrollerTrekk(trekk, alleKrav, spor, bakover, ugyldig);
  kontrollerEndringsordrene(opplysninger, dokumenter, ugyldig);
  kontrollerHenvisningene(henvisninger, elementer, besvart, bakover, ugyldig);
  const saken: Saksutsagn = {
    dokumenter: journal.flatMap((h) => (h.art === 'dokument' ? [h.dokument] : [])),
    foresporsler,
    henvisninger,
    elementer,
    kravMedUten,
    besvart,
  };
  for (const n of SPOR) kontrollerI(n).saken(saken, bakover, ugyldig);
  kontrollerVarslene(varsler, ugyldig);
  kontrollerKorrigeringene(korrigeringer, kravMedUten, elementer, bakover, ugyldig);
  kontrollerRettingene(rettinger, elementer, dokumenter, bakover, ugyldig);
  kontrollerKunnskapsdatoene(
    kunnskapsdatoer,
    spor.vederlag,
    varsler,
    kravMedUten,
    bakover,
    ugyldig
  );

  begrensninger.push(...registreringer(journal).feil);
  if (begrensninger.length) return tom(journal, regler, begrensninger);

  fyllSporene(spor, varsler, besvart, trekk, alleKrav);
  const datoopplysninger = opplysningerOmDatoen(journal, spor.forhold.krav, korrigeringer);
  const svar = svarberegninger(alleSvar, spor);
  settDatoopplysningene(svar, datoopplysninger, (id) => plass.get(id)!.versjon);
  const kunnskapsopplysninger = opplysningerOmKunnskapsdatoen(
    journal,
    spor.vederlag,
    varsler,
    kunnskapsdatoer
  );
  settKunnskapsdatoene(
    svar,
    kunnskapsopplysninger,
    (id) => plass.get(id)!.versjon,
    dagene(journal).dagen
  );
  settForholdssvarene(
    svar,
    spor.forhold.svar,
    spor.forhold.svarUtenforRekken,
    (id) => plass.get(id)!.versjon,
    dagene(journal)
  );
  settEnighetene(
    spor,
    aksepter,
    (id) => plass.get(id)!.hendelse,
    (id) => plass.get(id)!.versjon
  );
  settSubsidiaer(spor, svar);
  const datoerVedSvar: Utledning['datoerVedSvar'] = {};
  if (rettingene.length) {
    for (const s of svareneSomKontrolleres.values()) {
      const krav = alleKrav.get(s.gjelder);
      const gjelder = new Set([
        s.gjelder,
        ...s.standpunkter.flatMap((p) => {
          if (p.art !== 'rettidighet') return [];
          const varsel =
            krav && s.spor === 'vederlag' && erKravpostvarselhjemmel(p.hjemmel)
              ? varseletForKravposten({ journal, rettinger: rettingene, spor }, krav, p.gjelder)
              : undefined;
          return [varsel ?? p.gjelder];
        }),
      ]);
      for (const id of gjelder) {
        const siste = sisteRettingFor(rettingene, id);
        if (!siste) continue;
        const vedSvaret = rettingVedSvaret(id, s);
        if (siste === vedSvaret) continue;
        const utsagn = { id, dokument: elementer[id].hendelse };
        const dato = vedSvaret?.dato ?? sendt(utsagn);
        if (dato !== null)
          (datoerVedSvar[s.dokument] ??= []).push({
            gjelder: id,
            dato,
            dokument: vedSvaret?.dokument ?? utsagn.dokument,
          });
      }
    }
  }
  return {
    ...tom(journal, regler, begrensninger),
    forstaatt: true,
    svar,
    elementer,
    datoopplysninger,
    kunnskapsdatoer: kunnskapsopplysninger,
    rettinger: rettingene,
    datoerVedSvar,
    utenVirkning: [...uten].map(([element, x]) => ({ element, ...x })),
    opplysninger: opplysninger.map((o) => ({ opplysning: o })),
    spor,
    ...forholdssvaretsVirkning(spor, svar, dokumenter),
    paaberopelserUtenVarsel3412: spor.forhold.krav
      .filter((k) => !hjemmelenGjelder('34.1.2', k, regler))
      .map((k) => k.id),
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
  sendt: GjaldtVedSvaret,
  regler: Regelsett,
  ugyldig: Ugyldig
): void {
  for (const s of alleSvar.values()) {
    const varselet = s.bareVarselet ? undefined : varsler.find((v) => v.id === s.gjelder);
    if (varselet) kontrollerSvarPaaVarselet(s, varselet, bakover, ugyldig);
    else if (alleKrav.get(s.gjelder)?.spor !== s.spor || !bakover(s.id, s.gjelder))
      ugyldig(s.id, 'svaret viser til et krav som ikke står før det i sporet');
    if (s.erstatter !== null) {
      const forrige = alleSvar.get(s.erstatter);
      if (!forrige || svarkjeden(forrige) !== svarkjeden(s) || !bakover(s.id, s.erstatter))
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
    if (!sammenfallStemmer(s, alleKrav.get(s.gjelder)))
      ugyldig(
        s.id,
        'sammenfallet stemmer ikke med standpunktene i brevet (GR-U10, MM-U18 (opphevet av MM-U43))'
      );
    for (const p of s.standpunkter) {
      const ekstraStandpunkt =
        p.art === 'rettidighet' && p.hjemmel === '34.1.2' && varselet?.hjemmel !== p.hjemmel;
      if (!varselet || ekstraStandpunkt)
        kontrollerStandpunktet(s, p, spor, varsler, besvart, bakover, sendt, regler, ugyldig);
    }
    if (varselet) continue;
    const krav = alleKrav.get(s.gjelder);
    if (krav?.spor !== s.spor) continue;
    // VS-U96 punkt 38 og 39: svaret bare på varselet har bare standpunktene til varselet.
    if (s.bareVarselet) kontrollerI(s.spor).svaretBarePaaVarselet(s, krav, ugyldig);
    else kontrollerI(s.spor).svaret(s, krav, ugyldig);
  }
}

/**
 * VS-U79: svaret på et varsel i vederlaget som står alene, er et svar på vederlaget. Standpunktene
 * gjelder varselet: rettidigheten etter varselets bestemmelse og, for § 34.3.3, justeringen
 * (VS-U87 punkt 30–32). Svaret på varselet etter § 34.1.2 eller § 34.1.3, og svaret i fristen på
 * varselet etter § 33.4, har rettidigheten (VS-U96 punkt 32). Svaret godkjenner ikke noe krav, så det faller ikke sammen med noe (GR-U7).
 */
function kontrollerSvarPaaVarselet(
  s: Svar,
  varselet: LestVarsel,
  bakover: Bakover,
  ugyldig: Ugyldig
): void {
  if (!erSvarbarVarselhjemmel(varselet.hjemmel) || VARSELSPOR[varselet.hjemmel] !== s.spor)
    ugyldig(
      s.id,
      'svaret gjelder et varsel som ikke er etter punkt 33.4, 34.1.2, 34.1.3, 34.3.3 eller 34.4 i samme spor'
    );
  else if (!bakover(s.id, s.gjelder))
    ugyldig(s.id, 'svaret viser til et varsel som ikke står før det');
  else if (
    s.standpunkter.some((p) =>
      p.art === 'rettidighet'
        ? p.gjelder !== s.gjelder ||
          (p.hjemmel !== varselet.hjemmel &&
            !(p.hjemmel === '34.1.2' && varslerOgsaaEtter3412(varselet.hjemmel)))
        : p.art !== 'justering' || p.gjelder !== s.gjelder || varselet.hjemmel !== '34.3.3'
    )
  )
    ugyldig(s.id, 'standpunktene i svaret på varselet gjelder ikke varselet');
  // VS-U77 punkt 30: svaret på varselet etter § 34.3.3 har standpunktet til justeringen.
  else if (varselet.hjemmel === '34.3.3' && !s.standpunkter.some((p) => p.art === 'justering'))
    ugyldig(s.id, 'svaret på varselet etter punkt 34.3.3 har ikke standpunktet til justeringen');
  else if (
    (varselet.hjemmel === '33.4' ||
      varselet.hjemmel === '34.1.2' ||
      varselet.hjemmel === '34.1.3' ||
      varselet.hjemmel === '34.4') &&
    !s.standpunkter.some((p) => p.art === 'rettidighet' && p.hjemmel === varselet.hjemmel)
  )
    ugyldig(
      s.id,
      `svaret på varselet etter punkt ${varselet.hjemmel} har ikke standpunktet til varselet`
    );
  else if (s.beslutningsgrunnlag.sammenfall)
    ugyldig(s.id, 'svaret på et varsel faller ikke sammen med et krav');
}

/** Spesifiseringen og rettidigheten i svaret `s` viser til det de kan gjelde. */
function kontrollerStandpunktet(
  s: Svar,
  p: Standpunkt,
  spor: Record<Spor, Sporutledning>,
  varsler: readonly LestVarsel[],
  besvart: readonly ForesporselOgSvar[],
  bakover: Bakover,
  sendt: GjaldtVedSvaret,
  regler: Regelsett,
  ugyldig: Ugyldig
): void {
  // HF-U1, VS-U4: spesifiseringen gjelder kravversjonen svaret gjelder.
  if (p.art === 'spesifisering' && p.gjelder !== s.gjelder)
    ugyldig(s.id, 'spesifiseringen viser ikke til kravet svaret gjelder');
  // VS-U95: begrunnelsen før svaret, og svaret på den første kravversjonen.
  if (
    p.art === 'ikke_svar' &&
    (!besvart.some((f) => f.svar === p.gjelder && !f.medKrav && f.kravFoer === null) ||
      !bakover(s.id, p.gjelder) ||
      [...spor.frist.krav, ...spor.frist.kravUtenforRekken].find((k) => k.id === s.gjelder)
        ?.erstatter !== null)
  )
    ugyldig(
      s.id,
      'standpunktet om at begrunnelsen ikke er et svar, viser ikke til en begrunnelse etter § 33.6.2 annet ledd b før svaret på det første fristkravet'
    );
  if (p.art !== 'rettidighet') return;
  const ekstraVarselsvar =
    p.hjemmel === '34.1.2' && (s.bareVarselet || varsler.some((v) => v.id === s.gjelder));
  if (ekstraVarselsvar) {
    const paaberopelse = spor.forhold.krav.find((k) => k.id === s.paaberopelse);
    if (p.gjelder !== s.gjelder || !hjemmelenGjelder('34.1.2', paaberopelse, regler)) {
      ugyldig(s.id, 'standpunktet etter punkt 34.1.2 gjelder ikke varselet svaret gjelder');
      return;
    }
  }
  // VS-U17, VS-U29: rettidigheten av svaret på en forespørsel gjelder kravet eller begrunnelsen som svarte.
  if (p.hjemmel === '33.6.2') {
    if (!besvart.some((f) => f.svar === p.gjelder) || !bakover(s.id, p.gjelder))
      ugyldig(
        s.id,
        'påberopelsen etter § 33.6.2 viser ikke til et svar på en forespørsel før svaret'
      );
    return;
  }
  // VS-U86 punkt 6 og 10: påberopelsen gjelder varselet `varseletFoerSvaret` gir, og en senere
  // versjon er ikke et nytt varsel. Et svar sendt før VS-U70 viser til det egne varselet,
  // og står med det (MM-U50). Etter § 34.3.3 og § 34.4 gjelder den kravposten (`kontrollerPostene`).
  if (erVarselhjemmel(p.hjemmel) && !erKravpostvarselhjemmel(p.hjemmel)) {
    const n = VARSELSPOR[p.hjemmel];
    const varslene = varsler.filter((v) => v.hjemmel === p.hjemmel);
    const foer = (v: string) => bakover(s.id, v);
    const krav = kravSomVarsler(p.hjemmel, spor[n], foer);
    const andreVarsler =
      p.hjemmel === '34.1.2' &&
      hjemmelenGjelder(
        '34.1.2',
        spor.forhold.krav.find((k) => k.id === s.paaberopelse),
        regler
      )
        ? varsler.filter((v) => varslerOgsaaEtter3412(v.hjemmel))
        : [];
    const dagen = (v: Pick<Krav, 'id' | 'dokument'>) => sendt(v, s);
    const tidligste = varseletFoerSvaret(
      p.hjemmel,
      [...varslene, ...andreVarsler],
      krav,
      foer,
      dagen
    );
    const eldreSvar =
      !ekstraVarselsvar && s.beslutningsgrunnlag.regelversjon < REGELVERSJON_VS_U98;
    const eget = varslene.find((v) => foer(v.id))?.id;
    const egetGjelder = (p.hjemmel !== '34.1.2' || eldreSvar) && p.gjelder === eget;
    // MM-U50: eldre svar kunne vise til kravet selv om et av de andre varslene kom først.
    const historisk =
      andreVarsler.length > 0 &&
      eldreSvar &&
      p.gjelder === varseletFoerSvaret(p.hjemmel, varslene, krav, foer, dagen);
    if (p.gjelder !== tidligste && !egetGjelder && !historisk)
      ugyldig(
        s.id,
        `påberopelsen etter § ${p.hjemmel} viser til ${p.gjelder}, men varselet før svaret er ${tidligste ?? 'ikke i saken'}`
      );
  }
}

/**
 * Svarene på én kravversjon, eller på ett varsel (VS-U77 punkt 33), er én kjede: ett første
 * svar, og hver revisjon erstatter det forrige. To første svar eller en forgrening gjør det tvetydig
 * hvilket svar som gjelder.
 */
function kontrollerSvarkjedene(spor: Record<Spor, Sporutledning>, ugyldig: Ugyldig): void {
  for (const n of SPOR) {
    // Kravpostvarslene fylles i sporet etter kontrollene, så varslene leses av svarene. Svarene
    // bare på varselet i en kravversjon er en egen kjede (VS-U96 punkt 38).
    const varslene = new Set(spor[n].svarPaaVarsler.map(svarkjeden));
    const kjedene = [
      ...spor[n].krav.map((k) => ({ gjelder: k.id, svarene: spor[n].svar })),
      ...[...varslene].map((v) => ({ gjelder: v, svarene: spor[n].svarPaaVarsler })),
    ];
    for (const { gjelder, svarene } of kjedene) {
      const paaKravet = svarene.filter((s) => svarkjeden(s) === gjelder);
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
 * Hvert utsagn som viser til et annet, viser bakover til noe det kan gjelde.
 * Et element uten virkning er bevart og vist (MM-U43 punkt 9), så et utsagn kan vise til det,
 * med samme krav til art og part.
 */
function kontrollerHenvisningene(
  henvisninger: readonly Henvisning[],
  elementer: Record<string, Element>,
  besvart: readonly ForesporselOgSvar[],
  bakover: Bakover,
  ugyldig: Ugyldig
): void {
  for (const x of henvisninger) {
    const maal = elementer[x.gjelder];
    if (!maal || !bakover(x.id, x.gjelder) || !kanGjelde(x.art, maal))
      ugyldig(x.id, `${x.art} viser ikke til noe den kan gjelde før den`);
    // KA-U1: én begrunnelse per forespørsel, og ikke etter at et krav har svart.
    else if (x.art === 'foresporselssvar' && !besvart.some((f) => f.svar === x.id))
      ugyldig(x.id, 'begrunnelsen svarer på en forespørsel som alt er besvart');
  }
}

/** Det utsagnet kan gjelde, etter arten. */
function kanGjelde(art: Henvisning['art'], maal: Element) {
  switch (art) {
    case 'foresporselssvar':
      // VS-U27: en forespørsel fra appen. Forespørselen er fra BH og svaret fra TE (format/leser.ts).
      return maal.art === 'foresporsel';
    case 'innlegg':
      // MM-U47 punkt 2: et brev i saken.
      return maal.art === 'dokument';
  }
}

/**
 * Punkt 8 og 18 i samlevedtaket for retting av sendt brev (MM-U59): rettingen viser til et varsel
 * eller et krav TE har lagt til som korrespondanse før den (D-1 og D-2 i BF-50).
 */
function kontrollerRettingene(
  rettinger: readonly Utsagn<'retting'>[],
  elementer: Record<string, Element>,
  dokumenter: ReadonlyMap<string, Dokument>,
  bakover: Bakover,
  ugyldig: Ugyldig
): void {
  for (const x of rettinger) {
    const maal = elementer[x.gjelder];
    const d = maal && dokumenter.get(maal.hendelse);
    if (
      !maal ||
      !d ||
      !bakover(x.id, x.gjelder) ||
      (maal.art !== 'krav' && maal.art !== 'varsel') ||
      maal.part !== 'TE' ||
      !erRegistrert(d.opplysninger)
    )
      ugyldig(
        x.id,
        'rettingen viser ikke til et varsel eller et krav totalentreprenøren har lagt til før den'
      );
  }
}

/** SK-12: høyst ett varsel per hjemmel, utenom § 34.3.3 og § 34.4 (VS-U48, VS-U52). */
function kontrollerVarslene(varsler: readonly LestVarsel[], ugyldig: Ugyldig): void {
  for (const hjemmel of Object.keys(VARSELSPOR) as Varselhjemmel[]) {
    if (erKravpostvarselhjemmel(hjemmel)) continue;
    const andre = varsler.filter((v) => v.hjemmel === hjemmel)[1];
    if (andre) ugyldig(andre.id, `saken har to varsler etter § ${hjemmel} (SK-12)`);
  }
}

/** Varslene, forespørslene, gjeldende krav og svar, og om sporet er trukket. */
function fyllSporene(
  spor: Record<Spor, Sporutledning>,
  varsler: readonly LestVarsel[],
  besvart: ForesporselOgSvar[],
  trekk: readonly Utsagn<'trekk'>[],
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
  }
  for (const n of KRAVSPOR) spor[n].trukket ||= spor.forhold.trukket;
}

/**
 * OV-U5, HF-U1, VS-U86 punkt 10: et svar står med virkningen det hadde, også når TE senere
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
      kunnskapsdato: null,
      forholdssvaret: null,
    };
  }
  return svar;
}

/**
 * Designdelen i samlevedtaket for retting av sendt brev (MM-U59): opplysningen om datoen som var
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

/**
 * U-8 i BF-48 (VS-U86 punkt 15): TEs siste opplysning om kunnskapsdatoen da svaret i vederlaget
 * ble sendt. For et svar lagt til teller ikke en opplysning sendt etter dagen svaret ble sendt.
 */
function settKunnskapsdatoene(
  svar: Record<string, Svarberegning>,
  kunnskapsdatoer: readonly Kunnskapsopplysning[],
  versjonen: (id: string) => number,
  dagen: (x: Pick<Svar, 'id' | 'dokument'>) => string | null
): void {
  for (const b of Object.values(svar)) {
    if (b.svar.spor !== 'vederlag') continue;
    const svaret = versjonen(b.svar.id);
    const sendt = dagen(b.svar);
    b.kunnskapsdato =
      sisteKunnskapsdato({
        kunnskapsdatoer: kunnskapsdatoer.filter(
          (o) => versjonen(o.id) < svaret && !foerDagen(sendt, dagen(o))
        ),
      })?.id ?? null;
  }
}

/** Dagen et svar ble sendt (OV-U98), og om det står i et brev lagt til. */
function dagene(journal: Domenehendelse[]) {
  const dokumentene = new Map([...dokumenterI(journal)].map((d) => [d.id, d]));
  const dokumentet = (x: Pick<Svar, 'id' | 'dokument'>) => {
    const d = dokumentene.get(x.dokument);
    if (!d) throw new Error(`${x.id} står ikke i et dokument i journalen.`);
    return d;
  };
  return {
    dagen: (x: Pick<Svar, 'id' | 'dokument'>) =>
      dagenSendt({ id: x.id, dokument: x.dokument }, dokumentet(x)),
    lagtTil: (x: Svar) => erRegistrert(dokumentet(x).opplysninger),
  };
}

/**
 * `Svarberegning.forholdssvaret` for hvert svar på vederlag og frist: svaret på forholdet i samme
 * brev, ellers `forholdssvaretPaaDagen`, som frysingen leser (#2057).
 */
function settForholdssvarene(
  svar: Record<string, Svarberegning>,
  forhold: Svar[],
  utenforRekken: Svar[],
  versjonen: (id: string) => number,
  { dagen, lagtTil }: ReturnType<typeof dagene>
): void {
  // OV-U32: svaret på forholdet i samme brev, også et svar utenfor rekken (OV-U103).
  const iBrevet = [...forhold, ...utenforRekken];
  for (const b of Object.values(svar)) {
    const s = b.svar;
    if (s.spor === 'forhold') continue;
    const kilde =
      iBrevet.find((g) => g.dokument === s.dokument) ??
      (s.paaberopelse === null
        ? undefined
        : forholdssvaretPaaDagen(
            forhold.filter((g) => versjonen(g.id) < versjonen(s.id)),
            utenforRekken.filter((g) => versjonen(g.id) < versjonen(s.id)),
            s.paaberopelse,
            lagtTil(s) ? dagen(s) : null,
            dagen
          ));
    b.forholdssvaret = kilde?.id ?? null;
  }
}

/**
 * Enigheten i hvert spor: en aksept av svaret, eller sammenfall i svaret. Enigheten om det gjeldende
 * svaret er `enighet`, og enighetene om de andre svarene `enigheterOmEldreSvar` (OV-U110).
 */
function settEnighetene(
  spor: Record<Spor, Sporutledning>,
  aksepter: readonly Utsagn<'aksept'>[],
  hendelsen: (id: string) => string,
  versjonen: (id: string) => number
): void {
  const aksepten = new Map(aksepter.map((a) => [a.gjelder, a]));
  const enighetOm = (s: Svar): Enighet | null => {
    const aksept = aksepten.get(s.id);
    if (aksept) return { grunnlag: enighetsgrunnlag(s, 'aksept'), holder: hendelsen(aksept.id) };
    if (s.beslutningsgrunnlag.sammenfall)
      return { grunnlag: enighetsgrunnlag(s, 'sammenfall'), holder: s.id };
    return null;
  };
  for (const n of SPOR) {
    const g = spor[n].gjeldendeSvar;
    spor[n].enighet = g ? enighetOm(g) : null;
    spor[n].enigheterOmEldreSvar = [...spor[n].svar, ...spor[n].svarUtenforRekken]
      .filter((s) => s !== g)
      .sort((a, b) => versjonen(a.id) - versjonen(b.id))
      .flatMap((s) => enighetOm(s) ?? []);
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
  if (spor !== 'forhold' && (forholdetErAvvistVedEnighet(u) || u.spor[spor].trukket))
    return 'uten_virkning';
  return e.grunnlag.vilkaar === null || u.forholdAvklart ? 'virksom' : 'betinget';
}

/**
 * OV-U3: kravene er avgjort når forholdet er avklart etter GR-U7, TE har sendt minst
 * ett vederlags- eller fristkrav, og hvert vederlags- og fristkrav TE har sendt, er
 * trukket eller har en virksom enighet. Et spor uten krav hindrer ikke; et varsel er
 * ikke et krav (KA-U2). Predikatet leses av utsagnene og relasjonene, ikke av en status:
 * `enighetensVirkning` er selv et predikat av enigheten, forholdet og trekkene. Det er
 * en opplysning i visningen, og ingen regel sperrer etter det (MM-U34 punkt 12).
 */
export function kraveneErAvgjort(u: Utledning): boolean {
  const sendt = (n: Kravspor) => u.spor[n].krav.length > 0;
  return (
    u.forholdAvklart &&
    KRAVSPOR.some(sendt) &&
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
    if (d.id === utsagn.dokument) return dagenSendt(utsagn, d);
  }
  throw new Error(`${utsagn.id} står ikke i et dokument i journalen.`);
}

/**
 * Punkt 19 i samlevedtaket for retting av sendt brev (MM-U59): dagen som gjelder for kravet eller
 * varselet etter TEs rettinger, som premiss for nye svar og for det første varselet løsningen
 * kjenner (VS-U86). Uten en retting som har begynt å gjelde, er det `datoenDetBleSendt`.
 */
export const datoenSomGjelder = (
  u: Pick<Utledning, 'journal' | 'rettinger'>,
  utsagn: Pick<Krav, 'id' | 'dokument'>
): string | null => datoEtterRettingene(u.rettinger, utsagn.id, datoenDetBleSendt(u, utsagn));

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
 * HF-U35 punkt 9, HF-U37: TE har godtatt et svar som avslår forholdet, så saken er lukket,
 * og et svar eller en aksept i sporet avvises (`strid`). Et trukket forhold lukker hvert spor
 * gjennom `trukket` (GR-U5).
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
 * ikke lukket, så et svar ville blitt godtatt (HF-U35 punkt 9). En ny påberopelsesversjon etter et
 * frafall venter på svar (GR-U23).
 */
export function venterPaaSvar(u: Utledning, spor: Spor): boolean {
  const s = u.spor[spor];
  return s.gjeldendeKrav !== null && s.gjeldendeSvar === null && !s.trukket && !sporetErLukket(u);
}

/**
 * MM-U24: byggherrens gjeldende svar i sporet står uten enighet, kravet er ikke trukket,
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
 * OV-U5, OV-U24, OV-U102: kravene som kan være det første varselet løsningen kjenner etter
 * hjemmelen: den første kravversjonen som varsler, og hvert krav utenfor rekken som står før
 * svaret (`foer`). Etter § 34.1.3 varsler bare et krav som krever posten etter annet ledd.
 */
export function kravSomVarsler(
  hjemmel: Enkeltvarselhjemmel,
  s: Pick<Sporutledning, 'krav' | 'kravUtenforRekken'>,
  foer: (krav: string) => boolean
): readonly Krav[] {
  const varsler = (k: Krav) => varslerEtter(hjemmel, k);
  const [foerste] = s.krav.filter(varsler);
  return [
    ...(foerste ? [foerste] : []),
    ...s.kravUtenforRekken.filter((k) => varsler(k) && foer(k.id)),
  ];
}

/**
 * OV-U102 og VS-U98: det som ble sendt først. Med samme dato, eller uten dato, gjelder det
 * første i lista.
 */
function foerstSendt<K>(elementer: readonly K[], sendt: (k: K) => string | null): K | undefined {
  let foerst: K | undefined;
  for (const k of elementer) {
    const dato = sendt(k);
    const tidligste = foerst === undefined ? null : sendt(foerst);
    if (foerst === undefined || (dato !== null && tidligste !== null && dato < tidligste))
      foerst = k;
  }
  return foerst;
}

/**
 * VS-U20, OV-U5, HF-U1, VS-U86 punkt 6: varselet en påberopelse etter § 32.2, § 33.4, § 34.1.2
 * eller § 34.1.3 gjelder: varselet etter hjemmelen som var registrert da svaret ble sendt,
 * ellers det første kravet som varsler (`kravSomVarsler`), som er det første varselet appen
 * kjenner (arbeidsvalgene i #309 og #479, OV-U24). Etter § 33.4, § 34.1.2 og § 34.1.3 gjelder
 * påberopelsen det av dem som ble sendt først (VS-U70, VS-U66); med samme dato, eller uten
 * en dato for kravet, det egne varselet. Vilkåret i E3 om en tidligere dato for § 32.2 er ikke
 * bygget (#1600).
 * VS-U98: etter § 34.1.2 kommer et uttrykkelig varsel først i lista, så de øvrige i journalrekkefølge.
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
  const eget = foerstSendt(
    varsler.filter((v) => foerSvaret(v.id)),
    sendt
  );
  const kravet = foerstSendt(krav, sendt);
  if (!eget || !kravet || !datoenSammenliknes(hjemmel)) return eget?.id ?? kravet?.id;
  const [varselet, kravetSendt] = [sendt(eget), sendt(kravet)];
  if (kravetSendt === null) return eget.id;
  return varselet === null || kravetSendt < varselet ? kravet.id : eget.id;
}

/**
 * Varselet en påberopelse etter hjemmelen gjelder i et nytt svar (#766). For et svar lagt til
 * er `sendt` datoen byggherren har oppgitt.
 */
export function varseletForNyttSvar(
  u: Utledning,
  hjemmel: Enkeltvarselhjemmel,
  sendt: string | null = null
): string {
  const varsel = varseletFoerBrevet(u, hjemmel, sendt);
  if (varsel === undefined)
    throw new Error(`Et svar kan ikke påberope § ${hjemmel} uten varsel eller krav som varsler.`);
  return varsel;
}

/**
 * Varselet etter hjemmelen saken har før et nytt brev, slik `varseletForNyttSvar` leser det, eller
 * `undefined` når saken ikke har noe. Brevteksten for vederlagskravet viser til det (#1824).
 */
export function varseletFoerBrevet(
  u: Utledning,
  hjemmel: Enkeltvarselhjemmel,
  sendt: string | null = null
): string | undefined {
  const s = u.spor[VARSELSPOR[hjemmel]];
  const registrert = s.varsler[hjemmel];
  const varslene = registrert ? [registrert] : [];
  if (hjemmel === '34.1.2' && !varselEtter3412KrevesIkke(u, sendt)) {
    const andre = new Set([s.varsler['34.1.3']?.id, ...s.kravpostvarsler.map((v) => v.id)]);
    for (const d of dokumenterI(u.journal))
      for (const v of d.utsagn)
        if (v.art === 'varsel' && andre.has(v.id) && varslerOgsaaEtter3412(v.hjemmel))
          varslene.push(v);
  }
  const krav = kravSomVarsler(hjemmel, s, () => true);
  const medDatoene = medRettingeneTil(u, sendt);
  return varseletFoerSvaret(
    hjemmel,
    varslene,
    krav,
    () => true,
    (v) => datoenSomGjelder(medDatoene, v)
  );
}

/** VS-U100: kan svaret på varselet også ta stilling etter § 34.1.2? */
export function varseletGjelderOgsaa3412(
  u: Utledning,
  gjelder: string,
  hjemmel: Varselhjemmel | null,
  sendt: string | null
): boolean {
  const { svar, svarUtenforRekken } = u.spor.vederlag;
  return (
    (hjemmel === null || varslerOgsaaEtter3412(hjemmel)) &&
    !varselEtter3412KrevesIkke(u, sendt) &&
    varseletFoerBrevet(u, '34.1.2', sendt) === gjelder &&
    ![...svar, ...svarUtenforRekken].some(
      (s) => sendt === null || !foerDagen(sendt, datoenDetBleSendt(u, s))
    )
  );
}
