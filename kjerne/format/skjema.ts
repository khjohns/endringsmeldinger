/**
 * Kontrollen av formen på en kommando mot et JSON-skjema. Validatoren kan bare
 * nøkkelordene i `NOEKKELORD`. `$ref` løses mot `rot`.
 *
 * JSON skiller ikke 5 fra 5.0 i JavaScript, så `integer` godtar 5.0.
 */

import type { Avvisning } from '../typer.ts';
import { SETTBARE_TEGN } from './tegnsett.ts';

export type Skjema = Record<string, unknown>;

export const NOEKKELORD = new Set([
  'type',
  'enum',
  'const',
  'properties',
  'required',
  'additionalProperties',
  'items',
  'anyOf',
  '$ref',
  'minimum',
  'exclusiveMinimum',
  'minLength',
  'pattern',
  'minItems',
]);

/** NUL og en enslig surrogat er gyldig JSON, men JSONB i PostgreSQL avviser dem (#373). */
const ENSLIG_SURROGAT = /[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/;
export const ulagringsbarTekst = (t: string): boolean =>
  t.includes('\u0000') || ENSLIG_SURROGAT.test(t);

/** Verdien har en tekst, også et feltnavn, som basen ikke kan lagre (#373). Uten rekursjon. */
function harUlagringsbarTekst(verdi: unknown): boolean {
  const igjen: unknown[] = [verdi];
  while (igjen.length) {
    const v = igjen.pop();
    if (typeof v === 'string' && ulagringsbarTekst(v)) return true;
    if (v !== null && typeof v === 'object')
      for (const [k, del] of Object.entries(v)) igjen.push(k, del);
  }
  return false;
}

/** Avvisningen av en kommando med tekst basen ikke kan lagre (#373), eller `null`. */
export function tekstSomIkkeKanLagres(kommando: unknown): Avvisning | null {
  return harUlagringsbarTekst(kommando)
    ? {
        regel: 'TEKST_KAN_IKKE_LAGRES',
        melding: 'Kommandoen har tegn som ikke kan lagres (NUL eller en enslig surrogat).',
      }
    : null;
}

/** Tab, LF, VT, FF og CR, som brev-PDF-en setter som mellomrom og linjeskift. */
const SOM_MELLOMROM = /[\t\n\v\f\r]/;

/** Brev-PDF-en kan sette tegnet med skriftene i `server/brevpdf.ts` (#801). */
function kanSettes(tegn: string): boolean {
  if (SOM_MELLOMROM.test(tegn)) return true;
  const kode = tegn.codePointAt(0)!;
  let fra = 0;
  let til = SETTBARE_TEGN.length / 2 - 1;
  while (fra <= til) {
    const midt = (fra + til) >> 1;
    if (kode < SETTBARE_TEGN[2 * midt]) til = midt - 1;
    else if (kode > SETTBARE_TEGN[2 * midt + 1]) fra = midt + 1;
    else return true;
  }
  return false;
}

/**
 * Avvisningen av en tekst med et tegn brev-PDF-en ikke kan vise (#801, oppdragsgiver
 * 20.10 og 22.10): et tegn skriftene mangler, som emoji, eller et usynlig tegn. `felt`
 * er der teksten står, og meldingen nevner tegnet, kodepunktet og feltet.
 */
export function tegnSomIkkeKanVises(t: string, felt: string): Avvisning | null {
  for (const tegn of t) {
    if (kanSettes(tegn)) continue;
    const kode = `U+${tegn.codePointAt(0)!.toString(16).toUpperCase().padStart(4, '0')}`;
    const hva = /\p{Default_Ignorable_Code_Point}/u.test(tegn)
      ? `det usynlige tegnet ${kode}`
      : `tegnet «${tegn}» (${kode})`;
    return {
      regel: 'UGYLDIG_FORM',
      melding: `${felt} har ${hva}, som PDF-en av brevet ikke kan vise.`,
    };
  }
  return null;
}

/** `tegnSomIkkeKanVises` for hver tekst i kommandoen, med stien til feltet. */
export function kommandoenHarTegnSomIkkeKanVises(kommando: unknown): Avvisning | null {
  const igjen: [unknown, string][] = [[kommando, '$']];
  while (igjen.length) {
    const [v, sti] = igjen.shift()!;
    if (typeof v === 'string') {
      const avvist = tegnSomIkkeKanVises(v, sti);
      if (avvist) return avvist;
    } else if (Array.isArray(v)) v.forEach((del, i) => igjen.push([del, `${sti}[${i}]`]));
    else if (v !== null && typeof v === 'object')
      for (const [k, del] of Object.entries(v)) igjen.push([del, `${sti}.${k}`]);
  }
  return null;
}

/** En dato på formen ÅÅÅÅ-MM-DD som finnes i kalenderen. */
export function erKalenderdato(v: unknown): boolean {
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const d = new Date(`${v}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().startsWith(v);
}

/** Teksten, eller `null` når verdien ikke er en tekst. */
export const tekst = (v: unknown): string | null => (typeof v === 'string' ? v : null);

/** Et JSON-objekt: ikke `null` og ikke en liste. */
export const erObjekt = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const TYPER: Record<string, (v: unknown) => boolean> = {
  string: (v) => typeof v === 'string',
  integer: (v) => typeof v === 'number' && Number.isInteger(v),
  number: (v) => typeof v === 'number' && Number.isFinite(v),
  boolean: (v) => typeof v === 'boolean',
  object: erObjekt,
  array: (v) => Array.isArray(v),
  null: (v) => v === null,
};

export function oppslag(ref: string, rot: Skjema): Skjema {
  if (!ref.startsWith('#/')) throw new Error(`Bare lokale referanser: ${ref}`);
  return ref
    .slice(2)
    .split('/')
    .reduce<unknown>((d, ledd) => (d as Skjema)[ledd], rot) as Skjema;
}

const vis = (v: unknown) => JSON.stringify(v);

/** Feilene i `verdi` etter skjemaet `s`, tomme når verdien passer. */
export function feilI(verdi: unknown, s: Skjema, sti = '$', rot: Skjema = s): string[] {
  const feil = typeof s.$ref === 'string' ? feilI(verdi, oppslag(s.$ref, rot), sti, rot) : [];
  if (Array.isArray(s.anyOf) && s.anyOf.every((a) => feilI(verdi, a as Skjema, sti, rot).length)) {
    feil.push(`${sti}: ${vis(verdi)} passer ingen av alternativene`);
  }
  if (s.type !== undefined) {
    const typer = Array.isArray(s.type) ? (s.type as string[]) : [s.type as string];
    if (!typer.some((t) => TYPER[t](verdi)))
      return [`${sti}: ${vis(verdi)} er ikke ${typer.join('/')}`];
  }
  if (typeof verdi === 'string' && ulagringsbarTekst(verdi))
    feil.push(`${sti}: har tegn som ikke kan lagres`);
  if ('const' in s && verdi !== s.const) feil.push(`${sti}: ${vis(verdi)} er ikke ${vis(s.const)}`);
  if (Array.isArray(s.enum) && !s.enum.includes(verdi))
    feil.push(`${sti}: ${vis(verdi)} er ikke en av ${vis(s.enum)}`);
  if (
    typeof s.exclusiveMinimum === 'number' &&
    typeof verdi === 'number' &&
    verdi <= s.exclusiveMinimum
  )
    feil.push(`${sti}: ${verdi} er ikke over ${s.exclusiveMinimum}`);
  if (typeof s.minimum === 'number' && typeof verdi === 'number' && verdi < s.minimum) {
    feil.push(`${sti}: ${verdi} er under ${s.minimum}`);
  }
  if (typeof s.minLength === 'number' && typeof verdi === 'string' && verdi.length < s.minLength) {
    feil.push(`${sti}: er kortere enn ${s.minLength}`);
  }
  if (
    typeof s.pattern === 'string' &&
    typeof verdi === 'string' &&
    !new RegExp(s.pattern, 'u').test(verdi)
  )
    feil.push(`${sti}: ${vis(verdi)} har ikke formen ${s.pattern}`);
  if (erObjekt(verdi)) {
    const objekt = verdi;
    const egenskaper = (s.properties ?? {}) as Record<string, Skjema>;
    for (const navn of (s.required ?? []) as string[])
      if (!Object.hasOwn(objekt, navn)) feil.push(`${sti}.${navn}: mangler`);
    for (const [navn, del] of Object.entries(objekt)) {
      if (Object.hasOwn(egenskaper, navn))
        feil.push(...feilI(del, egenskaper[navn], `${sti}.${navn}`, rot));
      else if (s.additionalProperties === false) feil.push(`${sti}.${navn}: ukjent felt`);
    }
  }
  if (typeof s.minItems === 'number' && Array.isArray(verdi) && verdi.length < s.minItems)
    feil.push(`${sti}: har færre enn ${s.minItems} elementer`);
  if (Array.isArray(verdi) && s.items)
    verdi.forEach((d, i) => feil.push(...feilI(d, s.items as Skjema, `${sti}[${i}]`, rot)));
  return feil;
}
