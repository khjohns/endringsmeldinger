/**
 * Kommandoene i kjernen, slik klienten sender dem, og kontrollen av formen mot
 * skjemaene her (`feilI`). Aksepten bærer svaret og regelversjonen TE fikk se
 * (KA-U10); det har ikke `kontrakt.json` (#304). Innholdet i et krav har
 * feltene i formatet (`KRAVINNHOLD` i `format.ts`). Vurderingene i et svar har
 * navnene reglene regner med, og blir standpunkter og utregning når brevet
 * skrives.
 */

import { DATO, ID, KRAVINNHOLD as INNHOLD, liste, objekt } from './format.ts';
import { erObjekt, feilI, type Skjema } from './skjema.ts';
import type { Svarvurdering } from './standpunkt.ts';
import { SPOR as SPORENE, type Spor } from './typer.ts';

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
    }
  | { type: 'trekk'; spor: Spor }
  | { type: 'varsel'; spor: 'frist'; hjemmel: '33.4'; sendt: string; dokumentasjon?: string[] }
  | { type: 'bestridelse'; gjelder: string; hva: 'sendt' | 'mottatt' };

const SPOR = { enum: [...SPORENE] };
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

const KRAVINNHOLD = Object.fromEntries(
  SPORENE.map((s) => [s, objekt(INNHOLD[s].properties, INNHOLD[s].required)])
) as Record<Spor, Skjema>;

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
    },
    ['type', 'spor', 'svar', 'regelversjon']
  ),
  trekk: objekt({ type: { const: 'trekk' }, spor: SPOR }, ['type', 'spor']),
  varsel: objekt(
    {
      type: { const: 'varsel' },
      spor: { const: 'frist' },
      hjemmel: { const: '33.4' },
      sendt: DATO,
      dokumentasjon: liste(ID),
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
  if (!erObjekt(kommando)) return ['Kommandoen må være et objekt.'];
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
