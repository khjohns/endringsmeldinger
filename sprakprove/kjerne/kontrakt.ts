/**
 * Kontrakten i `docs/domenetabell/kontrakt.json`, validert ved kjøretid.
 * Validatoren kan bare nøkkelordene skjemaet bruker, som validatoren i
 * `backend/tests/test_domenetabell/kontrakt.py`. Skjemaet er den eneste kilden;
 * typene i kjernen holdes mot det av kontrakttesten.
 *
 * Forskjell fra Python: JSON skiller ikke 5 fra 5.0 i JavaScript, så `integer`
 * godtar 5.0. Python avviser 5.0 som heltall.
 */

import skjema from '../../docs/domenetabell/kontrakt.json' with { type: 'json' };

type Skjema = Record<string, unknown>;
const DEFS = (skjema as Skjema)['$defs'] as Record<string, Skjema>;

export const NOKKELORD = new Set([
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
  'minLength',
]);
const ANNOTASJONER = new Set(['$schema', '$id', '$defs', 'title', 'description']);

const TYPER: Record<string, (v: unknown) => boolean> = {
  string: (v) => typeof v === 'string',
  integer: (v) => typeof v === 'number' && Number.isInteger(v),
  number: (v) => typeof v === 'number' && Number.isFinite(v),
  boolean: (v) => typeof v === 'boolean',
  object: (v) => typeof v === 'object' && v !== null && !Array.isArray(v),
  array: (v) => Array.isArray(v),
  null: (v) => v === null,
};

export function ukjenteNokkelord(del: unknown = skjema, sti = '#'): string[] {
  if (typeof del !== 'object' || del === null || Array.isArray(del)) return [];
  const feil: string[] = [];
  for (const [nokkel, verdi] of Object.entries(del)) {
    if (nokkel.startsWith('x-')) continue;
    if (!NOKKELORD.has(nokkel) && !ANNOTASJONER.has(nokkel)) feil.push(`${sti}: ${nokkel}`);
    if (nokkel === 'properties' || nokkel === '$defs') {
      for (const [navn, d] of Object.entries(verdi as Skjema))
        feil.push(...ukjenteNokkelord(d, `${sti}/${nokkel}/${navn}`));
    } else if (
      (nokkel === 'items' || nokkel === 'additionalProperties') &&
      typeof verdi === 'object'
    ) {
      feil.push(...ukjenteNokkelord(verdi, `${sti}/${nokkel}`));
    } else if (nokkel === 'anyOf') {
      (verdi as unknown[]).forEach((d, i) =>
        feil.push(...ukjenteNokkelord(d, `${sti}/anyOf/${i}`))
      );
    }
  }
  return feil;
}

function oppslag(ref: string): Skjema {
  if (!ref.startsWith('#/')) throw new Error(`Bare lokale referanser: ${ref}`);
  return ref
    .slice(2)
    .split('/')
    .reduce<unknown>((d, ledd) => (d as Skjema)[ledd], skjema) as Skjema;
}

const vis = (v: unknown) => JSON.stringify(v);

export function feilI(verdi: unknown, s: Skjema, sti = '$'): string[] {
  const feil = typeof s.$ref === 'string' ? feilI(verdi, oppslag(s.$ref), sti) : [];
  if (Array.isArray(s.anyOf) && s.anyOf.every((a) => feilI(verdi, a as Skjema, sti).length)) {
    feil.push(`${sti}: ${vis(verdi)} passer ingen av alternativene`);
  }
  if (s.type !== undefined) {
    const typer = Array.isArray(s.type) ? (s.type as string[]) : [s.type as string];
    if (!typer.some((t) => TYPER[t](verdi)))
      return [`${sti}: ${vis(verdi)} er ikke ${typer.join('/')}`];
  }
  if ('const' in s && verdi !== s.const) feil.push(`${sti}: ${vis(verdi)} er ikke ${vis(s.const)}`);
  if (Array.isArray(s.enum) && !s.enum.includes(verdi))
    feil.push(`${sti}: ${vis(verdi)} er ikke en av ${vis(s.enum)}`);
  if (typeof s.minimum === 'number' && typeof verdi === 'number' && verdi < s.minimum) {
    feil.push(`${sti}: ${verdi} er under ${s.minimum}`);
  }
  if (typeof s.minLength === 'number' && typeof verdi === 'string' && verdi.length < s.minLength) {
    feil.push(`${sti}: er kortere enn ${s.minLength}`);
  }
  if (TYPER.object(verdi)) {
    const objekt = verdi as Record<string, unknown>;
    const egenskaper = (s.properties ?? {}) as Record<string, Skjema>;
    for (const navn of (s.required ?? []) as string[])
      if (!(navn in objekt)) feil.push(`${sti}.${navn}: mangler`);
    for (const [navn, del] of Object.entries(objekt)) {
      if (navn in egenskaper) feil.push(...feilI(del, egenskaper[navn], `${sti}.${navn}`));
      else if (s.additionalProperties === false) feil.push(`${sti}.${navn}: ukjent felt`);
    }
  }
  if (Array.isArray(verdi) && s.items)
    verdi.forEach((d, i) => feil.push(...feilI(d, s.items as Skjema, `${sti}[${i}]`)));
  return feil;
}

export function valider(verdi: unknown, definisjon: string): string[] {
  const s = DEFS[definisjon];
  if (!s) throw new Error(`Ukjent definisjon i kontrakten: ${definisjon}`);
  return feilI(verdi, s);
}

export function definisjon(navn: string): Skjema | undefined {
  return DEFS[navn];
}

/** Feltene skjemaet kjenner i `data` for en kommando, med `$ref` løst. */
export function datafelt(kommando: string): Set<string> {
  const s = DEFS[`kommando.${kommando}`];
  const data = ((s?.properties as Record<string, Skjema>)?.data ?? {}) as Skjema;
  const losst = typeof data.$ref === 'string' ? oppslag(data.$ref) : data;
  return new Set(Object.keys((losst.properties ?? data.properties ?? {}) as Skjema));
}

export const KOMMANDOER = Object.keys(DEFS)
  .filter((n) => n.startsWith('kommando.'))
  .map((n) => n.slice('kommando.'.length));

export const RADER = (skjema as Skjema)['x-rader'] as string[];
