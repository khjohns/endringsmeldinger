/**
 * Formatet for fristen (#1783): skjemaene for fristkravet, standpunktene og utregningen i svaret,
 * og tilgangen til kravinnholdet og utregningen med typen for sporet. De felles modulene i
 * `format/` slår opp her.
 */

import { FRISTRESULTATER } from '../../regler/typer.ts';
import {
  artfelt,
  ID,
  objekt,
  Uforstaatt,
  type Skjema,
  type Svarlesing,
} from '../../format/skjema.ts';
import type { Fristutregning, Hjemmel, Krav, Standpunkt, Standpunktsart } from '../../typer.ts';

/** Standpunktene i svaret på fristkravet, etter `STANDPUNKTER_I_SPORET`. */
export const STANDPUNKTER_I_FRISTEN: { art: Standpunktsart; paakrevd: boolean }[] = [
  // § 33.4, så § 33.6.2 (VS-U17). Én for hver hjemmel (`leser.ts`).
  { art: 'rettidighet', paakrevd: false },
  { art: 'rettidighet', paakrevd: false },
  { art: 'hindring', paakrevd: false },
  { art: 'spesifisering', paakrevd: false },
  { art: 'dager', paakrevd: true },
];

/** Innholdet i fristkravet, etter `KRAVINNHOLD`. */
export const FRISTINNHOLD: { properties: Skjema; required: string[]; anyOf?: Skjema[] } = {
  properties: { dager: { type: 'integer', minimum: 1 } },
  required: ['dager'],
};

/** HF-U1, LV-U18 punkt 3: forespørselen etter § 33.6.2 fristkravet svarer på. */
export const RELASJON_I_FRISTKRAVET: Record<string, Skjema> = { gjelder: ID };

/** Skjemaene for standpunktene i svaret på fristkravet, etter `STANDPUNKT`. */
export const STANDPUNKT_I_FRISTEN: Record<'hindring' | 'spesifisering' | 'dager', Skjema> = {
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

/** Serverens utregning etter B-13, etter `UTREGNING`. */
export const UTREGNING_I_FRISTEN: Skjema = objekt(
  {
    resultat: { enum: [...FRISTRESULTATER] },
    godkjent_dager: { type: 'integer', minimum: 0 },
    subsidiaert_resultat: { enum: [...FRISTRESULTATER] },
    subsidiaert_godkjent_dager: { type: 'integer', minimum: 0 },
  },
  ['resultat', 'godkjent_dager']
);

/** Fristkravet, etter `KRAVINNHOLD.frist`. */
export interface Fristinnhold {
  dager: number;
}

/** Fristkravet i kravet. */
export const innholdIFristen = (krav: Pick<Krav, 'innhold'>): Fristinnhold => ({
  dager: krav.innhold.dager as number,
});

/**
 * Utregningen i et svar på fristen (#1777). Den lagrede formen er `Svar.utregning`, og leseren
 * kontrollerer den mot `UTREGNING` i `format/format.ts`. Frysingen før skrivingen leser
 * standpunktene med en utregning som ikke er kontrollert, så et felt kan mangle der.
 */
export const utregningIFristen = (utregning: Record<string, unknown>): Fristutregning =>
  utregning as unknown as Fristutregning;

type Data = Record<string, unknown>;

/** Standpunktene som er fristens egne, lest av det lagrede svaret. Rettidigheten leses felles. */
function standpunktIFristen(e: Data, utregning: Data, sti: string): Standpunkt | null {
  const id = e.id as string;
  switch (e.art) {
    case 'hindring':
      return { id, art: 'hindring', oppfylt: e.oppfylt as boolean };
    case 'spesifisering':
      // VS-U4: det prinsipale dagtallet står bare når spesifiseringen kom for sent.
      if (e.i_tide === 'dager' in e)
        throw new Uforstaatt(
          `${sti}: dagene i standpunktet etter § 33.6.1 stemmer ikke med rettidigheten`
        );
      return {
        id,
        art: 'spesifisering',
        gjelder: e.gjelder as string,
        hjemmel: '33.6.1',
        iTide: e.i_tide as boolean,
        ...(e.i_tide ? {} : { dager: e.dager as number }),
      };
    case 'dager': {
      const frist = utregningIFristen(utregning);
      return {
        id,
        art: 'dager',
        resultat: frist.subsidiaert_resultat ?? frist.resultat,
        vurdert: frist.subsidiaert_godkjent_dager ?? frist.godkjent_dager,
      };
    }
    default:
      return null;
  }
}

/** VS-U24: ett standpunkt for hver bestemmelse, § 33.4 før § 33.6.2. */
function kontrollerHjemleneIFristen(hjemler: Hjemmel[], sti: string): void {
  if (hjemler.length > 1 && (hjemler[0] !== '33.4' || hjemler[1] !== '33.6.2'))
    throw new Uforstaatt(
      `${sti}: rettidigheten står ${hjemler.map((h) => `etter § ${h}`).join(', ')}, men bare § 33.4 og deretter § 33.6.2 er lov`
    );
}

/** Lesingen av svaret på fristkravet, etter `SVARLESING` i `format/leser.ts`. */
export const LESING_I_FRISTEN = {
  standpunkt: standpunktIFristen,
  gjentas: false,
  // § 33.6.2 (VS-U17, VS-U19): fristen har også rettidigheten av svaret på forespørselen.
  rettidighet: ['33.6.2'],
  subsidiaertVerdi: 'subsidiaert_godkjent_dager',
  kontrollerHjemlene: kontrollerHjemleneIFristen,
} satisfies Svarlesing;
