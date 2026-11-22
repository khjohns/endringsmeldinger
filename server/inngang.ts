/**
 * Det ruteren i `app.ts` og inngangene deler. `app.ts` importerer inngangene og
 * leser rutene deres når modulen lastes, så det de deler, kan ikke bo der: en
 * inngang som importerte verdier fra `app.ts`, ville gitt en sirkulær import
 * (#854 punkt 2 og 3).
 */

import type { IncomingMessage, OutgoingHttpHeaders } from 'node:http';
import type { Svar } from './rutetyper.ts';
import { ukjenteFeltmelding } from '../src/lib/kontroll/kroppsfelt.ts';

/** Feilsvaret i samme form fra hver inngang, også de åpne (#942). */
export const feilsvar = (status: number, error: string, message: string): Svar => [
  status,
  { success: false, error, message },
];
export const ugyldig = (melding: string) => feilsvar(400, 'UGYLDIG_FORESPOERSEL', melding);
/** 400 når kroppen har felt utenom `tillatte`, ellers `null` (sikkerhetsinvariantene i CLAUDE.md). */
export function ukjenteFelt(
  kropp: Record<string, unknown>,
  tillatte: ReadonlySet<string>
): Svar | null {
  const melding = ukjenteFeltmelding(kropp, tillatte);
  return melding ? ugyldig(melding) : null;
}
/** Koden og meldingen for en kropp over grensen. */
export const FOR_STOR = ['PAYLOAD_TOO_LARGE', 'Forespørselen er for stor.'] as const;

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
 * Kroppen som bytes, eller `null` når den er over `grense`. Felles for JSON-kroppen og
 * filen, så grensen telles likt (#815 punkt 2); kalleren gir feilkoden.
 */
export async function lesInntil(
  foresporsel: IncomingMessage,
  grense: number
): Promise<Buffer | null> {
  const deler: Buffer[] = [];
  let stoerrelse = 0;
  for await (const del of foresporsel) {
    stoerrelse += (del as Buffer).length;
    if (stoerrelse > grense) return null;
    deler.push(del as Buffer);
  }
  return Buffer.concat(deler);
}

const RESERVER = new WeakMap<Svar, () => Svar>();

/**
 * Svaret etter en skriving som er lagret, med svaret ruteren gir i stedet når dette
 * ikke kan skrives. Signalet kommer fra behandleren, ikke fra statusen (#877, #893).
 */
export function lagret(svar: Svar, reserve: () => Svar = lagretUtenSvar): Svar {
  RESERVER.set(svar, reserve);
  return svar;
}

/** Reservesvaret for et svar fra `lagret`, ellers `undefined`. */
export const reserveFor = (svar: Svar): (() => Svar) | undefined => RESERVER.get(svar);

const lagretUtenSvar = (): Svar => [
  500,
  {
    success: false,
    error: 'INTERNAL_ERROR',
    message: 'Endringen er lagret, men svaret kunne ikke skrives. Last inn på nytt.',
  },
];
