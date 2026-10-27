// Lager bildene i bilder/ fra skissene i skjermer/. Kjøres fra repoets rot:
// node docs/design/konsept-varden/lag-bilder.mjs
// Bruker den globale playwright-pakken, som skillen mockup-nettleser sier.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, realpathSync } from 'node:fs';
import { createRequire } from 'node:module';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

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

const mappe = dirname(fileURLToPath(import.meta.url));
const skjermer = join(mappe, 'skjermer');
const bilder = join(mappe, 'bilder');
const filer = readdirSync(skjermer).filter((f) => f.endsWith('.html')).sort();

const { chromium } = globalPlaywright();
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1520, height: 1000 } });
  for (const fil of filer) {
    const navn = basename(fil, '.html');
    await page.goto(pathToFileURL(join(skjermer, fil)).href, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    const skjerm = page.locator('section.screen');
    await skjerm.screenshot({ path: join(bilder, `${navn}.png`) });
    console.log(`${navn}.png`);

    const meny = page.locator('#brukermeny');
    if ((await meny.count()) > 0) {
      await meny.evaluate((el) => el.removeAttribute('hidden'));
      const boks = await skjerm.boundingBox();
      await page.screenshot({
        path: join(bilder, `${navn}-brukermeny.png`),
        clip: { x: boks.x + 760, y: boks.y, width: 680, height: 380 },
      });
      console.log(`${navn}-brukermeny.png`);
    }
  }
} finally {
  await browser.close();
}
