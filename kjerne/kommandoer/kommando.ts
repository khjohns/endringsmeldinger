/**
 * Kommandoene i kjernen, slik klienten sender dem, og kontrollen av formen mot
 * skjemaene her (`feilI`). Aksepten bærer svaret og regelversjonen TE fikk se
 * (KA-U10); det har ikke `kontrakt.json` (#304). Innholdet i et krav har
 * feltene i formatet (`KRAVINNHOLD` i `format.ts`). Vurderingene i et svar har
 * navnene reglene regner med, og blir standpunkter og utregning når brevet
 * skrives.
 */

import {
  DATO,
  DATOEN_GJELDER,
  ID,
  KRAVINNHOLD,
  liste,
  objekt,
  oppgittDato,
  OPPLYSNINGSSLAG,
  TEKST,
} from '../format/format.ts';
import { erKalenderdato, erObjekt, feilI, type Skjema } from '../format/skjema.ts';
import type { Svarvurdering } from '../frosset/standpunkt.ts';
import {
  KRAVSPOR,
  SPOR as SPORENE,
  VARSELSPOR,
  type Kravspor,
  type Opplysningsslag,
  type Spor,
  type Varselhjemmel,
} from '../typer.ts';

export interface Svarutkast {
  spor: Spor;
  /** Kravversjonen svaret gjelder. */
  gjelder: string;
  regelversjon: number;
  vurderinger: Svarvurdering;
  /** Klientens utregning, som serveren regner på nytt (B-13). */
  resultat: Record<string, unknown>;
  /** Byggherrens utdypning under den låste teksten, også begrunnelsen (KA-U18, KA-U24). Appen tolker den ikke (KA-U19). */
  utdypning?: string;
}

/**
 * Den låste teksten klienten viste avsenderen, ett avsnitt per element i
 * rekkefølgen i brevet (LV-U2, A1 i paragrafmatrisen). Serveren lager teksten
 * selv og avviser en annen. Påkrevd i hver kommando som gir et brev fra appen;
 * et registrert brev har ingen tekst fra appen (MM-U17).
 */
interface Brevtekst {
  brevtekst?: string[];
}

type Varselet = { spor: 'frist'; hjemmel: '33.4' } | { spor: 'vederlag'; hjemmel: '34.1.2' };

export type Kommando = (
  | {
      type: 'krav';
      spor: Spor;
      innhold: Record<string, unknown>;
      /**
       * Varselet etter § 33.4 TE sendte utenfor appen, med datoen og brevet som vedlegg
       * (OV-U5). Vedlegget kreves når kravet registrerer varselet (`nyttelast.ts`).
       */
      varsel?: { sendt: string; dokumentasjon?: string[] };
      /**
       * TEs utdypning under den låste teksten: beskrivelsen av forholdet i
       * grunnlaget (GR-U15), begrunnelsen i fristkravet (KA-U33). Appen tolker den
       * ikke (KA-U19).
       */
      utdypning?: string;
    }
  | { type: 'brev'; svar: Svarutkast[] }
  | { type: 'revisjon'; erstatter: string; svar: Svarutkast }
  | {
      type: 'aksept';
      spor: Spor;
      svar: string;
      regelversjon: number;
    }
  | { type: 'trekk'; spor: Spor }
  /**
   * Registrerer et varsel etter § 33.4 eller § 34.1.2 sendt utenfor appen (MM-U1, SK-12,
   * OV-U5), med brevet som vedlegg (OV-U4). `dokumentasjon` er ID-ene i mellomlageret
   * (LV-U14). Hjemmelen følger sporet.
   */
  | ({ type: 'varsel'; sendt: string; dokumentasjon: string[] } & Varselet)
  /**
   * OV-U4, OV-U16: et eget brev sendt utenfor appen, registrert som dokumentasjon, med
   * beskrivelsen med egne ord, datoen det ble sendt og brevet som vedlegg. Uten `spor`
   * hører det til saken. Med `retter` er det en retting av den registreringen (OV-U17).
   */
  | {
      type: 'registrert_brev';
      spor?: Spor[];
      sendt: string;
      beskrivelse: string;
      dokumentasjon: string[];
      retter?: string;
    }
  /** OV-U18: registreringen `retter` står i feil sak; brevet hører ikke til saken. */
  | { type: 'ikke_i_saken'; retter: string }
  /** VS-U15, OV-U5: TE sender et eget varsel fra appen, uten dager eller beløp. */
  | ({ type: 'send_varsel' } & Varselet)
  | { type: 'bestridelse'; gjelder: string; hva: Opplysningsslag }
  /** KA-U12, KA-U15, KA-U17: TE krever ikke noe i et spor som ikke er sendt. Ingen fritekst (KA-U22). */
  | { type: 'ingen_krav'; spor: Kravspor }
  /**
   * § 5 tredje ledd (VS-U1, VS-U9, VS-U14): mot motpartens varsel, krav eller svar. Mot TEs
   * begrunnelse etter § 33.6.2 annet ledd b kan byggherren i stedet gjøre gjeldende at den
   * ikke er et svar etter annet ledd (`grunn`, VS-U29).
   */
  | { type: 'innsigelse'; gjelder: string; grunn?: 'ikke_svar' }
  /** § 33.6.2 første ledd (VS-U19): byggherren ber TE angi og begrunne antall dager. */
  | { type: 'foresporsel'; spor: 'frist'; hjemmel: '33.6.2' }
  /**
   * § 33.6.2 annet ledd b (VS-U17, VS-U27): TE begrunner hvorfor grunnlaget for å beregne
   * kravet ikke foreligger. `gjelder` er forespørselen, og begrunnelsen er utdypningen.
   */
  | { type: 'foresporselssvar'; gjelder: string; utdypning: string }
  /** VS-U1, MP-U6: mot en innsigelse, en påberopelse i et svar eller alle innsigelsene i et dokument. */
  | { type: 'protest'; gjelder: string }
  /** VS-U12: TE påberoper byggherrens passivitet etter § 32.3 annet ledd. */
  | { type: 'passivitet'; gjelder: string }
  /** KA-U20: merkingen av et registrert brev og avklaringen av den. Avvises etter OV-U7. */
  | { type: 'merking'; gjelder: string; spor: Spor[] }
  | { type: 'avklaring'; gjelder: string }
  /**
   * Byggherrens senere begrunnelse av et svar. Fra appen er teksten utdypningen
   * (KA-U34). Registrert har den datoen brevet ble sendt og brevet som vedlegg, uten
   * tekst (KA-U35).
   */
  | {
      type: 'begrunnelse';
      gjelder: string;
      utdypning?: string;
      sendt?: string;
      dokumentasjon?: string[];
    }
) &
  Brevtekst;

const SPOR = { enum: [...SPORENE] };
const SVARUTKAST = objekt(
  {
    spor: SPOR,
    gjelder: ID,
    regelversjon: { type: 'integer' },
    vurderinger: { type: 'object' },
    resultat: { type: 'object' },
    utdypning: TEKST,
  },
  ['spor', 'gjelder', 'regelversjon', 'vurderinger', 'resultat']
);

const BREVTEKST = { brevtekst: liste(TEKST) };
const VARSELET = {
  spor: { enum: Object.values(VARSELSPOR) },
  hjemmel: { enum: Object.keys(VARSELSPOR) },
};

const henvisning = (type: string) =>
  objekt({ type: { const: type }, gjelder: ID, ...BREVTEKST }, ['type', 'gjelder']);

const SKJEMA: Record<Kommando['type'], Skjema> = {
  krav: objekt(
    {
      type: { const: 'krav' },
      spor: SPOR,
      innhold: { type: 'object' },
      varsel: objekt({ sendt: DATO, dokumentasjon: liste(ID) }, ['sendt']),
      utdypning: TEKST,
      ...BREVTEKST,
    },
    ['type', 'spor', 'innhold']
  ),
  brev: objekt(
    { type: { const: 'brev' }, svar: { type: 'array', items: SVARUTKAST }, ...BREVTEKST },
    ['type', 'svar']
  ),
  revisjon: objekt({ type: { const: 'revisjon' }, erstatter: ID, svar: SVARUTKAST, ...BREVTEKST }, [
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
      ...BREVTEKST,
    },
    ['type', 'spor', 'svar', 'regelversjon']
  ),
  trekk: objekt({ type: { const: 'trekk' }, spor: SPOR, ...BREVTEKST }, ['type', 'spor']),
  varsel: objekt(
    {
      type: { const: 'varsel' },
      ...VARSELET,
      sendt: DATO,
      dokumentasjon: liste(ID),
    },
    ['type', 'spor', 'hjemmel', 'sendt', 'dokumentasjon']
  ),
  registrert_brev: objekt(
    {
      type: { const: 'registrert_brev' },
      spor: liste(SPOR),
      sendt: DATO,
      beskrivelse: TEKST,
      dokumentasjon: liste(ID),
      retter: ID,
    },
    ['type', 'sendt', 'beskrivelse', 'dokumentasjon']
  ),
  ikke_i_saken: objekt({ type: { const: 'ikke_i_saken' }, retter: ID }, ['type', 'retter']),
  send_varsel: objekt(
    {
      type: { const: 'send_varsel' },
      ...VARSELET,
      ...BREVTEKST,
    },
    ['type', 'spor', 'hjemmel']
  ),
  bestridelse: objekt(
    {
      type: { const: 'bestridelse' },
      gjelder: ID,
      hva: { enum: [...OPPLYSNINGSSLAG] },
      ...BREVTEKST,
    },
    ['type', 'gjelder', 'hva']
  ),
  ingen_krav: objekt(
    { type: { const: 'ingen_krav' }, spor: { enum: [...KRAVSPOR] }, ...BREVTEKST },
    ['type', 'spor']
  ),
  innsigelse: objekt(
    { type: { const: 'innsigelse' }, gjelder: ID, grunn: { const: 'ikke_svar' }, ...BREVTEKST },
    ['type', 'gjelder']
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
  protest: henvisning('protest'),
  passivitet: henvisning('passivitet'),
  merking: objekt(
    { type: { const: 'merking' }, gjelder: ID, spor: liste({ enum: [...SPORENE] }), ...BREVTEKST },
    ['type', 'gjelder', 'spor']
  ),
  avklaring: henvisning('avklaring'),
  begrunnelse: objekt(
    {
      type: { const: 'begrunnelse' },
      gjelder: ID,
      utdypning: TEKST,
      sendt: DATO,
      dokumentasjon: liste(ID),
      ...BREVTEKST,
    },
    ['type', 'gjelder']
  ),
};

type Innhold = Record<string, unknown>;

/**
 * Feltet med datoen og vedleggene kommandoen viser til: brevets, eller varselets i et
 * fristkrav (OV-U5). Feilmeldingene har stien herfra (#984).
 */
const brevfelt = (k: Kommando): { sti: string; sendt?: unknown; dokumentasjon?: string[] } =>
  k.type === 'krav'
    ? { sti: '$.varsel.', ...k.varsel }
    : {
        sti: '$.',
        ...('sendt' in k ? { sendt: k.sendt } : {}),
        ...('dokumentasjon' in k ? { dokumentasjon: k.dokumentasjon } : {}),
      };

/** Vedleggene kommandoen viser til: brevets, eller varselets i et fristkrav (OV-U5). */
export const vedleggI = (k: Kommando): string[] => brevfelt(k).dokumentasjon ?? [];

/**
 * VS-U26: et grunnlagskrav fra appen har datoen kategorien har, som en dato.
 * Formatet binder feltet til kategorien; her kreves det.
 */
function datofeil(innhold: Innhold): string[] {
  const felt = oppgittDato(innhold.hovedkategori, innhold.underkategori);
  if (felt === null) return [];
  const dato = innhold[felt];
  if (dato === undefined)
    return [`$.innhold.${felt}: TE må oppgi datoen ${DATOEN_GJELDER[felt]} (VS-U26)`];
  return erKalenderdato(dato)
    ? []
    : [`$.innhold.${felt}: ${JSON.stringify(dato)} er ikke en dato på formen ÅÅÅÅ-MM-DD`];
}

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
    if (k.spor === 'grunnlag' && !feil.length) feil.push(...datofeil(k.innhold as Innhold));
    if (k.spor !== 'frist' && 'varsel' in k)
      feil.push('$.varsel: bare et fristkrav har varsel etter § 33.4');
  }
  // OV-U5: varselet etter § 33.4 står i fristen, varselet etter § 34.1.2 i vederlaget.
  if ((type === 'varsel' || type === 'send_varsel') && !feil.length) {
    const k = kommando as { spor: Kravspor; hjemmel: Varselhjemmel };
    if (VARSELSPOR[k.hjemmel] !== k.spor)
      feil.push(`$.hjemmel: et varsel etter § ${k.hjemmel} står ikke i sporet ${k.spor}`);
  }
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
  // En UUID er den samme med store og små bokstaver.
  if (new Set(vedlegg.map((v) => v.toLowerCase())).size !== vedlegg.length)
    feil.push(`${sti}dokumentasjon: samme vedlegg står to ganger`);
  if (type === 'registrert_brev' && !feil.length) {
    const k = kommando as { spor?: Spor[]; beskrivelse: string };
    if (!k.beskrivelse.trim()) feil.push('$.beskrivelse: brevet har ingen beskrivelse');
    if (k.spor && new Set(k.spor).size !== k.spor.length)
      feil.push('$.spor: samme spor står to ganger');
  }
  if (type === 'begrunnelse' && !feil.length) {
    const k = kommando as { utdypning?: unknown; dokumentasjon?: unknown[] };
    if ('sendt' in kommando) {
      // KA-U35: den registrerte begrunnelsen har ingen tekst i appen, og brevet ligger ved.
      if ('utdypning' in k) feil.push('$.utdypning: en registrert begrunnelse har ingen tekst');
      if (!k.dokumentasjon?.length)
        feil.push('$.dokumentasjon: brevet med begrunnelsen må ligge ved');
    } else if ('dokumentasjon' in k)
      // KA-U34: brevet fra appen har bare setningen og teksten.
      feil.push('$.dokumentasjon: bare en registrert begrunnelse har vedlegg');
  }
  return feil;
}
