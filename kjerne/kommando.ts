/**
 * Kommandoene i målmodellen, slik klienten sender dem, og kontrollen av formen.
 * Formen kontrolleres med kontraktvalidatoren fra språkprøven (`feilI`), mot
 * skjemaene her: aksepten bærer regelversjonen og enighetsgrunnlaget TE fikk
 * se, og det har ikke `kontrakt.json` (#304; formatet hører til #273).
 */

import { feilI } from './skjema.ts';
import type { Svarvurdering } from './standpunkt.ts';
import type { Enighetsgrunnlag, Spor } from './typer.ts';

export interface Svarutkast {
  spor: Spor;
  /** Kravversjonen svaret gjelder. */
  gjelder: string;
  regelversjon: number;
  vurderinger: Svarvurdering;
  /** Klientens utregning, som serveren regner på nytt (B-13). */
  resultat: Record<string, unknown>;
}

export type Kommando =
  | { type: 'krav'; spor: Spor; innhold: Record<string, unknown>; varsel?: { sendt: string } }
  | { type: 'brev'; svar: Svarutkast[] }
  | { type: 'revisjon'; erstatter: string; svar: Svarutkast }
  | {
      type: 'aksept';
      spor: Spor;
      svar: string;
      regelversjon: number;
      enighetsgrunnlag: Enighetsgrunnlag | null;
    }
  | { type: 'trekk'; spor: Spor }
  | { type: 'varsel'; spor: 'frist'; hjemmel: '33.4'; sendt: string; dokumentasjon?: string[] }
  | { type: 'bestridelse'; gjelder: string; hva: 'sendt' | 'mottatt' };

type Skjema = Record<string, unknown>;

const SPOR = { enum: ['grunnlag', 'vederlag', 'frist'] };
const ID = { type: 'string', minLength: 1 };
const DATO = { type: 'string', minLength: 10 };
const objekt = (properties: Skjema, required: string[]): Skjema => ({
  type: 'object',
  properties,
  required,
  additionalProperties: false,
});

const SVARUTKAST = objekt(
  {
    spor: SPOR,
    gjelder: ID,
    regelversjon: { type: 'integer' },
    vurderinger: { type: 'object' },
    resultat: { type: 'object' },
  },
  ['spor', 'gjelder', 'regelversjon', 'vurderinger', 'resultat']
);

/** Feltnavnene er de dagens kravhendelser har, så kompatibilitetsleseren leser dem likt. */
const KRAVINNHOLD: Record<Spor, Skjema> = {
  grunnlag: objekt(
    {
      hovedkategori: { type: 'string' },
      underkategori: { type: 'string' },
      tittel: { type: 'string' },
      beskrivelse: { type: 'string' },
    },
    ['hovedkategori', 'underkategori']
  ),
  vederlag: objekt(
    { metode: { const: 'FASTPRIS_TILBUD' }, belop_direkte: { type: 'number', minimum: 0 } },
    ['metode', 'belop_direkte']
  ),
  frist: objekt(
    { varsel_type: { const: 'spesifisert' }, antall_dager: { type: 'integer', minimum: 0 } },
    ['varsel_type', 'antall_dager']
  ),
};

const SKJEMA: Record<Kommando['type'], Skjema> = {
  krav: objekt(
    {
      type: { const: 'krav' },
      spor: SPOR,
      innhold: { type: 'object' },
      varsel: objekt({ sendt: DATO }, ['sendt']),
    },
    ['type', 'spor', 'innhold']
  ),
  brev: objekt({ type: { const: 'brev' }, svar: { type: 'array', items: SVARUTKAST } }, [
    'type',
    'svar',
  ]),
  revisjon: objekt({ type: { const: 'revisjon' }, erstatter: ID, svar: SVARUTKAST }, [
    'type',
    'erstatter',
    'svar',
  ]),
  aksept: objekt(
    {
      type: { const: 'aksept' },
      spor: SPOR,
      svar: ID,
      regelversjon: { type: 'integer' },
      enighetsgrunnlag: { type: ['object', 'null'] },
    },
    ['type', 'spor', 'svar', 'regelversjon', 'enighetsgrunnlag']
  ),
  trekk: objekt({ type: { const: 'trekk' }, spor: SPOR }, ['type', 'spor']),
  varsel: objekt(
    {
      type: { const: 'varsel' },
      spor: { const: 'frist' },
      hjemmel: { const: '33.4' },
      sendt: DATO,
      dokumentasjon: { type: 'array', items: { type: 'string' } },
    },
    ['type', 'spor', 'hjemmel', 'sendt']
  ),
  bestridelse: objekt(
    { type: { const: 'bestridelse' }, gjelder: ID, hva: { enum: ['sendt', 'mottatt'] } },
    ['type', 'gjelder', 'hva']
  ),
};

/** Feilene i formen, tomme når kommandoen kan vurderes. */
export function formfeil(kommando: unknown): string[] {
  if (typeof kommando !== 'object' || kommando === null || Array.isArray(kommando))
    return ['Kommandoen må være et objekt.'];
  const type = (kommando as { type?: unknown }).type;
  if (typeof type !== 'string' || !Object.hasOwn(SKJEMA, type))
    return [`Ukjent kommando: ${String(type)}`];
  const feil = feilI(kommando, SKJEMA[type as Kommando['type']]);
  if (type === 'krav' && !feil.length) {
    const k = kommando as { spor: Spor; innhold: unknown };
    feil.push(...feilI(k.innhold, KRAVINNHOLD[k.spor], '$.innhold'));
    if (k.spor !== 'frist' && 'varsel' in k)
      feil.push('$.varsel: bare et fristkrav har varsel etter § 33.4');
  }
  if (type === 'brev' && !feil.length) {
    const spor = (kommando as { svar: Svarutkast[] }).svar.map((s) => s.spor);
    if (!spor.length) feil.push('$.svar: brevet har ingen svar');
    if (new Set(spor).size !== spor.length) feil.push('$.svar: to svar i samme spor');
  }
  return feil;
}
