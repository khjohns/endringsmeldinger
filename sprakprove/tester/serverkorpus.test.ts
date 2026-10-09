/**
 * Bevis-sakene i flyten gjennom TS-serveren og testbasen (#274, P2-1 og P2-2):
 * samme forløp og forventninger som `korpus.test.ts`, nå med tilgang, lagring
 * og gjenlesing, gjennom `/api/events` og `/api/events/batch`. Forventningene
 * er radene i domenetabellen. Krever `KOE_TESTBASE_URL`, som databasetestene i Python.
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { FLYTEN, kjor } from './korpus.ts';
import { serverbane } from './serverbane.ts';
import {
  lagOppsett,
  rydd,
  startServer,
  TESTBASE_URL,
  type KjorendeServer,
  type Oppsett,
} from './testbase.ts';

describe.skipIf(!TESTBASE_URL)('bevis-sakene i flyten gjennom TS-serveren', () => {
  let o: Oppsett;
  let server: KjorendeServer;

  beforeAll(async () => {
    o = await lagOppsett();
    server = await startServer(o.teammedlemmer);
  });

  afterAll(async () => {
    await server?.stopp();
    if (o) await rydd(o);
  });

  for (const batch of [false, true]) {
    it.each(FLYTEN.map((f) => [f.id, f] as const))(
      `%s (${batch ? 'batch' : 'events'})`,
      async (_id, forlop) => {
        const bane = await serverbane(server, o, { batch });
        await kjor(forlop, bane, {
          pastand: (holder, melding) => expect(holder, melding).toBe(true),
        });
      }
    );
  }
});
