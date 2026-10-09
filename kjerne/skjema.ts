/**
 * Kontrollen av formen på en kommando mot et JSON-skjema. Validatoren kan bare
 * nøkkelordene i `NOKKELORD`. `$ref` løses mot `rot`.
 *
 * JSON skiller ikke 5 fra 5.0 i JavaScript, så `integer` godtar 5.0.
 */

export type Skjema = Record<string, unknown>;

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

const TYPER: Record<string, (v: unknown) => boolean> = {
  string: (v) => typeof v === 'string',
  integer: (v) => typeof v === 'number' && Number.isInteger(v),
  number: (v) => typeof v === 'number' && Number.isFinite(v),
  boolean: (v) => typeof v === 'boolean',
  object: (v) => typeof v === 'object' && v !== null && !Array.isArray(v),
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
      if (navn in egenskaper) feil.push(...feilI(del, egenskaper[navn], `${sti}.${navn}`, rot));
      else if (s.additionalProperties === false) feil.push(`${sti}.${navn}: ukjent felt`);
    }
  }
  if (Array.isArray(verdi) && s.items)
    verdi.forEach((d, i) => feil.push(...feilI(d, s.items as Skjema, `${sti}[${i}]`, rot)));
  return feil;
}
