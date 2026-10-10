/**
 * Forløp A–E fra modellforslaget mot kjernen i minnet (#304, #273). Samme
 * bevis-saker går gjennom testbasen i `sprakprove/kjernelagring/lagring.test.ts`.
 */

import { describe, expect, it } from 'vitest';
import { minnebane } from './bane.ts';
import { avvikFraFormatet } from './formatprove.ts';
import { kjoer, MAALMODELL } from './kjoerer.ts';

describe('forløp A–E i minnet', () => {
  it.each(MAALMODELL.forlop.map((f) => [f.id, f] as const))('%s', async (_id, forloep) => {
    const bane = minnebane();
    const k = await kjoer(forloep, bane, {
      paastand: (holder, melding) => expect(holder, melding).toBe(true),
    });
    // 7.1.2: hver rad kjernen skrev, har formen i format 1.
    const skrevet = (await bane.journal()).filter((r) => k.skrevet.includes(r.event_id));
    expect(skrevet.flatMap(avvikFraFormatet)).toEqual([]);
  });
});
