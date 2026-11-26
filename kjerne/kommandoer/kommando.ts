/**
 * Kommandoene i kjernen, slik klienten sender dem, og kontrollen av formen mot
 * skjemaene her (`feilI`). Aksepten bærer svaret og regelversjonen TE fikk se
 * (KA-U10, MM-U50); det har ikke `kontrakt.json` (#304). Innholdet i et krav har
 * feltene i formatet (`KRAVINNHOLD` i `format.ts`). Vurderingene i et svar har
 * navnene reglene regner med, og blir standpunkter og utregning når brevet
 * skrives.
 */

import { KRAVFORM_I_VEDERLAGET } from '../spor/vederlag/kommando.ts';
import { iSporet } from '../frosset/byggeklosser.ts';
import { vedleggsnoekkel } from './vedlegg.ts';
import {
  DATO,
  erKalenderdato,
  erObjekt,
  feilI,
  ID,
  KALENDERDAG,
  liste,
  objekt,
  TEKST,
  type Skjema,
} from '../format/skjema.ts';
import type { Svarvurdering } from '../frosset/byggeklosser.ts';
import {
  KRAVSPOR,
  SPOR as SPORENE,
  VARSELSPOR,
  erKravpostvarselhjemmel,
  type Kravspor,
  type Part,
  type Spor,
  type Kravvarselhjemmel,
  type Varselhjemmel,
  KORRESPONDANSETYPER,
  SENDEMAATER,
  type Korrespondansetype,
  type Sendemaate,
} from '../typer.ts';
import { KRAVFORM_I_FORHOLDET, korrigertDato } from '../spor/forhold/kommando.ts';
import { KRAVFORM_I_FRISTEN } from '../spor/frist/kommando.ts';
import { kunnskapsdatoIKravet } from '../spor/vederlag/format.ts';

export interface Svarutkast {
  spor: Spor;
  /** Kravversjonen svaret gjelder. */
  gjelder: string;
  regelversjon: number;
  vurderinger: Svarvurdering;
  /** Klientens utregning, som serveren regner på nytt (B-13). */
  resultat: Record<string, unknown>;
  /** Byggherrens utdypning under den låste teksten, også begrunnelsen (KA-U18, KA-U24 (opphevet av KA-U46)). Appen tolker den ikke (KA-U19). */
  utdypning?: string;
  /** Byggherrens utdypning per punkt i svaret, med punktet som nøkkel (LV-U71). */
  utdypninger?: Record<string, string>;
  /** Akseptfristen, som en kalenderdag (HF-U23 punkt 1 og 2). Kontrolleres når brevet skrives. */
  akseptfrist?: string;
}

/**
 * Den låste teksten klienten viste avsenderen, ett avsnitt per element i
 * rekkefølgen i brevet (LV-U2, A1 i paragrafmatrisen). Serveren lager teksten
 * selv og avviser en annen. Påkrevd i hver kommando som gir et brev fra appen;
 * et registrert brev har ingen tekst fra appen (MM-U17 (opphevet av MM-U50)).
 */
interface Brevtekst {
  brevtekst?: string[];
}

/**
 * Ett varsel i brevet, etter hjemmelen. Sporet følger hjemmelen (`VARSELSPOR`, OV-U5). Brevet kan
 * ha flere varsler (beslutningsdelen i VS-U87, arbeidsvalg 2 26.11 i #2408, og med varselet etter
 * § 32.2 svaret A 26.11 i #1823). Fra løsningen er
 * påberopelsen varselet etter § 32.2 (GR-U31), så `H` er `Kravvarselhjemmel` i `send_varsel`.
 */
export interface Varselposten<H extends Varselhjemmel = Varselhjemmel> {
  hjemmel: H;
  /** VS-U87 punkt 27: arbeidet varselet etter § 34.3.3 eller § 34.4 gjelder. */
  arbeid?: string;
  /** VS-U86 punkt 12: datoen varselet etter § 34.1.3 oppga. */
  klar_over_utgiftene?: string;
}

/**
 * OV-U80, OV-U98: kravet, svaret eller aksepten er sendt utenfor løsningen og legges til med
 * datoen avsenderen oppgir, typen (LV-U45) og brevet som vedlegg. Uten `sendt` sendes det fra
 * løsningen.
 */
export interface Registrering {
  sendt?: string;
  korrespondansetype?: Korrespondansetype;
  sendemaate?: Sendemaate;
  /** OV-U79: den korte beskrivelsen med egne ord, påkrevd med `sendt` (`sendemaatefeil`). */
  beskrivelse?: string;
  dokumentasjon?: string[];
}

/** Kravet, svaret eller aksepten er lagt til med datoen det ble sendt (OV-U98). */
export const erRegistrering = (
  k: Kommando
): k is Extract<Kommando, { type: 'krav' | 'brev' | 'revisjon' | 'aksept' }> & {
  sendt: string;
} =>
  (k.type === 'krav' || k.type === 'brev' || k.type === 'revisjon' || k.type === 'aksept') &&
  k.sendt !== undefined;

/** Feltene bare et brev lagt til med datoen har (OV-U79, OV-U80), med ordet meldingen bruker. */
export const BARE_LAGT_TIL = {
  korrespondansetype: 'typen',
  sendemaate: 'sendemåten',
  beskrivelse: 'beskrivelsen',
  dokumentasjon: 'vedlegg',
} as const;

/**
 * Formen for et brev sendt utenfor løsningen og lagt til med datoen (`sendt`): typen og brevet
 * som vedlegg, og ingen tekst fra løsningen (`tekstfeil`). Uten `sendt` har kommandoen verken
 * typen eller vedlegg (OV-U80).
 */
function registreringensForm(
  kommando: Record<string, unknown>,
  tekstfeil: () => string[],
  /** Et krav fra løsningen kan ha vedlegg (VS-U38). */
  vedleggFraLoesningen = false
): string[] {
  if (!('sendt' in kommando))
    return Object.entries(BARE_LAGT_TIL)
      .filter(([felt]) => felt in kommando)
      .filter(([felt]) => !(vedleggFraLoesningen && felt === 'dokumentasjon'))
      .map(
        ([felt, hva]) =>
          `$.${felt}: bare et brev lagt til med datoen det ble sendt (\`sendt\`), har ${hva}`
      );
  return [
    ...tekstfeil(),
    ...('korrespondansetype' in kommando ? [] : ['$.korrespondansetype: typen mangler']),
    ...((kommando as Registrering).dokumentasjon?.length
      ? []
      : ['$.dokumentasjon: brevet som ble sendt, må ligge ved']),
  ];
}

export type Kommando = (
  | ({
      type: 'krav';
      spor: Spor;
      innhold: Record<string, unknown>;
      /**
       * Varselet etter § 33.4 TE sendte utenfor appen, med datoen, typen og brevet som vedlegg
       * (OV-U5, VS-U34). Har saken ikke varselet, skrives det som et eget registrert varsel
       * før kravet (`medVarselet` i fristen); ellers kreves samme dato (`nyttelast.ts`).
       */
      varsel?: {
        sendt: string;
        korrespondansetype?: Korrespondansetype;
        sendemaate?: Sendemaate;
        beskrivelse?: string;
        dokumentasjon?: string[];
      };
      /**
       * Vedleggene til påberopelsen, som ID-er i mellomlageret (LV-U14). Dokumentet med
       * varselet etter punkt 32.2 TE alt har sendt, legges ved påberopelsen (VS-U38).
       */
      dokumentasjon?: string[];
      /**
       * TEs utdypning under den låste teksten: beskrivelsen av forholdet i
       * forholdet (GR-U15), begrunnelsen i fristkravet (KA-U33). Appen tolker den
       * ikke (KA-U19).
       */
      utdypning?: string;
      /**
       * TEs utdypning per punkt i kravet, med punktet som nøkkel: for en kravpost betegnelsen
       * (LV-U71). Brevteksten setter den under punktet.
       */
      utdypninger?: Record<string, string>;
      /** Forbeholdet i kravet om fristforlengelse eller vederlagsjustering (KA-U82, LV-U74). */
      forbehold?: string;
    } & Registrering)
  | ({ type: 'brev'; svar: Svarutkast[] } & Registrering)
  | ({ type: 'revisjon'; erstatter: string; svar: Svarutkast } & Registrering)
  | ({
      type: 'aksept';
      spor: Spor;
      svar: string;
      regelversjon: number;
    } & Registrering)
  | { type: 'trekk'; spor: Spor }
  /**
   * Registrerer ett eller flere varsler etter § 32.2, § 33.4, § 34.1.2, § 34.1.3, § 34.3.3 eller
   * § 34.4 sendt utenfor appen i samme brev (MM-U1, SK-12, OV-U5, VS-U34, VS-U52, VS-U87 punkt 28
   * og beslutningsdelen, og med varselet etter § 32.2 svaret A 26.11 i #1823), med brevet som
   * vedlegg (OV-U4). `dokumentasjon` er ID-ene i
   * mellomlageret (LV-U14). Datoen gjelder alle varslene.
   */
  | {
      type: 'varsel';
      varsler: Varselposten[];
      sendt: string;
      korrespondansetype: Korrespondansetype;
      sendemaate?: Sendemaate;
      beskrivelse?: string;
      dokumentasjon: string[];
    }
  /**
   * OV-U4, OV-U16: et eget brev sendt utenfor appen, registrert som dokumentasjon, med
   * beskrivelsen med egne ord, datoen det ble sendt og brevet som vedlegg. Uten `spor`
   * hører det til saken. Med `retter` er det en retting av den registreringen (OV-U17).
   * `avsender` er parten som sendte brevet; uten den er det parten som legger det til (OV-U79).
   */
  | {
      type: 'registrert_brev';
      spor?: Spor[];
      sendt: string;
      korrespondansetype: Korrespondansetype;
      sendemaate?: Sendemaate;
      beskrivelse: string;
      dokumentasjon: string[];
      retter?: string;
      avsender?: Part;
    }
  /** OV-U18: registreringen `retter` står i feil sak; brevet hører ikke til saken. */
  | { type: 'ikke_i_saken'; retter: string }
  /**
   * VS-U15, OV-U5: TE sender ett eller flere varsler fra appen i et eget brev, uten dager eller
   * beløp. Varslene står i ett spor (beslutningsdelen i VS-U87).
   */
  | { type: 'send_varsel'; varsler: Varselposten<Kravvarselhjemmel>[] }
  /** KA-U12: TE krever ikke noe i et spor som ikke er sendt. Avvises etter OV-U7 og OV-U99 punkt 2. */
  | { type: 'ingen_krav'; spor: Kravspor }
  /** § 33.6.2 første ledd (VS-U19): byggherren ber TE angi og begrunne antall dager. */
  | { type: 'foresporsel'; spor: 'frist'; hjemmel: '33.6.2' }
  /**
   * § 33.6.2 annet ledd b (VS-U17, VS-U27): TE begrunner hvorfor grunnlaget for å beregne
   * kravet ikke foreligger. `gjelder` er forespørselen, og begrunnelsen er utdypningen.
   */
  | { type: 'foresporselssvar'; gjelder: string; utdypning: string }
  /**
   * Punkt 10 i samlevedtaket for retting av sendt brev (MM-U59): TE korrigerer sin opplysning
   * etter VS-U26 i et eget brev. `gjelder` er elementet med TEs siste opplysning, og datoen står
   * i feltet kravet har for kategorien.
   */
  | {
      type: 'korrigering';
      gjelder: string;
      paalegg_mottatt?: string;
      klar_over_forholdet?: string;
      /** MM-U53: TEs valgfrie forklaring under den vedtatte teksten. Løsningen tolker den ikke. */
      utdypning?: string;
    }
  /**
   * VS-U86 punkt 14 (VS-U82): TE supplerer eller endrer datoen TE ble klar over at økte utgifter
   * etter § 34.1.3 annet ledd ville påløpe, i et eget brev. `gjelder` er varselet etter § 34.1.3.
   */
  | {
      type: 'kunnskapsdato';
      gjelder: string;
      klar_over_utgiftene: string;
      /** Arbeidsvalget D-5 i BF-48, etter MM-U53: TEs valgfrie forklaring. Løsningen tolker den ikke. */
      utdypning?: string;
    }
  /**
   * Innlegget i fritekst fra en av partene (OV-U97, MM-U47 punkt 1–6, MM-U56). `gjelder` er brevet
   * det viser til, `tittel` tittelen parten skriver, og `utdypning` teksten som følger
   * henvisningen (punkt 2 og designdelen). `dokumentasjon` er vedleggene (G-6 i BF-03).
   */
  | {
      type: 'innlegg';
      gjelder: string;
      tittel: string;
      utdypning: string;
      dokumentasjon?: string[];
    }
) &
  Brevtekst;

const SPOR = { enum: [...SPORENE] };
/** LV-U45, D1 A i #1497: påkrevd i hver registrering av korrespondanse sendt utenfor løsningen. */
const KORRESPONDANSETYPE = { enum: [...KORRESPONDANSETYPER] };
/** OV-U79: sendemåten for et brev sendt utenfor løsningen (`sendemaatefeil`). */
const SENDEMAATE = { enum: [...SENDEMAATER] };
/** LV-U71: partens utdypning per punkt, med punktet som nøkkel. */
const UTDYPNINGER = { type: 'object', additionalProperties: TEKST };
const SVARUTKAST = objekt(
  {
    spor: SPOR,
    gjelder: ID,
    regelversjon: { type: 'integer' },
    vurderinger: { type: 'object' },
    resultat: { type: 'object' },
    utdypning: TEKST,
    utdypninger: UTDYPNINGER,
    akseptfrist: KALENDERDAG,
  },
  ['spor', 'gjelder', 'regelversjon', 'vurderinger', 'resultat']
);

const BREVTEKST = { brevtekst: liste(TEKST) };
/** Varslene i brevet, minst ett (`Varselposten`). */
const varslene = (hjemler: string[]) => ({
  varsler: {
    type: 'array',
    minItems: 1,
    items: objekt({ hjemmel: { enum: hjemler }, arbeid: TEKST, klar_over_utgiftene: DATO }, [
      'hjemmel',
    ]),
  },
});

/** OV-U80, OV-U98: feltene i et krav, et svar eller en aksept lagt til med datoen det ble sendt. */
const REGISTRERING = {
  sendt: DATO,
  korrespondansetype: KORRESPONDANSETYPE,
  sendemaate: SENDEMAATE,
  beskrivelse: TEKST,
  dokumentasjon: liste(ID),
};

const SKJEMA: Record<Kommando['type'], Skjema> = {
  krav: objekt(
    {
      type: { const: 'krav' },
      spor: SPOR,
      innhold: { type: 'object' },
      varsel: objekt(
        {
          sendt: DATO,
          korrespondansetype: KORRESPONDANSETYPE,
          sendemaate: SENDEMAATE,
          beskrivelse: TEKST,
          dokumentasjon: liste(ID),
        },
        ['sendt']
      ),
      utdypning: TEKST,
      utdypninger: UTDYPNINGER,
      forbehold: TEKST,
      ...BREVTEKST,
      ...REGISTRERING,
    },
    ['type', 'spor', 'innhold']
  ),
  brev: objekt(
    {
      type: { const: 'brev' },
      svar: { type: 'array', items: SVARUTKAST },
      ...BREVTEKST,
      ...REGISTRERING,
    },
    ['type', 'svar']
  ),
  revisjon: objekt(
    {
      type: { const: 'revisjon' },
      erstatter: ID,
      svar: SVARUTKAST,
      ...BREVTEKST,
      ...REGISTRERING,
    },
    ['type', 'erstatter', 'svar']
  ),
  aksept: objekt(
    {
      type: { const: 'aksept' },
      spor: SPOR,
      svar: ID,
      regelversjon: { type: 'integer' },
      ...BREVTEKST,
      ...REGISTRERING,
    },
    ['type', 'spor', 'svar', 'regelversjon']
  ),
  trekk: objekt({ type: { const: 'trekk' }, spor: SPOR, ...BREVTEKST }, ['type', 'spor']),
  varsel: objekt(
    {
      type: { const: 'varsel' },
      ...varslene(Object.keys(VARSELSPOR)),
      sendt: DATO,
      korrespondansetype: KORRESPONDANSETYPE,
      sendemaate: SENDEMAATE,
      beskrivelse: TEKST,
      dokumentasjon: liste(ID),
    },
    ['type', 'varsler', 'sendt', 'korrespondansetype', 'dokumentasjon']
  ),
  registrert_brev: objekt(
    {
      type: { const: 'registrert_brev' },
      spor: liste(SPOR),
      sendt: DATO,
      korrespondansetype: KORRESPONDANSETYPE,
      sendemaate: SENDEMAATE,
      beskrivelse: TEKST,
      dokumentasjon: liste(ID),
      retter: ID,
      avsender: { enum: ['TE', 'BH'] },
    },
    ['type', 'sendt', 'korrespondansetype', 'beskrivelse', 'dokumentasjon']
  ),
  ikke_i_saken: objekt({ type: { const: 'ikke_i_saken' }, retter: ID }, ['type', 'retter']),
  send_varsel: objekt(
    {
      type: { const: 'send_varsel' },
      ...varslene(Object.keys(VARSELSPOR).filter((h) => h !== '32.2')),
      ...BREVTEKST,
    },
    ['type', 'varsler']
  ),
  ingen_krav: objekt(
    { type: { const: 'ingen_krav' }, spor: { enum: [...KRAVSPOR] }, ...BREVTEKST },
    ['type', 'spor']
  ),
  foresporsel: objekt(
    {
      type: { const: 'foresporsel' },
      spor: { const: 'frist' },
      hjemmel: { const: '33.6.2' },
      ...BREVTEKST,
    },
    ['type', 'spor', 'hjemmel']
  ),
  foresporselssvar: objekt(
    { type: { const: 'foresporselssvar' }, gjelder: ID, utdypning: TEKST, ...BREVTEKST },
    ['type', 'gjelder', 'utdypning']
  ),
  korrigering: objekt(
    {
      type: { const: 'korrigering' },
      gjelder: ID,
      paalegg_mottatt: DATO,
      klar_over_forholdet: DATO,
      utdypning: TEKST,
      ...BREVTEKST,
    },
    ['type', 'gjelder'],
    [
      { required: ['paalegg_mottatt'], properties: { klar_over_forholdet: { enum: [] } } },
      { required: ['klar_over_forholdet'], properties: { paalegg_mottatt: { enum: [] } } },
    ]
  ),
  kunnskapsdato: objekt(
    {
      type: { const: 'kunnskapsdato' },
      gjelder: ID,
      klar_over_utgiftene: DATO,
      utdypning: TEKST,
      ...BREVTEKST,
    },
    ['type', 'gjelder', 'klar_over_utgiftene']
  ),
  innlegg: objekt(
    {
      type: { const: 'innlegg' },
      gjelder: ID,
      tittel: TEKST,
      utdypning: TEKST,
      dokumentasjon: liste(ID),
      ...BREVTEKST,
    },
    ['type', 'gjelder', 'tittel', 'utdypning']
  ),
};

/** Kunnskapsdatoen etter § 34.1.3 i kommandoen, eller `undefined` (VS-U86 punkt 12 og 14). */
export function kunnskapsdatoIKommandoen(k: Kommando): string | undefined {
  if (k.type === 'varsel' || k.type === 'send_varsel')
    return k.varsler.find((v) => v.klar_over_utgiftene !== undefined)?.klar_over_utgiftene;
  if (k.type === 'kunnskapsdato') return k.klar_over_utgiftene;
  return k.type === 'krav' && k.spor === 'vederlag' ? kunnskapsdatoIKravet(k) : undefined;
}

/** Kommandotypene kjernen tar imot, med et skjema for hver. */
export const KOMMANDOTYPER = Object.keys(SKJEMA) as Kommando['type'][];

export type Innhold = Record<string, unknown>;

/**
 * Feltet med datoen og vedleggene kommandoen viser til: brevets, kravets (VS-U38, #1823), og
 * varselets i et fristkrav (OV-U5). Et fristkrav kan ha begge, og
 * vedleggene står da i samme brev. Feilmeldingene har stien herfra (#984).
 */
const brevfelt = (k: Kommando): { sti: string; sendt?: unknown; dokumentasjon?: string[] } => {
  if (k.type !== 'krav')
    return {
      sti: '$.',
      ...('sendt' in k ? { sendt: k.sendt } : {}),
      ...('dokumentasjon' in k ? { dokumentasjon: k.dokumentasjon } : {}),
    };
  const dokumentasjon = [...(k.dokumentasjon ?? []), ...(k.varsel?.dokumentasjon ?? [])];
  return {
    sti: k.varsel ? '$.varsel.' : '$.',
    ...(k.varsel ? { sendt: k.varsel.sendt } : 'sendt' in k ? { sendt: k.sendt } : {}),
    ...(dokumentasjon.length ? { dokumentasjon } : {}),
  };
};

/**
 * Vedleggene kommandoen viser til: brevets, kravets (VS-U38, #1823), varselets i et fristkrav
 * (OV-U5), eller dokumentene kravskjemaet legger til som varsel for en kravpost (VS-U53).
 */
export const vedleggI = (k: Kommando): string[] => [
  ...(brevfelt(k).dokumentasjon ?? []),
  // Kalles også før formen er kontrollert, så et ukjent spor gir ingen vedlegg.
  ...(k.type === 'krav' && Object.hasOwn(KRAVFORM, k.spor)
    ? KRAVFORM[k.spor].vedleggIInnholdet(k.innhold)
    : []),
];

/** Det som er sporets eget i formen på et krav (#1783). */
export interface Kravform {
  /** Feilene i innholdet i kravet, med stien fra `$.innhold`. */
  feil(innhold: unknown): string[];
  /** Vedleggene innholdet i kravet viser til, utenom brevets. */
  vedleggIInnholdet(innhold: Innhold): string[];
  /** Kravet kan ha et varsel (`varsel`), som fristkravet (OV-U5). */
  varselVedKravet: boolean;
}

/** Formen på kravet i hvert spor. */
const KRAVFORM: Record<Spor, Kravform> = {
  forhold: KRAVFORM_I_FORHOLDET,
  vederlag: KRAVFORM_I_VEDERLAGET,
  frist: KRAVFORM_I_FRISTEN,
};

/** OV-U79: bare et brev sendt utenfor løsningen har sendemåten. */
const sendemaatefeil = (sti: string, k: Record<string, unknown>): string[] =>
  'sendemaate' in k && k.korrespondansetype !== 'brev'
    ? [`${sti}sendemaate: bare et brev har sendemåten`]
    : [];

/**
 * OV-U79: avsenderen oppgir sendemåten for et brev lagt til, og beskrivelsen for all
 * korrespondanse lagt til (arbeidsvalget 2 A i #807). Varselet i fristkravet prøves når det
 * skrives som et eget brev (`medVarselet` i fristen).
 */
const korrespondansefeil = (k: Record<string, unknown>): string[] => {
  const feil = sendemaatefeil('$.', k);
  if (feil.length || !('sendt' in k)) return feil;
  return [
    ...(k.korrespondansetype === 'brev' && !('sendemaate' in k)
      ? ['$.sendemaate: sendemåten for brevet mangler']
      : []),
    ...('beskrivelse' in k ? [] : ['$.beskrivelse: beskrivelsen mangler']),
  ];
};

/** Sporet varselet etter `hjemmel` står i (OV-U5). */
export const sporetFor = (v: Pick<Varselposten, 'hjemmel'>) => VARSELSPOR[v.hjemmel];

/**
 * Feilene i varslene i brevet. Bare varselet etter § 34.1.3 har kunnskapsdatoen (VS-U86 punkt 12).
 * Arbeidet står bare i varselet etter § 34.3.3 og § 34.4, og fra løsningen er det påkrevd (VS-U87
 * punkt 27). To varsler etter samme bestemmelse er bare mulig etter § 34.3.3 og § 34.4 (D-2 i
 * BF-37). Brevet fra løsningen har varsler i ett spor (beslutningsdelen i VS-U87).
 */
function varselfeil(k: Extract<Kommando, { type: 'varsel' | 'send_varsel' }>): string[] {
  const feil: string[] = [];
  const sett = new Set<string>();
  k.varsler.forEach((v, i) => {
    const sti = `$.varsler[${i}]`;
    if (v.hjemmel !== '34.1.3' && v.klar_over_utgiftene !== undefined)
      feil.push(
        `${sti}.klar_over_utgiftene: bare varselet etter punkt 34.1.3 har datoen totalentreprenøren ble klar over at utgiftene ville påløpe`
      );
    else if (v.klar_over_utgiftene !== undefined && !erKalenderdato(v.klar_over_utgiftene))
      feil.push(
        `${sti}.klar_over_utgiftene: ${JSON.stringify(v.klar_over_utgiftene)} er ikke en dato på formen ÅÅÅÅ-MM-DD`
      );
    const kravpost = erKravpostvarselhjemmel(v.hjemmel);
    if (!kravpost && v.arbeid !== undefined)
      feil.push(
        `${sti}.arbeid: varselet etter punkt ${v.hjemmel} har ingen beskrivelse av arbeidet`
      );
    if (kravpost && k.type === 'send_varsel' && !v.arbeid?.trim())
      feil.push(
        `${sti}.arbeid: mangler: et varsel etter punkt ${v.hjemmel} fra løsningen har arbeidet det gjelder`
      );
    if (!kravpost && sett.has(v.hjemmel))
      feil.push(`${sti}.hjemmel: brevet har alt et varsel etter punkt ${v.hjemmel}`);
    sett.add(v.hjemmel);
  });
  const spor = new Set(k.varsler.map(sporetFor));
  if (k.type === 'send_varsel' && spor.size > 1)
    feil.push(
      '$.varsler: varslene i et brev fra løsningen står i ett spor, og varselet om fristforlengelse sendes i et eget brev'
    );
  return feil;
}

/** Feilene i formen, tomme når kommandoen kan vurderes. */
export function formfeil(kommando: unknown): string[] {
  if (!erObjekt(kommando)) return ['Kommandoen må være et objekt.'];
  const type = (kommando as { type?: unknown }).type;
  if (typeof type !== 'string' || !Object.hasOwn(SKJEMA, type))
    return [`Ukjent kommando: ${String(type)}`];
  const feil = feilI(kommando, SKJEMA[type as Kommando['type']]);
  if (type === 'krav' && !feil.length) {
    const k = kommando as { spor: Spor; innhold: unknown; dokumentasjon?: string[] };
    const form = iSporet(KRAVFORM, k.spor);
    const innholdsfeil = form.feil(k.innhold);
    feil.push(...innholdsfeil);
    if (!form.varselVedKravet && 'varsel' in k)
      feil.push('$.varsel: bare et fristkrav har varsel etter punkt 33.4');
    // VS-U51: dokumentet med varselet for en kravpost ligger alt ved kravet.
    const iInnholdet = new Set(
      innholdsfeil.length || !k.dokumentasjon?.length
        ? []
        : form.vedleggIInnholdet(k.innhold as Innhold).map(vedleggsnoekkel)
    );
    if (k.dokumentasjon?.some((v) => iInnholdet.has(vedleggsnoekkel(v))))
      feil.push(
        '$.dokumentasjon: vedlegget ved kravet er også dokumentet med varselet for en kravpost'
      );
    // KA-U82: forbeholdet gjelder ikke påberopelsen av forholdet.
    if (k.spor === 'forhold' && 'forbehold' in k)
      feil.push('$.forbehold: påberopelsen av forholdet har ikke noe forbehold');
  }
  if ((type === 'varsel' || type === 'send_varsel') && !feil.length)
    feil.push(
      ...varselfeil(kommando as unknown as Extract<Kommando, { type: 'varsel' | 'send_varsel' }>)
    );
  // VS-U86 punkt 12 og 14: datoen er en kalenderdag. I vederlagskravet kontrollerer sporet den.
  const kunnskapsdato = kommando.klar_over_utgiftene;
  if (!feil.length && typeof kunnskapsdato === 'string' && !erKalenderdato(kunnskapsdato))
    feil.push(
      `$.klar_over_utgiftene: ${JSON.stringify(kunnskapsdato)} er ikke en dato på formen ÅÅÅÅ-MM-DD`
    );
  const {
    sti,
    sendt,
    dokumentasjon = [],
  } = feil.length ? { sti: '$.' } : brevfelt(kommando as unknown as Kommando);
  // Datoen står i brevteksten og må være en dato (LV-U4 punkt 3).
  if (!feil.length && sendt !== undefined && !erKalenderdato(sendt))
    feil.push(`${sti}sendt: ${JSON.stringify(sendt)} er ikke en dato på formen ÅÅÅÅ-MM-DD`);
  if (type === 'brev' && !feil.length) {
    const spor = (kommando as { svar: Svarutkast[] }).svar.map((s) => s.spor);
    if (!spor.length) feil.push('$.svar: brevet har ingen svar');
    if (new Set(spor).size !== spor.length) feil.push('$.svar: to svar i samme spor');
  }
  const vedlegg = feil.length ? [] : dokumentasjon;
  if (new Set(vedlegg.map(vedleggsnoekkel)).size !== vedlegg.length)
    feil.push(`${sti}dokumentasjon: samme vedlegg står to ganger`);
  // OV-U16, OV-U79: en beskrivelse med bare mellomrom er ingen beskrivelse.
  for (const [sti, k] of [
    ['$.', kommando],
    ['$.varsel.', kommando.varsel],
  ] as const)
    if (!feil.length && erObjekt(k) && typeof k.beskrivelse === 'string' && !k.beskrivelse.trim())
      feil.push(`${sti}beskrivelse: brevet har ingen beskrivelse`);
  if (type === 'registrert_brev' && !feil.length) {
    const k = kommando as { spor?: Spor[] };
    if (k.spor && new Set(k.spor).size !== k.spor.length)
      feil.push('$.spor: samme spor står to ganger');
  }
  // MM-U47 punkt 2 og designdelen: innlegget har en tittel og en tekst.
  if (type === 'innlegg' && !feil.length)
    for (const felt of ['tittel', 'utdypning'] as const)
      if (!(kommando[felt] as string).trim())
        feil.push(`$.${felt}: innlegget har ingen ${felt === 'tittel' ? 'tittel' : 'tekst'}`);

  // OV-U80: et krav fra løsningen kan ha vedlegg (VS-U38), men bare et krav lagt til har typen.
  if (
    type === 'krav' &&
    !feil.length &&
    ['sendt', 'korrespondansetype', 'sendemaate', 'beskrivelse'].some((felt) => felt in kommando)
  )
    feil.push(
      ...registreringensForm(
        kommando,
        () =>
          ['brevtekst', 'utdypning', 'utdypninger', 'forbehold', 'varsel']
            .filter((felt) => felt in kommando)
            .map((felt) => `$.${felt}: et krav lagt til har ikke feltet`),
        true
      )
    );
  if ((type === 'brev' || type === 'revisjon' || type === 'aksept') && !feil.length) {
    const svar = (kommando as { svar?: unknown }).svar;
    const utkast = (type === 'brev' ? svar : type === 'revisjon' ? [svar] : []) as Svarutkast[];
    // OV-U80: registreringen har ingen tekst fra løsningen.
    feil.push(
      ...registreringensForm(kommando, () => [
        ...('brevtekst' in kommando ? ['$.brevtekst: en registrering har ingen brevtekst'] : []),
        ...(utkast.some((s) => s.utdypning !== undefined || s.utdypninger !== undefined)
          ? ['$.svar: et registrert svar har ingen utdypning']
          : []),
      ])
    );
  }
  if (!feil.length) feil.push(...korrespondansefeil(kommando));
  if (type === 'krav' && !feil.length && erObjekt(kommando.varsel))
    feil.push(...sendemaatefeil('$.varsel.', kommando.varsel));
  if (type === 'korrigering' && !feil.length) {
    const { felt, dato } = korrigertDato(
      kommando as unknown as Extract<Kommando, { type: 'korrigering' }>
    );
    if (!erKalenderdato(dato))
      feil.push(`$.${felt}: ${JSON.stringify(dato)} er ikke en dato på formen ÅÅÅÅ-MM-DD`);
  }
  return feil;
}
