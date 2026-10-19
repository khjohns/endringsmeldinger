/**
 * Gjenoppbyggingen etter en regelendring, mot testbasen i SQL Server (B-10, #316,
 * merknaden 07.10 til B-10, presiseringen i F2, og #932). Uten nye hendelser finner
 * en spørring sakene der bufferen er regnet med en annen versjon, og kjernen bygger
 * dem på nytt. Forventningen:
 *
 * - bare `koe.kjernebuffer` endres. Journalen, de frosne brevene og alle andre
 *   tabeller, også leveringen, er uendret, og ingen levering utløses (merknaden
 *   07.10 til B-10);
 * - et sendt brev beholder virkningen (MM-U9), mens visningen regnes med de nye
 *   reglene;
 * - etter gjenoppbyggingen er ingen sak utdatert.
 *
 * Oppsettet har sin egen base, så ingen annen testfil skriver i den mens basen
 * sammenliknes.
 */

import { createHash, randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { byggPaaNytt, lesSak, type Bufferlager } from '../../kjerne/utledning/buffer.ts';
import { utledJournal } from '../../kjerne/kommandoer/skriving.ts';
import { bygg } from '../../kjerne/tester/baner.ts';
import { NESTE_REGLER } from '../../kjerne/tester/klient.ts';
import { VERSJONER } from '../../kjerne/tester/kompatibilitet.ts';
import { medRegler } from '../../kjerne/tester/kjoerer.ts';
import { KJERNE } from '../../kjerne/versjon.ts';
import { lagOppsett, rydd, type Oppsett } from '../../server/tester/testbase.ts';
import {
  basebane,
  journalen,
  nySak,
  sakerKjernenIkkeLeser,
  skrivRader,
  somEier,
  sqlBuffer,
  GRENSER,
  TESTBASE_URL,
  utdaterteSaker,
} from './bane.ts';

vi.setConfig(GRENSER);

const N1 = medRegler(NESTE_REGLER);

/** Et avtrykk av hver tabell i basen utenom `koe.kjernebuffer`, lest som eieren. */
async function avtrykk(o: Oppsett): Promise<Record<string, string>> {
  return somEier(o, async (r) => {
    const tabeller = await r().query<{ navn: string }>(
      `SELECT QUOTENAME(s.name) + N'.' + QUOTENAME(t.name) AS navn
         FROM sys.tables t JOIN sys.schemas s ON s.schema_id = t.schema_id
        WHERE NOT (s.name = N'koe' AND t.name = N'kjernebuffer')`
    );
    const ut: Record<string, string> = {};
    for (const { navn } of tabeller.recordset) {
      const svar = await r().query<{ rader: string | null }>(
        `SELECT (SELECT * FROM ${navn} FOR JSON PATH, INCLUDE_NULL_VALUES) AS rader`
      );
      const rader = (JSON.parse(svar.recordset[0].rader ?? '[]') as unknown[])
        .map((x) => JSON.stringify(x))
        .sort();
      ut[navn] = `${rader.length}:${createHash('sha256').update(rader.join('|')).digest('hex')}`;
    }
    return ut;
  });
}

describe.skipIf(!TESTBASE_URL)('gjenoppbyggingen mot testbasen', () => {
  let o: Oppsett;
  let lager: Bufferlager;
  const saker: Record<string, string> = {};

  beforeAll(async () => {
    o = await lagOppsett();
    lager = sqlBuffer(o, o.prosjekt);
    const lag = async (navn: string, steg: Parameters<typeof bygg>[1]) => {
      const bane = await basebane(o);
      await bygg(bane, steg);
      saker[navn] = bane.sakId;
      await lesSak(bane.sakId, await bane.journal(), lager, KJERNE);
    };
    // Grunnlaget prekludert etter § 32.2 i SAMORD, som regelendringen i prøven rører.
    await lag('rørt av regelendringen', [
      'krav_samord',
      {
        handling: 'brev',
        svar: [{ spor: 'grunnlag', resultat: 'avslaatt', varslet_i_tide: false }],
      },
    ]);
    await lag('enighet om beløpet', ['forlop_a']);
  });
  afterAll(async () => {
    if (o) await rydd(o);
  });

  it('finner de utdaterte sakene og bygger dem på nytt uten å endre noe annet enn bufferen', async () => {
    const alle = Object.values(saker).sort();
    expect(await utdaterteSaker(o, o.prosjekt, KJERNE)).toEqual([]);
    expect(await utdaterteSaker(o, o.prosjekt, N1)).toEqual(alle);

    const journaler = new Map<string, Awaited<ReturnType<typeof journalen>>>();
    for (const id of alle) journaler.set(id, await journalen(o, id));
    const foer = new Map(alle.map((id) => [id, utledJournal(journaler.get(id)!, KJERNE)]));

    const fra = await avtrykk(o);
    const bygget = await byggPaaNytt(journaler, lager, N1);
    expect(bygget).toEqual({ buffer: [], utledet: alle, stoppet: [] });
    expect(await avtrykk(o)).toEqual(fra);

    expect(await utdaterteSaker(o, o.prosjekt, N1)).toEqual([]);
    for (const id of alle) {
      expect((await lager.les(id))?.versjon.regelversjon).toBe(N1.regler.versjon);
      // MM-U9: brevene er de samme, også beslutningsgrunnlaget.
      const etter = utledJournal(await journalen(o, id), N1);
      expect(etter.svar).toEqual(foer.get(id)!.svar);
    }
    const rort = await lager.les(saker['rørt av regelendringen']);
    expect(rort?.visning.spor.grunnlag.etiketter).toContain('regel_endret_etter_brevet');
    // Kontrollsak: en sak regelendringen ikke rører, får ingen merknad.
    const urort = await lager.les(saker['enighet om beløpet']);
    expect(urort?.visning.spor.grunnlag.etiketter).not.toContain('regel_endret_etter_brevet');
  });

  it('finner en sak med en ny hendelse etter bufferen, og bare den', async () => {
    for (const id of Object.values(saker)) await lesSak(id, await journalen(o, id), lager, KJERNE);
    expect(await utdaterteSaker(o, o.prosjekt, KJERNE)).toEqual([]);
    const bane = await basebane(o);
    const k = await bygg(bane, ['krav_eo']);
    await lesSak(bane.sakId, await bane.journal(), lager, KJERNE);
    expect(await utdaterteSaker(o, o.prosjekt, KJERNE)).toEqual([]);
    expect((await k.send({ handling: 'krav', spor: 'frist', dager: 30 }))?.godtatt).toBe(true);
    expect(await utdaterteSaker(o, o.prosjekt, KJERNE)).toEqual([bane.sakId]);
  });

  it('lister sakene med en rad i et format kjernen ikke leser, før en tilbakerulling (B-10, MM-U2)', async () => {
    expect(await sakerKjernenIkkeLeser(o, o.prosjekt, KJERNE)).toEqual([]);
    const bane = await basebane(o);
    const k = await bygg(bane, ['krav_eo'], VERSJONER.v2b);
    expect((await k.send({ handling: 'krav', spor: 'vederlag', belop: 120000 }))?.godtatt).toBe(
      true
    );
    // Kontrollsak: skrevet av v2a, som leser format 2 men skriver format 1.
    const kontroll = await basebane(o);
    await bygg(kontroll, ['krav_eo'], VERSJONER.v2a);
    expect(await sakerKjernenIkkeLeser(o, o.prosjekt, VERSJONER.v1)).toEqual([bane.sakId]);
    expect(await sakerKjernenIkkeLeser(o, o.prosjekt, VERSJONER.v2a)).toEqual([]);
  });

  it('tar ikke med en sak uten rader fra kjernen', async () => {
    // Sakene fra testene over, som ikke alle er regnet ut.
    const foer = await utdaterteSaker(o, o.prosjekt, KJERNE);
    // Kontrollsak: forløpet skrevet av kjernen, uten buffer.
    const kontroll = await basebane(o);
    await bygg(kontroll, ['krav_eo']);
    // Samme rader uten format i en annen sak, som Python skriver (B-17). Journalen
    // endres ikke, så radene skrives slik og ikke om.
    const python = await nySak(o);
    const rader = (await kontroll.journal()).map((r) => ({
      ...r,
      event_id: randomUUID(),
      sak_id: python,
      format: null,
    }));
    await skrivRader(o, rader, 0);
    expect(await utdaterteSaker(o, o.prosjekt, KJERNE)).toEqual([...foer, kontroll.sakId].sort());
  });

  it('lar bufferen holde seg i prosjektet', async () => {
    const annet = { ...o, prosjekt: o.annetProsjekt };
    const bane = await basebane(annet);
    await bygg(bane, ['krav_eo']);
    const lagerB = sqlBuffer(o, o.annetProsjekt);
    await lesSak(bane.sakId, await bane.journal(), lagerB, KJERNE);
    // Kontrollsak: hvert lager leser sin egen sak.
    const egenB = await lagerB.les(bane.sakId);
    const id = saker['enighet om beløpet'];
    const egenA = await lager.les(id);
    if (!egenA || !egenB) throw new Error('Forutsetning: begge sakene har en buffer');

    expect(await lager.les(bane.sakId)).toBeNull();
    expect(await lagerB.les(id)).toBeNull();
    const avvist = (skriving: Promise<void>) =>
      skriving.then(
        () => 'skrevet',
        (e: Error) => e.message
      );
    expect(await avvist(lager.skriv(bane.sakId, egenA))).toMatch(/finnes ikke i prosjektet/);
    expect(await avvist(lagerB.skriv(id, egenB))).toMatch(/finnes ikke i prosjektet/);
    expect(await lager.les(id)).toEqual(egenA);
    expect(await lagerB.les(bane.sakId)).toEqual(egenB);
  });
});
