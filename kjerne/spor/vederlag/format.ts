/**
 * Formatet for vederlaget (#1783): skjemaene for kravet, standpunktene og utregningen i svaret,
 * og tilgangen til kravinnholdet og utregningen med typen for sporet. De felles modulene i
 * `format/` slår opp her.
 */

import { beloep, UgyldigBeloep, type Oere } from '../../regler/beloep.ts';
import { SAERSKILTE, VEDERLAGSRESULTATER } from '../../regler/typer.ts';
import { artfelt, DATO, ID, liste, objekt, TEKST, type Skjema } from '../../format/skjema.ts';
import {
  KORRESPONDANSETYPER,
  type Krav,
  type Kravpost,
  type Standpunkt,
  type Standpunktsart,
  type Vederlagsutregning,
} from '../../typer.ts';

/**
 * Standpunktene i svaret på vederlaget, etter `STANDPUNKTER_I_SPORET`: § 34.1.2, oppgjørsformen
 * og beløpet for hver kravpost, § 34.1.3 og de særskilte postene (OV-U27, OV-U28, KA-U57).
 * Rekkefølgen kontrolleres i `leser.ts`, fordi kravpostene gjentar seg.
 */
export const STANDPUNKTER_I_VEDERLAGET: { art: Standpunktsart; paakrevd: boolean }[] = [
  { art: 'rettidighet', paakrevd: false },
  { art: 'oppgjoersform', paakrevd: false },
  { art: 'justering', paakrevd: false },
  { art: 'beloep', paakrevd: true },
];

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
 * Formen følger OV-U95 punkt 19–22 og arbeidsvalget 07.11 i domenetabellen.
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
 * Skjemaene for standpunktene bare vederlaget har. Rettidigheten er felles og står i
 * `STANDPUNKT` i `format/format.ts`.
 */
export const STANDPUNKT_I_VEDERLAGET: Record<'beloep' | 'oppgjoersform' | 'justering', Skjema> = {
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
};

/** Serverens utregning i svaret på vederlaget, etter B-13. */
export const UTREGNING_I_VEDERLAGET: Skjema = objekt(
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
);

/** Vederlagskravet, etter `KRAVINNHOLD.vederlag`: kravpostene, postene utenfor dem og trekket. */
export interface Vederlagsinnhold {
  kravposter: readonly Kravpost[];
  saerskilt: { produktivitet?: { beloep: number }; rigg_og_drift?: { beloep: number } };
  trekker: readonly string[];
}

/** Vederlagskravet i kravet. */
export function innholdIVederlaget(krav: Pick<Krav, 'innhold'>): Vederlagsinnhold {
  const innhold = krav.innhold as Partial<Vederlagsinnhold>;
  return {
    kravposter: innhold.kravposter ?? [],
    saerskilt: innhold.saerskilt ?? {},
    trekker: innhold.trekker ?? [],
  };
}

/**
 * Et krevd beløp i vederlagskravet, i øre, eller `null` når det ikke står i kravet. Et
 * beløp som ikke er et tall, kaster `Error` og ikke `UgyldigBeloep`: det står i kravet,
 * så det er en feil på serveren og ikke byggherrens ugyldige vurdering (#766).
 */
function lesKrevd(krav: Krav, verdi: number | undefined): Oere | null {
  try {
    return beloep(verdi);
  } catch (feil) {
    if (!(feil instanceof UgyldigBeloep)) throw feil;
    throw new Error(`Det krevde beløpet i kravet ${krav.id} kan ikke leses: ${feil.message}.`);
  }
}

/** OV-U23: kravet krever posten etter § 34.1.3 annet ledd (`saerskilt.produktivitet`). */
export const harProduktivitetspost = (krav: Krav): boolean =>
  innholdIVederlaget(krav).saerskilt.produktivitet !== undefined;

/** Kravpostene i en lagret kravversjon (OV-U95 punkt 19). */
export const kravposterI = (krav: Pick<Krav, 'innhold'>): readonly Kravpost[] =>
  innholdIVederlaget(krav).kravposter;

/** OV-U95 punkt 19: kravet har kravposter i vederlagsjusteringen, i tillegg til eller uten postene utenfor. */
export const harHovedbeloep = (krav: Krav): boolean => kravposterI(krav).length > 0;

/** Det krevde beløpet i en kravpost med fast sum, i øre, eller `null` etter en beregningsregel. */
export const krevdIKravposten = (krav: Krav, post: Kravpost): Oere | null =>
  post.oppgjoersform === 'tilbud' ? lesKrevd(krav, post.beloep) : null;

/** Det krevde beløpet for rigg og drift i forlenget byggetid, i øre, eller `null` uten posten (OV-U89 punkt 17). */
export const krevdRigg = (krav: Krav): Oere | null =>
  lesKrevd(krav, innholdIVederlaget(krav).saerskilt.rigg_og_drift?.beloep);

/** Det krevde beløpet i posten etter § 34.1.3 annet ledd, i øre, eller `null` uten posten. */
export const krevdProduktivitet = (krav: Krav): Oere | null =>
  lesKrevd(krav, innholdIVederlaget(krav).saerskilt.produktivitet?.beloep);

/**
 * Summen av de krevde faste beløpene i kravet, i øre: kravpostene med fast sum, kravet etter
 * § 34.1.3 annet ledd og rigg og drift. En kravpost etter en beregningsregel har ikke et krevd
 * beløp og regnes ikke med (OV-U95 punkt 2 og 19, OV-U73).
 */
export const krevdSamlet = (krav: Krav): Oere =>
  kravposterI(krav).reduce((sum, p) => sum + (krevdIKravposten(krav, p) ?? 0n), 0n) +
  (krevdProduktivitet(krav) ?? 0n) +
  (krevdRigg(krav) ?? 0n);

/** Utregningen i et svar på vederlaget. */
export const utregningIVederlaget = (utregning: Record<string, unknown>): Vederlagsutregning =>
  utregning as unknown as Vederlagsutregning;
