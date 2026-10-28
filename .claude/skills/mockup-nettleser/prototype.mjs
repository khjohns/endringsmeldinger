// Den mekaniske forprøven av prototypen for et brukerforløp (#1347, steg 6 i skillen
// brukerforlop). Følger klikkstiene i forløpsfila, kontrollerer ankrene, data-spor mot
// bestillingen begge veier, axe for WCAG 2.1 A og AA i hver tilstand og konsollfeilene, og
// tar et skjermbilde per tilstand. Bredden på 390 px rapporteres, men stopper ikke
// (oppdragsgiver 27.10). Skriptet vurderer ingen tekst og leser ingen vedtak.
//
//   node .claude/skills/mockup-nettleser/prototype.mjs BF-03 [--utdata <mappe>]
//
// Avslutter med 1 når noe annet enn bredden har avvik.

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, realpathSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const FORLOEP = join(ROT, 'docs/domenetabell/brukerforlop');
const AXE_TAGGER = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

const [id, ...resten] = process.argv.slice(2);
if (!id || id.startsWith('--')) {
  console.error('Bruk: node .claude/skills/mockup-nettleser/prototype.mjs BF-xx [--utdata <mappe>]');
  process.exit(2);
}
const i = resten.indexOf('--utdata');
const utdata = resolve(i >= 0 ? resten[i + 1] : join(tmpdir(), `prototype-${id}`));

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

const forloep = JSON.parse(readFileSync(join(FORLOEP, `${id}.json`), 'utf8'));
if (!forloep.prototype) throw new Error(`${id}.json har ikke feltet prototype`);
if (!forloep.bestilling) throw new Error(`${id}.json har ikke feltet bestilling`);
const bestilling = readFileSync(join(FORLOEP, forloep.bestilling), 'utf8');
const fil = join(FORLOEP, forloep.prototype.fil);
const url = pathToFileURL(fil).href;
const stier = forloep.prototype.klikkstier;

/** Stegene i tabellen under «Arbeidsmåten»: ID-en i første kolonne og ankrene i den siste. */
function stegtabell(md) {
  const avsnitt = md.split(/^## /m).find((a) => a.startsWith('Arbeidsmåten')) ?? '';
  return avsnitt
    .split('\n')
    .filter((l) => /^\|\s*[^-\s|][^|]*\|/.test(l) && !/^\|\s*Steg\s*\|/.test(l))
    .map((l) => {
      const celler = l.split('|').slice(1, -1).map((c) => c.trim());
      return { id: celler[0], ankre: [...celler.at(-1).matchAll(/`#([\w-]+)`/g)].map((m) => m[1]) };
    });
}

const steg = stegtabell(bestilling);
const definert = [...bestilling.matchAll(/^- \*\*([A-Z]-\d+)\*\*/gm)].map((m) => m[1]);
const nevnt = new Set(bestilling.match(/(?<![\w-])[A-Z]-\d+(?![\w-])/g));

const avvik = [];
const bredde = [];
const konsoll = [];
const axe = new Map();
const tilstander = new Set();
const forloepet = [];

const { chromium } = globalPlaywright();
const axeSti = createRequire(join(ROT, 'package.json')).resolve('axe-core/axe.min.js');
mkdirSync(utdata, { recursive: true });
const browser = await chromium.launch({ args: ['--allow-file-access-from-files'] });
let blokkert = 0;

async function nySide(width) {
  const context = await browser.newContext({ viewport: { width, height: 900 } });
  await context.route(/^https?:/, (r) => (blokkert++, r.abort()));
  const page = await context.newPage();
  page.on('console', (m) => {
    if (m.type() === 'error' && !/ERR_FAILED/.test(m.text())) konsoll.push(m.text());
  });
  page.on('pageerror', (e) => konsoll.push(String(e)));
  return page;
}

async function kjoerAxe(page, hvor) {
  await page.addScriptTag({ path: axeSti });
  const brudd = await page.evaluate(
    (tagger) =>
      window.axe
        .run(document, { runOnly: { type: 'tag', values: tagger } })
        .then((r) => r.violations.map((v) => `${v.id} (${v.nodes.length})`)),
    AXE_TAGGER
  );
  for (const b of brudd) axe.set(b, [...(axe.get(b) ?? []), hvor]);
}

const synlig = (l) => l.filter({ visible: true });

/** Det ene synlige elementet, eller en feil som sier hvor mange det var. */
async function ett(locator, hva) {
  const antall = await synlig(locator).count();
  if (antall !== 1) throw new Error(`${hva}: ${antall} synlige`);
  return synlig(locator);
}

async function tilstand(page, sti, n) {
  const anker = (await page.evaluate(() => location.hash)).slice(1);
  tilstander.add(anker);
  await page.screenshot({ path: join(utdata, `${sti}-${String(n).padStart(2, '0')}-${anker}.png`), fullPage: true });
  await kjoerAxe(page, `${sti}#${anker}`);
}

// Klikkstiene, med 1440 px bredde. Bare starten settes med ankeret; resten klikkes.
for (const sti of stier) {
  const page = await nySide(1440);
  await page.goto(`${url}#${sti.start}`);
  let n = 0;
  await tilstand(page, sti.id, n++);
  let feil = null;
  for (const h of sti.handlinger) {
    try {
      if ('klikk' in h) {
        const lenke = await ett(page.getByRole('link', { name: h.klikk }), `lenken «${h.klikk}»`);
        const foer = await page.evaluate(() => location.hash);
        const sperret = (await lenke.getAttribute('aria-disabled')) === 'true';
        await lenke.click({ force: sperret, timeout: 3000 });
        const maal = page.locator(`[id="${h.tilstand}"]`);
        await maal.waitFor({ state: 'visible', timeout: 2000 }).catch(() => {});
        const naa = await page.evaluate(() => location.hash);
        if (naa !== `#${h.tilstand}`) throw new Error(`«${h.klikk}» førte til ${naa}, ikke #${h.tilstand}`);
        if (!(await maal.isVisible())) throw new Error(`#${h.tilstand} er ikke synlig`);
        if (naa !== foer) await tilstand(page, sti.id, n++);
      } else if ('kryss' in h) {
        await (await ett(page.getByRole('checkbox', { name: h.kryss }), `avkrysningen «${h.kryss}»`)).check();
      } else if ('fyll' in h) {
        await (await ett(page.getByRole('textbox', { name: h.fyll }), `feltet «${h.fyll}»`)).fill(h.tekst);
      } else if ('staar' in h) {
        if (!(await synlig(page.getByText(h.staar)).count())) throw new Error(`«${h.staar}» står ikke`);
      } else throw new Error(`ukjent handling ${JSON.stringify(h)}`);
    } catch (e) {
      feil = e.message.split('\n')[0];
      await page.screenshot({ path: join(utdata, `${sti.id}-brudd.png`), fullPage: true });
      break;
    }
  }
  forloepet.push(`${sti.id} (${sti.dekker.join(', ')}): ${feil ? `brudd: ${feil}` : 'virker'}`);
  if (feil) avvik.push(`klikkstien ${sti.id}: ${feil}`);
  await page.context().close();
}

// Ankrene, data-spor og «Vis sporbarhet», i starttilstanden.
const page = await nySide(1440);
await page.goto(url);
const side = await page.evaluate(() => ({
  ider: [...document.querySelectorAll('[id]')].map((e) => e.id),
  lenker: [...document.querySelectorAll('a[href^="#"]')].map((a) => a.getAttribute('href').slice(1)),
  spor: [...document.querySelectorAll('[data-spor]')].flatMap((e) => e.dataset.spor.split(/\s*·\s*/)),
}));
const ider = new Set(side.ider);
for (const a of new Set(side.lenker)) if (!ider.has(a)) avvik.push(`href="#${a}" har ikke noe mål`);
for (const s of steg)
  for (const a of s.ankre) if (!ider.has(a)) avvik.push(`steg ${s.id}: ankeret #${a} finnes ikke`);
const dekket = new Set(stier.flatMap((s) => s.dekker));
for (const s of steg) if (!dekket.has(s.id)) avvik.push(`steg ${s.id} har ingen klikksti`);
for (const d of dekket)
  if (!steg.some((s) => s.id === d) && !definert.includes(d))
    avvik.push(`klikkstiene dekker ${d}, som ikke står i ${forloep.bestilling}`);
for (const a of tilstander) if (!steg.some((s) => s.ankre.includes(a))) avvik.push(`#${a} står ikke i stegtabellen`);
const spor = new Set(side.spor);
for (const s of spor) if (!nevnt.has(s)) avvik.push(`data-spor ${s} står ikke i ${forloep.bestilling}`);
const utenSpor = definert.filter((d) => /^[UD]-/.test(d) && !spor.has(d));
for (const d of utenSpor) avvik.push(`${d} har ingen data-spor`);
const bryter = synlig(page.getByRole('checkbox', { name: 'Vis sporbarhet' }));
if (await bryter.count()) {
  await bryter.check();
  await page.screenshot({ path: join(utdata, 'sporbarhet.png'), fullPage: true });
} else avvik.push('«Vis sporbarhet» finnes ikke');
await page.context().close();

// Bredden på 390 px, for hver tilstand klikkstiene nådde. Rapporteres, stopper ikke.
const smal = await nySide(390);
for (const a of tilstander) {
  await smal.goto(`${url}#${a}`);
  const over = await smal.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  if (over > 0) bredde.push(`#${a}: ${over} px for bred`);
  await smal.screenshot({ path: join(utdata, `390-${a}.png`), fullPage: true });
}
await browser.close();

for (const [regel, hvor] of axe) avvik.push(`axe ${regel}: ${[...new Set(hvor)].join(', ')}`);
for (const k of new Set(konsoll)) avvik.push(`konsollen: ${k}`);

const linjer = [
  `# Mekanisk forprøve av ${id}`,
  '',
  `Prototypen: ${forloep.prototype.fil}. Skjermbildene: ${utdata}`,
  '',
  '## Klikkstiene (1440 px)',
  ...forloepet.map((l) => `- ${l}`),
  '',
  `## Kontrollene`,
  `- Tilstander nådd: ${[...tilstander].map((a) => `#${a}`).join(', ')}`,
  `- data-spor: ${spor.size} ID-er; U- og D-punkter uten data-spor: ${utenSpor.join(', ') || 'ingen'}`,
  `- axe (${AXE_TAGGER.join(', ')}) i ${tilstander.size} tilstander: ${axe.size ? `${axe.size} regler brutt` : 'ingen brudd'}`,
  `- Konsollfeil: ${new Set(konsoll).size}. Eksterne forespørsler blokkert: ${blokkert}`,
  `- Bredden på 390 px (stopper ikke): ${bredde.length ? bredde.join('; ') : 'ingen vannrett rulling'}`,
  '',
  avvik.length ? `## Avvik (${avvik.length})` : '## OK: ingen avvik',
  ...avvik.map((a) => `- ${a}`),
];
console.log(linjer.join('\n'));
process.exit(avvik.length ? 1 : 0);
