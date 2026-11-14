/**
 * Lenken fra saken til topicen i Catenda, som siden for vederlaget viser som «Åpne saken
 * i Catenda» (U-15 i BF-44, #1906). Verten er driftens (`CATENDA_NETTADRESSE`), og
 * prosjektet og topicens nummer er de lagrede i `koe_api.leveringsmaal`. Testene mot testbasen krever
 * `KOE_SQLSERVER_TILKOBLING`.
 */

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { sakslenkeFraMiljoe, type Sakslenke } from '../catenda.ts';
import { transaksjon, type Kontekst } from '../datalag.ts';
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

// Kilde for formen: lenken til en topic i Catenda fra oppdragsgiver 14.11 i #1906.
const NETTADRESSE = 'https://hub.catenda.com';
const maal = { catenda_project_id: '5c3a6c40-36e0-4b5a-8069-98d02a98b040', topic_nummer: 726 };

describe('lenken til saken i Catenda fra verten', () => {
  it('uten CATENDA_NETTADRESSE har saken ingen lenke, og verten har ingen standardverdi', () => {
    expect(sakslenkeFraMiljoe({})).toBeNull();
    expect(sakslenkeFraMiljoe({ CATENDA_NETTADRESSE: '' })).toBeNull();
  });

  it('har prosjekt-ID-en uten bindestreker og topicens nummer, som lenken i Catenda', () => {
    const lenke = sakslenkeFraMiljoe({ CATENDA_NETTADRESSE: NETTADRESSE })!;
    expect(lenke({ ...maal, catenda_project_id: maal.catenda_project_id.toUpperCase() })).toBe(
      'https://hub.catenda.com/project/5c3a6c4036e04b5a806998d02a98b040/issues/726'
    );
  });

  it('godtar verten med / til slutt', () => {
    expect(sakslenkeFraMiljoe({ CATENDA_NETTADRESSE: `${NETTADRESSE}/` })!(maal)).toBe(
      'https://hub.catenda.com/project/5c3a6c4036e04b5a806998d02a98b040/issues/726'
    );
  });

  it('gir ingen lenke uten topicens nummer, eller for en prosjekt-ID som ikke er en Catenda-ID', () => {
    const lenke = sakslenkeFraMiljoe({ CATENDA_NETTADRESSE: NETTADRESSE })!;
    expect(lenke({ ...maal, topic_nummer: null })).toBeNull();
    expect(lenke({ ...maal, catenda_project_id: 'p-1' })).toBeNull();
  });

  it.each([
    ['http i stedet for https', 'http://hub.catenda.com'],
    ['en sti', 'https://hub.catenda.com/project'],
    ['en spørring', 'https://hub.catenda.com/?a=1'],
    ['brukernavn', 'https://u@hub.catenda.com'],
    ['ikke en adresse', 'hub.catenda.com'],
  ])('avviser en verdi med %s', (_, verdi) => {
    expect(() => sakslenkeFraMiljoe({ CATENDA_NETTADRESSE: verdi })).toThrow(
      'CATENDA_NETTADRESSE er ikke en https-origin'
    );
  });
});

describe.skipIf(!TESTBASE_URL)('lenken til saken i Catenda i lesingen av saken', () => {
  let o: Oppsett;
  let medVert: KjorendeServer;
  let utenVert: KjorendeServer;
  let medTopic: string;
  const sakslenke: Sakslenke = sakslenkeFraMiljoe({ CATENDA_NETTADRESSE: NETTADRESSE })!;

  const lenken = async (server: KjorendeServer, sakId: string, leser: Testbruker) => {
    const svar = await kall(server.url, `/api/kjerne/saker/${sakId}`, {
      bruker: leser,
      prosjektId: o.prosjekt.id,
    });
    expect(svar.status, JSON.stringify(svar.kropp)).toBe(200);
    return svar.kropp.catenda_lenke;
  };

  /** Sakens topic i Catenda, lagt inn som kjøreveien, `koe_jobbkjoerer` (#741). */
  const settTopic = (sakId: string, topic: string, nummer: number | null) =>
    somJobbkjoerer(
      o,
      `INSERT koe.sak_catenda_topic (sak_id, prosjekt_id, catenda_board_id, catenda_topic_id, catenda_topic_nummer)
       VALUES (@sak_id, @prosjekt_id, N'board-a', @topic, @nummer)`,
      { sak_id: sakId, prosjekt_id: o.prosjekt.id, topic, nummer }
    );

  beforeAll(async () => {
    o = await lagOppsett();
    medVert = await startServer(o, { sakslenke });
    utenVert = await startServer(o);
    medTopic = await opprettKjernesak(o);
    await settTopic(medTopic, 'topic-a', 726);
  });
  afterAll(async () => {
    await medVert?.stopp();
    await utenVert?.stopp();
    if (o) await rydd(o);
  });

  it.each([
    ['TE', () => o.te],
    ['BH', () => o.bh],
    ['et medlem med leserolle', () => o.leser],
  ])('%s får lenken til sakens topic i prosjektets Catenda-prosjekt', async (_, leser) => {
    expect(await lenken(medVert, medTopic, leser())).toBe(
      `https://hub.catenda.com/project/${o.prosjekt.catendaProsjekt.replaceAll('-', '')}/issues/726`
    );
  });

  it('en sak uten topic i Catenda ennå har ingen lenke', async () => {
    const sakId = await opprettKjernesak(o);
    expect(await lenken(medVert, sakId, o.bh)).toBeNull();
  });

  it('en topic uten nummer, koblet før nummeret ble lagret, gir ingen lenke', async () => {
    const sakId = await opprettKjernesak(o);
    await settTopic(sakId, 'topic-uten-nummer', null);
    expect(await lenken(medVert, sakId, o.bh)).toBeNull();
  });

  it('uten verten har saken ingen lenke, også med topic', async () => {
    expect(await lenken(utenVert, medTopic, o.bh)).toBeNull();
  });

  it('målet leses bare i sakens prosjekt', async () => {
    const maalet = (kontekst: Kontekst) =>
      transaksjon(o.datalag.kjoeretid.pool, kontekst, (foresp) =>
        foresp().input('sak_id', medTopic).execute('koe_api.leveringsmaal')
      );
    // Kontrollsak: i sakens prosjekt gir prosedyren topicen.
    const i = await maalet({ aktor: o.bh.id, prosjekt: o.prosjekt.id, side: 'BH' });
    expect(i.recordset.map((r) => [r.topic_id, r.topic_nummer])).toEqual([['topic-a', 726]]);
    const utenfor = await maalet({ aktor: o.utenfor.id, prosjekt: o.annetProsjekt.id });
    expect(utenfor.recordset).toEqual([]);
  });

  it('et oppslag av målet som feiler, gir ingen lenke og velter ikke lesingen', async () => {
    const advarsel = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const rett = (s: string) => o.datalag.base.pool.request().query(s);
    await rett('REVOKE EXECUTE ON koe_api.leveringsmaal FROM koe_runtime');
    try {
      const svar = await kall(medVert.url, `/api/kjerne/saker/${medTopic}`, {
        bruker: o.bh,
        prosjektId: o.prosjekt.id,
      });
      expect(svar.status, JSON.stringify(svar.kropp)).toBe(200);
      expect(svar.kropp.catenda_lenke).toBeNull();
      expect((svar.kropp.journal as unknown[]).length).toBe(1);
      expect(advarsel).toHaveBeenCalledOnce();
      expect(advarsel.mock.calls[0][0]).toContain('lenken til Catenda');
    } finally {
      await rett('GRANT EXECUTE ON koe_api.leveringsmaal TO koe_runtime');
      advarsel.mockRestore();
    }
  });
});
