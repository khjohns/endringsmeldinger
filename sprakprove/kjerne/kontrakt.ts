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

import { feilI as feilISkjema, NOKKELORD, oppslag, type Skjema } from '../../kjerne/skjema.ts';

export { NOKKELORD };
const DEFS = (skjema as Skjema)['$defs'] as Record<string, Skjema>;
const ANNOTASJONER = new Set(['$schema', '$id', '$defs', 'title', 'description']);

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

export function feilI(verdi: unknown, s: Skjema, sti = '$'): string[] {
  return feilISkjema(verdi, s, sti, skjema as Skjema);
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
  const losst = typeof data.$ref === 'string' ? oppslag(data.$ref, skjema as Skjema) : data;
  return new Set(Object.keys((losst.properties ?? data.properties ?? {}) as Skjema));
}

export const KOMMANDOER = Object.keys(DEFS)
  .filter((n) => n.startsWith('kommando.'))
  .map((n) => n.slice('kommando.'.length));

export const RADER = (skjema as Skjema)['x-rader'] as string[];
