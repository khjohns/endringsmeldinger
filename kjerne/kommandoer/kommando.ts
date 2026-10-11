/**
 * Kommandoene i kjernen, slik klienten sender dem, og kontrollen av formen mot
 * skjemaene her (`feilI`). Aksepten bærer svaret og regelversjonen TE fikk se
 * (KA-U10); det har ikke `kontrakt.json` (#304). Innholdet i et krav har
 * feltene i formatet (`KRAVINNHOLD` i `format.ts`). Vurderingene i et svar har
 * navnene reglene regner med, og blir standpunkter og utregning når brevet
 * skrives.
 */

import { DATO, ID, KRAVINNHOLD, liste, objekt, OPPLYSNINGSSLAG } from '../format/format.ts';
import { erObjekt, feilI, type Skjema } from '../format/skjema.ts';
import type { Svarvurdering } from '../frosset/standpunkt.ts';
import { KRAVSPOR, SPOR as SPORENE, type Kravspor, type Opplysning, type Spor } from '../typer.ts';

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
  | { type: 'bestridelse'; gjelder: string; hva: Opplysning['hva'] }
  /** KA-U12, KA-U15, KA-U17: TE krever ikke noe i et spor som ikke er sendt. Ingen fritekst (KA-U22). */
  | { type: 'ingen_krav'; spor: Kravspor }
  /** § 5 tredje ledd (VS-U1, VS-U9, VS-U14): mot motpartens varsel, krav eller svar. */
  | { type: 'innsigelse'; gjelder: string }
  /** VS-U1, MP-U6: mot en innsigelse, en påberopelse i et svar eller alle innsigelsene i et dokument. */
  | { type: 'protest'; gjelder: string }
  /** VS-U12: TE påberoper byggherrens passivitet etter § 32.3 annet ledd. */
  | { type: 'passivitet'; gjelder: string }
  /** KA-U20: en senere merking av et registrert brev med noe appen ikke kan uttrykke. */
  | { type: 'merking'; gjelder: string; spor: Spor[] }
  /** KA-U20: den som sendte brevet, sier at standpunktene gjelder uten forbehold. */
  | { type: 'avklaring'; gjelder: string };

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

const henvisning = (type: string) =>
  objekt({ type: { const: type }, gjelder: ID }, ['type', 'gjelder']);

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
    {
      type: { const: 'bestridelse' },
      gjelder: ID,
      hva: { enum: [...OPPLYSNINGSSLAG] },
    },
    ['type', 'gjelder', 'hva']
  ),
  ingen_krav: objekt({ type: { const: 'ingen_krav' }, spor: { enum: [...KRAVSPOR] } }, [
    'type',
    'spor',
  ]),
  innsigelse: henvisning('innsigelse'),
  protest: henvisning('protest'),
  passivitet: henvisning('passivitet'),
  merking: objekt(
    { type: { const: 'merking' }, gjelder: ID, spor: liste({ enum: [...SPORENE] }) },
    ['type', 'gjelder', 'spor']
  ),
  avklaring: henvisning('avklaring'),
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
    const { properties, required, anyOf } = KRAVINNHOLD[k.spor];
    feil.push(...feilI(k.innhold, objekt(properties, required, anyOf), '$.innhold'));
    if (k.spor !== 'frist' && 'varsel' in k)
      feil.push('$.varsel: bare et fristkrav har varsel etter § 33.4');
  }
  if (type === 'brev' && !feil.length) {
    const spor = (kommando as { svar: Svarutkast[] }).svar.map((s) => s.spor);
    if (!spor.length) feil.push('$.svar: brevet har ingen svar');
    if (new Set(spor).size !== spor.length) feil.push('$.svar: to svar i samme spor');
  }
  if (type === 'merking' && !feil.length) {
    const spor = (kommando as { spor: Spor[] }).spor;
    if (new Set(spor).size !== spor.length) feil.push('$.spor: samme spor to ganger');
  }
  return feil;
}
