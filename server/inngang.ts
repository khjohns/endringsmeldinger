/**
 * Det ruteren i `app.ts` og inngangene deler. `app.ts` importerer inngangene og
 * leser rutene deres når modulen lastes, så det de deler, kan ikke bo der: en
 * inngang som importerte verdier fra `app.ts`, ville gitt en sirkulær import
 * (#854 punkt 2 og 3).
 */

import type { OutgoingHttpHeaders } from 'node:http';
import type { Svar } from './app.ts';
import { feilnummer } from './datalag.ts';

/** En rute med én fast sti; tegnene i stien står for seg selv i uttrykket (#716 punkt 4). */
export const fast = (sti: string) => ({
  sti: new RegExp(`^${sti.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`),
  eksempel: () => sti,
});

/** Hodene ruteren skriver for svaret: `Content-Type` for en JSON-kropp, rutens hoder og svarets. */
export function svarhoder(
  [, kropp, hoder]: Svar,
  rute: Record<string, string> | undefined
): OutgoingHttpHeaders {
  const json = kropp !== null && !Buffer.isBuffer(kropp);
  return {
    ...(json ? { 'content-type': 'application/json; charset=utf-8' } : {}),
    ...rute,
    ...hoder,
  };
}

/**
 * Logger en feil serveren ikke kan svare på annet enn generelt: stedet,
 * feilklassen, feilnummeret fra basen og kallstakken, uten meldingen. Meldingen
 * kan bære et token, et navn eller et svar fra Catenda (AGENTS.md, #867 punkt 5).
 */
export function loggFeil(hvor: string, feil: unknown): void {
  const klasse = (feil as Error)?.constructor?.name ?? typeof feil;
  const nummer = feilnummer(feil);
  const stakk = typeof (feil as Error)?.stack === 'string' ? (feil as Error).stack! : '';
  // Stakken begynner med navnet og meldingen, og en linje i dem kan også begynne med
  // «at». Begynner den ikke med dem slik de er nå, logges ingen rammer.
  const hode = stakk ? Error.prototype.toString.call(feil) : '';
  const rammer = stakk.startsWith(hode)
    ? stakk
        .slice(hode.length)
        .split('\n')
        .filter((l) => /^\s+at /.test(l))
        .join('\n')
    : '';
  console.error(
    `${hvor} (${klasse}${nummer === undefined ? '' : `, feilnummer ${nummer}`})${rammer ? `\n${rammer}` : ''}`
  );
}
