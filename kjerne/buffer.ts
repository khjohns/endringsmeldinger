/**
 * Et bufret resultat bærer versjonene det er regnet med (2.7 i
 * modellforslaget). Kjernen bruker det bare når alle samsvarer med dens egne
 * og sakens, i begge retninger: etter en tilbakerulling kan resultatet være
 * nyere enn kjernen som leser det (#304).
 */

import { utledJournal } from './skriving.ts';
import type { Journalrad } from './typer.ts';
import type { Kjerne } from './versjon.ts';
import { visning, type Visning } from './visning.ts';

export interface Bufferversjon {
  projeksjonsversjon: number;
  regelversjon: number;
  /** Høyeste hendelsesformat kjernen som skrev bufferen, leser. */
  leserformat: number;
  /** Saksversjonen resultatet er regnet fra. */
  saksversjon: number;
}

export interface Buffer {
  versjon: Bufferversjon;
  visning: Visning;
}

export function bufferversjon(kjerne: Kjerne, saksversjon: number): Bufferversjon {
  return {
    projeksjonsversjon: kjerne.projeksjonsversjon,
    regelversjon: kjerne.regler.versjon,
    leserformat: kjerne.leserformat,
    saksversjon,
  };
}

export function bufferGjelder(b: Buffer, kjerne: Kjerne, saksversjon: number): boolean {
  const egen = bufferversjon(kjerne, saksversjon);
  return (Object.keys(egen) as (keyof Bufferversjon)[]).every((n) => b.versjon[n] === egen[n]);
}

/**
 * Saken i oversikten (MM-U15): siste kjente status fra bufferen, merket
 * `oppdateres` når bufferen ikke gjelder for kjernen og saken. Oversikten regner
 * ikke ut saken; det gjør `lesSak` og `byggPaaNytt`. En bindende handling prøves
 * alltid mot journalen (B-10).
 */
export interface Oversiktslinje {
  status: Visning['status'] | null;
  oppdateres: boolean;
}

export function iOversikten(b: Buffer | null, kjerne: Kjerne, saksversjon: number): Oversiktslinje {
  return {
    status: b?.visning.status ?? null,
    oppdateres: !b || !bufferGjelder(b, kjerne, saksversjon),
  };
}

export interface Bufferlager {
  les(sakId: string): Promise<Buffer | null>;
  skriv(sakId: string, b: Buffer): Promise<void>;
}

export function minnebuffer(): Bufferlager {
  const lager = new Map<string, string>();
  return {
    les: async (sakId) => (lager.has(sakId) ? (JSON.parse(lager.get(sakId)!) as Buffer) : null),
    skriv: async (sakId, b) => void lager.set(sakId, JSON.stringify(b)),
  };
}

export type Lesing =
  | { kilde: 'buffer' | 'utledet'; visning: Visning }
  /** MM-U2: saken er ikke forstått. Visningen viser journalen med begrensningen; bufferen oppdateres ikke. */
  | { kilde: 'stoppet'; visning: Visning };

/** Saken slik en kjerne viser den: fra bufferen når versjonene samsvarer, ellers utledet på nytt (2.7 regel 2). */
export async function lesSak(
  sakId: string,
  journal: Journalrad[],
  lager: Bufferlager,
  kjerne: Kjerne
): Promise<Lesing> {
  const saksversjon = journal.at(-1)?.versjon ?? 0;
  const b = await lager.les(sakId);
  if (b && bufferGjelder(b, kjerne, saksversjon)) return { kilde: 'buffer', visning: b.visning };
  const u = utledJournal(journal, kjerne);
  const v = visning(u, kjerne.regler);
  if (!u.forstaatt) return { kilde: 'stoppet', visning: v };
  await lager.skriv(sakId, { versjon: bufferversjon(kjerne, saksversjon), visning: v });
  return { kilde: 'utledet', visning: v };
}

/**
 * Bygger bufferen på nytt for sakene der den ikke gjelder for kjernen, etter en
 * utrulling eller tilbakerulling (B-10, #316). Bare bufferen skrives: journalen,
 * de frosne brevene og leveringen røres ikke, og en sak kjernen ikke forstår,
 * får ingen ny buffer (MM-U2).
 */
export async function byggPaaNytt(
  saker: Iterable<[sakId: string, journal: Journalrad[]]>,
  lager: Bufferlager,
  kjerne: Kjerne
): Promise<Record<Lesing['kilde'], string[]>> {
  const ut: Record<Lesing['kilde'], string[]> = { buffer: [], utledet: [], stoppet: [] };
  for (const [sakId, journal] of saker)
    ut[(await lesSak(sakId, journal, lager, kjerne)).kilde].push(sakId);
  return ut;
}

/**
 * Sakene der utledningen endres når kjernen byttes, som listes før utrulling
 * (B-13, 2.7 regel 2). Sammenlikner visningen, som viser det dagens regler
 * ville gitt brevene (MM-U9).
 */
export function endredeSaker(
  journaler: Map<string, Journalrad[]>,
  fra: Kjerne,
  til: Kjerne
): string[] {
  const avtrykk = (j: Journalrad[], k: Kjerne) => {
    const u = utledJournal(j, k);
    return JSON.stringify(visning(u, k.regler));
  };
  return [...journaler]
    .filter(([, j]) => avtrykk(j, fra) !== avtrykk(j, til))
    .map(([sakId]) => sakId);
}
