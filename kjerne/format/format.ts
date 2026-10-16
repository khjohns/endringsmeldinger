/**
 * Lagringsformatet for hendelsene TS-kjernen skriver, format 1 (B-10, #273,
 * designnotatet `docs/design-hendelsesformat-2026-10-09.md`). Én rad per
 * dokument. Hvert krav, svar, utsagn og hver opplysning har en UUID fra
 * serveren, og relasjonene står som `gjelder` og `erstatter`.
 *
 * `data` har ingen `null`, ingen tom liste og ingen tom streng. Et felt som
 * mangler, betyr at parten ikke har sagt det, eller at det ikke hører til arten.
 * Et ukjent felt, en ukjent art eller et felt arten krever som mangler, gjør
 * raden ikke forstått (4.4, MM-U2). Skjemaene her er formen; lesereglene som
 * går på tvers av radene, står i `utled.ts`.
 *
 * Registeret over typene og artene er `docs/datamodell/kjernehendelser.toml`
 * (#320), og en vakttest holder det likt med det som eksporteres her.
 */

import { HOVEDKATEGORIER, KATEGORIER, UNDERKATEGORIER, type Hovedkategori } from './koder.ts';
import { FRISTRESULTATER, GRUNNLAGSRESULTATER, VEDERLAGSRESULTATER } from '../regler/typer.ts';
import type { Skjema } from './skjema.ts';
import {
  KRAVSPOR,
  SPOR,
  type Hjemmel,
  type Opplysningsslag,
  type Spor,
  type Standpunkt,
  type Standpunktsart,
  type Utsagnsart,
} from '../typer.ts';

/** Formatversjonen kjernen skriver. Står i kolonnen `format`. */
export const FORMAT = 1;

/**
 * Det høyeste formatet kjernen leser. Et nytt format leses i én versjon av
 * kjernen før det skrives i den neste, så en tilbakerulling ett trinn ikke
 * stopper noen sak (B-10, #316). `FORMAT` er aldri høyere.
 */
export const LESERFORMAT = 1;

export const HENDELSESTYPER = ['sak_opprettet', 'dokument_registrert'] as const;

/** Hjemmelen for rettidigheten i sporet: § 32.2 i grunnlaget, § 34.1.2 i vederlaget, § 33.4 i fristen. */
export const HJEMMEL: Record<Spor, Hjemmel> = {
  grunnlag: '32.2',
  vederlag: '34.1.2',
  frist: '33.4',
};

/**
 * Standpunktene et svar i sporet kan ha, i rekkefølgen brevet setter dem.
 * Rekkefølgen avgjør hva som er prinsipalt og subsidiært (vedtaket 05.10 om
 * avslag sammen med § 32.2). Arten i sporet uten `?` må finnes.
 */
export const STANDPUNKTER_I_SPORET: Record<Spor, { art: Standpunktsart; paakrevd: boolean }[]> = {
  grunnlag: [
    { art: 'rettidighet', paakrevd: false },
    { art: 'grunnlag', paakrevd: true },
  ],
  vederlag: [
    { art: 'rettidighet', paakrevd: false },
    { art: 'metode', paakrevd: false },
    { art: 'beloep', paakrevd: true },
  ],
  frist: [
    { art: 'rettidighet', paakrevd: false },
    { art: 'hindring', paakrevd: false },
    { art: 'spesifisering', paakrevd: false },
    { art: 'dager', paakrevd: true },
  ],
};

/** Metodene byggherren kan mene vederlaget skal justeres etter, når tilbudet ikke er akseptert (§ 34.2.2). */
export const METODER = ['enhetspriser', 'regningsarbeid'] as const satisfies readonly NonNullable<
  Extract<Standpunkt, { art: 'metode' }>['oensket']
>[];

export const ID: Skjema = { type: 'string', minLength: 1 };
export const TEKST: Skjema = { type: 'string', minLength: 1 };
export const DATO: Skjema = { type: 'string', minLength: 10 };
export const liste = (items: Skjema): Skjema => ({ type: 'array', minItems: 1, items });

export const objekt = (properties: Skjema, required: string[], anyOf?: Skjema[]): Skjema => ({
  type: 'object',
  properties,
  required,
  additionalProperties: false,
  ...(anyOf ? { anyOf } : {}),
});

/**
 * VS-U26: datoen varslingsplikten løper fra, som TE oppgir i grunnlagskravet,
 * etter hovedkategorien. Der § 32.2 gjelder, er det datoen pålegget ble mottatt;
 * i svikt og andre forhold (§ 33.1 b–c) datoen TE ble klar over forholdet.
 * Underkategorien endringsordre har ingen.
 */
export const OPPGITT_DATO = {
  endring: 'paalegg_mottatt',
  svikt: 'klar_over_forholdet',
  andre_forhold: 'klar_over_forholdet',
} as const satisfies Partial<Record<Hovedkategori, string>>;

export type OppgittDato = (typeof OPPGITT_DATO)[keyof typeof OPPGITT_DATO];

const OPPGITTE_DATOER = [...new Set(Object.values(OPPGITT_DATO))] as OppgittDato[];

/** Feltet for datoen TE oppgir i kategorien, eller `null` når kategorien ikke har en (VS-U26). */
export function oppgittDato(hovedkategori: unknown, underkategori: unknown): OppgittDato | null {
  if (underkategori === 'endringsordre' || typeof hovedkategori !== 'string') return null;
  return Object.hasOwn(OPPGITT_DATO, hovedkategori)
    ? OPPGITT_DATO[hovedkategori as keyof typeof OPPGITT_DATO]
    : null;
}

// Ingen verdi passer, så feltet finnes ikke i kategorien.
const ikkeI = (felt: readonly string[]): Skjema =>
  Object.fromEntries(felt.map((f) => [f, { enum: [] }]));

/**
 * Hovedkategorien og underkategorien er et par fra `KATEGORIER` (#335, HF-U1).
 * Underkategorien endringsordre har endringsordrens dato eller nummer, som TE
 * oppgir (GR-U16); de andre har det ikke. Datoen etter VS-U26 finnes bare i
 * kategorien den hører til. Den er valgfri i formatet, fordi et registrert brev
 * ikke oppgir den; kommandoen krever den.
 */
const KATEGORIPAR: Skjema[] = HOVEDKATEGORIER.flatMap((h) => {
  const under: readonly string[] = KATEGORIER[h];
  const andre = under.filter((u) => u !== 'endringsordre');
  const dato = oppgittDato(h, andre[0]);
  const par: Skjema[] = [];
  if (andre.length)
    par.push({
      properties: {
        hovedkategori: { const: h },
        underkategori: { enum: andre },
        ...ikkeI(['endringsordre', ...OPPGITTE_DATOER.filter((d) => d !== dato)]),
      },
    });
  if (under.includes('endringsordre'))
    par.push({
      properties: {
        hovedkategori: { const: h },
        underkategori: { const: 'endringsordre' },
        ...ikkeI(OPPGITTE_DATOER),
      },
      required: ['endringsordre'],
    });
  return par;
});

/**
 * Innholdet i en kravversjon per spor, uten `id`, `spor` og `erstatter`.
 * Kommandoen bruker det samme. Et krav på 0 kr eller 0 dager er ikke et krav om
 * noe (KA-U8). Kategorien har kjernens koder, ikke katalogens (#335). TEs
 * beskrivelse av forholdet står bare i brevteksten, som kravets utdypning (A8 i
 * paragrafmatrisen).
 */
export const KRAVINNHOLD: Record<
  Spor,
  { properties: Skjema; required: string[]; anyOf?: Skjema[] }
> = {
  grunnlag: {
    properties: {
      hovedkategori: { enum: HOVEDKATEGORIER },
      underkategori: { enum: UNDERKATEGORIER },
      tittel: TEKST,
      endringsordre: TEKST,
      paalegg_mottatt: DATO,
      klar_over_forholdet: DATO,
    },
    required: ['hovedkategori', 'underkategori'],
    anyOf: KATEGORIPAR,
  },
  vederlag: {
    properties: {
      metode: { const: 'tilbud' },
      beloep: { type: 'number', exclusiveMinimum: 0 },
    },
    required: ['metode', 'beloep'],
  },
  frist: { properties: { dager: { type: 'integer', minimum: 1 } }, required: ['dager'] },
};

const sporfelt = (spor: Spor) => ({ id: ID, spor: { const: spor } });
const artfelt = (art: string) => ({ id: ID, art: { const: art } });

export const KRAV: Record<Spor, Skjema> = Object.fromEntries(
  SPOR.map((s) => [
    s,
    objekt(
      { ...sporfelt(s), erstatter: ID, ...KRAVINNHOLD[s].properties },
      ['id', 'spor', ...KRAVINNHOLD[s].required],
      KRAVINNHOLD[s].anyOf
    ),
  ])
) as Record<Spor, Skjema>;

export const STANDPUNKT: Record<Standpunktsart, Skjema> = {
  rettidighet: objekt(
    {
      ...artfelt('rettidighet'),
      gjelder: ID,
      hjemmel: { enum: ['32.2', '33.4', '34.1.2'] },
      i_tide: { type: 'boolean' },
    },
    ['id', 'art', 'gjelder', 'hjemmel', 'i_tide']
  ),
  grunnlag: objekt({ ...artfelt('grunnlag'), resultat: { enum: [...GRUNNLAGSRESULTATER] } }, [
    'id',
    'art',
    'resultat',
  ]),
  beloep: objekt(artfelt('beloep'), ['id', 'art']),
  metode: objekt(
    {
      ...artfelt('metode'),
      hjemmel: { const: '34.2.2' },
      aksepterer: { type: 'boolean' },
      oensket_metode: { enum: [...METODER] },
    },
    ['id', 'art', 'hjemmel', 'aksepterer']
  ),
  hindring: objekt({ ...artfelt('hindring'), oppfylt: { type: 'boolean' } }, [
    'id',
    'art',
    'oppfylt',
  ]),
  spesifisering: objekt(
    {
      ...artfelt('spesifisering'),
      gjelder: ID,
      hjemmel: { const: '33.6.1' },
      i_tide: { type: 'boolean' },
      dager: { type: 'integer', minimum: 0 },
    },
    ['id', 'art', 'gjelder', 'hjemmel', 'i_tide']
  ),
  dager: objekt(artfelt('dager'), ['id', 'art']),
};

/** Serverens utregning etter B-13. Grunnlaget har ingen. */
export const UTREGNING: Record<Spor, Skjema | null> = {
  grunnlag: null,
  vederlag: objekt(
    {
      resultat: { enum: [...VEDERLAGSRESULTATER] },
      godkjent_beloep: { type: 'number', minimum: 0 },
      subsidiaert_resultat: { enum: [...VEDERLAGSRESULTATER] },
      subsidiaert_godkjent_beloep: { type: 'number', minimum: 0 },
    },
    ['resultat', 'godkjent_beloep']
  ),
  frist: objekt(
    {
      resultat: { enum: [...FRISTRESULTATER] },
      godkjent_dager: { type: 'integer', minimum: 0 },
      subsidiaert_resultat: { enum: [...FRISTRESULTATER] },
      subsidiaert_godkjent_dager: { type: 'integer', minimum: 0 },
    },
    ['resultat', 'godkjent_dager']
  ),
};

export const BESLUTNINGSGRUNNLAG: Skjema = objekt(
  {
    regelversjon: { type: 'integer' },
    virkninger: liste(
      objekt({ standpunkt: ID, virkning: { enum: ['prinsipalt', 'subsidiaert'] } }, [
        'standpunkt',
        'virkning',
      ])
    ),
    uten_virkning: liste(ID),
    linje: TEKST,
    sammenfall: { type: 'boolean' },
    varslingsplikt: { type: 'boolean' },
  },
  ['regelversjon', 'virkninger', 'linje', 'sammenfall']
);

export const SVAR: Record<Spor, Skjema> = Object.fromEntries(
  SPOR.map((s) => {
    const utregning = UTREGNING[s];
    return [
      s,
      objekt(
        {
          ...sporfelt(s),
          gjelder: ID,
          erstatter: ID,
          ...(s === 'grunnlag' ? {} : { grunnlagskrav: ID }),
          standpunkter: { type: 'array', minItems: 1 },
          ...(utregning ? { utregning } : {}),
          beslutningsgrunnlag: BESLUTNINGSGRUNNLAG,
        },
        ['id', 'spor', 'gjelder', 'standpunkter', 'beslutningsgrunnlag'].concat(
          utregning ? ['utregning'] : [],
          s === 'grunnlag' ? [] : ['grunnlagskrav']
        )
      ),
    ];
  })
) as Record<Spor, Skjema>;

/** Slagene opplysning om et dokument, som også er det en bestridelse gjelder (MM-U7). */
export const OPPLYSNINGSSLAG = [
  'sendt',
  'mottatt',
  'endringsordre',
] as const satisfies readonly Opplysningsslag[];

export const UTSAGN: Record<Utsagnsart, Skjema> = {
  varsel: objekt({ ...artfelt('varsel'), hjemmel: { const: '33.4' } }, ['id', 'art', 'hjemmel']),
  trekk: objekt({ ...artfelt('trekk'), gjelder: ID }, ['id', 'art', 'gjelder']),
  aksept: objekt({ ...artfelt('aksept'), gjelder: ID, regelversjon: { type: 'integer' } }, [
    'id',
    'art',
    'gjelder',
    'regelversjon',
  ]),
  bestridelse: objekt(
    {
      ...artfelt('bestridelse'),
      gjelder: ID,
      hva: { enum: [...OPPLYSNINGSSLAG] },
    },
    ['id', 'art', 'gjelder', 'hva']
  ),
  ingen_krav: objekt({ ...artfelt('ingen_krav'), spor: { enum: [...KRAVSPOR] } }, [
    'id',
    'art',
    'spor',
  ]),
  innsigelse: objekt({ ...artfelt('innsigelse'), gjelder: ID }, ['id', 'art', 'gjelder']),
  protest: objekt({ ...artfelt('protest'), gjelder: ID }, ['id', 'art', 'gjelder']),
  passivitet: objekt({ ...artfelt('passivitet'), gjelder: ID }, ['id', 'art', 'gjelder']),
  begrunnelse: objekt({ ...artfelt('begrunnelse'), gjelder: ID }, ['id', 'art', 'gjelder']),
};

export const STANDPUNKTSARTER = Object.keys(STANDPUNKT) as Standpunktsart[];
export const UTSAGNSARTER = Object.keys(UTSAGN) as Utsagnsart[];

/**
 * Opplysningene om et dokument, etter `hva`. `sendt` og `mottatt` uten `gjelder`
 * gjelder dokumentet, som da er registrert korrespondanse. Med `gjelder` gjelder de
 * et varsel i dokumentet, for eksempel et varsel sendt før kravet det står i
 * (HF-U1, MM-U1). `endringsordre` gjelder registrert korrespondanse med et svar på
 * grunnlaget: den som registrerer, oppgir om brevet var en endringsordre etter
 * § 31.3 (GR-U13). Uten `gjelder` står den i brevet selv; med `gjelder` er den en
 * senere avklaring av et registrert brev, uten at brevet skrives om (MM-U12).
 * Merkingen etter KA-U20 og avklaringen av den er ikke med i første versjon, så en
 * rad med dem er ikke forstått (OV-U7, HF-U1, B-10).
 */
export const OPPLYSNING: Record<(typeof OPPLYSNINGSSLAG)[number], Skjema> = {
  sendt: objekt({ id: ID, hva: { const: 'sendt' }, dato: DATO, gjelder: ID }, [
    'id',
    'hva',
    'dato',
  ]),
  mottatt: objekt({ id: ID, hva: { const: 'mottatt' }, dato: DATO, gjelder: ID }, [
    'id',
    'hva',
    'dato',
  ]),
  endringsordre: objekt(
    { id: ID, hva: { const: 'endringsordre' }, oppfylt: { type: 'boolean' }, gjelder: ID },
    ['id', 'hva', 'oppfylt']
  ),
};

/**
 * Brevteksten i et brev appen sender (LV-U2, LV-U3, #369): ett avsnitt per element,
 * med den låste delen og utdypningen hver for seg (B-13 om begrunnelsestekst).
 */
export const BREVTEKST: Skjema = liste(
  objekt({ gjelder: ID, laast: TEKST, utdypning: TEKST }, ['gjelder', 'laast'])
);

/** `data` i `dokument_registrert`. Elementene kontrolleres hver for seg etter `spor` eller `art`. */
export const DOKUMENT: Skjema = objekt(
  {
    krav: { type: 'array', minItems: 1 },
    svar: { type: 'array', minItems: 1 },
    utsagn: { type: 'array', minItems: 1 },
    opplysninger: { type: 'array', minItems: 1 },
    dokumentasjon: liste(ID),
    brevtekst: BREVTEKST,
  },
  []
);

/** `data` i `sak_opprettet`. Andre sakstyper hører til #309. */
export const SAK_OPPRETTET: Skjema = objekt(
  { sakstittel: TEKST, sakstype: { const: 'standard' } },
  ['sakstittel', 'sakstype']
);
