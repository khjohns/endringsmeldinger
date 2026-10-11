/**
 * Registeret over inngangene i TS-serveren (sikkerhetsinvariantene i
 * AGENTS.md, #91 for kontraktsrollen). Hver inngang i `RUTER` prøves over HTTP
 * mot testbasen, så en ny inngang prøves uten at testen endres:
 * - uten sesjon: 401;
 * - en endring uten CSRF-token, eller med feil token: 403 fra autentiseringen;
 * - uten `X-Project-ID`, i et annet prosjekt, eller en sak i et annet prosjekt: 403;
 * - inngangen krever kontraktsrolle: et medlem uten kontraktsteam får 403;
 * - kontrollsaken: TE med alt i orden kommer forbi tilgangen.
 *
 * Ruteren kontrollerer tilgangen fra registeret, så en inngang som ikke står
 * der, finnes ikke: den gir 404 før noen behandler kalles.
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { RUTER, type Rute } from '../app.ts';
import {
  kall,
  lagOppsett,
  opprettKjernesak,
  rydd,
  startServer,
  TESTBASE_URL,
  type KjorendeServer,
  type Oppsett,
} from './testbase.ts';

const navn = (r: Rute) => `${r.metode} ${r.eksempel('<sak>')}`;
const kropp = (r: Rute) => (r.metode === 'GET' ? undefined : {});

describe('registeret over inngangene', () => {
  it.each(RUTER.map((r) => [navn(r), r] as const))(
    '%s har prosjektrolle og kontraktsrolle, eller en begrunnelse for at den ikke krever rolle',
    (_navn, r) => {
      expect(['viewer', 'member']).toContain(r.tilgang.prosjektrolle);
      const k = r.tilgang.kontraktsrolle;
      if (k !== 'kreves') expect(k.ikke.trim().length).toBeGreaterThan(20);
      if (r.metode !== 'GET') expect(k).toBe('kreves');
      expect(r.eksempel('x')).toMatch(r.sti);
    }
  );
});

describe.skipIf(!TESTBASE_URL)('hver inngang i registeret mot testbasen', () => {
  let o: Oppsett;
  let server: KjorendeServer;
  let sak: string;
  let annenSak: string;

  beforeAll(async () => {
    o = await lagOppsett();
    server = await startServer(o);
    sak = await opprettKjernesak(o);
    annenSak = await opprettKjernesak(o, o.annetProsjekt);
  });
  afterAll(async () => {
    await server?.stopp();
    if (o) await rydd(o);
  });

  const hver = RUTER.map((r) => [navn(r), r] as const);

  it.each(hver)('%s: uten sesjon gir 401', async (_n, r) => {
    const svar = await kall(server.url, r.eksempel(sak), {
      bruker: null,
      prosjektId: o.prosjekt.id,
      kropp: kropp(r),
    });
    expect(svar.status).toBe(401);
  });

  it.each(hver.filter(([, r]) => r.metode !== 'GET'))(
    '%s: uten eller med feil CSRF-token gir 403',
    async (_n, r) => {
      for (const csrf of [null, 'feil']) {
        const svar = await kall(server.url, r.eksempel(sak), {
          bruker: o.te,
          prosjektId: o.prosjekt.id,
          kropp: kropp(r),
          csrf,
        });
        expect(svar.status).toBe(403);
        expect(svar.kropp.error).toBe('CSRF validation failed');
      }
    }
  );

  it.each(hver)(
    '%s: uten prosjekt, i feil prosjekt eller mot en sak utenfor gir 403',
    async (_n, r) => {
      const forsok = [
        { bruker: o.te, prosjektId: null, sakId: sak },
        { bruker: o.utenfor, prosjektId: o.prosjekt.id, sakId: sak },
        { bruker: o.utenfor, prosjektId: o.annetProsjekt.id, sakId: sak },
        { bruker: o.te, prosjektId: o.prosjekt.id, sakId: annenSak },
        { bruker: o.te, prosjektId: o.annetProsjekt.id, sakId: annenSak },
      ];
      for (const { bruker, prosjektId, sakId } of forsok) {
        const svar = await kall(server.url, r.eksempel(sakId), {
          bruker,
          prosjektId,
          kropp: kropp(r),
        });
        expect(svar.status, JSON.stringify({ prosjektId, sakId })).toBe(403);
        expect(svar.kropp.error).toBe('FORBIDDEN');
      }
    }
  );

  it.each(hver)('%s: kontraktsrollen', async (_n, r) => {
    const svar = await kall(server.url, r.eksempel(sak), {
      bruker: o.utenTeam,
      prosjektId: o.prosjekt.id,
      kropp: kropp(r),
    });
    if (r.tilgang.kontraktsrolle === 'kreves') {
      expect(svar.status).toBe(403);
      expect(svar.kropp.error).toBe('CONTRACT_ROLE_REQUIRED');
    } else {
      expect(svar.status).toBe(200);
    }
  });

  it.each(hver)('%s: kontrollsaken kommer forbi tilgangen', async (_n, r) => {
    const svar = await kall(server.url, r.eksempel(sak), {
      bruker: o.te,
      prosjektId: o.prosjekt.id,
      kropp: kropp(r),
    });
    expect([200, 400]).toContain(svar.status);
    expect(svar.kropp.error ?? 'ingen').not.toMatch(/FORBIDDEN|CSRF|UNAUTHORIZED|CONTRACT/);
  });

  it('en sti som ikke står i registeret, gir 404', async () => {
    for (const [metode, sti] of [
      ['GET', `/api/kjerne/saker/${sak}/journal`],
      ['POST', `/api/kjerne/saker/${sak}`],
      ['DELETE', `/api/kjerne/saker/${sak}`],
    ]) {
      const svar = await kall(server.url, sti, {
        bruker: o.te,
        prosjektId: o.prosjekt.id,
        metode,
      });
      expect(svar.status, `${metode} ${sti}`).toBe(404);
    }
  });
});
