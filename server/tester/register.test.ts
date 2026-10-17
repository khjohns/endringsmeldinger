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
 * En inngang til prosjektet selv, uten sak, prøves uten sesjon, uten
 * `X-Project-ID`, med et annet prosjekt i hodet enn i stien og i et prosjekt
 * brukeren ikke er med i.
 *
 * Inngangen som oppretter en sak, har ingen sak i stien. Den prøves som en
 * saksinngang, med en sak i et annet prosjekt i kroppen i stedet for i stien.
 *
 * En inngang uten prosjekt, uten sak eller uten sesjon står i en lukket liste her, med
 * begrunnelsen i registeret, som `OFFENTLIGE_RUTER` og `UTEN_PROSJEKT` i
 * `backend/tests/test_security/test_public_route_registry.py`. En ny slik
 * inngang gir rød test til den står i listen. En inngang uten prosjekt prøves
 * uten sesjon og uten og med feil CSRF-token.
 *
 * Ruteren kontrollerer tilgangen fra registeret, så en inngang som ikke står
 * der, finnes ikke: den gir 404 før noen behandler kalles.
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  erAapen,
  erOpprettelse,
  erSaksrute,
  erUtenProsjekt,
  erUtenSak,
  RUTER,
  type Rute,
} from '../app.ts';
import { opprettSesjon } from '../sesjon.ts';
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

const navn = (r: Rute) => `${r.metode} ${r.eksempel(erUtenSak(r) ? '<prosjekt>' : '<sak>')}`;
const kropp = (r: Rute) => (r.metode === 'GET' ? undefined : {});

const UTEN_SESJON = ['GET /api/auth/catenda/login', 'GET /api/auth/catenda/callback'];
const UTEN_PROSJEKT = [
  'GET /api/auth/session',
  'POST /api/auth/logout',
  'GET /api/csrf-token',
  'GET /api/projects',
];
const UTEN_SAK = ['GET /api/projects/<prosjekt>'];
const NY_SAK = ['POST /api/kjerne/saker'];

describe('registeret over inngangene', () => {
  it('inngangene uten sesjon, uten prosjekt og uten sak er de i de lukkede listene', () => {
    expect(RUTER.filter(erAapen).map(navn)).toEqual(UTEN_SESJON);
    expect(RUTER.filter(erUtenProsjekt).map(navn)).toEqual(UTEN_PROSJEKT);
    expect(RUTER.filter(erUtenSak).map(navn)).toEqual(UTEN_SAK);
    expect(RUTER.filter(erOpprettelse).map(navn)).toEqual(NY_SAK);
  });

  it.each(RUTER.filter((r) => !erSaksrute(r)).map((r) => [navn(r), r] as const))(
    '%s har en skriftlig begrunnelse for å stå uten sak, prosjekt eller sesjon',
    (_navn, r) => {
      const begrunnelse = erAapen(r)
        ? r.tilgang.utenSesjon
        : erUtenProsjekt(r)
          ? r.tilgang.utenProsjekt
          : erUtenSak(r)
            ? r.tilgang.utenSak
            : erOpprettelse(r)
              ? r.tilgang.nySak
              : '';
      expect(begrunnelse.trim().length).toBeGreaterThan(20);
      expect(r.eksempel('x')).toMatch(r.sti);
    }
  );

  it.each(RUTER.filter(erSaksrute).map((r) => [navn(r), r] as const))(
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

describe.skipIf(!TESTBASE_URL)('hver inngang i registeret mot testbasene', () => {
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

  const hver = RUTER.filter(erSaksrute).map((r) => [navn(r), r] as const);
  const utenProsjekt = RUTER.filter(erUtenProsjekt).map((r) => [navn(r), r] as const);

  it.each(utenProsjekt)('%s: uten sesjon gir 401', async (_n, r) => {
    const svar = await kall(server.url, r.eksempel(''), {
      bruker: null,
      prosjektId: null,
      kropp: kropp(r),
    });
    expect(svar.status).toBe(401);
    expect(svar.kropp.error).toBe('UNAUTHORIZED');
  });

  it.each(utenProsjekt.filter(([, r]) => r.metode !== 'GET'))(
    '%s: uten eller med feil CSRF-token gir 403',
    async (_n, r) => {
      for (const csrf of [null, 'feil']) {
        const svar = await kall(server.url, r.eksempel(''), {
          bruker: o.te,
          prosjektId: null,
          kropp: kropp(r),
          csrf,
        });
        expect(svar.status).toBe(403);
        expect(svar.kropp.error).toBe('CSRF validation failed');
      }
    }
  );

  // En egen sesjon, så utloggingen ikke tar sesjonen de andre testene bruker.
  it.each(utenProsjekt)('%s: kontrollsaken uten prosjekt gir 200', async (_n, r) => {
    const ny = await opprettSesjon(o.datalag.kjoeretid.pool, o.te.id);
    const svar = await kall(server.url, r.eksempel(''), {
      bruker: { ...o.te, token: ny.token, csrf: ny.csrfToken },
      prosjektId: null,
      kropp: kropp(r),
    });
    expect(svar.status).toBe(200);
  });

  const utenSak = RUTER.filter(erUtenSak).map((r) => [navn(r), r] as const);

  it.each(utenSak)('%s: uten sesjon gir 401', async (_n, r) => {
    const svar = await kall(server.url, r.eksempel(o.prosjekt.id), {
      bruker: null,
      prosjektId: o.prosjekt.id,
    });
    expect(svar.status).toBe(401);
    expect(svar.kropp.error).toBe('UNAUTHORIZED');
  });

  it.each(utenSak)(
    '%s: uten prosjekt, med et annet prosjekt i hodet enn i stien eller i feil prosjekt gir 403',
    async (_n, r) => {
      const forsok = [
        { bruker: o.te, prosjektId: null, iStien: o.prosjekt.id },
        { bruker: o.te, prosjektId: o.annetProsjekt.id, iStien: o.prosjekt.id },
        { bruker: o.te, prosjektId: o.prosjekt.id, iStien: o.annetProsjekt.id },
        { bruker: o.te, prosjektId: o.annetProsjekt.id, iStien: o.annetProsjekt.id },
        { bruker: o.utenfor, prosjektId: o.prosjekt.id, iStien: o.prosjekt.id },
      ];
      for (const { bruker, prosjektId, iStien } of forsok) {
        const svar = await kall(server.url, r.eksempel(iStien), { bruker, prosjektId });
        expect(svar.status, JSON.stringify({ prosjektId, iStien })).toBe(403);
        expect(svar.kropp.error).toBe('FORBIDDEN');
      }
    }
  );

  it.each(utenSak)('%s: kontrollsaken i eget prosjekt gir 200', async (_n, r) => {
    for (const bruker of [o.te, o.utenTeam]) {
      const svar = await kall(server.url, r.eksempel(o.prosjekt.id), {
        bruker,
        prosjektId: o.prosjekt.id,
      });
      expect(svar.status).toBe(200);
    }
  });

  it.each(RUTER.filter(erAapen).map((r) => [navn(r), r] as const))(
    '%s: uten sesjon kommer forbi tilgangen',
    async (_n, r) => {
      const svar = await kall(server.url, r.eksempel(''), { bruker: null, prosjektId: null });
      expect(svar.status).not.toBe(401);
      expect(svar.status).not.toBe(403);
    }
  );

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

  const nySak = RUTER.filter(erOpprettelse).map((r) => [navn(r), r] as const);

  it.each(nySak)('%s: krever kontraktsrolle og medlemskap', (_n, r) => {
    expect(r.tilgang).toMatchObject({ prosjektrolle: 'member', kontraktsrolle: 'kreves' });
  });

  it.each(nySak)('%s: uten sesjon gir 401', async (_n, r) => {
    const svar = await kall(server.url, r.eksempel(''), {
      bruker: null,
      prosjektId: o.prosjekt.id,
      kropp: {},
    });
    expect(svar.status).toBe(401);
    expect(svar.kropp.error).toBe('UNAUTHORIZED');
  });

  it.each(nySak)('%s: uten eller med feil CSRF-token gir 403', async (_n, r) => {
    for (const csrf of [null, 'feil']) {
      const svar = await kall(server.url, r.eksempel(''), {
        bruker: o.te,
        prosjektId: o.prosjekt.id,
        kropp: {},
        csrf,
      });
      expect(svar.status).toBe(403);
      expect(svar.kropp.error).toBe('CSRF validation failed');
    }
  });

  it.each(nySak)(
    '%s: uten prosjekt, i feil prosjekt eller med en sak utenfor i kroppen gir 403',
    async (_n, r) => {
      const forsok = [
        { bruker: o.te, prosjektId: null, kropp: {} },
        { bruker: o.utenfor, prosjektId: o.prosjekt.id, kropp: {} },
        { bruker: o.te, prosjektId: o.annetProsjekt.id, kropp: {} },
        { bruker: o.te, prosjektId: o.prosjekt.id, kropp: { sak_id: annenSak } },
        { bruker: o.te, prosjektId: o.prosjekt.id, kropp: { prosjekt_id: o.annetProsjekt.id } },
      ];
      for (const { bruker, prosjektId, kropp } of forsok) {
        const svar = await kall(server.url, r.eksempel(''), { bruker, prosjektId, kropp });
        expect(svar.status, JSON.stringify({ prosjektId, kropp })).toBe(403);
        expect(svar.kropp.error).toBe('FORBIDDEN');
      }
    }
  );

  it.each(nySak)('%s: et medlem uten kontraktsteam gir 403', async (_n, r) => {
    const svar = await kall(server.url, r.eksempel(''), {
      bruker: o.utenTeam,
      prosjektId: o.prosjekt.id,
      kropp: {},
    });
    expect(svar.status).toBe(403);
    expect(svar.kropp.error).toBe('CONTRACT_ROLE_REQUIRED');
  });

  it.each(nySak)('%s: kontrollsaken kommer forbi tilgangen', async (_n, r) => {
    const svar = await kall(server.url, r.eksempel(''), {
      bruker: o.te,
      prosjektId: o.prosjekt.id,
      kropp: {},
    });
    expect(svar.status).toBe(400);
    expect(svar.kropp.error).toBe('UGYLDIG_FORESPOERSEL');
  });

  it('lesingen av saken gir leserens side i part, og null uten kontraktsteam (#705)', async () => {
    for (const [bruker, part] of [
      [o.te, 'TE'],
      [o.bh, 'BH'],
      [o.utenTeam, null],
    ] as const) {
      const svar = await kall(server.url, `/api/kjerne/saker/${sak}`, {
        bruker,
        prosjektId: o.prosjekt.id,
      });
      expect(svar.status).toBe(200);
      expect(svar.kropp.part).toBe(part);
    }
  });

  it('en sak TS-kjernen ikke har skrevet, gir 404 (#705)', async () => {
    const pythonsak = await opprettKjernesak(o, o.prosjekt, null);
    const svar = await kall(server.url, `/api/kjerne/saker/${pythonsak}`, {
      bruker: o.te,
      prosjektId: o.prosjekt.id,
    });
    expect(svar.status).toBe(404);
    expect(svar.kropp.error).toBe('SAK_FINNES_IKKE');
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

  it('en sti new URL ikke kan lese, gir 404 og tar ikke ned serveren (#754)', async () => {
    const svar = await fetch(`${server.url}//`);
    expect(svar.status).toBe(404);
    expect(((await svar.json()) as { error: string }).error).toBe('NOT_FOUND');
    // Kontrollsak: serveren svarer fortsatt.
    expect((await fetch(`${server.url}/api/ukjent`)).status).toBe(404);
  });
});
