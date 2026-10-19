/**
 * Det ruteren i `app.ts` og inngangene deler. `app.ts` importerer inngangene og
 * leser rutene deres når modulen lastes, så det de deler, kan ikke bo der: en
 * inngang som importerte verdier fra `app.ts`, ville gitt en sirkulær import
 * (#854 punkt 2 og 3).
 */

import type { IncomingMessage, OutgoingHttpHeaders } from 'node:http';
import type { Svar } from './app.ts';
import { feilnummer } from './datalag.ts';

/** Feilsvaret i samme form fra hver inngang, også de åpne (#942). */
export const feilsvar = (status: number, error: string, message: string): Svar => [
  status,
  { success: false, error, message },
];
export const ugyldig = (melding: string) => feilsvar(400, 'UGYLDIG_FORESPOERSEL', melding);
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

/**
 * Logger en feil serveren ikke kan svare på annet enn generelt: stedet,
 * feilklassen, feilnummeret fra basen og kallstakken, uten meldingen. Meldingen
 * kan bære et token, et navn eller et svar fra Catenda (AGENTS.md, #867 punkt 5).
 */
export function loggFeil(hvor: string, feil: unknown, nivaa: 'error' | 'warn' = 'error'): void {
  const klasse = (feil as Error)?.constructor?.name ?? typeof feil;
  const nummer = feilnummer(feil);
  const rammer = rammene(feil);
  console[nivaa](
    `${hvor} (${klasse}${nummer === undefined ? '' : `, feilnummer ${nummer}`})${rammer ? `\n${rammer}` : ''}`
  );
}

/**
 * En ramme fra V8: `at sted (fil:linje:kolonne)` eller `at fil:linje:kolonne`, også
 * med mellomrom i stien og som eval-ramme, `at eval (eval at f (fil:1:1), <anonymous>:1:1)`.
 */
const RAMME = /^\s+at (?:.* \((?:.+:\d+:\d+|<anonymous>|native|index \d+)\)|.+:\d+:\d+)$/;

/**
 * Rammene i kallstakken, uten hodet med navnet og meldingen, der en linje også kan
 * begynne med «at». Hodet lages som `Error.prototype.toString`, også i formen
 * `navn [kode]: melding` for Nodes egne feil. Står ikke et av dem alene på
 * første linje eller linjene, gis ingen rammer, og bare linjer med en plassering
 * regnes som rammer.
 */
function rammene(feil: unknown): string {
  try {
    const { stack, name, message, code } = feil as Error & { code?: unknown };
    if (typeof stack !== 'string') return '';
    const melding = message === undefined ? '' : String(message);
    const hode = (navn: string) => (!navn ? melding : !melding ? navn : `${navn}: ${melding}`);
    const navn = name === undefined ? 'Error' : String(name);
    const hoder = [hode(navn)];
    if (typeof code === 'string') hoder.push(hode(`${navn} [${code}]`));
    const funnet = hoder.find(
      (h) => stack.startsWith(h) && (stack.length === h.length || stack[h.length] === '\n')
    );
    if (funnet === undefined) return '';
    return stack
      .slice(funnet.length)
      .split('\n')
      .filter((l) => RAMME.test(l))
      .join('\n');
  } catch {
    return '';
  }
}
