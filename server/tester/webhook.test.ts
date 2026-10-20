/**
 * Mottaket for webhooken fra Catenda mot SQL Server-testbasen (W-1a, #819): den
 * hemmelige stien (INT-01), lagringen før svaret 200 og én rad per `event.id`
 * (INT-02). Kroppen er det lagrede, anonymiserte kallet fra Catenda
 * (`backend/tests/fixtures/catenda_issue_created_contract.md`), med en ny `event.id`
 * per test, så testene ikke deler rad.
 */

import { randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { lagServer } from '../app.ts';
import type { Catenda } from '../autorisasjon.ts';
import { hendelsen, kallgrense, STOERSTE_HENDELSE, webhookFraMiljoe } from '../webhook.ts';
import { avvisning, opprettMigrertTestbase } from './sqlserver_migrert.ts';
import {
  opprettKjoeretid,
  slettAlle,
  SQLSERVER_TILKOBLING,
  type Pool,
  type Testbase,
} from './sqlserver.ts';

const KALLET = readFileSync(
  new URL('../../backend/tests/fixtures/catenda_issue_created_anonymized.json', import.meta.url),
  'utf8'
);
const KALLETS_ID = (JSON.parse(KALLET) as { event: { id: string } }).event.id;
const HEMMELIGHET = randomBytes(24).toString('hex');

const nyId = () => randomBytes(16).toString('hex');
const kallMed = (id: string) => KALLET.replace(KALLETS_ID, id);

describe('oppsettet av webhooken', () => {
  it('uten WEBHOOK_SECRET_PATH, eller med en kort hemmelighet, er mottaket ikke satt opp, og meldingen har ikke verdien', () => {
    expect(() => webhookFraMiljoe({})).toThrow(/WEBHOOK_SECRET_PATH/);
    let melding = '';
    try {
      webhookFraMiljoe({ WEBHOOK_SECRET_PATH: 'kort-hemmelighet' });
    } catch (feil) {
      melding = (feil as Error).message;
    }
    expect(melding).toMatch(/kortere enn 32/);
    expect(melding).not.toContain('kort-hemmelighet');
    expect(webhookFraMiljoe({ WEBHOOK_SECRET_PATH: HEMMELIGHET }).hemmelighet).toBe(HEMMELIGHET);
  });

  it('RATE_LIMIT_WEBHOOK er antall kall per minutt, 100 som i Python når den mangler, og må være et heltall ≥ 1', () => {
    const grense = (verdi?: string) => {
      const { grense } = webhookFraMiljoe({
        WEBHOOK_SECRET_PATH: HEMMELIGHET,
        ...(verdi === undefined ? {} : { RATE_LIMIT_WEBHOOK: verdi }),
      });
      return Array.from({ length: 101 }, () => grense.tillat(0)).filter(Boolean).length;
    };
    expect(grense()).toBe(100);
    expect(grense('3')).toBe(3);
    for (const ugyldig of ['0', '-1', '2.5', 'mange', ''])
      expect(() => grense(ugyldig)).toThrow(/RATE_LIMIT_WEBHOOK/);
  });
});

describe('grensen for kall på webhooken (#819)', () => {
  it('slipper gjennom høyst grensen i hvert minutt, og teller på nytt i neste minutt', () => {
    const grense = kallgrense(2);
    expect([0, 1_000, 59_999].map((t) => grense.tillat(t))).toEqual([true, true, false]);
    expect([60_000, 60_001, 60_002].map((t) => grense.tillat(t))).toEqual([true, true, false]);
  });

  it('kallet fra Catenda gir event.id og event.type (catenda_issue_created_contract.md)', () => {
    expect(hendelsen(KALLET)).toEqual({ id: KALLETS_ID, type: 'issue.created' });
  });

  it.each([
    ['ikke JSON', '{', 'Kroppen er ikke gyldig JSON.'],
    ['en liste', '[]', 'Kroppen mangler event.'],
    ['uten event', '{}', 'Kroppen mangler event.'],
    ['uten event.id', '{"event":{"type":"issue.created"}}', 'event.id mangler eller er ugyldig.'],
    [
      'tom event.id',
      '{"event":{"id":"","type":"issue.created"}}',
      'event.id mangler eller er ugyldig.',
    ],
    [
      'event.id med mellomrom',
      '{"event":{"id":"a b","type":"x"}}',
      'event.id mangler eller er ugyldig.',
    ],
    [
      'event.id over 100 tegn',
      `{"event":{"id":"${'a'.repeat(101)}","type":"x"}}`,
      'event.id mangler eller er ugyldig.',
    ],
    ['uten event.type', '{"event":{"id":"a"}}', 'event.type mangler eller er ugyldig.'],
  ])('en kropp %s avvises', (_n, tekst, feil) => {
    expect(hendelsen(tekst)).toEqual({ feil });
  });
});

describe.skipIf(!SQLSERVER_TILKOBLING)('webhooken fra Catenda i SQL Server', () => {
  let base: Testbase;
  let kjoeretid: { pool: Pool; slett(): Promise<void> };
  let lukket: { pool: Pool; slett(): Promise<void> };
  const servere: { stopp(): Promise<void> }[] = [];

  async function start(pool: Pool, hemmelighet: string | null, grense = kallgrense(10_000)) {
    const server = createServer(
      lagServer({
        datalag: pool,
        catenda: {} as Catenda,
        webhook: hemmelighet === null ? null : { hemmelighet, grense },
      })
    );
    await new Promise<void>((ok) => server.listen(0, '127.0.0.1', ok));
    servere.push({ stopp: () => new Promise((ok) => server.close(() => ok())) });
    return `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  }

  let url: string;
  const send = (kropp: string | Uint8Array<ArrayBuffer>, sti = HEMMELIGHET, adresse = url) =>
    fetch(`${adresse}/webhook/catenda/${sti}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: kropp,
    });
  const rader = async (id: string) =>
    (
      await base.pool
        .request()
        .input('id', id)
        .query(
          `SELECT kilde, hendelse_id, hendelsestype, kropp, mottatt, SYSUTCDATETIME() AS naa
             FROM koe.innkommende_hendelse WHERE hendelse_id = @id`
        )
    ).recordset;

  beforeAll(async () => {
    base = await opprettMigrertTestbase('webhook', { maks: 8 });
    kjoeretid = await opprettKjoeretid(base, { maks: 8 });
    lukket = await opprettKjoeretid(base, { maks: 1 });
    await lukket.pool.close();
    url = await start(kjoeretid.pool, HEMMELIGHET);
  }, 240_000);
  afterAll(async () => {
    for (const s of servere) await s.stopp();
    await slettAlle(lukket, kjoeretid, base);
  }, 60_000);

  it('uten sesjon og med rett hemmelighet lagres kallet fra Catenda før svaret 200, med den rå kroppen (INT-02)', async () => {
    const id = nyId();
    const svar = await send(kallMed(id));
    expect(svar.status).toBe(200);
    expect(await svar.json()).toEqual({ success: true, status: 'mottatt' });
    const [rad, ...flere] = await rader(id);
    expect(flere).toEqual([]);
    expect(rad).toMatchObject({
      kilde: 'catenda',
      hendelse_id: id,
      hendelsestype: 'issue.created',
      kropp: kallMed(id),
    });
    // Tidspunktet er trimmet, ikke rundet opp, så det ligger aldri etter klokka i basen (#778 punkt 11).
    expect((rad.mottatt as Date).getTime()).toBeLessThanOrEqual((rad.naa as Date).getTime());
  });

  it('samme event.id igjen gir 200 og ingen ny rad, så Catenda slutter å prøve (INT-02)', async () => {
    const id = nyId();
    expect((await send(kallMed(id))).status).toBe(200);
    const igjen = await send(kallMed(id));
    expect(igjen.status).toBe(200);
    expect(await igjen.json()).toEqual({ success: true, status: 'allerede_mottatt' });
    expect(await rader(id)).toHaveLength(1);
  });

  it('åtte samtidige leveringer av samme event.id gir én rad og én «mottatt»', async () => {
    const id = nyId();
    const svar = await Promise.all(Array.from({ length: 8 }, () => send(kallMed(id))));
    expect(svar.map((s) => s.status)).toEqual(Array(8).fill(200));
    const status = await Promise.all(svar.map(async (s) => (await s.json()).status));
    expect(status.filter((s) => s === 'mottatt')).toHaveLength(1);
    expect(await rader(id)).toHaveLength(1);
  });

  it('over grensen gir 429 og ingen rad; kall med feil hemmelighet telles ikke (#819)', async () => {
    // Klokka står stille, så alle kallene er i samme minutt.
    const toPerMinutt = kallgrense(2);
    const adresse = await start(kjoeretid.pool, HEMMELIGHET, {
      tillat: () => toPerMinutt.tillat(0),
    });
    for (let i = 0; i < 3; i++) expect((await send('{}', 'feil', adresse)).status).toBe(404);
    const [a, b] = [nyId(), nyId()];
    expect((await send(kallMed(a), HEMMELIGHET, adresse)).status).toBe(200);
    expect((await send(kallMed(b), HEMMELIGHET, adresse)).status).toBe(200);
    const over = nyId();
    const svar = await send(kallMed(over), HEMMELIGHET, adresse);
    expect(svar.status).toBe(429);
    expect(await svar.json()).toMatchObject({ success: false, error: 'RATE_LIMITED' });
    expect(await rader(over)).toEqual([]);
    expect(await rader(a)).toHaveLength(1);
  });

  it('en feil hemmelighet gir samme 404 som en ukjent sti, og ingen rad (INT-01)', async () => {
    const id = nyId();
    const ukjent = await fetch(`${url}/webhook/ukjent`, { method: 'POST', body: '{}' });
    const forventet = { status: ukjent.status, kropp: await ukjent.json() };
    expect(forventet.status).toBe(404);
    for (const sti of [
      HEMMELIGHET.slice(0, -1),
      `${HEMMELIGHET}x`,
      'x',
      HEMMELIGHET.toUpperCase(),
    ]) {
      const svar = await send(kallMed(id), sti);
      expect({ status: svar.status, kropp: await svar.json() }).toEqual(forventet);
    }
    expect(await rader(id)).toEqual([]);
  });

  it('uten hemmeligheten i oppsettet svarer mottaket 404, også på den stien som ellers er rett', async () => {
    const id = nyId();
    const utenOppsett = await start(kjoeretid.pool, null);
    expect((await send(kallMed(id), HEMMELIGHET, utenOppsett)).status).toBe(404);
    expect(await rader(id)).toEqual([]);
  });

  it.each([
    ['over grensen', () => new Uint8Array(STOERSTE_HENDELSE + 1).fill(0x20), 413],
    ['uten event.id', () => '{"event":{"type":"issue.created"}}', 400],
    ['som ikke er UTF-8', () => new Uint8Array([0x7b, 0xff, 0x7d]), 400],
  ])('en kropp %s avvises med %#', async (_n, kropp, status) => {
    expect((await send(kropp())).status).toBe(status);
  });

  it('feiler lagringen, er svaret 500 og ikke 200, så Catenda prøver igjen, og hemmeligheten står ikke i loggen (INT-01, INT-02)', async () => {
    const id = nyId();
    const logg = [vi.spyOn(console, 'error'), vi.spyOn(console, 'warn')];
    try {
      const svar = await send(kallMed(id), HEMMELIGHET, await start(lukket.pool, HEMMELIGHET));
      expect(svar.status).toBe(500);
      const skrevet = JSON.stringify(logg.flatMap((l) => l.mock.calls));
      expect(skrevet).not.toBe('[]');
      expect(skrevet).not.toContain(HEMMELIGHET);
    } finally {
      for (const l of logg) l.mockRestore();
    }
    expect(await rader(id)).toEqual([]);
  });

  it('kjøretiden kan ikke lese eller endre innboksen, bare skrive med koe_api.motta_hendelse', async () => {
    const r = () => kjoeretid.pool.request();
    expect(await avvisning(r().query('SELECT 1 FROM koe.innkommende_hendelse'))).toBe(229);
    expect(
      await avvisning(
        r().query(
          `INSERT koe.innkommende_hendelse (kilde, hendelse_id, hendelsestype, kropp)
           VALUES (N'catenda', N'x', N'x', N'{}')`
        )
      )
    ).toBe(229);
  });

  it('en mottatt hendelse kan ikke endres eller slettes, heller ikke av eieren (51001)', async () => {
    const id = nyId();
    await send(kallMed(id));
    const r = () => base.pool.request().input('id', id);
    expect(
      await avvisning(
        r().query(`UPDATE koe.innkommende_hendelse SET kropp = N'{}' WHERE hendelse_id = @id`)
      )
    ).toBe(51001);
    expect(
      await avvisning(r().query('DELETE koe.innkommende_hendelse WHERE hendelse_id = @id'))
    ).toBe(51001);
  });

  it('samme event.id lagres én gang også forbi prosedyren, gjennom den unike indeksen (2601)', async () => {
    const id = nyId();
    await send(kallMed(id));
    expect(
      await avvisning(
        base.pool
          .request()
          .input('id', id)
          .query(
            `INSERT koe.innkommende_hendelse (kilde, hendelse_id, hendelsestype, kropp)
             VALUES (N'catenda', @id, N'issue.created', N'{}')`
          )
      )
    ).toBe(2601);
  });
});
