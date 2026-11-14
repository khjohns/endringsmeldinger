/**
 * Lagringsformatet for hendelsene TS-kjernen skriver, format 1 (B-10, #273,
 * designnotatet `docs/design-hendelsesformat-2026-10-09.md`). Én rad per
 * dokument. Hvert krav, svar, utsagn og hver opplysning har en UUID fra
 * serveren, og relasjonene står som `gjelder` og `erstatter`.
 *
 * `data` har ingen `null`, ingen tom liste og ingen tom streng. Et felt som
 * mangler, betyr at parten ikke har sagt det, eller at det ikke hører til arten.
 * Et ukjent felt, en ukjent art eller et felt arten krever som mangler, gjør
 * raden ikke forstått (4.4, MM-U2). Skjemaene her er formen, sammen med skjemaene for et spor
 * i `spor/<spor>/format.ts` som de slår opp i (#1783); lesereglene som går på tvers av radene,
 * står i `utled.ts`.
 *
 * Registeret over typene og artene er `docs/datamodell/kjernehendelser.toml`
 * (#320), og en vakttest holder det likt med det som eksporteres her.
 */

import { artfelt, DATO, ID, liste, objekt, TEKST, type Skjema } from './skjema.ts';
import {
  FORHOLDSINNHOLD,
  STANDPUNKT_I_FORHOLDET,
  TILLATTE_STANDPUNKTER_I_FORHOLDET,
} from '../spor/forhold/format.ts';
import {
  fristinnhold,
  RELASJON_I_FRISTKRAVET,
  STANDPUNKT_I_FRISTEN,
  TILLATTE_STANDPUNKTER_I_FRISTEN,
  UTREGNINGSSKJEMA_I_FRISTEN,
} from '../spor/frist/format.ts';
import {
  STANDPUNKT_I_VEDERLAGET,
  TILLATTE_STANDPUNKTER_I_VEDERLAGET,
  UTREGNINGSSKJEMA_I_VEDERLAGET,
  vederlagsinnhold,
} from '../spor/vederlag/format.ts';
import {
  KRAVSPOR,
  SPOR,
  type Hjemmel,
  type Opplysningsslag,
  type Spor,
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
export const TILLATTE_STANDPUNKTER: Record<Spor, { art: Standpunktsart; paakrevd: boolean }[]> = {
  forhold: TILLATTE_STANDPUNKTER_I_FORHOLDET,
  vederlag: TILLATTE_STANDPUNKTER_I_VEDERLAGET,
  frist: TILLATTE_STANDPUNKTER_I_FRISTEN,
};

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
  forhold: FORHOLDSINNHOLD,
  vederlag: vederlagsinnhold(true),
  frist: fristinnhold(true),
};

/** Relasjonene i en kravversjon ut over `erstatter`, per spor. */
const RELASJONER_I_KRAVET: Record<Spor, Record<string, Skjema>> = {
  forhold: {},
  vederlag: {},
  frist: RELASJON_I_FRISTKRAVET,
};

const sporfelt = (spor: Spor) => ({ id: ID, spor: { const: spor } });

export const KRAV: Record<Spor, Skjema> = Object.fromEntries(
  SPOR.map((s) => [
    s,
    objekt(
      {
        ...sporfelt(s),
        erstatter: ID,
        ...RELASJONER_I_KRAVET[s],
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
  ...STANDPUNKT_I_FORHOLDET,
  ...STANDPUNKT_I_VEDERLAGET,
  ...STANDPUNKT_I_FRISTEN,
};

/** Serverens utregning etter B-13. Forholdet har ingen. */
export const UTREGNINGSSKJEMA: Record<Spor, Skjema | null> = {
  forhold: null,
  vederlag: UTREGNINGSSKJEMA_I_VEDERLAGET,
  frist: UTREGNINGSSKJEMA_I_FRISTEN,
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
    const utregning = UTREGNINGSSKJEMA[s];
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
  // Punkt 10 i samlevedtaket for retting av sendt brev (MM-U55): datoen står i samme felt som
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
 * Brevteksten i et brev appen sender (LV-U2, LV-U3, #369): ett avsnitt per element, eller per
 * punkt i et element med punkter (LV-U70), med den låste delen og utdypningen hver for
 * seg (B-13 om begrunnelsestekst).
 */
export const BREVTEKST: Skjema = liste(
  objekt(
    {
      gjelder: ID,
      punkt: ID,
      overskrift: TEKST,
      laast: TEKST,
      utdypning: TEKST,
    },
    ['gjelder', 'laast']
  )
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
