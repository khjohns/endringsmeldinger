/**
 * Et bufret resultat bærer versjonene det er regnet med (2.7 i
 * modellforslaget). Kjernen bruker det bare når alle samsvarer med dens egne
 * og sakens, i begge retninger: etter en tilbakerulling kan resultatet være
 * nyere enn kjernen som leser det (#304).
 */

import type { ClientBase } from 'pg';
import type { Hendelse } from '../../kjerne/typer.ts';
import type { Kjerne } from '../kjerne/regelsett.ts';
import { utledJournal } from '../kjerne/skriving.ts';
import { visning, type Visning } from '../kjerne/visning.ts';

export interface Bufferversjon {
  projeksjonsversjon: number;
  regelversjon: number;
  /** Høyeste hendelsesformat kjernen som skrev bufferen, leser. */
  format: number;
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
    format: kjerne.format,
    saksversjon,
  };
}

export function bufferGjelder(b: Buffer, kjerne: Kjerne, saksversjon: number): boolean {
  const egen = bufferversjon(kjerne, saksversjon);
  return (Object.keys(egen) as (keyof Bufferversjon)[]).every((n) => b.versjon[n] === egen[n]);
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

/**
 * Bufferen i en midlertidig tabell på én forbindelse til testbasen. Prøven
 * velger ikke hvor bufferen skal ligge (B-10, #273), og endrer ikke skjemaet:
 * `cached_*` i `sak_metadata` har ingen versjoner i dag.
 */
export async function pgBuffer(klient: ClientBase): Promise<Bufferlager> {
  await klient.query(
    'CREATE TEMP TABLE IF NOT EXISTS maalmodell_buffer (sak_id text PRIMARY KEY, buffer jsonb NOT NULL)'
  );
  return {
    async les(sakId) {
      const r = await klient.query<{ buffer: Buffer }>(
        'SELECT buffer FROM maalmodell_buffer WHERE sak_id = $1',
        [sakId]
      );
      return r.rows[0]?.buffer ?? null;
    },
    async skriv(sakId, b) {
      await klient.query(
        'INSERT INTO maalmodell_buffer (sak_id, buffer) VALUES ($1, $2::jsonb) ON CONFLICT (sak_id) DO UPDATE SET buffer = EXCLUDED.buffer',
        [sakId, JSON.stringify(b)]
      );
    },
  };
}

export type Lesing =
  | { kilde: 'buffer' | 'utledet'; visning: Visning }
  /** MM-U2: saken er ikke forstått. Visningen viser journalen med begrensningen; bufferen oppdateres ikke. */
  | { kilde: 'stoppet'; visning: Visning };

/** Saken slik en kjerne viser den: fra bufferen når versjonene samsvarer, ellers utledet på nytt (2.7 regel 2). */
export async function lesSak(
  sakId: string,
  journal: Hendelse[],
  lager: Bufferlager,
  kjerne: Kjerne
): Promise<Lesing> {
  const saksversjon = journal.at(-1)?.versjon ?? 0;
  const b = await lager.les(sakId);
  if (b && bufferGjelder(b, kjerne, saksversjon)) return { kilde: 'buffer', visning: b.visning };
  const u = utledJournal(journal, kjerne);
  const v = visning(u);
  if (!u.forstatt) return { kilde: 'stoppet', visning: v };
  await lager.skriv(sakId, { versjon: bufferversjon(kjerne, saksversjon), visning: v });
  return { kilde: 'utledet', visning: v };
}

/**
 * Sakene der utledningen endres når kjernen byttes, som listes før utrulling
 * (B-13, 2.7 regel 2). Sammenlikner visningen og standpunktene i hvert svar.
 */
export function endredeSaker(
  journaler: Map<string, Hendelse[]>,
  fra: Kjerne,
  til: Kjerne
): string[] {
  const avtrykk = (j: Hendelse[], k: Kjerne) => {
    const u = utledJournal(j, k);
    const standpunkter = Object.values(u.svar).map((s) => [s.svar.id, s.standpunkter, s.avvik]);
    return JSON.stringify([visning(u), standpunkter]);
  };
  return [...journaler]
    .filter(([, j]) => avtrykk(j, fra) !== avtrykk(j, til))
    .map(([sakId]) => sakId);
}
