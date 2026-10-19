/**
 * Oppstarten og stoppen av TS-serveren (`server/start.ts`), kjørt som egen prosess.
 * Kildene er #813 punkt 4 (en skrift som mangler, stopper oppstarten før serveren
 * lytter, #809) og punkt 3 (et andre signal mens stoppen henger, avslutter
 * prosessen). Stoppdelen krever `KOE_SQLSERVER_TILKOBLING`.
 */

import { spawn, type ChildProcess } from 'node:child_process';
import { once } from 'node:events';
import { cpSync, mkdtempSync, rmSync, symlinkSync } from 'node:fs';
import { connect } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { opprettMigrertTestbase } from './sqlserver_migrert.ts';
import {
  opprettKjoeretid,
  slettAlle,
  sql,
  SQLSERVER_TILKOBLING,
  type Testbase,
} from './sqlserver.ts';

const ROT = fileURLToPath(new URL('../../', import.meta.url));

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

function start(skript: string, miljoe: NodeJS.ProcessEnv): Prosess {
  const barn = spawn(process.execPath, [skript, '0'], { env: miljoe, stdio: 'pipe' });
  let utdata = '';
  barn.stdout!.on('data', (d) => (utdata += d));
  barn.stderr!.on('data', (d) => (utdata += d));
  const avsluttet = once(barn, 'exit').then(([kode, signal]) => ({ kode, signal }));
  return { barn, utdata: () => utdata, avsluttet };
}

/** Utfallet, eller `'kjører'` når prosessen ikke har avsluttet innen `ms`. */
const innen = <T>(utfall: Promise<T>, ms: number) =>
  Promise.race([utfall, new Promise<'kjører'>((r) => setTimeout(() => r('kjører'), ms))]);

describe('oppstarten når en skrift mangler (#813 punkt 4)', () => {
  let mappe: string;

  // En kopi av `server/`, så en skrift kan fjernes uten å røre treet. `kjerne/` og
  // pakkene lenkes; `brevpdf.ts` leser skriftene ved siden av seg selv i kopien.
  beforeAll(() => {
    mappe = mkdtempSync(join(tmpdir(), 'koe-start-'));
    cpSync(join(ROT, 'server'), join(mappe, 'server'), {
      recursive: true,
      filter: (kilde) => !kilde.startsWith(join(ROT, 'server', 'tester')),
    });
    cpSync(join(ROT, 'package.json'), join(mappe, 'package.json'));
    for (const navn of ['kjerne', 'node_modules']) symlinkSync(join(ROT, navn), join(mappe, navn));
  });
  afterAll(() => rmSync(mappe, { recursive: true, force: true }));

  it('med skriftene på plass går oppstarten forbi kontrollen og stopper først på tilkoblingen', async () => {
    const p = start(join(mappe, 'server', 'start.ts'), rentMiljoe());
    expect((await p.avsluttet).kode).toBe(1);
    expect(p.utdata()).toContain('KOE_DATALAG_TILKOBLING er ikke satt');
    expect(p.utdata()).not.toContain('Skriftene til brev-PDF-en');
  });

  it('uten NotoSansMath stopper oppstarten med meldingen om skriftene, før tilkoblingen leses', async () => {
    rmSync(join(mappe, 'server', 'skrift', 'NotoSansMath-Regular.ttf'));
    const p = start(join(mappe, 'server', 'start.ts'), rentMiljoe());
    expect((await p.avsluttet).kode).toBe(1);
    expect(p.utdata()).toContain('Skriftene til brev-PDF-en kan ikke brukes');
    expect(p.utdata()).toContain('NotoSansMath-Regular.ttf');
    expect(p.utdata()).not.toContain('KOE_DATALAG_TILKOBLING');
    expect(p.utdata()).not.toContain('lytter på');
  });
});

describe.skipIf(!SQLSERVER_TILKOBLING)('stoppen (#813 punkt 3)', () => {
  let base: Testbase | undefined;
  let kjoeretid: Awaited<ReturnType<typeof opprettKjoeretid>> | undefined;
  let tilkobling: string;

  beforeAll(async () => {
    base = await opprettMigrertTestbase('start');
    kjoeretid = await opprettKjoeretid(base, { maks: 1 });
    // Kjøretidens innlogging for barneprosessen. `mssql` har `config`, men typene mangler den.
    const c = (kjoeretid.pool as unknown as { config: sql.config }).config;
    tilkobling = [
      `Server=${c.server},${c.port}`,
      `Database=${c.database}`,
      `User Id=${c.user}`,
      `Password=${c.password}`,
      `Encrypt=${c.options?.encrypt ?? true}`,
      `TrustServerCertificate=${c.options?.trustServerCertificate ?? false}`,
    ].join(';');
  }, 240_000);
  afterAll(() => slettAlle(kjoeretid, base));

  async function startServer(): Promise<Prosess & { port: number }> {
    const p = start(
      join(ROT, 'server', 'start.ts'),
      rentMiljoe({ KOE_DATALAG_TILKOBLING: tilkobling, APP_ENV: 'development' })
    );
    const port = await new Promise<number>((klar, feil) => {
      const se = () => {
        const treff = p.utdata().match(/lytter på http:\/\/127\.0\.0\.1:(\d+)/);
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

  it('et andre SIGTERM mens stoppen venter på en forespørsel, avslutter med 128 + 15 og logger det', async () => {
    const p = await startServer();
    // En forespørsel som aldri blir ferdig, holder `server.close` åpen.
    const forbindelse = connect(p.port, '127.0.0.1');
    await once(forbindelse, 'connect');
    await new Promise<void>((skrevet) =>
      forbindelse.write('GET /api/csrf-token HTTP/1.1\r\nHost: localhost\r\n', () => skrevet())
    );
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
      if (p.barn.exitCode === null) p.barn.kill('SIGKILL');
    }
  }, 30_000);
});
