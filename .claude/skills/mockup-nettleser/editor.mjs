// Kontrollerer RichTextEditor (Tiptap) på /mockup: skriving, fet, innliming av HTML med
// skriptkode, angre og gjør om, låste verdier og at tilleggsteksten står når den genererte
// teksten endres (#268). Exit 1 ved avvik eller JavaScript-feil i siden.
import { createRequire } from 'node:module';
import { execFileSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, realpathSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseArgs } from 'node:util';

const { values: arg } = parseArgs({
  options: {
    url: { type: 'string', default: 'http://localhost:5173' },
    utdata: { type: 'string', default: join(tmpdir(), 'mockup-skjermbilder') },
  },
});

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

const SKADELIG =
  '<p>Innlimt tekst</p><img src="x" onerror="window.__xss=1"><script>window.__xss=2</script>' +
  '<a href="javascript:window.__xss=3">lenke</a><p onclick="window.__xss=4">slutt</p>';
const LAAST =
  '<p>Kravet på <span data-locked-value="500000" data-locked-type="belop">kr 500 000,-</span> godkjennes.</p>';

const mockup = `${arg.url}/mockup?scenario=scenario1`;
const { chromium } = globalPlaywright();
mkdirSync(arg.utdata, { recursive: true });
const vite = await startVite(mockup);
let browser;
const feil = [];
const avvik = [];
const krav = (ok, tekst) => {
  console.log(`${ok ? 'OK  ' : 'AVVIK'} ${tekst}`);
  if (!ok) avvik.push(tekst);
};

try {
  browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  page.setDefaultTimeout(15000);
  page.on('pageerror', (e) => feil.push(e.message));
  const knapp = (name) => page.getByRole('button', { name, exact: true });
  const lim = (el, html) =>
    el.evaluate((e, h) => {
      const dt = new DataTransfer();
      dt.setData('text/html', h);
      dt.setData('text/plain', e.innerText);
      e.dispatchEvent(
        new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true })
      );
    }, html);

  // Fristsvaret: editoren er tilleggsbegrunnelsen under den genererte teksten.
  await page.goto(mockup, { waitUntil: 'networkidle' });
  await knapp('Byggherre BH').click();
  await page.getByRole('button', { name: /^Fristforlengelse/ }).click();
  await knapp('Svar på kravet').click();
  for (const r of await page.getByRole('radio', { name: /^Ja, i tide$/ }).all()) await r.click();
  await page.getByRole('radio', { name: 'Ja, hindring', exact: true }).click();
  const dager = page.locator('#bh-frist-godkjent-dager');
  await dager.fill('30');

  const editor = page.locator('.ProseMirror').first();
  await editor.click();
  await page.keyboard.type('Skrevet.');
  await page.getByRole('button', { name: 'Fet' }).first().click();
  await page.keyboard.type(' Fet tekst');
  krav(/Skrevet\.<strong> Fet tekst<\/strong>/.test(await editor.innerHTML()), 'skriving og fet');

  // ProseMirror slår sammen endringer innen 500 ms til ett angre-steg.
  await page.waitForTimeout(800);
  const foer = await editor.innerHTML();
  await lim(editor, SKADELIG);
  await page.waitForTimeout(300);
  const etter = await editor.innerHTML();
  krav(etter.includes('Innlimt tekst'), 'innlimt tekst kommer inn');
  krav(!/<img|<script|onerror|onclick|javascript:/i.test(etter), 'editoren fjerner img, script og hendelsesattributter');
  krav(
    (await page.evaluate(
      () =>
        document.querySelectorAll('img[src="x"]').length +
        [...document.scripts].filter((s) => s.textContent.includes('__xss')).length
    )) === 0,
    'ingen img eller script fra innlimingen i dokumentet'
  );
  krav((await page.evaluate(() => window.__xss)) === undefined, 'ingen skriptkode kjørte');
  await page.screenshot({ path: join(arg.utdata, 'editor-innliming.png') });

  await page.getByRole('button', { name: 'Angre' }).first().click();
  krav((await editor.innerHTML()) === foer, 'angre gir teksten fra før innlimingen');
  await page.getByRole('button', { name: 'Gjør om' }).first().click();
  krav((await editor.innerHTML()).includes('Innlimt tekst'), 'gjør om limer inn igjen');

  const generert = page.locator('.generated-reasoning .reasoning-text');
  await dager.fill('20');
  await page.waitForTimeout(300);
  krav((await generert.innerText()).includes('20 dager av krevde'), 'den genererte teksten følger dagene');
  krav((await editor.innerText()).includes('Skrevet.'), 'tilleggsteksten står når den genererte endres');

  // Grunnlagssvaret har LockedValueNode. Med et utkast heter knappen «Fortsett til utfylling».
  await page.getByRole('button', { name: /^Grunnlag/ }).click();
  await page.getByRole('button', { name: /^(Fortsett til utfylling|Svar på kravet)/ }).click();
  const grunnlag = page.locator('.ProseMirror').first();
  await grunnlag.click();
  await lim(grunnlag, LAAST);
  await page.waitForTimeout(300);
  const span = grunnlag.locator('[data-locked-value="500000"]');
  krav(
    (await span.count()) === 1 &&
      (await span.getAttribute('contenteditable')) === 'false' &&
      (await span.getAttribute('data-locked-type')) === 'belop',
    'en innlimt låst verdi blir en låst node'
  );
  await page.screenshot({ path: join(arg.utdata, 'editor-laast.png') });

  krav(feil.length === 0, `ingen JavaScript-feil${feil.length ? `: ${feil.join('; ')}` : ''}`);
  if (avvik.length) process.exitCode = 1;
  else console.log('OK: editoren besto alle kontrollene.');
} catch (e) {
  console.error(e.message);
  process.exitCode = 1;
} finally {
  await browser?.close();
  stopp(vite);
}
