/**
 * Brukerforløpene mot testbasen i SQL Server (#1330): hvert steg lagres i `koe.hendelse`
 * med testskriveren i `bane.ts`, og journalen leses med serverens `lesJournal` før
 * hver kontroll, som bevis-sakene i `lagring.test.ts`. Krever `KOE_SQLSERVER_TILKOBLING`.
 */

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { avvikFraFormatet, utenAvsnitt } from '../../kjerne/tester/formatprove.ts';
import { kjoerBrukerforloep, kjoerbare, START } from '../../kjerne/tester/brukerforloep.ts';
import { lagOppsett, rydd, type Oppsett } from '../../server/tester/testbase.ts';
import { basebane, GRENSER, TESTBASE_URL } from './bane.ts';

vi.setConfig(GRENSER);

describe.skipIf(!TESTBASE_URL)('brukerforløpene gjennom testbasen', () => {
  let o: Oppsett;
  beforeAll(async () => {
    o = await lagOppsett();
  });
  afterAll(async () => {
    if (o) await rydd(o);
  });

  it.each(kjoerbare().map((b) => [b.id, b] as const))('%s', async (_id, b) => {
    const { k, bane } = await kjoerBrukerforloep(b, {
      // Saken opprettes når klokka i forløpet starter, som i minnet og i startjournalene.
      bane: await basebane(o, START),
      paastand: (holder, melding) => expect(holder, melding).toBe(true),
    });
    const skrevet = (await bane.journal()).filter((r) => k.skrevet.includes(r.event_id));
    expect(skrevet.length).toBe(b.steg!.length);
    expect(skrevet.flatMap(avvikFraFormatet)).toEqual([]);
    expect(skrevet.flatMap(utenAvsnitt)).toEqual([]);
  });
});
