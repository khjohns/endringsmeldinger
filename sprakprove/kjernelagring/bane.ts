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

import type pg from 'pg';
import type { ClientBase, PoolClient } from 'pg';
import type { Buffer, Bufferlager } from '../../kjerne/buffer.ts';
import type { Bane } from '../../kjerne/tester/bane.ts';
import type { Baner } from '../../kjerne/tester/baner.ts';
import type { Hendelse } from '../kjerne/typer.ts';
import { leggTil, lesJournal } from '../server/lager.ts';
import { lagOppsett, opprettSak, rydd, TESTBASE_URL, type Oppsett } from '../tester/testbase.ts';

export { TESTBASE_URL };

export async function basebane(o: Oppsett): Promise<Bane> {
  const sakId = await opprettSak(o.pool, o.prosjekt.id, o.te);
  return {
    sakId,
    aktor: (part) => (part === 'TE' ? o.te.id : o.bh.id),
    journal: async () => (await lesJournal(o.pool as pg.Pool, sakId, o.prosjekt.id)).hendelser,
    async skriv(hendelser, forventet) {
      // Lageret kjenner bare språkprøvens hendelsestyper; basen tar imot alle.
      await leggTil(o.pool, o.prosjekt.id, hendelser as Hendelse[], forventet);
    },
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
