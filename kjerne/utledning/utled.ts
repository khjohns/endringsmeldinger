/**
 * `utled(journal, regler)`: predikatene kjernen regner av journalen (2.6 i
 * modellforslaget). Kommandoene, handlingene og visningen leser denne
 * utledningen. Den har ingen status; statusen er en etikett i visningen.
 *
 * Det er én beregning per svar, som alle leser:
 * - brevet slik det ble sendt: virkningene i beslutningsgrunnlaget (MM-U9);
 * - en eventuell enighet: en aksept av svaret, eller sammenfall i brevet. Innholdet
 *   er brevets (KA-U10, MM-U3);
 * - predikatene av relasjonene: hva svaret `gjelder`, hva det `erstatter`, om
 *   en rettidighetsvurdering gjelder det registrerte varselet (MM-U8), og om
 *   vilkåret for enigheten er oppfylt (GR-U7).
 *
 * Regelsettet brukes ikke til å vurdere et sendt brev på nytt. Relasjonene
 * bestemmer, ikke rekkefølgen: hver referanse leses etter lesereglene i 4.2 i
 * designnotatet, og gjeldende svar er svaret på gjeldende krav som ikke er
 * erstattet. Løses en relasjon ikke entydig, eller er en hendelse
 * ukjent, er saken ikke forstått, og ingenting utledes (MM-U2, 2.7 regel 1).
 */

import { erRegistrert, sammeSlag } from '../format/leser.ts';
import type { Regelsett } from '../regler/regelsett.ts';
import type { Subsidiaergrunn } from '../regler/grunnlag.ts';
import {
  blirEndringsordre,
  enighetsgrunnlag,
  grunnerFraGrunnlaget,
  grunnlagetErAvklart,
  innsigelsenPaaberoper,
  prinsipalt,
  sammenfallStemmer,
  standpunktet,
} from '../frosset/standpunkt.ts';
import { senketInnroemmelse } from './innroemmelse.ts';
import {
  KRAVSPOR,
  SPOR,
  type Dokument,
  type Domenehendelse,
  type Enighetsgrunnlag,
  type Hjemmel,
  type Krav,
  type LestOpplysning,
  type LestUtsagn,
  type Opplysningsslag,
  type Part,
  type Spor,
  type Standpunktsvirkning,
  type Svar,
} from '../typer.ts';

export interface Svarberegning {
  svar: Svar;
  /** Virkningen standpunktene hadde slik brevet uttrykte dem (MM-U9). */
  virkninger: Standpunktsvirkning[];
  /**
   * Standpunktene etter § 33.4 som gjelder et annet varsel enn det som er registrert nå.
   * Svaret står med sin virkning (OV-U5), og bare visningen leser dette.
   */
  gjaldtEtAnnetVarsel: string[];
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
  /** TE har trukket kravet, eller grunnlaget som bærer det (GR-U5, SD-02). */
  trukket: boolean;
  /** TE har sagt at det ikke kreves noe i sporet (KA-U12). */
  ingenKrav: boolean;
  /** Det registrerte varselet etter § 33.4; bare fristen. */
  varsel: Extract<LestUtsagn, { art: 'varsel' }> | null;
  /** Hvorfor hele svaret i sporet er subsidiært til grunnlaget; tomt for grunnlaget. */
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
export const KAN_FAA_INNSIGELSE: ReadonlySet<Element['art']> = new Set(['krav', 'svar', 'varsel']);

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
   * MM-U18, MM-U19: elementer i et registrert brev
   * som strider mot en enighet eller mot at saken er lukket. Brevet bevares og
   * vises, elementet har ingen virkning på utfallet, og ingenting sperres. Det er
   * appens vurdering, atskilt fra det parten sa (HF-U2, MM-U12).
   */
  utenVirkning: { element: string; hendelse: string; grunn: string }[];
  spor: Record<Spor, Sporutledning>;
  /**
   * GR-U7: byggherren har godkjent grunnlaget uten virksom preklusjon etter
   * § 32.2, eller frafalt pålegget, etter brevet eller enigheten om det. Venter en ny
   * grunnlagsversjon på svar etter et frafall som binder, er grunnlaget avklart ved
   * frafallet (GR-U23).
   */
  grunnlagAvklart: boolean;
  /** SK-01, #213, MM-U13: TE har godtatt et grunnlagssvar som ikke avklarer grunnlaget etter GR-U7. */
  grunnlagAvvist: boolean;
  /**
   * GR-U3, GR-U9: byggherren har frafalt pålegget (§ 32.3 c). Er ikke en enighet. Gjelder
   * også mens en ny grunnlagsversjon venter på svar etter et frafall som binder (GR-U23).
   */
  frafalt: boolean;
  /**
   * Om byggherrens godkjenning av grunnlaget er en endringsordre etter § 32.3
   * første ledd a med § 31.3 (GR-U10, GR-U12, GR-U13): godkjent uten påberopt
   * preklusjon i en kategori § 32.2 gjaldt for, i et brev sendt fra appen. En
   * registrert endringsordre etter OV-U6 er `nei`: opplysningen fra byggherren
   * vises, men gir ingen egen virkning i appen.
   */
  endringsordre: 'ja' | 'nei';
}

const tomtSpor = (): Sporutledning => ({
  krav: [],
  gjeldendeKrav: null,
  svar: [],
  gjeldendeSvar: null,
  enighet: null,
  trukket: false,
  ingenKrav: false,
  varsel: null,
  subsidiaer: [],
});

const tommeSpor = (): Record<Spor, Sporutledning> => ({
  grunnlag: tomtSpor(),
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
    utenVirkning: [],
    spor: tommeSpor(),
    grunnlagAvklart: false,
    grunnlagAvvist: false,
    frafalt: false,
    endringsordre: 'nei',
  };
}

/** Svarene på kravet som ikke er erstattet. Flere enn ett er en tvetydig relasjon. */
function ikkeErstattet(svar: Svar[], kravId: string): Svar[] {
  const paaKravet = svar.filter((s) => s.gjelder === kravId);
  const erstattet = new Set(paaKravet.map((s) => s.erstatter).filter((e) => e !== null));
  return paaKravet.filter((s) => !erstattet.has(s.id));
}

/** Elementene i et dokument som kan endre utfallet (KA-U11). Andre utsagn har ingen virkning på det. */
const ENDRER_UTFALLET = new Set<string>(['aksept', 'trekk', 'ingen_krav', 'varsel']);

const kanStride = (d: Dokument): boolean =>
  d.krav.length > 0 ||
  d.svar.length > 0 ||
  d.utsagn.some((x) => ENDRER_UTFALLET.has(x.art) || x.art === 'innsigelse');

interface Strid {
  element: string;
  grunn: string;
}

/**
 * OV-U6: byggherrens registrerte endringsordre er svaret på grunnlaget når den er en
 * godkjenning uten påberopt preklusjon i en underkategori der § 32.2 gjelder, og
 * byggherren oppgir i brevet at det er en endringsordre etter § 31.3.
 */
const erRegistrertEndringsordre = (s: Svar, d: Dokument): boolean =>
  s.spor === 'grunnlag' &&
  blirEndringsordre(s.beslutningsgrunnlag) &&
  d.opplysninger.some((o) => o.hva === 'endringsordre' && o.brev === s.dokument && o.oppfylt);

/**
 * OV-U4: kravene, svarene, akseptene og trekkene i et registrert brev er dokumentasjon
 * og får ingen virkning. Unntaket er OV-U6. Et varsel med datoen TE oppgir, har
 * virkning (OV-U5).
 */
function dokumentasjonIBrevet(d: Dokument): Set<string> {
  if (!erRegistrert(d.opplysninger)) return new Set();
  return new Set([
    ...d.krav.map((k) => k.id),
    ...d.svar.filter((s) => !erRegistrertEndringsordre(s, d)).map((s) => s.id),
    ...d.utsagn.filter((x) => x.art === 'aksept' || x.art === 'trekk').map((x) => x.id),
  ]);
}

/**
 * MM-U18: elementene i dokumentet som ikke kan forstås i samsvar med journalen før
 * det og vedtakene om enighet og lukking: en ny kravversjon eller en revisjon i et
 * spor med enighet (KA-U7, GR-U10), en ny kravversjon i et trukket spor eller et spor
 * med «ingen krav» (GR-U5, KA-U12), et svar eller en aksept i et trukket spor
 * (MM-U20), et avslag av grunnlaget eller en påberopelse etter § 32.2 når frafallet
 * binder (GR-U17, GR-U20), en aksept av et frafall (GR-U9) eller av et svar
 * partene alt er enige om (GR-U8, KA-U7), noe som endrer
 * utfallet etter at kravene er avgjort eller avslaget av grunnlaget er godtatt
 * (KA-U11, SK-01), og det som viser til et element uten virkning. Kontrollen
 * gjelder bare disse vedtakene, ikke vilkårene for å sende, så en strengere
 * forutsetning senere gjør ikke et eldre brev uforstått. Bindingen etter frafallet er
 * et slikt vedtak og gjelder også et avslag fra appen før PROJEKSJONSVERSJON 20, som
 * journalen ikke skiller fra en rad utenfor kommandoene (B-17, #510).
 */
function strid(d: Dokument, u: Utledning, uten: Map<string, unknown>): Strid[] {
  const ut: Strid[] = [];
  const lukket = u.grunnlagAvvist
    ? 'TE har godtatt avslaget av grunnlaget (SK-01)'
    : kraveneErAvgjort(u)
      ? 'kravene er avgjort (KA-U11)'
      : null;
  const utenVirkning = (...id: (string | null)[]) => id.some((x) => x !== null && uten.has(x));
  const bundet = frafalletBinder(u);
  for (const k of d.krav)
    if (lukket) ut.push({ element: k.id, grunn: `en kravversjon etter at ${lukket}` });
    else if (u.spor[k.spor].trukket)
      ut.push({ element: k.id, grunn: 'en kravversjon etter at kravet er trukket (GR-U5)' });
    else if (u.spor[k.spor].ingenKrav)
      ut.push({ element: k.id, grunn: 'en kravversjon i et spor med «ingen krav» (KA-U12)' });
    else if (u.spor[k.spor].enighet)
      ut.push({ element: k.id, grunn: 'en ny kravversjon i et spor med enighet (KA-U7)' });
    else if (utenVirkning(k.erstatter))
      ut.push({ element: k.id, grunn: 'kravversjonen erstatter en kravversjon uten virkning' });
  for (const s of d.svar)
    if (lukket) ut.push({ element: s.id, grunn: `et svar etter at ${lukket}` });
    else if (s.erstatter !== null && u.spor[s.spor].enighet)
      ut.push({
        element: s.id,
        grunn: 'en revisjon av et svar partene er enige om (GR-U10, KA-U7)',
      });
    else if (utenVirkning(s.gjelder, s.erstatter, s.grunnlagskrav))
      ut.push({ element: s.id, grunn: 'svaret viser til et element uten virkning' });
    else if (u.spor[s.spor].trukket)
      ut.push({
        element: s.id,
        grunn: 'et svar på et krav etter at det er trukket (MM-U20, GR-U5)',
      });
    else if (
      bundet &&
      s.spor === 'grunnlag' &&
      standpunktet(s, 'grunnlag')?.resultat === 'avslaatt'
    )
      ut.push({
        element: s.id,
        grunn: 'et avslag av grunnlaget etter at byggherren har frafalt pålegget (GR-U17, GR-U20)',
      });
    else if (bundet && s.spor === 'grunnlag' && paaberoperVarselet(s))
      ut.push({
        element: s.id,
        grunn:
          'en påberopelse etter § 32.2 etter at byggherren har frafalt pålegget (GR-U17, GR-U20)',
      });
  for (const x of d.utsagn) {
    if (!ENDRER_UTFALLET.has(x.art)) continue;
    const gjelder = 'gjelder' in x ? x.gjelder : null;
    /** Sporet med svaret en aksept gjelder. */
    const sporet =
      x.art === 'aksept'
        ? SPOR.find((n) => u.spor[n].svar.some((s) => s.id === x.gjelder))
        : undefined;
    if (lukket) ut.push({ element: x.id, grunn: `${x.art} etter at ${lukket}` });
    else if (utenVirkning(gjelder))
      ut.push({ element: x.id, grunn: `${x.art} viser til et element uten virkning` });
    else if (sporet && u.spor[sporet].trukket)
      ut.push({
        element: x.id,
        grunn: 'en aksept av et svar i et spor etter at kravet er trukket (MM-U20, GR-U5)',
      });
    else if (x.art === 'aksept' && x.gjelder === u.spor.grunnlag.gjeldendeSvar?.id && u.frafalt)
      ut.push({ element: x.id, grunn: 'en aksept av et frafall (GR-U9)' });
    else if (sporet && u.spor[sporet].enighet && u.spor[sporet].gjeldendeSvar?.id === gjelder)
      ut.push({
        element: x.id,
        grunn: 'en aksept av et svar partene alt er enige om (GR-U8, KA-U7)',
      });
  }
  return ut;
}

/**
 * MM-U27: elementene i en hendelse som ikke er et registrert brev, og som byggherren ikke
 * kunne sendt fra appen fordi hen er bundet av et svar sendt fra appen: en påberopelse av
 * at et varsel eller krav kom for sent etter at hen har sagt at det kom i tide (HF-U4),
 * og en revisjon som senker det hen har innrømmet i et svar TE ikke har godtatt (HF-U5).
 * Samme kontroller som kommandoene, så journalen henger sammen også utenfor dem.
 */
function bryterBindingen(d: Dokument, u: Utledning, regler: Regelsett): Strid[] {
  const ut: Strid[] = [];
  const sagtITide =
    'påberoper at det kom for sent, etter at byggherren har sagt at det kom i tide (HF-U4, MM-U27)';
  for (const s of d.svar) {
    const paaberopt = s.standpunkter.some(
      (p) =>
        (p.art === 'rettidighet' && !p.iTide && harSagtITide(u, s.spor, { hjemmel: p.hjemmel })) ||
        (p.art === 'spesifisering' &&
          !p.iTide &&
          harSagtITide(u, s.spor, { hjemmel: '33.6.1', gjelder: p.gjelder }))
    );
    const forrige = u.spor[s.spor].gjeldendeSvar;
    if (paaberopt) ut.push({ element: s.id, grunn: `et svar som ${sagtITide}` });
    else if (
      s.erstatter !== null &&
      forrige?.id === s.erstatter &&
      senketInnroemmelse(forrige, s.standpunkter)
    )
      ut.push({
        element: s.id,
        grunn:
          'en revisjon som senker det byggherren har innrømmet i et svar TE ikke har godtatt (HF-U5, MM-U27)',
      });
  }
  for (const x of d.utsagn) {
    if (x.art !== 'innsigelse') continue;
    const maal = u.elementer[x.gjelder];
    const hjemmel = innsigelsenPaaberoper(
      maal && { art: maal.art, krav: u.spor.grunnlag.krav.find((k) => k.id === x.gjelder) },
      regler
    );
    if (hjemmel && harSagtITide(u, hjemmel === '33.4' ? 'frist' : 'grunnlag', { hjemmel }))
      ut.push({ element: x.id, grunn: `en innsigelse som ${sagtITide}` });
  }
  return ut;
}

/**
 * Utledningen av journalen. Hvert dokument kontrolleres mot journalen før det
 * (MM-U18, `strid`): en strid i en hendelse som ikke er et registrert brev, gjør
 * saken ikke forstått, og i et registrert brev får elementet ingen virkning.
 */
export function utled(journal: Domenehendelse[], regler: Regelsett): Utledning {
  const uten = new Map<string, { hendelse: string; grunn: string }>();
  const konflikter: Utledning['begrensninger'] = [];
  for (const [i, h] of journal.entries()) {
    if (h.art !== 'dokument' || !kanStride(h.dokument)) continue;
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
    // MM-U27: bare utenfor et registrert brev, og én grunn per element.
    if (!registrert)
      for (const x of bryterBindingen(h.dokument, foer, regler))
        if (!stridene.some((y) => y.element === x.element))
          konflikter.push({ hendelse: h.id, grunn: x.grunn });
    if (konflikter.length) break;
  }
  const u = utledSporene(journal, regler, uten);
  return konflikter.length ? tom(journal, regler, [...u.begrensninger, ...konflikter]) : u;
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
  const aksepter: Extract<LestUtsagn, { art: 'aksept' }>[] = [];
  const trekk: Extract<LestUtsagn, { art: 'trekk' }>[] = [];
  const bestridelser: Extract<LestUtsagn, { art: 'bestridelse' }>[] = [];
  const ingenKrav: Extract<LestUtsagn, { art: 'ingen_krav' }>[] = [];
  const varsler: Extract<LestUtsagn, { art: 'varsel' }>[] = [];
  const henvisninger: Extract<
    LestUtsagn,
    { art: 'innsigelse' | 'protest' | 'passivitet' | 'begrunnelse' }
  >[] = [];
  const opplysninger: LestOpplysning[] = [];
  /** Hvert krav i saken, også de uten virkning (MM-U18). */
  const kravMedUten = new Map<string, Krav>();
  const dobbelt = new Set<string>();
  const plasser = (id: string, h: { id: string; versjon: number }) => {
    if (plass.has(id)) dobbelt.add(id);
    plass.set(id, { hendelse: h.id, versjon: h.versjon });
  };
  const registrer = (id: string, h: { id: string }, part: Part, art: Element['art']) =>
    (elementer[id] = { hendelse: h.id, part, art });

  for (const h of journal) {
    if (h.art === 'ukjent') {
      begrensninger.push({ hendelse: h.id, grunn: h.grunn });
      continue;
    }
    plasser(h.id, h);
    if (h.art === 'sak') continue;
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
      if (!harVirkning(u.id)) continue;
      if (u.art === 'aksept') aksepter.push(u);
      else if (u.art === 'trekk') trekk.push(u);
      else if (u.art === 'bestridelse') bestridelser.push(u);
      else if (u.art === 'ingen_krav') ingenKrav.push(u);
      else if (u.art === 'varsel') varsler.push(u);
      else henvisninger.push(u);
    }
    for (const o of d.opplysninger) {
      plasser(o.id, h);
      registrer(o.id, h, d.avsender, 'opplysning');
    }
    opplysninger.push(...d.opplysninger);
  }

  // Lesereglene i 4.2: hver referanse finnes i saken, har riktig art og spor, og
  // peker på en rad med lavere saksversjon. Ingen referanse løses etter plassen i
  // journalen.
  const alleSvar = new Map(SPOR.flatMap((n) => spor[n].svar).map((s) => [s.id, s]));
  const alleKrav = new Map(SPOR.flatMap((n) => spor[n].krav).map((k) => [k.id, k]));
  const alleOpplysninger = new Map(opplysninger.map((o) => [o.id, o]));
  const ugyldig = (id: string, grunn: string) =>
    begrensninger.push({ hendelse: plass.get(id)?.hendelse ?? id, grunn });
  const bakover = (fra: string, til: string) =>
    (plass.get(til)?.versjon ?? Infinity) < (plass.get(fra)?.versjon ?? -Infinity);
  for (const id of dobbelt) ugyldig(id, 'to elementer i saken har samme ID');
  const dokumenter = new Map(
    journal.flatMap((h) => (h.art === 'dokument' ? [[h.id, h.dokument] as const] : []))
  );
  /** Avsenderen av dokumentet elementet står i. */
  const avsenderAv = (id: string): Part | undefined =>
    dokumenter.get(plass.get(id)?.hendelse ?? '')?.avsender;

  for (const n of SPOR) {
    // Kravversjonene i sporet er én kjede: den første erstatter ingenting, og hver
    // neste erstatter den forrige (KA-U2).
    spor[n].krav.forEach((k, i) => {
      const forrige = spor[n].krav[i - 1]?.id ?? null;
      if (k.erstatter !== forrige)
        ugyldig(k.id, 'kravversjonene i sporet er ikke én kjede der hver erstatter den forrige');
    });
  }
  for (const s of alleSvar.values()) {
    if (alleKrav.get(s.gjelder)?.spor !== s.spor || !bakover(s.id, s.gjelder))
      ugyldig(s.id, 'svaret viser til et krav som ikke står før det i sporet');
    if (s.erstatter !== null) {
      const forrige = alleSvar.get(s.erstatter);
      if (!forrige || forrige.gjelder !== s.gjelder || !bakover(s.id, s.erstatter))
        ugyldig(s.id, 'revisjonen erstatter et svar som ikke står før den på samme krav');
    }
    // #342, HF-U1: et svar på vederlag eller frist viser til grunnlagsversjonen det ble regnet mot.
    if (
      (s.spor === 'grunnlag') !== (s.grunnlagskrav === null) ||
      (s.grunnlagskrav !== null &&
        (alleKrav.get(s.grunnlagskrav)?.spor !== 'grunnlag' || !bakover(s.id, s.grunnlagskrav)))
    )
      ugyldig(s.id, 'svaret viser ikke til en grunnlagsversjon før det');
    // MM-U18: sammenfallet er appens vurdering av samme brev og må stemme med standpunktene.
    if (!sammenfallStemmer(s))
      ugyldig(s.id, 'sammenfallet stemmer ikke med standpunktene i brevet (GR-U10, MM-U18)');
    for (const p of s.standpunkter) {
      // HF-U1, VS-U4: spesifiseringen gjelder kravversjonen svaret gjelder.
      if (p.art === 'spesifisering' && p.gjelder !== s.gjelder)
        ugyldig(s.id, 'spesifiseringen viser ikke til kravet svaret gjelder');
      if (p.art !== 'rettidighet') continue;
      // Arbeidsvalget i #479: påberopelsen etter § 34.1.2 gjelder det første vederlagskravet,
      // det første varselet appen kjenner (OV-U5).
      if (p.hjemmel === '34.1.2') {
        if (p.gjelder !== spor.vederlag.krav[0]?.id)
          ugyldig(s.id, 'påberopelsen etter § 34.1.2 viser ikke til det første vederlagskravet');
        continue;
      }
      if (p.hjemmel === '33.4') {
        if (p.gjelder !== varseletFoerSvaret(varsler, spor.frist.krav, (v) => bakover(s.id, v)))
          ugyldig(
            s.id,
            'påberopelsen etter § 33.4 viser ikke til varselet før svaret eller, uten varsel, det første fristkravet'
          );
        continue;
      }
      // Etter § 32.2 gjelder rettidigheten kravet.
      if (p.gjelder !== s.gjelder) ugyldig(s.id, 'rettidigheten viser ikke til kravet');
    }
  }
  // Svarene på én kravversjon er én kjede: ett første svar, og hver revisjon
  // erstatter det forrige. To første svar eller en forgrening gjør det tvetydig
  // hvilket svar som gjelder.
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
  for (const a of aksepter) {
    if (!alleSvar.has(a.gjelder) || !bakover(a.id, a.gjelder))
      ugyldig(a.id, 'aksepten viser til et svar som ikke står før den');
    // GR-U8: et svar som godkjenner hele kravet, kan ikke godtas. KA-U7: en enighet
    // inngås én gang, så to aksepter av samme svar er tvetydige.
    else if (alleSvar.get(a.gjelder)!.beslutningsgrunnlag.sammenfall)
      ugyldig(a.id, 'aksepten gjelder et svar partene alt er enige om ved sammenfall');
    else if (aksepter.filter((x) => x.gjelder === a.gjelder).length > 1)
      ugyldig(a.id, 'svaret er godtatt to ganger');
  }
  for (const t of trekk) {
    // Trekket gjelder sporets gjeldende kravversjon da det ble registrert.
    const k = alleKrav.get(t.gjelder);
    const gjeldende = k && spor[k.spor].krav.filter((x) => bakover(t.id, x.id)).at(-1);
    if (!k || gjeldende?.id !== k.id)
      ugyldig(t.id, 'trekket viser ikke til gjeldende kravversjon i sporet');
  }
  // OV-U13: opplysningen om § 31.3 står bare i brevet med byggherrens endringsordre som svar
  // på grunnlaget (OV-U6). En senere avklaring og to opplysninger i samme brev avvises av
  // leseren.
  for (const o of opplysninger) {
    if (o.hva !== 'endringsordre') continue;
    const brev = dokumenter.get(o.brev)!;
    if (!brev.svar.some((s) => erRegistrertEndringsordre(s, brev)))
      ugyldig(
        o.id,
        'opplysningen om § 31.3 står ikke ved byggherrens endringsordre som svar på grunnlaget (OV-U6, OV-U13)'
      );
  }
  // OV-U12: endringsordren er svar på en kravversjon sendt fra appen, eller revisjon av et
  // svar sendt fra appen, ikke av et krav eller svar som bare er dokumentasjon.
  for (const s of spor.grunnlag.svar) {
    if (!elementer[s.dokument]?.registrertBrev) continue;
    const fraAppen = (e: { dokument: string } | undefined) =>
      e !== undefined && !elementer[e.dokument]?.registrertBrev;
    if (
      !fraAppen(alleKrav.get(s.gjelder)) ||
      (s.erstatter !== null && !fraAppen(alleSvar.get(s.erstatter)))
    )
      ugyldig(
        s.id,
        'endringsordren viser til et krav eller svar som bare er registrert som dokumentasjon (OV-U12)'
      );
  }
  // § 5 og VS-U12: hvert utsagn som viser til et annet, viser bakover til noe det kan
  // gjelde. Innsigelsen og protesten gjelder motparten (VS-U1, VS-U14, MP-U6).
  // Et element uten virkning er bevart og vist (MM-U18), så et utsagn kan vise til det,
  // med samme krav til art og part.
  for (const x of henvisninger) {
    const maal = elementer[x.gjelder];
    if (
      !maal ||
      !bakover(x.id, x.gjelder) ||
      !kanGjelde(x.art, maal, elementer[x.id].part, x.gjelder)
    )
      ugyldig(x.id, `${x.art} viser ikke til noe den kan gjelde før den`);
  }
  /** Det utsagnet kan gjelde, etter arten. */
  function kanGjelde(
    art: (typeof henvisninger)[number]['art'],
    maal: Element,
    part: Part,
    id: string
  ) {
    switch (art) {
      case 'innsigelse':
        return kanFaaInnsigelse(maal, part);
      case 'protest':
        return kanFaaProtest(id, part, elementer);
      case 'passivitet':
        return maal.art === 'krav' && kravMedUten.get(id)?.spor === 'grunnlag';
      case 'begrunnelse':
        // KA-U34: et svar. Begrunnelsen og svaret er begge fra BH (format/leser.ts).
        return maal.art === 'svar';
    }
  }
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
  // KA-U12: «ingen krav» står i et spor uten kravversjon, og bare én gang.
  // KA-U15: grunnlaget må være sendt, som for et krav.
  for (const i of ingenKrav)
    if (
      spor[i.spor].krav.length ||
      ingenKrav.filter((x) => x.spor === i.spor).length > 1 ||
      !spor.grunnlag.krav.some((k) => bakover(i.id, k.id))
    )
      ugyldig(
        i.id,
        '«ingen krav» står i et spor med en kravversjon eller et annet «ingen krav», eller før grunnlaget er sendt'
      );
  if (varsler.length > 1) ugyldig(varsler[1].id, 'saken har to varsler etter § 33.4 (SK-12)');

  if (begrensninger.length) return tom(journal, regler, begrensninger);

  spor.frist.varsel = varsler[0] ?? null;
  for (const n of SPOR) {
    const sp = spor[n];
    sp.gjeldendeKrav = sp.krav.at(-1) ?? null;
    sp.gjeldendeSvar = sp.gjeldendeKrav
      ? (ikkeErstattet(sp.svar, sp.gjeldendeKrav.id)[0] ?? null)
      : null;
    sp.trukket = trekk.some((t) => alleKrav.get(t.gjelder)?.spor === n);
    sp.ingenKrav = ingenKrav.some((i) => i.spor === n);
  }
  for (const n of KRAVSPOR) spor[n].trukket ||= spor.grunnlag.trukket;

  // OV-U5, HF-U1: et svar står med virkningen det hadde, også når TE senere har registrert
  // et annet varsel enn det påberopelsen etter § 33.4 gjaldt. Visningen sier det.
  const annetVarsel = (gjelder: string) =>
    spor.frist.varsel !== null && gjelder !== spor.frist.varsel.id;
  const svar: Record<string, Svarberegning> = {};
  for (const s of alleSvar.values()) {
    svar[s.id] = {
      svar: s,
      virkninger: s.beslutningsgrunnlag.virkninger,
      gjaldtEtAnnetVarsel: s.standpunkter
        .filter((p) => p.art === 'rettidighet' && p.hjemmel === '33.4' && annetVarsel(p.gjelder))
        .map((p) => p.id),
    };
  }

  // Enigheten i hvert spor: en aksept av gjeldende svar, eller sammenfall i svaret.
  for (const n of SPOR) {
    const g = spor[n].gjeldendeSvar;
    if (!g) continue;
    const aksept = aksepter.find((a) => a.gjelder === g.id);
    if (aksept)
      spor[n].enighet = {
        grunnlag: enighetsgrunnlag(g, 'aksept'),
        holder: plass.get(aksept.id)!.hendelse,
      };
    else if (g.beslutningsgrunnlag.sammenfall)
      spor[n].enighet = { grunnlag: enighetsgrunnlag(g, 'sammenfall'), holder: g.id };
  }

  const gSvar = spor.grunnlag.gjeldendeSvar;
  const eg = spor.grunnlag.enighet;
  // § 31.3: et brev sendt i appen oppfyller den, fordi appen lager brevet (#310). En
  // registrert endringsordre gir ingen egen virkning (OV-U6).
  const endringsordre: Utledning['endringsordre'] =
    gSvar &&
    blirEndringsordre(gSvar.beslutningsgrunnlag) &&
    !erRegistrert(dokumenter.get(gSvar.dokument)!.opplysninger)
      ? 'ja'
      : 'nei';
  const gBrev = gSvar ? svar[gSvar.id] : null;
  // GR-U1, GR-U4, #342: svaret i sporet er subsidiært til gjeldende svar på
  // grunnlaget. Venter grunnlaget på svar på en ny versjon, forblir det subsidiært
  // til grunnlagssvaret som sist gjaldt: svaret på den seneste besvarte versjonen i
  // kravkjeden, fra og med versjonen det ble regnet mot, også når det svaret er
  // revidert. Relasjonen leses av `grunnlagskrav` og kravkjeden, ikke av rekkefølgen.
  const grunnlagskjede = spor.grunnlag.krav;
  for (const n of KRAVSPOR) {
    const sistBesvart = [...spor[n].krav]
      .reverse()
      .map((k) => ikkeErstattet(spor[n].svar, k.id)[0])
      .find((x) => x !== undefined);
    const fra = grunnlagskjede.findIndex((k) => k.id === sistBesvart?.grunnlagskrav);
    const kilde =
      gSvar ??
      (fra < 0
        ? null
        : (grunnlagskjede
            .slice(fra)
            .reverse()
            .map((k) => ikkeErstattet(spor.grunnlag.svar, k.id)[0])
            .find((x) => x !== undefined) ?? null));
    spor[n].subsidiaer = kilde
      ? grunnerFraGrunnlaget(svar[kilde.id].svar, svar[kilde.id].virkninger)
      : [];
  }

  const paaberopelser = (art: 'innsigelse' | 'protest' | 'passivitet'): Paaberopelse[] =>
    henvisninger
      .filter((x) => x.art === art)
      .map((x) => ({
        id: x.id,
        part: elementer[x.id].part,
        gjelder: x.gjelder,
        hendelse: elementer[x.id].hendelse,
      }));

  // GR-U23: venter en ny grunnlagsversjon på svar etter et frafall som binder (GR-U20),
  // er grunnlaget avklart ved frafallet til byggherren svarer.
  const venterEtterFrafall =
    !spor.grunnlag.trukket &&
    gSvar === null &&
    spor.grunnlag.gjeldendeKrav !== null &&
    frafalletBinder({ spor });
  return {
    ...tom(journal, regler, begrensninger),
    forstaatt: true,
    svar,
    elementer,
    innsigelser: paaberopelser('innsigelse'),
    protester: paaberopelser('protest'),
    passivitet: paaberopelser('passivitet'),
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
    // Utledet av standpunktene i brevet om grunnlaget, som også er innholdet i en
    // enighet om det (KA-U10, MM-U11).
    grunnlagAvklart:
      venterEtterFrafall ||
      (!spor.grunnlag.trukket &&
        gBrev !== null &&
        grunnlagetErAvklart(gBrev.svar, gBrev.virkninger)),
    // SK-01, #213, MM-U13: TE har godtatt grunnlagssvaret, og det avklarer ikke grunnlaget
    // etter GR-U7. Et godtatt avslag og en godtatt preklusjon har samme virkning.
    grunnlagAvvist:
      eg?.grunnlag.kilde === 'aksept' &&
      gBrev !== null &&
      !grunnlagetErAvklart(gBrev.svar, gBrev.virkninger),
    // GR-U12: om § 32.2 gjaldt, er frosset i brevet. Dagens regelsett vurderer det
    // ikke på nytt (MM-U9), og det avhenger ikke av om brevet sier noe om varslingen.
    endringsordre,
    // GR-U3, GR-U9: frafallet er byggherrens standpunkt, uavhengig av hva TE har sagt.
    frafalt: venterEtterFrafall || (gSvar !== null && frafaller(gSvar)),
  };
}

/**
 * KA-U13 og KA-U14, med § 31.3 (GR-U13): TE kan ikke trekke grunnlaget når byggherren
 * har godkjent det i et svar sendt fra appen, og godkjenningen er en endringsordre. Et
 * trekk ville gitt journalen den videre virkningen at endringsordren leses som bortfalt
 * (KA-U6). En endringsordre byggherren har registrert, sperrer ikke (OV-U6).
 */
export const trekkAvGrunnlagetErSperret = (u: Utledning): boolean => u.endringsordre === 'ja';

/**
 * Om enigheten i sporet har virkning (GR-U7, MM-U3): `betinget` til vilkåret
 * er oppfylt, `virksom` når det er det, og `uten_virkning` når grunnlaget er
 * avvist ved enighet eller kravet er trukket (KA-U6). `null` uten enighet.
 */
export function enighetensVirkning(
  u: Utledning,
  spor: Spor
): 'betinget' | 'virksom' | 'uten_virkning' | null {
  const e = u.spor[spor].enighet;
  if (!e) return null;
  if (spor !== 'grunnlag' && (u.grunnlagAvvist || u.spor[spor].trukket)) return 'uten_virkning';
  return e.grunnlag.vilkaar === null || u.grunnlagAvklart ? 'virksom' : 'betinget';
}

/**
 * KA-U11: kravene er avgjort når grunnlaget er avklart, og hvert vederlags- og
 * fristkrav er trukket, har «ingen krav» (KA-U12) eller har en virksom enighet.
 * Et spor TE ikke har sendt, er ikke avgjort (EO-U2, GR-U3). Da avvises alt
 * unntatt bestridelse. Predikatet leses av utsagnene og relasjonene, ikke av en
 * status: `enighetensVirkning` er selv et predikat av enigheten, grunnlaget og
 * trekkene.
 */
export function kraveneErAvgjort(u: Utledning): boolean {
  return (
    u.grunnlagAvklart &&
    KRAVSPOR.every(
      (n) => u.spor[n].trukket || u.spor[n].ingenKrav || enighetensVirkning(u, n) === 'virksom'
    )
  );
}

/**
 * EO-U5, EO-U2: saken kan inngå i en endringsordre når kravene er avgjort,
 * grunnlaget er godkjent og ikke frafalt (GR-U3), og minst ett av vederlag og
 * frist har enighet, også et godtatt avslag. Et trukket spor og et spor med
 * «ingen krav» teller som avgjort, men gir ikke alene grunnlag for endringsordre.
 */
export function kanInngaaIEo(u: Utledning): boolean {
  return (
    kraveneErAvgjort(u) &&
    !u.frafalt &&
    KRAVSPOR.some((n) => !u.spor[n].trukket && u.spor[n].enighet !== null)
  );
}

/** En påberopelse av at varselet kom for sent, eller at kravet ble spesifisert for sent. */
export type Rettidighet = { hjemmel: Hjemmel } | { hjemmel: '33.6.1'; gjelder: string };

/**
 * HF-U4, HF-U8: byggherren har i et svar sendt fra appen uttrykkelig sagt at varselet
 * kom i tide etter bestemmelsen, eller at kravversjonen ble spesifisert i tide etter
 * § 33.6.1, og kan ikke senere påberope det motsatte. Svaret binder også når det er
 * revidert eller gjaldt en tidligere kravversjon, fordi et «i tide» ikke faller bort med
 * svaret (HF-U8). Etter § 33.4 finnes ett varsel i saken, også når TE senere registrerer
 * et tidligere sendt varsel (oppdragsgiver 15.10, #498). Spesifiseringen gjelder
 * kravversjonen (HF-U1). Et registrert brev binder ikke (OV-U4, HF-U4), heller ikke
 * byggherrens endringsordre etter OV-U6, som kan si at varselet etter § 32.2 kom i tide.
 */
export function harSagtITide(u: Utledning, spor: Spor, r: Rettidighet): boolean {
  return u.spor[spor].svar.some(
    (s) =>
      !u.elementer[s.dokument]?.registrertBrev &&
      s.standpunkter.some((p) =>
        'gjelder' in r
          ? p.art === 'spesifisering' && p.gjelder === r.gjelder && p.iTide
          : p.art === 'rettidighet' && p.hjemmel === r.hjemmel && p.iTide
      )
  );
}

/**
 * GR-U3, GR-U9: svaret frafaller pålegget etter § 32.3 c, og frafallet er svarets
 * prinsipale standpunkt. Kommandoene avviser et frafall sammen med en påberopelse
 * etter § 32.2 som har virkning (#235), så et svar fra appen som frafaller, har alltid
 * frafallet prinsipalt (#562).
 */
const frafaller = (s: Svar): boolean =>
  prinsipalt(s.beslutningsgrunnlag.virkninger)?.art === 'grunnlag' &&
  standpunktet(s, 'grunnlag')?.resultat === 'paalegg_frafalt';

/** Svaret påberoper at varselet etter § 32.2 kom for sent. */
const paaberoperVarselet = (s: Pick<Svar, 'standpunkter'>): boolean =>
  s.standpunkter.some((p) => p.art === 'rettidighet' && p.hjemmel === '32.2' && !p.iTide);

/**
 * GR-U17, GR-U20: byggherren har i et svar sendt fra appen frafalt pålegget (§ 32.3 c)
 * og er bundet av løftet om endringsordre, så svaret på gjeldende grunnlagsversjon kan
 * ikke være et avslag eller en påberopelse etter § 32.2. Frafallet står også når svaret
 * er revidert, og når TE har sendt en ny grunnlagsversjon (GR-U20). Et registrert svar
 * med virkning er bare byggherrens endringsordre etter OV-U6, som godkjenner grunnlaget og
 * aldri frafaller.
 */
export const frafalletBinder = (u: Pick<Utledning, 'spor'>): boolean =>
  u.spor.grunnlag.svar.some(frafaller);

/**
 * Grunnlagskravet et svar vurderes mot: kravet et grunnlagssvar gjelder, ellers
 * grunnlagsversjonen svaret viser til (#342), eller gjeldende grunnlagskrav for
 * et svar som ennå ikke er skrevet.
 */
export function grunnlagskravFor(
  svar: Pick<Svar, 'spor' | 'gjelder'> & { grunnlagskrav?: string | null },
  u: Utledning
): Krav | null | undefined {
  if (svar.spor === 'grunnlag') return u.spor.grunnlag.krav.find((k) => k.id === svar.gjelder);
  if (svar.grunnlagskrav) return u.spor.grunnlag.krav.find((k) => k.id === svar.grunnlagskrav);
  return u.spor.grunnlag.gjeldendeKrav;
}

/**
 * Sporet har et krav byggherren ikke har svart på, kravet er ikke trukket, og kravene
 * er ikke avgjort, så et svar ville blitt avvist (GR-U24, OV-U3).
 */
export function venterPaaSvar(u: Utledning, spor: Spor): boolean {
  const s = u.spor[spor];
  return s.gjeldendeKrav !== null && s.gjeldendeSvar === null && !s.trukket && !kraveneErAvgjort(u);
}

/**
 * VS-U20, OV-U5, HF-U1: varselet en påberopelse etter § 33.4 gjelder, er varselet som var
 * registrert da svaret ble sendt, ellers det første fristkravet, som er det første
 * varselet appen kjenner (arbeidsvalget i #309). `foerSvaret` sier om et varsel står før
 * svaret. Skriveren og valideringen leser det herfra (#496).
 */
export const varseletFoerSvaret = (
  varsler: readonly Pick<Extract<LestUtsagn, { art: 'varsel' }>, 'id'>[],
  fristkrav: readonly Pick<Krav, 'id'>[],
  foerSvaret: (varsel: string) => boolean
): string | undefined => varsler.find((v) => foerSvaret(v.id))?.id ?? fristkrav[0]?.id;
