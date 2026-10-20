// Den globale playwright-pakken er den som passer med nettleserne i
// PLAYWRIGHT_BROWSERS_PATH; en lokal `npm i playwright` henter en nyere som ikke gjør det.
import { createRequire } from 'node:module';
import { execFileSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, realpathSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseArgs } from 'node:util';

function ugyldig(melding) {
  console.error(melding);
  process.exit(1);
}

let arg;
try {
  ({ values: arg } = parseArgs({
    options: {
      url: { type: 'string', default: 'http://localhost:5173' },
      utdata: { type: 'string', default: join(tmpdir(), 'mockup-skjermbilder') },
      scenario: { type: 'string', default: 'scenario1' },
      varsel: { type: 'string', default: 'i-tide' },
      hindring: { type: 'string', default: 'ja' },
      dager: { type: 'string', default: '30' },
      tekst: { type: 'boolean', default: false },
    },
  }));
} catch (e) {
  ugyldig(`Flaggene kan ikke leses: ${e.message}`);
}

const varselSvar = { 'i-tide': /^Ja, i tide$/, 'for-sent': /^Nei, (for sent|prekludert)$/ };
const hindringSvar = { ja: 'Ja, hindring', nei: 'Nei, ingen hindring' };
if (!Object.hasOwn(varselSvar, arg.varsel))
  ugyldig(`--varsel kan bare være i-tide eller for-sent, fikk «${arg.varsel}».`);
if (!Object.hasOwn(hindringSvar, arg.hindring))
  ugyldig(`--hindring kan bare være ja eller nei, fikk «${arg.hindring}».`);
if (!/^\d+$/.test(arg.dager)) ugyldig(`--dager må være et helt tall fra 0, fikk «${arg.dager}».`);

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

const mockup = `${arg.url}/mockup?scenario=${arg.scenario}`;
const { chromium } = globalPlaywright();
mkdirSync(arg.utdata, { recursive: true });
const vite = await startVite(mockup);
let browser;
const feil = [];

try {
  browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  page.setDefaultTimeout(15000);
  page.on('pageerror', (e) => feil.push(e.message));
  let nr = 0;
  const steg = async (navn) => {
    const fil = join(arg.utdata, `${String(++nr).padStart(2, '0')}-${navn}.png`);
    await page.screenshot({ path: fil });
    console.log(`${nr}. ${navn} → ${fil}`);
  };
  const knapp = (name) => page.getByRole('button', { name, exact: true });
  const panel = page.locator('.approval-panel');

  await page.goto(mockup, { waitUntil: 'networkidle' });
  await knapp('Byggherre BH').click();
  await page.getByRole('button', { name: /^Fristforlengelse/ }).click();
  await knapp('Svar på kravet').click();
  for (const svar of await page.getByRole('radio', { name: varselSvar[arg.varsel] }).all())
    await svar.click();
  await page.getByRole('radio', { name: hindringSvar[arg.hindring], exact: true }).click();
  await page.locator('#bh-frist-godkjent-dager').fill(arg.dager);
  await steg('vurdering');

  await knapp('Ferdigstill vurdering').click();
  await panel.waitFor();
  await panel.getByRole('checkbox').check();
  await steg('brev');
  const send = (await knapp('Send svar').count())
    ? knapp('Send svar')
    : knapp('Send til godkjenning');
  await send.click();

  const velger = page.getByLabel('Demo · vis som');
  const godkjennere = await velger.locator('option').evaluateAll((o) => o.map((e) => e.value));
  for (
    let runde = 0;
    !(await page.getByText('Svaret er sendt', { exact: true }).count());
    runde++
  ) {
    if (runde > godkjennere.length)
      throw new Error('Svaret er ikke sendt etter at alle har godkjent');
    let fant = false;
    for (const id of godkjennere) {
      await velger.selectOption(id);
      if (!(await panel.getByRole('checkbox').count())) continue;
      await panel.getByRole('checkbox').check();
      const godkjenn = (await knapp('Godkjenn og send').count())
        ? knapp('Godkjenn og send')
        : knapp('Godkjenn');
      console.log(`   godkjent av ${id}: ${await godkjenn.innerText()}`);
      await godkjenn.click();
      fant = true;
      break;
    }
    if (!fant) throw new Error('Ingen i «Demo · vis som» kan godkjenne, og svaret er ikke sendt');
  }
  await steg('sendt');
  if (arg.tekst) {
    console.log(`\nBrevtekst:\n${await page.locator('article.letter-paper').innerText()}`);
    console.log(`\nSpor:\n${(await page.locator('.row-status').allInnerTexts()).join('\n')}`);
  }
  if (feil.length) throw new Error(`JavaScript-feil i siden:\n${feil.join('\n')}`);
  console.log('OK: svaret er sendt.');
} finally {
  await browser?.close();
  stopp(vite);
}
