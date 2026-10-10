/**
 * Kontrollen av en lagret rad mot format 1 (7.1.2 i designnotatet for #273),
 * brukt både i minnet og mot testbasen: `format` er satt, `referstoid` er ikke
 * brukt, og `data` har ingen `null`, ingen tom liste og ingen tom streng (4.4).
 * At leseren forstår raden, prøves for seg.
 */

import type { Journalrad } from '../typer.ts';

/** Feltene i verdien som er `null`, en tom liste eller en tom streng. */
export function tommeVerdier(v: unknown, sti = '$'): string[] {
  if (v === null || v === '' || (Array.isArray(v) && !v.length)) return [sti];
  if (Array.isArray(v)) return v.flatMap((x, i) => tommeVerdier(x, `${sti}[${i}]`));
  if (typeof v === 'object')
    return Object.entries(v as Record<string, unknown>).flatMap(([n, x]) =>
      tommeVerdier(x, `${sti}.${n}`)
    );
  return [];
}

/** Avvikene fra format 1 i raden, tomme når raden har formen. */
export function avvikFraFormatet(rad: Journalrad): string[] {
  const avvik = tommeVerdier(rad.data).map((sti) => `${rad.event_type} ${sti}: tom eller null`);
  if (rad.format !== 1) avvik.push(`${rad.event_type}: format ${String(rad.format)}`);
  if (rad.refererer_til_event_id !== null) avvik.push(`${rad.event_type}: referstoid er satt`);
  return avvik;
}
