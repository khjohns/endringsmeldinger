/**
 * Ruteren foran TS-serveren og Flask (#376, B18-01): `nginx.conf` kjøres i
 * nginx-bildet fra `Dockerfile`, med de samme miljøvariablene som bildet får.
 * Krever Docker; sesjonsdelen krever i tillegg `KOE_SQLSERVER_TILKOBLING`.
 *
 * Containeren bruker vertens nettverk, så den når serverne i testprosessen på
 * 127.0.0.1. Bare lytteporten i malen byttes, så testene ikke krever port 8080.
 */

import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createServer, request, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { tilTsServeren } from '../ruting.ts';
import {
  kall,
  lagOppsett,
  rydd,
  startServer,
  TESTBASE_URL,
  type KjorendeServer,
  type Oppsett,
} from './testbase.ts';

const ROT = new URL('../../', import.meta.url);
const DOCKER = spawnSync('docker', ['info'], { stdio: 'ignore' }).status === 0;
const BILDE = /^FROM (nginx:\S+)$/m.exec(readFileSync(new URL('Dockerfile', ROT), 'utf8'))![1];

interface Ruter {
  url: string;
  logg(): string;
  stopp(): void;
}

function ledigPort(): Promise<number> {
  const server = createServer();
  return new Promise((ok) =>
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address() as AddressInfo;
      server.close(() => ok(port));
    })
  );
}

async function startRuter(tsServeren: string, flask: string): Promise<Ruter> {
  const port = await ledigPort();
  const mal = readFileSync(new URL('nginx.conf', ROT), 'utf8');
  expect(mal).toContain('listen 8080;');
  const mappe = mkdtempSync(join(tmpdir(), 'koe-ruter-'));
  writeFileSync(
    join(mappe, 'default.conf.template'),
    mal.replace('listen 8080;', `listen ${port};`)
  );
  const navn = `koe-ruter-${port}`;
  const start = spawnSync(
    'docker',
    [
      'run',
      '-d',
      '--rm',
      '--name',
      navn,
      '--network',
      'host',
      '-v',
      `${mappe}:/etc/nginx/templates:ro`,
      '-e',
      `KOE_TS_SERVEREN=${tsServeren}`,
      '-e',
      `KOE_FLASK=${flask}`,
      BILDE,
    ],
    { encoding: 'utf8' }
  );
  if (start.status !== 0) throw new Error(`nginx startet ikke: ${start.stderr}`);
  const url = `http://127.0.0.1:${port}`;
  const logg = () => {
    const ut = spawnSync('docker', ['logs', navn], { encoding: 'utf8' });
    if (ut.status !== 0) throw new Error(`docker logs feilet: ${ut.stderr}`);
    return ut.stdout + ut.stderr;
  };
  const stopp = () => {
    spawnSync('docker', ['rm', '-f', navn], { stdio: 'ignore' });
    rmSync(mappe, { recursive: true, force: true });
  };
  for (let forsoek = 0; forsoek < 100; forsoek++) {
    const svar = await fetch(`${url}/health`).catch(() => null);
    if (svar?.ok) return { url, logg, stopp };
    await new Promise((ok) => setTimeout(ok, 100));
  }
  const utdata = logg();
  stopp();
  throw new Error(`nginx svarte ikke:\n${utdata}`);
}

/** En tjener som svarer med navnet sitt, stien og det den fikk av kapsel, adresseheadere og kropp. */
async function stedfortreder(navn: string): Promise<{ server: Server; adresse: string }> {
  const server = createServer((foresporsel, svar) => {
    let lengde = 0;
    foresporsel.on('data', (del: Buffer) => (lengde += del.length));
    foresporsel.on('end', () => {
      svar.setHeader('Content-Type', 'application/json');
      svar.end(
        JSON.stringify({
          tjener: navn,
          sti: foresporsel.url,
          kapsel: foresporsel.headers.cookie ?? null,
          videresendtFor: foresporsel.headers['x-forwarded-for'] ?? null,
          ekteIp: foresporsel.headers['x-real-ip'] ?? null,
          lengde,
        })
      );
    });
  });
  await new Promise<void>((ok) => server.listen(0, '127.0.0.1', ok));
  return { server, adresse: `127.0.0.1:${(server.address() as AddressInfo).port}` };
}

/** Stiene i `tilTsServeren`, med naboene som skal til Flask. */
const STIER: [string, string][] = [
  ['GET', '/api/kjerne/saker/s1'],
  ['POST', '/api/kjerne/saker'],
  ['POST', '/api/kjerne/saker/s1/kommandoer'],
  ['GET', '/api/kjerne/saker/s1/vedlegg/v1.pdf'],
  ['GET', '/api/kjernen'],
  ['GET', '/api/auth/session'],
  ['POST', '/api/auth/logout'],
  ['GET', '/api/auth/catenda/callback?code=k&state=s'],
  ['GET', '/api/csrf-token'],
  ['GET', '/api/csrf-token/x'],
  ['GET', '/api/projects'],
  ['GET', '/api/projects/'],
  ['GET', '/api/projects?aktive=1'],
  ['POST', '/api/projects'],
  ['GET', '/api/projects/p1'],
  ['PUT', '/api/projects/p1'],
  ['DELETE', '/api/projects/p1'],
  ['HEAD', '/api/projects/p1'],
  ['GET', '/api/projects/p1/members'],
  ['POST', '/api/projects/p1/members/sync'],
  ['DELETE', '/api/projects/p1/members/m1'],
  ['GET', '/api/projects/p1/membership'],
  ['GET', '/api/projects/p1/saker'],
  ['GET', '/api/projects/p1/saker/s1'],
  ['GET', '/api/saker/s1'],
  ['GET', '/api/health'],
  ['GET', '/api/logo.png'],
  ['POST', '/webhook/catenda/hemmelig'],
  ['POST', '/webhook/catenda'],
];

describe.skipIf(!DOCKER)('ruteren foran TS-serveren og Flask (#376)', () => {
  let ts: Awaited<ReturnType<typeof stedfortreder>>;
  let flask: Awaited<ReturnType<typeof stedfortreder>>;
  let ruter: Ruter;

  beforeAll(async () => {
    ts = await stedfortreder('ts');
    flask = await stedfortreder('flask');
    ruter = await startRuter(ts.adresse, flask.adresse);
  }, 120_000);

  afterAll(() => {
    ruter?.stopp();
    ts?.server.close();
    flask?.server.close();
  });

  it.each(STIER)(
    '%s %s går dit tilTsServeren sier, med uendret sti og kapsel',
    async (metode, sti) => {
      const svar = await fetch(`${ruter.url}${sti}`, {
        method: metode,
        headers: { Cookie: '__Host-koe_session=abc' },
      });
      expect(svar.headers.get('content-type')).toBe('application/json');
      if (metode === 'HEAD') return;
      expect(await svar.json()).toMatchObject({
        tjener: tilTsServeren(metode, sti) ? 'ts' : 'flask',
        sti,
        kapsel: '__Host-koe_session=abc',
      });
    }
  );

  it('et vedlegg på 15 MB slipper gjennom til TS-serveren (STOERSTE_VEDLEGG)', async () => {
    const kropp = new Uint8Array(15 * 1024 * 1024);
    const svar = await fetch(`${ruter.url}/api/kjerne/saker/s1/vedlegg`, {
      method: 'POST',
      body: kropp,
    });
    expect(await svar.json()).toMatchObject({ tjener: 'ts', lengde: kropp.length });
  });

  it.each([
    ['/api/kjerne/saker/s1', 'ts'],
    ['/api/saker/s1', 'flask'],
    ['/webhook/catenda/x', 'ts'],
  ])(
    'klientens X-Forwarded-For og X-Real-IP overskrives med adressen nginx ser (%s)',
    async (sti, tjener) => {
      const svar = await fetch(`${ruter.url}${sti}`, {
        headers: { 'X-Forwarded-For': '10.9.8.7', 'X-Real-IP': '10.9.8.7' },
      });
      expect(await svar.json()).toMatchObject({
        tjener,
        videresendtFor: '127.0.0.1',
        ekteIp: '127.0.0.1',
      });
    }
  );

  /** Statusen nginx gir et kall som melder en kropp på 17 MB, før kroppen sendes. */
  function forStorKropp(sti: string): Promise<number> {
    return new Promise((ok, feil) => {
      const kall = request(`${ruter.url}${sti}`, {
        method: 'POST',
        headers: { 'Content-Length': 17 * 1024 * 1024, Expect: '100-continue' },
      });
      kall.on('response', (svar) => {
        ok(svar.statusCode!);
        kall.destroy();
      });
      kall.on('error', feil);
      kall.flushHeaders();
    });
  }

  it('en webhook over 16 MB får 413, og hemmeligheten i stien står ikke i loggen (INT-01)', async () => {
    expect(await forStorKropp('/api/kjerne/saker/s1/kontroll-413')).toBe(413);
    expect(await forStorKropp('/webhook/catenda/hemmelig-sti-413')).toBe(413);
    for (let forsoek = 0; forsoek < 50 && !ruter.logg().includes('kontroll-413'); forsoek++) {
      await new Promise((ok) => setTimeout(ok, 100));
    }
    const logg = ruter.logg();
    expect(logg).toContain('kontroll-413');
    expect(logg).not.toContain('hemmelig-sti-413');
  });

  it('andre stier enn /api og webhooken får SPA-en, ikke en av serverne', async () => {
    const svar = await fetch(`${ruter.url}/webhook/catendaen`);
    expect(svar.headers.get('content-type')).not.toBe('application/json');
  });
});

describe.skipIf(!DOCKER || !TESTBASE_URL)('sesjonskapselen gjennom ruteren (#376)', () => {
  let o: Oppsett;
  let server: KjorendeServer;
  let flask: Awaited<ReturnType<typeof stedfortreder>>;
  let ruter: Ruter;

  beforeAll(async () => {
    o = await lagOppsett();
    server = await startServer(o);
    flask = await stedfortreder('flask');
    ruter = await startRuter(new URL(server.url).host, flask.adresse);
  }, 120_000);

  afterAll(async () => {
    ruter?.stopp();
    flask?.server.close();
    await server?.stopp();
    if (o) await rydd(o);
  });

  it('TS-serveren godtar __Host-koe_session gjennom ruteren, og uten den er det 401', async () => {
    const innlogget = await kall(ruter.url, '/api/auth/session', {
      bruker: o.te,
      prosjektId: null,
    });
    expect(innlogget).toMatchObject({ status: 200, kropp: { csrfToken: o.te.csrf } });
    const uten = await kall(ruter.url, '/api/auth/session', { bruker: null, prosjektId: null });
    expect(uten.status).toBe(401);
  });

  it('prosjekttilgangen håndheves bak ruteren', async () => {
    const sti = `/api/projects/${o.prosjekt.id}/saker`;
    expect((await kall(ruter.url, sti, { bruker: o.te, prosjektId: o.prosjekt.id })).status).toBe(
      200
    );
    expect(
      (await kall(ruter.url, sti, { bruker: o.utenfor, prosjektId: o.prosjekt.id })).status
    ).toBe(403);
  });

  it('utloggingen krever CSRF-token bak ruteren og sletter kapselen for verten', async () => {
    const uten = await kall(ruter.url, '/api/auth/logout', {
      bruker: o.te,
      prosjektId: null,
      kropp: {},
      csrf: null,
    });
    expect(uten.status).toBe(403);

    const svar = await fetch(`${ruter.url}/api/auth/logout`, {
      method: 'POST',
      headers: {
        Cookie: `__Host-koe_session=${o.te.token}`,
        'X-CSRF-Token': o.te.csrf,
        'Content-Type': 'application/json',
      },
      body: '{}',
    });
    expect(svar.status).toBe(200);
    const kapsel = svar.headers.get('set-cookie')!;
    expect(kapsel).toMatch(/^__Host-koe_session=;/);
    expect(kapsel).toContain('; Secure');
    expect(kapsel).toContain('; Path=/');
    expect(kapsel).not.toMatch(/domain=/i);
    expect(
      (await kall(ruter.url, '/api/auth/session', { bruker: o.te, prosjektId: null })).status
    ).toBe(401);
  });
});
