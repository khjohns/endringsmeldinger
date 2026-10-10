/**
 * Journalen i `hendelse`, som `repositories/postgres/hendelse.py`:
 * - lesing er avgrenset til det autoriserte prosjektet;
 * - skriving er alle eller ingen i én transaksjon, saken må finnes i
 *   prosjektet, og versjonen må være den klienten så;
 * - to samtidige skrivinger på samme versjon stoppes av unik-skranken
 *   `unique_hendelse_sak_versjon`, og taperen får versjonskonflikt.
 *
 * Tidspunktet leses i Pythons form, `+00:00` med mikrosekunder, så begge
 * leser samme tekst av samme rad. Kjernen skriver `toISOString()` (`Z`,
 * millisekunder); basen lagrer tidspunktet, ikke teksten.
 */

import type { ClientBase, Pool } from 'pg';

type Klient = Pool | ClientBase;
import { fraRad, tilRad } from '../kjerne/rad.ts';
import type { Hendelse, Rolle } from '../kjerne/typer.ts';

export const VERSJONSSKRANKE = 'unique_hendelse_sak_versjon';

export class Versjonskonflikt extends Error {
  readonly forventet: number;
  readonly faktisk: number;

  constructor(forventet: number, faktisk: number) {
    super(`Forventet versjon ${forventet}, journalen har ${faktisk}`);
    this.forventet = forventet;
    this.faktisk = faktisk;
  }
}

/** En verdi kolonnen ikke kan ta imot. Ruta svarer 400. */
export class UgyldigVerdi extends Error {}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface Lagret {
  event_id: string;
  sak_id: string;
  event_type: string;
  tid: string;
  actorid: string;
  actorrole: Rolle;
  actorteam: string | null;
  referstoid: string | null;
  format: number | null;
  data: Record<string, unknown>;
  versjon: number;
}

/** `datetime.isoformat()` i UTC: uten brøkdel når mikrosekundene er 0. */
function pythonTid(tid: string): string {
  return `${tid.endsWith('.000000') ? tid.slice(0, -7) : tid}+00:00`;
}

export async function lesJournal(
  db: Klient,
  sakId: string,
  prosjektId: string
): Promise<{ hendelser: Hendelse[]; versjon: number }> {
  const svar = await db.query<Lagret>(
    `SELECT event_id::text AS event_id, sak_id, event_type,
            to_char(time AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US') AS tid,
            actorid, actorrole, actorteam, referstoid::text AS referstoid, format, data, versjon
       FROM hendelse WHERE sak_id = $1 AND prosjekt_id = $2 ORDER BY versjon`,
    [sakId, prosjektId]
  );
  const hendelser = svar.rows.map((r) => fraRad({ ...r, time: pythonTid(r.tid) }));
  return { hendelser, versjon: hendelser.at(-1)?.versjon ?? 0 };
}

export async function sakensTopic(db: Klient, sakId: string): Promise<string | null> {
  const svar = await db.query<{ catenda_topic_id: string | null }>(
    'SELECT catenda_topic_id FROM sak_metadata WHERE sak_id = $1',
    [sakId]
  );
  return svar.rows[0]?.catenda_topic_id ?? null;
}

const KOLONNER = [
  'specversion',
  'event_id',
  'source',
  'type',
  'time',
  'subject',
  'datacontenttype',
  'actorid',
  'actorrole',
  'actorteam',
  'referstoid',
  'format',
  'data',
  'prosjekt_id',
  'sak_id',
  'event_type',
  'versjon',
] as const;

const SETT_INN = `INSERT INTO hendelse (${KOLONNER.join(', ')}) VALUES (${KOLONNER.map(
  (k, i) => `$${i + 1}${k === 'data' ? '::jsonb' : ''}`
).join(', ')})`;

async function versjon(db: Klient, sakId: string): Promise<number> {
  const svar = await db.query<{ versjon: number }>(
    'SELECT coalesce(max(versjon), 0)::int AS versjon FROM hendelse WHERE sak_id = $1',
    [sakId]
  );
  return svar.rows[0].versjon;
}

/** Kroker i transaksjonen, for prøven av avbrudd før commit (7.3 i designnotatet for #273). */
export interface Kroker {
  /** Kjøres etter at radene er skrevet, rett før `COMMIT`. Kaster den, rulles alt tilbake. */
  foerCommit?: (klient: ClientBase) => Promise<void>;
}

/**
 * Legg hendelsene til etter `forventet`. Versjonen i hendelsen settes av
 * lageret, som i Python. Returnerer ny versjon.
 *
 * @throws Versjonskonflikt, UgyldigVerdi, eller `Error` når saken ikke finnes i prosjektet.
 */
export async function leggTil(
  pool: Pool,
  prosjektId: string,
  hendelser: (Hendelse & { format?: number | null })[],
  forventet: number,
  kroker: Kroker = {}
): Promise<number> {
  if (!hendelser.length) throw new Error('Kan ikke legge til en tom liste');
  const sakId = hendelser[0].sak_id;
  if (hendelser.some((h) => h.sak_id !== sakId))
    throw new Error('Alle hendelsene må gjelde samme sak');
  for (const h of hendelser) {
    if (!UUID.test(h.event_id)) throw new UgyldigVerdi(`event_id må være en UUID: ${h.event_id}`);
    if (h.refererer_til_event_id !== null && !UUID.test(h.refererer_til_event_id))
      throw new UgyldigVerdi('refererer_til_event_id må være en UUID.');
  }
  const klient = await pool.connect();
  // En forbindelse som brytes under transaksjonen, sender `error` i tillegg til at
  // spørringen feiler. Uten lytter ville prosessen falle; feilen kommer fram gjennom
  // spørringen.
  const vedBrudd = () => {};
  klient.on('error', vedBrudd);
  try {
    await klient.query('BEGIN');
    const sak = await klient.query<{ prosjekt_id: string; versjon: number }>(
      `SELECT prosjekt_id, (SELECT coalesce(max(versjon), 0)::int FROM hendelse
         WHERE sak_id = m.sak_id) AS versjon FROM sak_metadata m WHERE sak_id = $1`,
      [sakId]
    );
    if (sak.rows[0]?.prosjekt_id !== prosjektId)
      throw new Error('Saken finnes ikke i det autoriserte prosjektet.');
    if (sak.rows[0].versjon !== forventet)
      throw new Versjonskonflikt(forventet, sak.rows[0].versjon);
    for (const [i, h] of hendelser.entries()) {
      const rad = tilRad({ ...h, versjon: forventet + i + 1 }, prosjektId);
      await klient.query(
        SETT_INN,
        KOLONNER.map((k) => (k === 'data' ? JSON.stringify(rad[k]) : rad[k]))
      );
    }
    await kroker.foerCommit?.(klient);
    await klient.query('COMMIT');
  } catch (feil) {
    try {
      await klient.query('ROLLBACK');
    } catch (brudd) {
      // En forbindelse som ikke kan rulle tilbake, skal ikke tilbake i poolen.
      klient.release(brudd as Error);
      throw feil;
    }
    klient.off('error', vedBrudd);
    klient.release();
    if ((feil as { constraint?: string }).constraint === VERSJONSSKRANKE)
      throw new Versjonskonflikt(forventet, await versjon(pool, sakId));
    throw feil;
  }
  klient.off('error', vedBrudd);
  klient.release();
  return forventet + hendelser.length;
}
