/**
 * Forløp A–E fra modellforslaget mot målmodellen i minnet (#304). Samme
 * bevis-saker går gjennom testbasen i `lagring.test.ts`.
 */

import { describe, expect, it } from 'vitest';
import { minnebane } from './bane.ts';
import { kjoer, MAALMODELL } from './kjoerer.ts';

describe('forløp A–E i minnet', () => {
  it.each(MAALMODELL.forlop.map((f) => [f.id, f] as const))('%s', async (_id, forloep) => {
    await kjoer(forloep, minnebane(), {
      paastand: (holder, melding) => expect(holder, melding).toBe(true),
    });
  });
});
