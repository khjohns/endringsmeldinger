/**
 * Lenken fra saken til topicen i Catenda, som siden for vederlaget viser som «Åpne saken
 * i Catenda» (U-15 i BF-44, #1906). Malen er driftens (`CATENDA_SAKSLENKE`), og ID-ene er
 * de lagrede i `koe_api.leveringsmaal`. Testene mot testbasen krever
 * `KOE_SQLSERVER_TILKOBLING`.
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { sakslenkeFraMiljoe, type Sakslenke } from '../catenda.ts';
import {
  kall,
  lagOppsett,
  opprettKjernesak,
  rydd,
  somJobbkjoerer,
  startServer,
  TESTBASE_URL,
  type KjorendeServer,
  type Oppsett,
  type Testbruker,
} from './testbase.ts';

const MAL = 'https://catenda.test/prosjekt/{prosjekt}/board/{board}/topic/{topic}';
const maal = { catenda_project_id: 'p-1', board_id: 'b 1', topic_id: 't/1' };

describe('malen for lenken til saken i Catenda', () => {
  it('uten CATENDA_SAKSLENKE har saken ingen lenke, og verten har ingen standardverdi', () => {
    expect(sakslenkeFraMiljoe({})).toBeNull();
    expect(sakslenkeFraMiljoe({ CATENDA_SAKSLENKE: '' })).toBeNull();
  });

  it('setter inn ID-ene kodet for adressen', () => {
    expect(sakslenkeFraMiljoe({ CATENDA_SAKSLENKE: MAL })!(maal)).toBe(
      'https://catenda.test/prosjekt/p-1/board/b%201/topic/t%2F1'
    );
  });

  it('gir ingen lenke før saken har en topic', () => {
    const lenke = sakslenkeFraMiljoe({ CATENDA_SAKSLENKE: MAL })!;
    expect(lenke({ ...maal, board_id: null, topic_id: null })).toBeNull();
  });

  it.each([
    ['http i stedet for https', 'http://catenda.test/{topic}'],
    ['uten {topic}', 'https://catenda.test/{prosjekt}/{board}'],
    ['en ukjent plassholder', 'https://catenda.test/{topic}?s={sak}'],
    ['ikke en adresse', '{topic}'],
  ])('avviser en mal med %s', (_, mal) => {
    expect(() => sakslenkeFraMiljoe({ CATENDA_SAKSLENKE: mal })).toThrow(/CATENDA_SAKSLENKE/);
  });
});

describe.skipIf(!TESTBASE_URL)('lenken til saken i Catenda i lesingen av saken', () => {
  let o: Oppsett;
  let medMal: KjorendeServer;
  let utenMal: KjorendeServer;
  let medTopic: string;
  const sakslenke: Sakslenke = sakslenkeFraMiljoe({ CATENDA_SAKSLENKE: MAL })!;

  const lenken = async (server: KjorendeServer, sakId: string, leser: Testbruker) => {
    const svar = await kall(server.url, `/api/kjerne/saker/${sakId}`, {
      bruker: leser,
      prosjektId: o.prosjekt.id,
    });
    expect(svar.status, JSON.stringify(svar.kropp)).toBe(200);
    return svar.kropp.catenda_lenke;
  };

  /** Sakens topic i Catenda, lagt inn som kjøreveien, `koe_jobbkjoerer` (#741). */
  const settTopic = (sakId: string, board: string, topic: string) =>
    somJobbkjoerer(
      o,
      `INSERT koe.sak_catenda_topic (sak_id, prosjekt_id, catenda_board_id, catenda_topic_id)
       VALUES (@sak_id, @prosjekt_id, @board, @topic)`,
      { sak_id: sakId, prosjekt_id: o.prosjekt.id, board, topic }
    );

  beforeAll(async () => {
    o = await lagOppsett();
    medMal = await startServer(o, { sakslenke });
    utenMal = await startServer(o);
    medTopic = await opprettKjernesak(o);
    await settTopic(medTopic, 'board-a', 'topic-a');
  });
  afterAll(async () => {
    await medMal?.stopp();
    await utenMal?.stopp();
    if (o) await rydd(o);
  });

  it.each([
    ['TE', () => o.te],
    ['BH', () => o.bh],
    ['et medlem med leserolle', () => o.leser],
  ])('%s får lenken til sakens topic i prosjektets Catenda-prosjekt', async (_, leser) => {
    expect(await lenken(medMal, medTopic, leser())).toBe(
      `https://catenda.test/prosjekt/${o.prosjekt.catendaProsjekt}/board/board-a/topic/topic-a`
    );
  });

  it('en sak uten topic i Catenda ennå har ingen lenke', async () => {
    const sakId = await opprettKjernesak(o);
    expect(await lenken(medMal, sakId, o.bh)).toBeNull();
  });

  it('uten malen har saken ingen lenke, også med topic', async () => {
    expect(await lenken(utenMal, medTopic, o.bh)).toBeNull();
  });

  it('en sak i et annet prosjekt gir ingen lenke, bare avvisningen', async () => {
    const sakId = await opprettKjernesak(o, o.annetProsjekt);
    const svar = await kall(medMal.url, `/api/kjerne/saker/${sakId}`, {
      bruker: o.bh,
      prosjektId: o.prosjekt.id,
    });
    expect(svar.status).toBe(403);
    expect(svar.kropp).not.toHaveProperty('catenda_lenke');
  });
});
