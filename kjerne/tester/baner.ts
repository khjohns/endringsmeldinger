/**
 * Banene en test kjører i. Kjernen har banen i minnet; banen mot testbasen
 * står i `sprakprove/kjernelagring/bane.ts`, og samme suiter kjøres der.
 */

import { minnebuffer, type Bufferlager } from '../utledning/buffer.ts';
import type { Kjerne } from '../versjon.ts';
import { minnebane, type Bane } from './bane.ts';
import type { Handling } from './klient.ts';
import { Forutsetning, Kjoering, MAALMODELL } from './kjoerer.ts';

export interface Baner {
  navn: string;
  start(): Promise<void>;
  stopp(): Promise<void>;
  bane(): Promise<Bane>;
  buffer(): Bufferlager;
}

export function minnet(): Baner {
  let lager = minnebuffer();
  return {
    navn: 'i minnet',
    start: async () => void (lager = minnebuffer()),
    stopp: async () => {},
    bane: async () => minnebane(),
    buffer: () => lager,
  };
}

/** Kjør stegene og krev at hvert godtas. Et prefiks-navn kjøres først. */
export async function bygg(
  bane: Bane,
  steg: (Handling | string)[],
  kjerne?: Kjerne
): Promise<Kjoering> {
  const k = new Kjoering(bane, kjerne);
  for (const h of steg.flatMap((s) => (typeof s === 'string' ? MAALMODELL.prefikser[s] : [s]))) {
    const u = await k.send(h);
    if (u && !u.godtatt)
      throw new Forutsetning(
        `${h.handling} ble avvist: ${u.avvisning.regel}: ${u.avvisning.melding}`
      );
  }
  return k;
}
