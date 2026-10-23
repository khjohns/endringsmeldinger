// Kjører axe-core med WCAG 2.1 A og AA mot /mockup i lys og mørk modus, bred og smal
// skjerm (#1187). axe finner bare en del av feilene; resten står i skillen uu-sjekk.
import { createRequire } from 'node:module';
import { execFileSync, spawn } from 'node:child_process';
import { existsSync, readFileSync, realpathSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';

let arg;
try {
  ({ values: arg } = parseArgs({
    options: {
      url: { type: 'string', default: 'http://localhost:5173' },
      scenario: { type: 'string', default: 'scenario1' },
      vis: { type: 'string', default: '5' },
    },
  }));
} catch (e) {
  console.error(`Flaggene kan ikke leses: ${e.message}`);
  process.exit(1);
}
if (!/^\d+$/.test(arg.vis)) {
  console.error(`--vis må være et helt tall, fikk «${arg.vis}».`);
  process.exit(1);
}

const REGLER = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];
const OPPSETT = [
  { navn: 'lys, bred', colorScheme: 'light', viewport: { width: 1440, height: 1000 } },
  { navn: 'mørk, bred', colorScheme: 'dark', viewport: { width: 1440, height: 1000 } },
  { navn: 'lys, smal', colorScheme: 'light', viewport: { width: 390, height: 844 } },
  { navn: 'mørk, smal', colorScheme: 'dark', viewport: { width: 390, height: 844 } },
];

function globalPlaywright() {
  const rot = execFileSync('npm', ['root', '-g']).toString().trim();
  const krev = createRequire(join(realpathSync(join(rot, 'playwright')), 'package.json'));
  const kjerne = krev.resolve('playwright-core/package.json');
  const nettlesere = JSON.parse(readFileSync(join(kjerne, '..', 'browsers.json'), 'utf8'));
  const skall = nettlesere.browsers.find((b) => b.name === 'chromium-headless-shell');
  const mappe = process.env.PLAYWRIGHT_BROWSERS_PATH;
  const forventet = mappe && join(mappe, `chromium_headless_shell-${skall.revision}`);
  if (!forventet || !existsSync(forventet)) {
    throw new Error(
      `Global playwright ${krev('playwright/package.json').version} venter ${forventet ?? 'PLAYWRIGHT_BROWSERS_PATH'}, som ikke finnes. Kjør ikke «playwright install».`
    );
  }
  return krev('playwright');
}

async function svarer(url) {
  try {
    return (await fetch(url)).ok;
  } catch {
    return false;
  }
}

function stopp(vite) {
  if (vite && vite.exitCode === null && vite.signalCode === null) process.kill(-vite.pid);
}

async function startVite(url) {
  if (await svarer(url)) return null;
  const port = new URL(url).port || '5173';
  const vite = spawn('npx', ['vite', 'dev', '--port', port, '--strictPort'], {
    stdio: 'ignore',
    detached: true,
  });
  for (let i = 0; i < 60; i++) {
    if (await svarer(url)) return vite;
    await new Promise((r) => setTimeout(r, 1000));
  }
  stopp(vite);
  throw new Error(`vite svarte ikke på ${url} innen 60 s`);
}

// Tilstandene som kjøres i hvert oppsett. Skjemaet nås bare på bred skjerm, der
// venstrekolonnen med sporene står ved siden av saken.
const TILSTANDER = [
  { navn: 'saken', vei: async () => {} },
  {
    navn: 'BHs svarskjema for fristen',
    bareBred: true,
    vei: async (page) => {
      await page.getByRole('button', { name: 'Byggherre BH', exact: true }).click();
      await page.getByRole('button', { name: /^Fristforlengelse/ }).click();
      await page.getByRole('button', { name: 'Svar på kravet', exact: true }).click();
    },
  },
];

const axeSti = createRequire(import.meta.url).resolve('axe-core/axe.min.js');
const mockup = `${arg.url}/mockup?scenario=${arg.scenario}`;
const { chromium } = globalPlaywright();
const vite = await startVite(mockup);
let browser;
let brudd = 0;

try {
  browser = await chromium.launch();
  for (const oppsett of OPPSETT) {
    const smal = oppsett.viewport.width < 768;
    for (const tilstand of TILSTANDER) {
      if (tilstand.bareBred && smal) continue;
      const kontekst = await browser.newContext({
        colorScheme: oppsett.colorScheme,
        viewport: oppsett.viewport,
      });
      const page = await kontekst.newPage();
      page.setDefaultTimeout(15000);
      await page.goto(mockup, { waitUntil: 'networkidle' });
      await tilstand.vei(page);
      const mørk = await page.evaluate(() => document.documentElement.classList.contains('dark'));
      if (mørk !== (oppsett.colorScheme === 'dark'))
        throw new Error(`${oppsett.navn}: <html> har ikke ventet tema (dark=${mørk}).`);
      await page.addScriptTag({ path: axeSti });
      const resultat = await page.evaluate(
        (tags) => window.axe.run(document, { runOnly: { type: 'tag', values: tags } }),
        REGLER
      );
      await kontekst.close();

      const tittel = `${oppsett.navn} · ${tilstand.navn}`;
      console.log(
        `\n${tittel}: ${resultat.violations.length} regler brutt, ${resultat.incomplete.length} til kontroll for hånd`
      );
      for (const v of resultat.violations) {
        brudd++;
        console.log(`  BRUDD ${v.id} (${v.impact}, ${v.nodes.length} steder): ${v.help}`);
        for (const n of v.nodes.slice(0, Number(arg.vis))) {
          const kontrast = n.any.find((k) => k.data?.contrastRatio)?.data;
          const tall = kontrast ? ` (${kontrast.contrastRatio}:1, krav ${kontrast.expectedContrastRatio})` : '';
          console.log(`    ${n.target.join(' ')}${tall}`);
        }
      }
      for (const v of resultat.incomplete)
        console.log(`  kontroller ${v.id} (${v.nodes.length} steder): ${v.help}`);
    }
  }
  console.log(
    `\n${brudd ? `AVVIK: ${brudd} regelbrudd på WCAG 2.1 A eller AA, summert over oppsettene.` : 'OK: ingen brudd på WCAG 2.1 A eller AA.'} axe finner bare en del av feilene; resten står i uu-sjekk.`
  );
  if (brudd) process.exitCode = 1;
} catch (e) {
  console.error(e.message);
  process.exitCode = 1;
} finally {
  await browser?.close();
  stopp(vite);
}
