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
import {
  FRISTRESULTATER,
  FORHOLDSRESULTATER,
  SAERSKILTE,
  VEDERLAGSRESULTATER,
} from '../regler/typer.ts';
import type { Skjema } from './skjema.ts';
import {
  KRAVSPOR,
  SPOR,
  type Hjemmel,
  type OppgittDatofelt,
  type Opplysningsslag,
  type Spor,
  type Standpunkt,
  type Standpunktsart,
  type Utsagnsart,
  KORRESPONDANSETYPER,
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

/** Hjemmelen for rettidigheten i sporet: § 32.2 i forholdet, § 34.1.2 i vederlaget, § 33.4 i fristen. */
export const HJEMMEL: Record<Spor, Hjemmel> = {
  forhold: '32.2',
  vederlag: '34.1.2',
  frist: '33.4',
};

/**
 * Standpunktene et svar i sporet kan ha, i rekkefølgen brevet setter dem.
 * Rekkefølgen avgjør hva som er prinsipalt og subsidiært (vedtaket 05.10 om
 * avslag sammen med § 32.2). Arten i sporet uten `?` må finnes.
 */
export const STANDPUNKTER_I_SPORET: Record<Spor, { art: Standpunktsart; paakrevd: boolean }[]> = {
  forhold: [
    { art: 'rettidighet', paakrevd: false },
    { art: 'forhold', paakrevd: true },
  ],
  // § 34.1.2, oppgjørsformen og beløpet for hver kravpost, § 34.1.3 og de særskilte postene
  // (OV-U27, OV-U28, KA-U57). Rekkefølgen kontrolleres i `leser.ts`, fordi kravpostene gjentar seg.
  vederlag: [
    { art: 'rettidighet', paakrevd: false },
    { art: 'oppgjoersform', paakrevd: false },
    { art: 'justering', paakrevd: false },
    { art: 'beloep', paakrevd: true },
  ],
  frist: [
    // § 33.4, så § 33.6.2 (VS-U17). Én for hver hjemmel (`leser.ts`).
    { art: 'rettidighet', paakrevd: false },
    { art: 'rettidighet', paakrevd: false },
    { art: 'hindring', paakrevd: false },
    { art: 'spesifisering', paakrevd: false },
    { art: 'dager', paakrevd: true },
  ],
};

/** Hjemmelen i standpunktet til oppgjørsformen etter TEs oppgjørsform (KA-U57 (d), KA-U54). */
export const OPPGJOERSHJEMMEL = {
  tilbud: '34.2.2',
  enhetspriser: '34.3',
  regningsarbeid: '34.4',
} as const;

/** Oppgjørsformene byggherren kan mene for kravposten, når tilbudet ikke er akseptert (§ 34.2.2). */
export const METODER = ['enhetspriser', 'regningsarbeid'] as const satisfies readonly NonNullable<
  Extract<Standpunkt, { art: 'oppgjoersform' }>['oensket']
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
 * VS-U26: datoen varslingsplikten løper fra, som TE oppgir i påberopelsen,
 * etter hovedkategorien. Der § 32.2 gjelder, er det datoen pålegget ble mottatt;
 * i svikt og andre forhold (§ 33.1 b–c) datoen TE ble klar over forholdet.
 * Underkategorien endringsordre har ingen.
 */
export const OPPGITT_DATO = {
  endring: 'paalegg_mottatt',
  svikt: 'klar_over_forholdet',
  andre_forhold: 'klar_over_forholdet',
} as const satisfies Partial<Record<Hovedkategori, OppgittDatofelt>>;

export type OppgittDato = (typeof OPPGITT_DATO)[keyof typeof OPPGITT_DATO];

/**
 * Det datoen gjelder, med ordene meldingene og skjemaet bruker (VS-U26, #698):
 * «TE har oppgitt at pålegget ble mottatt …», «datoen pålegget ble mottatt». Brevet har ordene
 * i `DATOEN_I_BREVET` (LV-U56).
 */
export const DATOEN_GJELDER: Record<OppgittDato, string> = {
  paalegg_mottatt: 'pålegget ble mottatt',
  klar_over_forholdet: 'TE ble klar over forholdet',
};

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

const POSITIVT_BELOEP: Skjema = { type: 'number', exclusiveMinimum: 0 };
const BELOEPSPOST = objekt({ beloep: POSITIVT_BELOEP }, ['beloep']);

/** Betegnelsen kommandoen tildeler en kravpost: P1, P2 … (KA-U53). */
export const BETEGNELSE = '^P[1-9][0-9]*$';

/**
 * Dokumentet sendt utenfor løsningen som TE legger til i kravskjemaet som varselet for
 * kravposten, med datoen og typen. Det skrives som et registrert varsel før kravet (VS-U53).
 */
const KRAVPOSTVARSEL_I_KOMMANDOEN: Skjema = objekt(
  {
    sendt: DATO,
    korrespondansetype: { enum: [...KORRESPONDANSETYPER] },
    dokumentasjon: liste(ID),
  },
  ['sendt', 'korrespondansetype', 'dokumentasjon']
);

/**
 * En kravpost med feltene oppgjørsformen har (OV-U95 punkt 19, KA-U66). I kommandoen har en
 * ny kravpost ingen `id`, og ingen kravpost har `betegnelse`: serveren setter dem
 * (`kommandoer/skriving.ts`). En kravpost fra forrige versjon har sin `id`.
 */
function kravpost(lagret: boolean): Skjema {
  const felles = {
    id: ID,
    ...(lagret ? { betegnelse: { type: 'string', pattern: BETEGNELSE } } : {}),
    beskrivelse: TEKST,
    pns: TEKST,
    // VS-U54: varselet etter § 34.3.3 eller § 34.4 for kravposten, når det er gitt før kravet.
    // I kommandoen kan det også være dokumentet TE legger til i kravskjemaet (VS-U51, VS-U53).
    varsel: lagret ? ID : { anyOf: [ID, KRAVPOSTVARSEL_I_KOMMANDOEN] },
  };
  const paakrevd = lagret
    ? ['id', 'betegnelse', 'beskrivelse', 'oppgjoersform']
    : ['beskrivelse', 'oppgjoersform'];
  return {
    anyOf: [
      objekt({ ...felles, oppgjoersform: { const: 'tilbud' }, beloep: POSITIVT_BELOEP }, [
        ...paakrevd,
        'beloep',
      ]),
      objekt(
        {
          ...felles,
          oppgjoersform: { const: 'enhetspriser' },
          justert: { type: 'boolean' },
          anslag: POSITIVT_BELOEP,
        },
        paakrevd
      ),
      objekt(
        {
          ...felles,
          oppgjoersform: { const: 'regningsarbeid' },
          kostnadsoverslag: POSITIVT_BELOEP,
        },
        paakrevd
      ),
    ],
  };
}

/**
 * Innholdet i vederlagskravet, lagret eller i kommandoen. `saerskilt` er postene utenfor
 * kravpostene: kravet etter § 34.1.3 annet ledd (OV-U89 punkt 6). Rigg og drift i forlenget
 * byggetid (OV-U89 punkt 17) er ikke i formatet før #1724 har satt formen, så en lagret rad med
 * posten er ikke forstått (#1775). `trekker` er kravpostene fra forrige versjon TE trekker (KA-U56).
 */
export function vederlagsinnhold(lagret: boolean): {
  properties: Skjema;
  required: string[];
  anyOf: Skjema[];
} {
  return {
    properties: {
      kravposter: liste(kravpost(lagret)),
      saerskilt: objekt({ produktivitet: BELOEPSPOST }, ['produktivitet']),
      trekker: liste(ID),
    },
    required: [],
    anyOf: [{ required: ['kravposter'] }, { required: ['saerskilt'] }],
  };
}

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
  forhold: {
    properties: {
      hovedkategori: { enum: HOVEDKATEGORIER },
      underkategori: { enum: UNDERKATEGORIER },
      endringsordre: TEKST,
      paalegg_mottatt: DATO,
      klar_over_forholdet: DATO,
    },
    required: ['hovedkategori', 'underkategori'],
    anyOf: KATEGORIPAR,
  },
  // OV-U95 punkt 19–22 og arbeidsvalget 07.11 i domenetabellen: kravpostene, postene utenfor dem og trekket. Et krav
  // kan ha bare postene utenfor kravpostene (OV-U89 punkt 6).
  vederlag: vederlagsinnhold(true),
  frist: { properties: { dager: { type: 'integer', minimum: 1 } }, required: ['dager'] },
};

const sporfelt = (spor: Spor) => ({ id: ID, spor: { const: spor } });
const artfelt = (art: string) => ({ id: ID, art: { const: art } });

export const KRAV: Record<Spor, Skjema> = Object.fromEntries(
  SPOR.map((s) => [
    s,
    objekt(
      {
        ...sporfelt(s),
        erstatter: ID,
        // HF-U1, LV-U18 punkt 3: forespørselen etter § 33.6.2 fristkravet svarer på.
        ...(s === 'frist' ? { gjelder: ID } : {}),
        ...KRAVINNHOLD[s].properties,
      },
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
      hjemmel: { enum: ['32.2', '33.4', '33.6.2', '34.1.2', '34.1.3', '34.3.3', '34.4'] },
      i_tide: { type: 'boolean' },
      // VS-U5, OV-U22: beløpet byggherren godtar for posten etter begrensningen etter § 34.1.3.
      begrenset_beloep: { type: 'number', minimum: 0 },
    },
    ['id', 'art', 'gjelder', 'hjemmel', 'i_tide']
  ),
  forhold: objekt({ ...artfelt('forhold'), resultat: { enum: [...FORHOLDSRESULTATER] } }, [
    'id',
    'art',
    'resultat',
  ]),
  // OV-U26, OV-U31: beløpet byggherren godtar for posten uten begrensningen etter § 34.1.3.
  // Posten er kravposten `gjelder` eller den særskilte `saerskilt`, ikke begge (`leser.ts`).
  // Uten `beloep` når tilbudet for kravposten ikke er akseptert (KA-U72, `leser.ts`).
  beloep: objekt(
    {
      ...artfelt('beloep'),
      beloep: { type: 'number', minimum: 0 },
      gjelder: ID,
      saerskilt: { enum: [...SAERSKILTE] },
    },
    ['id', 'art'],
    [{ required: ['gjelder'] }, { required: ['saerskilt'] }]
  ),
  // KA-U57 (d), KA-U54: standpunktet til TEs oppgjørsform for kravposten `gjelder`, med TEs
  // oppgjørsform som hjemmel. KA-U69, KA-U71: kravet om spesifisert tilbud (`leser.ts`).
  oppgjoersform: objekt(
    {
      ...artfelt('oppgjoersform'),
      gjelder: ID,
      hjemmel: { enum: ['34.2.2', '34.3', '34.4'] },
      aksepterer: { type: 'boolean' },
      oensket_oppgjoersform: { enum: [...METODER] },
      krever_tilbud: { const: true },
    },
    ['id', 'art', 'gjelder', 'hjemmel', 'aksepterer']
  ),
  // § 34.3.2, KA-U68: standpunktet til justeringen av enhetsprisene for kravposten `gjelder`.
  justering: objekt(
    {
      ...artfelt('justering'),
      gjelder: ID,
      hjemmel: { const: '34.3.2' },
      godtar: { type: 'boolean' },
    },
    ['id', 'art', 'gjelder', 'hjemmel', 'godtar']
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

/** Serverens utregning etter B-13. Forholdet har ingen. */
export const UTREGNING: Record<Spor, Skjema | null> = {
  forhold: null,
  vederlag: objekt(
    {
      resultat: { enum: [...VEDERLAGSRESULTATER] },
      godkjent_beloep: { type: 'number', minimum: 0 },
      subsidiaert_resultat: { enum: [...VEDERLAGSRESULTATER] },
      subsidiaert_godkjent_beloep: { type: 'number', minimum: 0 },
      // OV-U31, KA-U57 (e): én rad per post med ett element per lag. `leser.ts` kontrollerer
      // radene mot standpunktene og totalene.
      poster: liste(
        objekt(
          {
            gjelder: ID,
            saerskilt: { enum: ['produktivitet'] },
            lag: liste(
              objekt(
                { lag: { type: 'integer', minimum: 1 }, beloep: { type: 'number', minimum: 0 } },
                ['lag']
              )
            ),
          },
          ['lag']
        )
      ),
    },
    ['resultat', 'godkjent_beloep', 'poster']
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
      objekt({ standpunkt: ID, lag: { type: 'integer', minimum: 1 } }, ['standpunkt', 'lag'])
    ),
    upaavirket: liste(ID),
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
          ...(s === 'forhold' ? {} : { paaberopelse: ID }),
          standpunkter: { type: 'array', minItems: 1 },
          ...(utregning ? { utregning } : {}),
          beslutningsgrunnlag: BESLUTNINGSGRUNNLAG,
        },
        ['id', 'spor', 'gjelder', 'standpunkter', 'beslutningsgrunnlag'].concat(
          utregning ? ['utregning'] : [],
          s === 'forhold' ? [] : ['paaberopelse']
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
  // VS-U34: varselet etter § 32.2 sendt utenfor løsningen registreres som de andre.
  // VS-U48, VS-U52: varslene etter § 34.3.3 første ledd og § 34.4, sendt eller registrert.
  varsel: objekt(
    {
      ...artfelt('varsel'),
      hjemmel: { enum: ['32.2', '33.4', '34.1.2', '34.1.3', '34.3.3', '34.4'] },
    },
    ['id', 'art', 'hjemmel']
  ),
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
  innsigelse: objekt({ ...artfelt('innsigelse'), gjelder: ID, grunn: { const: 'ikke_svar' } }, [
    'id',
    'art',
    'gjelder',
  ]),
  foresporsel: objekt({ ...artfelt('foresporsel'), hjemmel: { const: '33.6.2' } }, [
    'id',
    'art',
    'hjemmel',
  ]),
  foresporselssvar: objekt({ ...artfelt('foresporselssvar'), gjelder: ID }, [
    'id',
    'art',
    'gjelder',
  ]),
  protest: objekt({ ...artfelt('protest'), gjelder: ID }, ['id', 'art', 'gjelder']),
  passivitet: objekt({ ...artfelt('passivitet'), gjelder: ID }, ['id', 'art', 'gjelder']),
  begrunnelse: objekt({ ...artfelt('begrunnelse'), gjelder: ID }, ['id', 'art', 'gjelder']),
  // Punkt 10 i samlevedtaket for retting av sendt brev (MM-U41 (opphevet av MM-U52)): datoen står i samme felt som
  // i kravet, og korrigeringen har nøyaktig én av dem.
  korrigering: objekt(
    {
      ...artfelt('korrigering'),
      gjelder: ID,
      paalegg_mottatt: DATO,
      klar_over_forholdet: DATO,
    },
    ['id', 'art', 'gjelder'],
    [
      { required: ['paalegg_mottatt'], properties: { klar_over_forholdet: { enum: [] } } },
      { required: ['klar_over_forholdet'], properties: { paalegg_mottatt: { enum: [] } } },
    ]
  ),
};

export const STANDPUNKTSARTER = Object.keys(STANDPUNKT) as Standpunktsart[];
export const UTSAGNSARTER = Object.keys(UTSAGN) as Utsagnsart[];

/**
 * Opplysningene om et dokument, etter `hva`. `sendt` og `mottatt` uten `gjelder`
 * gjelder dokumentet, som da er registrert korrespondanse. Med `gjelder` gjelder de
 * et varsel i dokumentet, for eksempel et varsel sendt før kravet det står i
 * (HF-U1, MM-U1). `endringsordre` gjelder registrert korrespondanse med et svar på
 * forholdet: den som registrerer, oppgir om brevet var en endringsordre etter
 * § 31.3 (GR-U13), i brevet selv. En senere avklaring med `gjelder` (MM-U12 (opphevet av MM-U50)) er ikke
 * med i første versjon: skjemaet godtar feltet, men leseren avviser den (OV-U13).
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

/**
 * Et vedlegg i brevet (LV-U14). Summen er SHA-256 av innholdet, som mellomlageret har den:
 * 64 hex-tegn med små bokstaver, som `vedlegg_sum_form` i basen.
 */
export const VEDLEGG: Skjema = objekt(
  { vedlegg_id: ID, filnavn: TEKST, innhold_sha256: { type: 'string', pattern: '^[0-9a-f]{64}$' } },
  ['vedlegg_id', 'filnavn', 'innhold_sha256']
);

/**
 * `data` i `dokument_registrert`. Elementene kontrolleres hver for seg etter `spor` eller `art`.
 * `beskrivelse` og `spor` hører til et brev registrert som dokumentasjon (OV-U4, OV-U16), som
 * ikke har noe annet enn dem, datoen det ble sendt og brevet som vedlegg (`leser.ts`).
 * `retter` er registreringen en retting viser til (OV-U17, OV-U18), og `ikke_i_saken` sier at
 * brevet ikke hører til saken (OV-U18); navnene er arbeidsvalget 22.10 i #1045.
 */
export const DOKUMENT: Skjema = objekt(
  {
    krav: { type: 'array', minItems: 1 },
    svar: { type: 'array', minItems: 1 },
    utsagn: { type: 'array', minItems: 1 },
    opplysninger: { type: 'array', minItems: 1 },
    dokumentasjon: liste(VEDLEGG),
    brevtekst: BREVTEKST,
    brevtittel: TEKST,
    brevnummer: { type: 'integer', minimum: 1 },
    merking: TEKST,
    deres_ref: liste(TEKST),
    korrespondansetype: { enum: [...KORRESPONDANSETYPER] },
    beskrivelse: TEKST,
    spor: liste({ enum: [...SPOR] }),
    retter: ID,
    ikke_i_saken: { const: true },
  },
  []
);

/** `data` i `sak_opprettet`. Andre sakstyper hører til #309. */
export const SAK_OPPRETTET: Skjema = objekt(
  { sakstittel: TEKST, sakstype: { const: 'standard' } },
  ['sakstittel', 'sakstype']
);
