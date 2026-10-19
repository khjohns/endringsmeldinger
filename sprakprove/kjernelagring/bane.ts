/**
 * Kjernen mot testbasen: journalen går gjennom `hendelse` med lageret fra
 * språkprøven, og bufferen ligger i `sak_metadata` (B-10, #316). Banen leser
 * journalen fra basen før hver utledning, så hvert steg prøver lagring og
 * gjenlesing. Krever `KOE_TESTBASE_URL`.
 *
 * Journallageret er språkprøvens, ikke kjernens; skrivestien er #310. Her
 * prøves at kjernens rader og bufferen tåler basen.
 */

import { randomUUID } from 'node:crypto';
import type pg from 'pg';
import type { ClientBase, PoolClient } from 'pg';
import {
  bufferversjon,
  type Buffer,
  type Bufferlager,
  type Bufferversjon,
} from '../../kjerne/utledning/buffer.ts';
import type { Kjerne } from '../../kjerne/versjon.ts';
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
 * Bufferen i `sak_metadata` (B-10, #316): visningen og versjonene den er regnet
 * med, i kolonnene fra migrasjonen `sak_metadata_kjernebuffer`. Lageret gjelder
 * ett prosjekt og leser og skriver bare dets saker.
 */
export function pgBuffer(klient: ClientBase, prosjektId: string): Bufferlager {
  return {
    async les(sakId) {
      const r = await klient.query<Bufferversjon & { visning: Buffer['visning'] | null }>(
        `SELECT kjerne_visning AS visning, kjerne_projeksjonsversjon AS projeksjonsversjon,
                kjerne_regelversjon AS regelversjon, kjerne_leserformat AS leserformat,
                kjerne_saksversjon AS saksversjon
           FROM sak_metadata WHERE sak_id = $1 AND prosjekt_id = $2`,
        [sakId, prosjektId]
      );
      const rad = r.rows[0];
      if (!rad?.visning) return null;
      const { visning, ...versjon } = rad;
      return { versjon, visning };
    },
    async skriv(sakId, b) {
      const r = await klient.query(
        `UPDATE sak_metadata
            SET kjerne_visning = $2::jsonb, kjerne_projeksjonsversjon = $3,
                kjerne_regelversjon = $4, kjerne_leserformat = $5, kjerne_saksversjon = $6
          WHERE sak_id = $1 AND prosjekt_id = $7`,
        [
          sakId,
          JSON.stringify(b.visning),
          b.versjon.projeksjonsversjon,
          b.versjon.regelversjon,
          b.versjon.leserformat,
          b.versjon.saksversjon,
          prosjektId,
        ]
      );
      if (r.rowCount !== 1) throw new Error(`Saken ${sakId} finnes ikke i prosjektet`);
    },
  };
}

/**
 * Sakene i prosjektet der bufferen ikke gjelder for kjernen: ingen buffer, en
 * annen versjon, eller en saksversjon som ikke er den siste i journalen. For en
 * sak med rader fra TS-kjernen er det det samme som `bufferGjelder` avgjør, som
 * en spørring (B-10, #316). En sak Python har skrevet alene (`format` mangler
 * på alle rader), tas ikke med: kjernen forstår den ikke og bygger ingen buffer
 * for den (B-17, MM-U2).
 */
export async function utdaterteSaker(
  klient: ClientBase,
  prosjektId: string,
  kjerne: Kjerne
): Promise<string[]> {
  const v = bufferversjon(kjerne, 0);
  const r = await klient.query<{ sak_id: string }>(
    `SELECT m.sak_id FROM sak_metadata m
       JOIN (SELECT sak_id, max(versjon) AS versjon FROM hendelse
              WHERE prosjekt_id = $1 GROUP BY sak_id HAVING count(format) > 0) h
         ON h.sak_id = m.sak_id
      WHERE m.prosjekt_id = $1
        AND (m.kjerne_visning IS NULL
             OR m.kjerne_projeksjonsversjon IS DISTINCT FROM $2
             OR m.kjerne_regelversjon IS DISTINCT FROM $3
             OR m.kjerne_leserformat IS DISTINCT FROM $4
             OR m.kjerne_saksversjon IS DISTINCT FROM h.versjon)
      ORDER BY m.sak_id`,
    [prosjektId, v.projeksjonsversjon, v.regelversjon, v.leserformat]
  );
  return r.rows.map((x) => x.sak_id);
}

/**
 * Sakene i prosjektet med en rad i et format kjernen ikke leser. Listes før en
 * tilbakerulling: de stopper med den eldre kjernen (MM-U2, B-10).
 */
export async function sakerKjernenIkkeLeser(
  klient: ClientBase,
  prosjektId: string,
  kjerne: Kjerne
): Promise<string[]> {
  const r = await klient.query<{ sak_id: string }>(
    `SELECT DISTINCT sak_id FROM hendelse
      WHERE prosjekt_id = $1 AND format > $2 ORDER BY sak_id`,
    [prosjektId, kjerne.leserformat]
  );
  return r.rows.map((x) => x.sak_id);
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
      lager = pgBuffer(klient, o.prosjekt.id);
    },
    async stopp() {
      klient?.release();
      if (o) await rydd(o);
    },
    bane: () => basebane(o),
    buffer: () => lager,
  };
}
