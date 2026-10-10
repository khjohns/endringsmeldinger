/**
 * Kjernen mot testbasen: journalen går gjennom `hendelse` med lageret fra
 * språkprøven, og bufferen ligger i en midlertidig tabell. Banen leser
 * journalen fra basen før hver utledning, så hvert steg prøver lagring og
 * gjenlesing. Krever `KOE_TESTBASE_URL`. Kjør ikke samtidig med pytest mot
 * samme base.
 *
 * Dette er ikke kjernens lagring. Hvor kjernen lagrer, avgjøres av B-18 og
 * #273; her prøves bare at kjernens rader tåler basen.
 */

import { randomUUID } from 'node:crypto';
import type pg from 'pg';
import type { ClientBase, PoolClient } from 'pg';
import type { Buffer, Bufferlager } from '../../kjerne/buffer.ts';
import type { Journalrad } from '../../kjerne/typer.ts';
import type { Bane } from '../../kjerne/tester/bane.ts';
import type { Baner } from '../../kjerne/tester/baner.ts';
import type { Hendelse } from '../kjerne/typer.ts';
import { leggTil, lesJournal, type Kroker } from '../server/lager.ts';
import { lagOppsett, rydd, TESTBASE_URL, type Oppsett } from '../tester/testbase.ts';

export { TESTBASE_URL };

/** Journalen i saken slik basen har den, med `format` fra kolonnen. */
export async function journalen(o: Oppsett, sakId: string): Promise<Journalrad[]> {
  const { hendelser } = await lesJournal(o.pool as pg.Pool, sakId, o.prosjekt.id);
  return hendelser.map((h) => ({ format: null, ...h }) as Journalrad);
}

/** Skriv kjernens rader med lageret. Lageret kjenner bare språkprøvens hendelsestyper; basen tar imot alle. */
export async function skrivRader(
  o: Oppsett,
  rader: Journalrad[],
  forventet: number,
  kroker?: Kroker
): Promise<number> {
  return leggTil(o.pool, o.prosjekt.id, rader as unknown as Hendelse[], forventet, kroker);
}

/** En ny sak i prosjektet, opprettet med `sak_opprettet` i kjernens format. */
export async function basebane(o: Oppsett): Promise<Bane> {
  const sakId = randomUUID();
  await o.pool.query(
    "INSERT INTO sak_metadata (sak_id, prosjekt_id, created_by, sakstype) VALUES ($1, $2, 'kjernelagring', 'standard')",
    [sakId, o.prosjekt.id]
  );
  const sak: Journalrad = {
    event_id: randomUUID(),
    sak_id: sakId,
    event_type: 'sak_opprettet',
    versjon: 1,
    tidsstempel: '2026-10-09T08:00:00.000Z',
    aktor_id: o.te.id,
    aktor_rolle: 'TE',
    aktor_team_id: null,
    refererer_til_event_id: null,
    format: 1,
    data: { sakstittel: 'Kjernelagringen', sakstype: 'standard' },
  };
  await skrivRader(o, [sak], 0);
  return {
    sakId,
    aktor: (part) => (part === 'TE' ? o.te.id : o.bh.id),
    journal: () => journalen(o, sakId),
    skriv: async (hendelser, forventet) => void (await skrivRader(o, hendelser, forventet)),
  };
}

/**
 * Bufferen i en midlertidig tabell på én forbindelse til testbasen. Prøven
 * velger ikke hvor bufferen skal ligge (B-10, #273), og endrer ikke skjemaet:
 * `cached_*` i `sak_metadata` har ingen versjoner i dag.
 */
export async function pgBuffer(klient: ClientBase): Promise<Bufferlager> {
  await klient.query(
    'CREATE TEMP TABLE IF NOT EXISTS kjerne_buffer (sak_id text PRIMARY KEY, buffer jsonb NOT NULL)'
  );
  return {
    async les(sakId) {
      const r = await klient.query<{ buffer: Buffer }>(
        'SELECT buffer FROM kjerne_buffer WHERE sak_id = $1',
        [sakId]
      );
      return r.rows[0]?.buffer ?? null;
    },
    async skriv(sakId, b) {
      await klient.query(
        'INSERT INTO kjerne_buffer (sak_id, buffer) VALUES ($1, $2::jsonb) ON CONFLICT (sak_id) DO UPDATE SET buffer = EXCLUDED.buffer',
        [sakId, JSON.stringify(b)]
      );
    },
  };
}

export function testbasen(): Baner {
  let o: Oppsett;
  let klient: PoolClient;
  let lager: Bufferlager;
  return {
    navn: 'mot testbasen',
    async start() {
      o = await lagOppsett();
      klient = await o.pool.connect();
      lager = await pgBuffer(klient);
    },
    async stopp() {
      klient?.release();
      if (o) await rydd(o);
    },
    bane: () => basebane(o),
    buffer: () => lager,
  };
}
