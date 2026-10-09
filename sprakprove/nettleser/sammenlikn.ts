/**
 * P2-1 i #274: samme TS-modul gir samme tilstand i Chromium og i Node-serveren.
 *
 *   KOE_TESTBASE_URL=… node sprakprove/nettleser/sammenlikn.ts
 *
 * 1. Bygger `inngang.ts` med Vite og kjører bevis-sakene i flyten i Chromium,
 *    med kjernen i minnet.
 * 2. Kjører de samme forløpene gjennom TS-serveren mot testbasen
 *    (`serverbane`), med tilstanden lest fra serveren.
 * 3. Holder utfallet og tilstanden etter hvert steg mot hverandre, uten
 *    kjøringenes egne ID-er.
 *
 * Forventet: «30 forløp, N steg, 0 avvik» og kode 0. Avvik skrives ut, og
 * koden er 1. Nettleseren er den globale playwright-pakken med nettleserne i
 * `PLAYWRIGHT_BROWSERS_PATH`, som i skillen `mockup-nettleser`. Kjøres ikke i CI,
 * fordi CI ikke har den nettleseren.
 */

import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, realpathSync, rmSync } from 'node:fs';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';
import { FLYTEN, kjor, normalisert } from '../tester/korpus.ts';
import { serverbane } from '../tester/serverbane.ts';
import { lagOppsett, rydd, startServer } from '../tester/testbase.ts';
import type { Resultat, Steg } from './inngang.ts';

function globalPlaywright() {
  const rot = execFileSync('npm', ['root', '-g']).toString().trim();
  const krev = createRequire(join(realpathSync(join(rot, 'playwright')), 'package.json'));
  const kjerne = krev.resolve('playwright-core/package.json');
  const nettlesere = JSON.parse(readFileSync(join(kjerne, '..', 'browsers.json'), 'utf8'));
  const skall = nettlesere.browsers.find(
    (b: { name: string }) => b.name === 'chromium-headless-shell'
  );
  const mappe = process.env.PLAYWRIGHT_BROWSERS_PATH;
  const forventet = mappe && join(mappe, `chromium_headless_shell-${skall.revision}`);
  if (!forventet || !existsSync(forventet)) {
    throw new Error(
      `Global playwright venter ${forventet ?? 'PLAYWRIGHT_BROWSERS_PATH'}, som ikke finnes. Kjør ikke «playwright install».`
    );
  }
  return krev('playwright');
}

async function iNettleseren(): Promise<Resultat> {
  const ut = mkdtempSync(join(tmpdir(), 'sprakprove-nettleser-'));
  const konfig = fileURLToPath(new URL('./vite.config.ts', import.meta.url));
  await build({ configFile: konfig, build: { outDir: ut } });
  const typer: Record<string, string> = { '.html': 'text/html', '.js': 'text/javascript' };
  const statisk = createServer((foresporsel, respons) => {
    const sti = join(
      ut,
      new URL(foresporsel.url ?? '/', 'http://x').pathname.replace(/\/$/, '/index.html')
    );
    if (!sti.startsWith(ut) || !existsSync(sti)) return void respons.writeHead(404).end();
    respons.writeHead(200, { 'content-type': typer[extname(sti)] ?? 'application/octet-stream' });
    respons.end(readFileSync(sti));
  });
  await new Promise<void>((ok) => statisk.listen(0, '127.0.0.1', ok));
  const adresse = statisk.address() as { port: number };
  const { chromium } = globalPlaywright();
  const nettleser = await chromium.launch();
  try {
    const side = await nettleser.newPage();
    const sidefeil: string[] = [];
    side.on('pageerror', (e: Error) => sidefeil.push(e.message));
    await side.goto(`http://127.0.0.1:${adresse.port}/`);
    await side.waitForFunction(() => 'resultat' in window, null, { timeout: 60_000 });
    if (sidefeil.length) throw new Error(`JavaScript-feil i siden: ${sidefeil.join('; ')}`);
    return (await side.evaluate(
      () => (window as unknown as { resultat: Resultat }).resultat
    )) as Resultat;
  } finally {
    await nettleser.close();
    statisk.close();
    rmSync(ut, { recursive: true, force: true });
  }
}

async function iServeren(): Promise<Record<string, Steg[]>> {
  const o = await lagOppsett();
  const server = await startServer(o.teammedlemmer);
  const forlop: Record<string, Steg[]> = {};
  try {
    for (const f of FLYTEN) {
      const bane = await serverbane(server, o);
      const opptak: Steg[] = [];
      await kjor(f, bane, {
        etterSteg: (steg, utfall) =>
          opptak.push({ steg, godtatt: utfall?.godtatt ?? null, tilstand: normalisert(bane) }),
      });
      forlop[f.id] = opptak;
    }
  } finally {
    await server.stopp();
    await rydd(o);
  }
  return forlop;
}

const nettleser = await iNettleseren();
const server = await iServeren();
const avvik: string[] = Object.entries(nettleser.feil).map(
  ([id, f]) => `${id}: feilet i nettleseren: ${f}`
);
let steg = 0;
for (const f of FLYTEN) {
  const n = nettleser.forlop[f.id] ?? [];
  const s = server[f.id];
  if (n.length !== s.length)
    avvik.push(`${f.id}: ${n.length} steg i nettleseren, ${s.length} i serveren`);
  for (const [i, a] of s.entries()) {
    steg += 1;
    if (JSON.stringify(n[i]) !== JSON.stringify(a))
      avvik.push(`${f.id} steg ${a.steg}: ulik tilstand eller utfall`);
  }
}
console.log(`Nettleser: ${nettleser.nettleser}`);
console.log(`${FLYTEN.length} forløp, ${steg} steg, ${avvik.length} avvik`);
for (const a of avvik) console.log(`  ${a}`);
process.exit(avvik.length ? 1 : 0);
