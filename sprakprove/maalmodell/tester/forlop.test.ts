/**
 * Forløp A–E fra modellforslaget mot målmodellen i minnet (#304). Samme
 * bevis-saker går gjennom testbasen i `lagring.test.ts`.
 */

import { describe, expect, it } from 'vitest';
import { minnebane } from './bane.ts';
import { kjor, MAALMODELL } from './kjorer.ts';

describe('forløp A–E i minnet', () => {
  it.each(MAALMODELL.forlop.map((f) => [f.id, f] as const))('%s', async (_id, forlop) => {
    await kjor(forlop, minnebane(), {
      pastand: (holder, melding) => expect(holder, melding).toBe(true),
    });
  });
});
