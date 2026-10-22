/**
 * Oppstarten og stoppen av TS-serveren (`server/start.ts`), kjørt som egen prosess.
 * Kildene er #813 punkt 4 (en skrift som mangler, stopper oppstarten før serveren
 * lytter, #809) og punkt 3 (et andre signal mens stoppen henger, avslutter
 * prosessen). Stoppdelen krever `KOE_SQLSERVER_TILKOBLING`.
 */

import { spawn, type ChildProcess } from 'node:child_process';
import { once } from 'node:events';
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, symlinkSync } from 'node:fs';
import { createRequire } from 'node:module';
import { connect } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { opprettMigrertTestbase } from './sqlserver_migrert.ts';
import { opprettKjoeretid, slettAlle, SQLSERVER_TILKOBLING, type Testbase } from './sqlserver.ts';

const ROT = fileURLToPath(new URL('../../', import.meta.url));

/**
 * Den nærmeste `node_modules` oppover fra rot, som Node søker i. I et arbeidstre er
 * den i hovedcheckouten (#1114).
 */
const PAKKEMAPPE = createRequire(join(ROT, 'package.json'))
  .resolve.paths('pdf-lib')!
  .find((mappe) => existsSync(join(mappe, 'pdf-lib')))!;

/** Miljøet uten oppsettet for databasen og Catenda, så bare det testen setter, gjelder. */
const rentMiljoe = (tillegg: Record<string, string> = {}): NodeJS.ProcessEnv => ({
  ...Object.fromEntries(
    Object.entries(process.env).filter(([k]) => !/^(CATENDA_|KOE_|AUTH_)/.test(k))
  ),
  ...tillegg,
});

interface Prosess {
  barn: ChildProcess;
  utdata: () => string;
  avsluttet: Promise<{ kode: number | null; signal: NodeJS.Signals | null }>;
}

const startet = new Set<Prosess>();

// En test som feiler eller går ut på tid, skal ikke etterlate en server som holder basen.
afterEach(async () => {
  for (const { barn } of startet)
    if (barn.exitCode === null && barn.signalCode === null) barn.kill('SIGKILL');
  await Promise.all([...startet].map((p) => p.avsluttet));
  startet.clear();
});

function start(skript: string, miljoe: NodeJS.ProcessEnv): Prosess {
  const barn = spawn(process.execPath, [skript, '0'], { env: miljoe, stdio: 'pipe' });
  let utdata = '';
  barn.stdout!.on('data', (d) => (utdata += d));
  barn.stderr!.on('data', (d) => (utdata += d));
  // `close`, ikke `exit`: da er stdout og stderr lest ut, og utdataene er hele.
  const avsluttet = once(barn, 'close').then(([kode, signal]) => ({ kode, signal }));
  const p = { barn, utdata: () => utdata, avsluttet };
  startet.add(p);
  return p;
}

/** Utfallet, eller `'kjører'` når prosessen ikke har avsluttet innen `ms`. */
async function innen<T>(utfall: Promise<T>, ms: number): Promise<T | 'kjører'> {
  let tidtaker: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      utfall,
      new Promise<'kjører'>((r) => (tidtaker = setTimeout(() => r('kjører'), ms))),
    ]);
  } finally {
    clearTimeout(tidtaker);
  }
}

/**
 * Køene for forbindelsen fra porten `fra` til `til` på 127.0.0.1, lest i
 * `/proc/net/tcp`: `sendt` er bytene som ennå ikke er kvittert av mottakeren, og
 * `uleste` bytene som ligger hos mottakeren uten at prosessen har lest dem.
 * `undefined` når forbindelsen ikke står der.
 */
function koeene(fra: number, til: number): { sendt: number; uleste: number } | undefined {
  const port = (n: number) => n.toString(16).toUpperCase().padStart(4, '0');
  for (const linje of readFileSync('/proc/net/tcp', 'utf8').split('\n').slice(1)) {
    const [, lokal, fjern, , koer] = linje.trim().split(/\s+/);
    if (lokal?.endsWith(`:${port(fra)}`) && fjern?.endsWith(`:${port(til)}`)) {
      const [tx, rx] = koer.split(':').map((h) => parseInt(h, 16));
      return { sendt: tx, uleste: rx };
    }
  }
}

describe('oppstarten når en skrift mangler (#813 punkt 4)', () => {
  let mappe: string;

  // En kopi av `server/` per test, så en skrift kan fjernes uten å røre treet eller
  // de andre testene. `kjerne/` og pakkene lenkes; `brevpdf.ts` leser skriftene ved
  // siden av seg selv i kopien.
  beforeEach(() => {
    mappe = mkdtempSync(join(tmpdir(), 'koe-start-'));
    cpSync(join(ROT, 'server'), join(mappe, 'server'), {
      recursive: true,
      filter: (kilde) => !kilde.startsWith(join(ROT, 'server', 'tester')),
    });
    cpSync(join(ROT, 'package.json'), join(mappe, 'package.json'));
    symlinkSync(join(ROT, 'kjerne'), join(mappe, 'kjerne'));
    symlinkSync(PAKKEMAPPE, join(mappe, 'node_modules'));
  });
  afterEach(() => rmSync(mappe, { recursive: true, force: true }));

  it('med skriftene på plass går oppstarten forbi kontrollen og stopper først på tilkoblingen', async () => {
    const p = start(join(mappe, 'server', 'start.ts'), rentMiljoe());
    expect((await p.avsluttet).kode).toBe(1);
    expect(p.utdata()).toContain('KOE_DATALAG_TILKOBLING er ikke satt');
    expect(p.utdata()).not.toContain('Skriftene til brev-PDF-en');
  }, 30_000);

  it('uten NotoSansMath stopper oppstarten med meldingen om skriftene, før tilkoblingen leses', async () => {
    rmSync(join(mappe, 'server', 'skrift', 'NotoSansMath-Regular.ttf'));
    const p = start(join(mappe, 'server', 'start.ts'), rentMiljoe());
    expect((await p.avsluttet).kode).toBe(1);
    expect(p.utdata()).toContain('Skriftene til brev-PDF-en kan ikke brukes');
    expect(p.utdata()).toContain('NotoSansMath-Regular.ttf');
    expect(p.utdata()).not.toContain('KOE_DATALAG_TILKOBLING');
    expect(p.utdata()).not.toContain('lytter på');
  }, 30_000);
});

describe.skipIf(!SQLSERVER_TILKOBLING)('stoppen (#813 punkt 3)', () => {
  let base: Testbase | undefined;
  let kjoeretid: Awaited<ReturnType<typeof opprettKjoeretid>> | undefined;

  beforeAll(async () => {
    base = await opprettMigrertTestbase('start');
    kjoeretid = await opprettKjoeretid(base, { maks: 1 });
  }, 240_000);
  afterAll(() => slettAlle(kjoeretid, base));

  async function startServer(
    tillegg: Record<string, string> = {},
    adresse = '127.0.0.1'
  ): Promise<Prosess & { port: number }> {
    const p = start(
      join(ROT, 'server', 'start.ts'),
      rentMiljoe({
        KOE_DATALAG_TILKOBLING: kjoeretid!.tilkobling,
        APP_ENV: 'development',
        ...tillegg,
      })
    );
    const port = await new Promise<number>((klar, feil) => {
      const se = () => {
        const treff = p
          .utdata()
          .match(new RegExp(`lytter på http://${adresse.replaceAll('.', '\\.')}:(\\d+)`));
        if (treff) klar(Number(treff[1]));
      };
      p.barn.stdout!.on('data', se);
      void p.avsluttet.then(() =>
        feil(new Error(`Serveren stoppet før den lyttet:\n${p.utdata()}`))
      );
    });
    return { ...p, port };
  }

  it('ett SIGTERM uten åpne forespørsler stopper prosessen av seg selv', async () => {
    const p = await startServer();
    p.barn.kill('SIGTERM');
    expect(await innen(p.avsluttet, 10_000)).toEqual({ kode: 0, signal: null });
  }, 30_000);

  it('med KOE_LYTTEADRESSE=0.0.0.0 lytter serveren på alle grensesnitt, svarer 401 uten sesjon og stopper på SIGTERM', async () => {
    const p = await startServer({ KOE_LYTTEADRESSE: '0.0.0.0' }, '0.0.0.0');
    const svar = await fetch(`http://127.0.0.1:${p.port}/api/auth/session`);
    expect(svar.status).toBe(401);
    p.barn.kill('SIGTERM');
    expect(await innen(p.avsluttet, 10_000)).toEqual({ kode: 0, signal: null });
  }, 30_000);

  it('et andre SIGTERM mens stoppen venter på en forespørsel, avslutter med 128 + 15 og logger det', async () => {
    const p = await startServer();
    // En forespørsel som aldri blir ferdig, holder `server.close` åpen.
    const forbindelse = connect(p.port, '127.0.0.1');
    forbindelse.on('error', () => {});
    await once(forbindelse, 'connect');
    await new Promise<void>((skrevet) =>
      forbindelse.write('GET /api/csrf-token HTTP/1.1\r\nHost: localhost\r\n', () => skrevet())
    );
    // Serveren må ha lest de første linjene før signalet; ellers er forbindelsen tom og
    // lukkes av `server.close`. De er lest når mottakeren har kvittert for dem og
    // ingen ligger ulest hos serveren.
    const fra = forbindelse.localPort!;
    for (;;) {
      const [klient, server] = [koeene(fra, p.port), koeene(p.port, fra)];
      if (klient?.sendt === 0 && server?.uleste === 0) break;
      await new Promise((r) => setTimeout(r, 5));
    }
    try {
      p.barn.kill('SIGTERM');
      expect(await innen(p.avsluttet, 1_000)).toBe('kjører');

      p.barn.kill('SIGTERM');
      expect(await innen(p.avsluttet, 10_000)).toEqual({ kode: 143, signal: null });
      expect(p.utdata()).toContain(
        'SIGTERM mens stoppen pågår: avslutter uten å vente på serveren og jobbene'
      );
    } finally {
      forbindelse.destroy();
    }
  }, 30_000);
});
