// Tar skjermbilder av en prototype i denne mappa i hver tilstand, kjører axe (WCAG 2.1 A og AA) og
// måler lenkeknappene. Søsteren til konsept-varden/lag-bilder.mjs. Kjøres fra repoets rot:
//
//   node docs/design/prototyper/lag-bilder.mjs grunnlagsoversikt-v2.html \
//     --ankre ubesvart-te,avslatt-te,eo-te [--utdata /tmp/prototype-bilder] [--klikk "Lang sak"]
//
// For hvert anker tas et helsidebilde på 1440 px, og for det første også på 390 px. `--klikk` trykker
// en knapp med det navnet før bildet tas, i hver tilstand. Rapporten står på standard ut og stopper med
// exit 1 ved axe-brudd, en lenkeknapp under 40 px, en bredde over 390 px eller en feil i siden.
// Bruker den globale playwright-pakken, som skillen mockup-nettleser sier, og axe-core fra node_modules.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, realpathSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';

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

const { values: arg, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    ankre: { type: 'string', default: '' },
    utdata: { type: 'string', default: join(tmpdir(), 'prototype-bilder') },
    klikk: { type: 'string' },
  },
});
const [fil] = positionals;
if (!fil) throw new Error('Oppgi prototypens filnavn, for eksempel grunnlagsoversikt-v2.html');
const mappe = dirname(fileURLToPath(import.meta.url));
const sti = resolve(mappe, fil);
if (!existsSync(sti)) throw new Error(`Finner ikke ${sti}`);
const ankre = arg.ankre ? arg.ankre.split(',') : [''];
const axe = readFileSync(resolve(mappe, '../../../node_modules/axe-core/axe.min.js'), 'utf8');
mkdirSync(arg.utdata, { recursive: true });

const { chromium } = globalPlaywright();
const browser = await chromium.launch();
const avvik = [];
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  page.on('pageerror', (e) => avvik.push(`sidefeil: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') avvik.push(`konsollfeil: ${m.text()}`); });
  const navnet = fil.replace(/\.html$/, '');

  const aapne = async (anker) => {
    await page.goto(`${pathToFileURL(sti).href}${anker ? `#${anker}` : ''}`, { waitUntil: 'load' });
    await page.reload({ waitUntil: 'load' });
    if (arg.klikk) await page.getByRole('button', { name: arg.klikk, exact: true }).click();
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(200);
  };
  const bilde = async (tilstand) => {
    const bildefil = join(arg.utdata, `${navnet}${tilstand ? `-${tilstand}` : ''}.png`);
    await page.screenshot({ path: bildefil, fullPage: true });
    await page.addScriptTag({ content: axe });
    const r = await page.evaluate(() =>
      axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] })
    );
    const brudd = r.violations.map((v) => `${v.id} (${v.nodes.length})`);
    if (brudd.length) avvik.push(`${tilstand}: axe ${brudd.join(', ')}`);
    const smaa = await page.evaluate(() =>
      [...document.querySelectorAll('main .lenke, main .knapp, main .rad h3 > button, main .rad h3 > a, main .andre button')]
        .filter((e) => e.getClientRects().length)
        .map((e) => [e.textContent.trim().slice(0, 40), Math.round(e.getBoundingClientRect().height)])
        .filter(([, h]) => h < 40)
    );
    if (smaa.length) avvik.push(`${tilstand}: knapper under 40 px: ${JSON.stringify(smaa)}`);
    console.log(`${tilstand || navnet}: ${brudd.length} axe-brudd, ${smaa.length} knapper under 40 px → ${bildefil}`);
  };

  for (const anker of ankre) {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await aapne(anker);
    await bilde(anker);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await aapne(ankre[0]);
  const bredde = await page.evaluate(() => document.documentElement.scrollWidth);
  if (bredde > 390) avvik.push(`bredden på 390 px er ${bredde} px`);
  console.log(`bredde på 390 px: ${bredde} px`);
  await bilde(`${ankre[0] ? `${ankre[0]}-` : ''}390`);
} finally {
  await browser.close();
}
if (avvik.length) {
  console.error(`Avvik:\n- ${avvik.join('\n- ')}`);
  process.exit(1);
}
