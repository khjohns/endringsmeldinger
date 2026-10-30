// Et brukerforløp i demoruta (#1330), i Chromium, BF-01 om ikke `--forlop` sier noe annet.
// Forløpet startes fra begynnelsen og fra kontrollpunktet der BH har mottatt vederlagskravet.
// BH fyller ut svaret i skjemaet, kontrollerer brevet og sender det; TE åpner saken og ser
// svaret, og godtar det når forløpet har kontrollpunktet `te-har-godtatt-svaret`. Til slutt
// startes forløpet på nytt. Demoruta sender ingenting, så skriptet trenger bare vite.
// Med `--visning varden` går de samme stegene gjennom Varden (#1331), og skjermbildene har
// de samme navnene, så de kan sammenlignes ved hvert kontrollpunkt. I Varden kontrolleres også
// at listen «Gjelder hvis» over beløpet har ett punkt per lag foran det (#1400, #1410).
//
//   node .claude/skills/mockup-nettleser/demoruta.mjs [--forlop BF-04] [--url http://localhost:5173] [--utdata <mappe>] [--visning varden]
//
// Den globale playwright-pakken er den som passer med nettleserne i
// PLAYWRIGHT_BROWSERS_PATH; en lokal `npm i playwright` henter en nyere som ikke gjør det.
import { createRequire } from 'node:module';
import { execFileSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, realpathSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseArgs } from 'node:util';

const { values: arg } = parseArgs({
  options: {
    url: { type: 'string', default: 'http://localhost:5173' },
    utdata: { type: 'string', default: join(tmpdir(), 'demoruta-skjermbilder') },
    visning: { type: 'string', default: 'dagens' },
    forlop: { type: 'string', default: 'BF-01' },
  },
});

// Oppsettet lokalt står i skillen; uten PLAYWRIGHT_BROWSERS_PATH startes installert Google
// Chrome (#1410).
const NETTLESEROPPSETT = '«Nettleseren» i .claude/skills/mockup-nettleser/SKILL.md';

function globalPlaywright() {
  const rot = execFileSync('npm', ['root', '-g']).toString().trim();
  let krev;
  try {
    krev = createRequire(join(realpathSync(join(rot, 'playwright')), 'package.json'));
  } catch {
    throw new Error(
      `Finner ikke den globale playwright-pakken i ${rot}. Oppsettet står i ${NETTLESEROPPSETT}. Kjør ikke «npm i playwright» eller «playwright install».`
    );
  }
  const mappe = process.env.PLAYWRIGHT_BROWSERS_PATH;
  if (!mappe) return { ...krev('playwright'), start: { channel: 'chrome' } };
  const kjerne = krev.resolve('playwright-core/package.json');
  const nettlesere = JSON.parse(readFileSync(join(kjerne, '..', 'browsers.json'), 'utf8'));
  const skall = nettlesere.browsers.find((b) => b.name === 'chromium-headless-shell');
  const forventet = join(mappe, `chromium_headless_shell-${skall.revision}`);
  if (!existsSync(forventet)) {
    throw new Error(
      `Global playwright ${krev('playwright/package.json').version} venter ${forventet}, som ikke finnes. Oppsettet står i ${NETTLESEROPPSETT}. Kjør ikke «playwright install».`
    );
  }
  return { ...krev('playwright'), start: {} };
}

async function startNettleser(chromium, start) {
  try {
    return await chromium.launch(start);
  } catch (e) {
    throw new Error(`${e.message}\nNettleseren startet ikke. Kjør ikke «playwright install»; oppsettet står i ${NETTLESEROPPSETT}.`);
  }
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

const FORLOEP = JSON.parse(
  readFileSync(new URL(`../../../docs/domenetabell/brukerforlop/${arg.forlop}.json`, import.meta.url), 'utf8')
);
const TITTEL = FORLOEP.tittel;
const punktet = (id) => FORLOEP.kontrollpunkter.find((p) => p.id === id);
const GODTAR = Boolean(punktet('te-har-godtatt-svaret'));
// Etikettene brevet skal ha, fra standpunktet i kontrollpunktet der TE har mottatt svaret.
const ETIKETTER = (
  punktet('te-har-mottatt-svaret')?.kontrollsett?.find((k) => k.sett === 'te_har_mottatt_svar')?.med
    .standpunkt ?? 'prinsipalt'
).match(/videre subsidiært|subsidiært|prinsipalt/g);
const VARDEN = arg.visning === 'varden';
if (!punktet('bh-har-mottatt-vederlagskravet'))
  throw new Error(`${arg.forlop} har ikke kontrollpunktet bh-har-mottatt-vederlagskravet`);
// Lagene foran beløpet, som er det siste laget: grunnlaget når BH har avslått det, og varselet.
const FORUTSETNINGER = [
  ...(punktet('grunnlaget-er-avslaatt') ? [/avslaget av grunnlaget/] : []),
  /innsigelsen om sen varsling/,
];
if (FORUTSETNINGER.length !== ETIKETTER.length - (ETIKETTER[0] === 'prinsipalt' ? 1 : 0))
  throw new Error(`Lagene ${ETIKETTER.join(', ')} i ${arg.forlop} passer ikke med forutsetningene skriptet venter`);
const forloep = (punkt) =>
  `${arg.url}/demo/${arg.forlop}?punkt=${punkt ?? 'start'}${VARDEN ? '&visning=varden' : ''}`;
// Laget er overskriften med kolon i brevet. «Subsidiært» inne i «videre subsidiært», eller i
// begrunnelsen («Subsidiært godtas …»), teller ikke.
const LAGET = {
  prinsipalt: /prinsipalt:/i,
  subsidiært: /(?<!videre\s)subsidiært:/i,
  'videre subsidiært': /videre\s+subsidiært:/i,
};
const brevetHarLagene = (tekst) =>
  ETIKETTER.every((e) => LAGET[e].test(tekst)) && /60\s000/.test(tekst);
const { chromium, start } = globalPlaywright();
mkdirSync(arg.utdata, { recursive: true });
const vite = await startVite(`${arg.url}/demo`);
let browser;
const feil = [];

try {
  browser = await startNettleser(chromium, start);
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  page.setDefaultTimeout(30000);
  page.on('pageerror', (e) => feil.push(e.message));
  let nr = 0;
  const steg = async (navn, fullPage = false) => {
    const fil = join(arg.utdata, `${String(++nr).padStart(2, '0')}-${navn}.png`);
    await page.screenshot({ path: fil, fullPage });
    console.log(`${nr}. ${navn} → ${fil}`);
  };
  const knapp = (name) => page.getByRole('button', { name, exact: true });
  const spor = (navn) =>
    page.getByRole('navigation', { name: 'Sakens spor' }).getByRole('button', { name: navn });
  const panel = page.getByRole('complementary', { name: 'Demo av brukerforløpet' });
  const side = (part) => panel.getByRole('radio', { name: part, exact: true }).click();
  // Demopanelet starter lukket og står over saken når det er åpent, så det åpnes bare for å
  // bytte side eller starte på nytt.
  const demo = panel.locator('details').first();
  const demopanel = async (aapent) => {
    if ((await demo.getAttribute('open')) !== null !== aapent) await demo.locator('summary').first().click();
  };

  if (VARDEN) {
  const article = (name) => page.getByRole('article', { name });

  await page.goto(forloep(), { waitUntil: 'networkidle' });
  await page.getByRole('heading', { name: TITTEL, level: 1 }).waitFor();
  await steg('start-te');

  await page.goto(forloep('bh-har-mottatt-vederlagskravet'), { waitUntil: 'networkidle' });
  await page.getByRole('heading', { name: TITTEL, level: 1 }).waitFor();
  await demopanel(false);
  await steg('bh-har-mottatt-kravet');

  await page.getByText('Skriv brev', { exact: true }).click();
  await knapp('Svar på kravet').click();
  await page.getByRole('radio', { name: 'Varslet for sent' }).check();
  await page.getByRole('radio', { name: 'Godtar metoden', exact: true }).check();
  await page.getByRole('radio', { name: 'Deler av beløpet' }).check();
  await page.getByRole('textbox', { name: 'Beløpet du godtar' }).fill('60000');
  await page
    .getByRole('textbox', { name: 'Begrunnelse' })
    .fill('Varselet etter § 34.1.2 kom for sent. Subsidiært godtas 60 000 kr.');
  const gjelderHvis = await page.locator('[id$="-beloep-forutsetninger"] li').allInnerTexts();
  console.log(`Beløpet gjelder hvis:\n${gjelderHvis.map((t) => `- ${t}`).join('\n')}`);
  if (
    gjelderHvis.length !== FORUTSETNINGER.length ||
    !FORUTSETNINGER.every((f, i) => f.test(gjelderHvis[i]))
  )
    throw new Error(`«Gjelder hvis» over beløpet har ikke punktene ${FORUTSETNINGER.join(', ')} i den rekkefølgen`);
  await steg('bh-vurderer', true);

  await knapp('Se brevet før sending').first().click();
  const tekst = await article('Svar på krav om vederlagsjustering').getByTestId('laast-tekst').innerText();
  console.log(`Brevet BH kontrollerer:\n${tekst}`);
  if (!brevetHarLagene(tekst))
    throw new Error(`Brevet sier ikke lagene ${ETIKETTER.join(', ')} og det subsidiære beløpet`);
  await steg('bh-kontrollerer-brevet', true);
  await page.getByRole('checkbox', { name: 'Jeg har kontrollert brevet' }).check();
  await knapp('Send svaret til TE').click();
  await page.getByRole('checkbox', { name: 'Jeg har kontrollert brevet' }).waitFor({ state: 'detached' });
  await steg('bh-har-sendt', true);

  await demopanel(true);
  await side('TE');
  await demopanel(false);
  await knapp('Ta stilling til svaret').click();
  await steg('te-har-mottatt-svaret', true);
  if (GODTAR) {
  await knapp('Se akseptbrevet').click();
  console.log(`Aksepten TE kontrollerer:\n${await article('Aksept av svaret').getByTestId('laast-tekst').innerText()}`);
  await steg('te-godtar');
  await page.getByRole('checkbox', { name: 'Jeg har kontrollert brevet' }).check();
  await knapp('Send aksepten til BH').click();
  await page.getByRole('checkbox', { name: 'Jeg har kontrollert brevet' }).waitFor({ state: 'detached' });
  if (await knapp('Ta stilling til svaret').isVisible())
    throw new Error('TE får fortsatt tilbud om å godta svaret etter aksepten');
  await steg('te-har-godtatt');
  }

  await demopanel(true);
  await knapp('Start på nytt').click();
  await page.getByText('Skriv brev', { exact: true }).waitFor();
  await steg('startet-paa-nytt');
  } else {
  // Fra begynnelsen: saken er opprettet, og TE handler i neste steg.
  await page.goto(forloep(), { waitUntil: 'networkidle' });
  await page.getByRole('heading', { name: TITTEL }).waitFor();
  await steg('start-te');

  // Fra kontrollpunktet der BH har mottatt vederlagskravet.
  await page.goto(forloep('bh-har-mottatt-vederlagskravet'), { waitUntil: 'networkidle' });
  await page.getByRole('heading', { name: TITTEL }).waitFor();
  await spor(/^Vederlag/).click();
  await steg('bh-har-mottatt-kravet');

  await knapp('Svar på kravet').click();
  await page.getByRole('radio', { name: 'Nei, for sent' }).click();
  await page.getByRole('radio', { name: 'Ja', exact: true }).click();
  await page.getByRole('radio', { name: 'Redusert beløp' }).click();
  await page.locator('#bh-hovedkrav-godkjent').fill('60000');
  await page.getByRole('textbox', { name: 'Begrunnelse' }).click();
  await page.keyboard.type('Varselet etter § 34.1.2 kom for sent. Subsidiært godtas 60 000 kr.');
  await steg('bh-vurderer', true);

  await knapp('Se brev og send').click();
  const brevkontroll = page.getByRole('region', { name: 'Brevkontroll' });
  const tekst = await brevkontroll.getByTestId('laast-tekst').innerText();
  console.log(`Brevet BH kontrollerer:\n${tekst}`);
  if (!brevetHarLagene(tekst))
    throw new Error(`Brevet sier ikke lagene ${ETIKETTER.join(', ')} og det subsidiære beløpet`);
  await steg('bh-kontrollerer-brevet');
  await brevkontroll.getByRole('checkbox', { name: 'Jeg har kontrollert brevet.' }).check();
  await brevkontroll.getByRole('button', { name: 'Send til entreprenøren' }).click();
  await brevkontroll.waitFor({ state: 'detached' });
  await steg('bh-har-sendt');

  // TE åpner saken og ser svaret BH skrev.
  await demopanel(true);
  await side('TE');
  await demopanel(false);
  await spor(/^Vederlag/).click();
  await knapp('Godta svaret').waitFor();
  await steg('te-har-mottatt-svaret', true);
  if (GODTAR) {
  await knapp('Godta svaret').click();
  const aksept = page.getByRole('region', { name: 'Brevkontroll' });
  console.log(`Aksepten TE kontrollerer:\n${await aksept.getByTestId('laast-tekst').innerText()}`);
  await steg('te-godtar');
  await aksept.getByRole('checkbox', { name: 'Jeg har kontrollert brevet.' }).check();
  await aksept.getByRole('button', { name: 'Send til byggherren' }).click();
  await aksept.waitFor({ state: 'detached' });
  if (await knapp('Godta svaret').isVisible())
    throw new Error('TE får fortsatt tilbud om å godta svaret etter aksepten');
  await steg('te-har-godtatt');
  }

  // En omstart gir saken ved kontrollpunktet igjen.
  await demopanel(true);
  await knapp('Start på nytt').click();
  await demopanel(false);
  await spor(/^Vederlag/).click();
  await knapp('Svar på kravet').waitFor();
  await steg('startet-paa-nytt');

  }

  await page.setViewportSize({ width: 390, height: 844 });
  await steg('smal-skjerm');

  if (feil.length) throw new Error(`JavaScript-feil i siden:\n${feil.join('\n')}`);
  console.log('OK');
} finally {
  await browser?.close();
  stopp(vite);
}
