// Et brukerforløp i demoruta (#1330), i Chromium, BF-01 om ikke `--forlop` sier noe annet.
// Forløpet startes fra begynnelsen og fra kontrollpunktet der BH har mottatt vederlagskravet.
// BH fyller ut svaret i skjemaet, kontrollerer brevet og sender det; TE åpner saken og ser
// svaret, og godtar det når forløpet har kontrollpunktet `te-har-godtatt-svaret`. Til slutt
// startes forløpet på nytt. Demoruta sender ingenting, så skriptet trenger bare vite.
// Stegene går gjennom Varden (#1331). Listen «Gjelder hvis» over beløpet kontrolleres også: den
// har ett punkt per lag foran beløpet (#1400, #1410). `--visning varden` godtas og er standard,
// og en annen verdi avvises.
//
//   node .claude/skills/mockup-nettleser/demoruta.mjs [--forlop BF-04] [--url http://localhost:5173] [--utdata <mappe>]
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
    visning: { type: 'string', default: 'varden' },
    forlop: { type: 'string', default: 'BF-01' },
  },
});
if (arg.visning !== 'varden') {
  throw new Error(`Demoruta har bare Varden (#1516), ikke visningen «${arg.visning}».`);
}

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
    // Datofeltet følger `LANG` i prosessen, ikke `locale` i konteksten eller `--lang`.
    return await chromium.launch({ ...start, env: { ...process.env, LANG: 'nb_NO.UTF-8' } });
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
// Et forløp som oppretter saken (BF-05), starter med TEs skjema for ny sak.
const NY_SAK = Boolean(FORLOEP.utgangspunkt?.opprettes);
if (!NY_SAK && !punktet('bh-har-mottatt-vederlagskravet'))
  throw new Error(`${arg.forlop} har ikke kontrollpunktet bh-har-mottatt-vederlagskravet`);
// Lagene foran beløpet, som er det siste laget: forholdet når Byggherren har avslått det, og varselet.
const FORUTSETNINGER = [
  ...(punktet('forholdet-er-avslaatt') ? [/avslaget av forholdet/] : []),
  /innsigelsen om sen varsling/,
];
if (!NY_SAK && FORUTSETNINGER.length !== ETIKETTER.length - (ETIKETTER[0] === 'prinsipalt' ? 1 : 0))
  throw new Error(`Lagene ${ETIKETTER.join(', ')} i ${arg.forlop} passer ikke med forutsetningene skriptet venter`);
const forloep = (punkt) =>
  `${arg.url}/demo/${arg.forlop}?punkt=${punkt ?? 'start'}`;
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
  // Norsk språk, så datofeltet viser dd.mm.åååå som for brukerne (oppdragsgiver 02.11, #1492).
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, locale: 'nb-NO' });
  page.setDefaultTimeout(30000);
  page.on('pageerror', (e) => feil.push(e.message));
  let nr = 0;
  const steg = async (navn, fullPage = false) => {
    const fil = join(arg.utdata, `${String(++nr).padStart(2, '0')}-${navn}.png`);
    // Panelet til venstre er klebrig, så et helsidebilde tas fra toppen av siden.
    if (fullPage) await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: fil, fullPage });
    console.log(`${nr}. ${navn} → ${fil}`);
  };
  const knapp = (name) => page.getByRole('button', { name, exact: true });
  const panel = page.getByRole('complementary', { name: 'Demo av brukerforløpet' });
  const side = (part) => panel.getByRole('radio', { name: part, exact: true }).click();
  // Demopanelet starter lukket og står over saken når det er åpent, så det åpnes bare for å
  // bytte side eller starte på nytt.
  const demo = panel.locator('details').first();
  const demopanel = async (aapent) => {
    if ((await demo.getAttribute('open')) !== null !== aapent) await demo.locator('summary').first().click();
  };

  if (NY_SAK) {
  const SAKSTITTEL = 'Teglforblending på fasaden';
  await page.goto(forloep(), { waitUntil: 'networkidle' });
  await page.getByRole('heading', { name: 'Nytt krav om endringsordre', level: 1 }).waitFor();
  await steg('ny-sak', true);

  // Steg 3f: feilene står ved feltet før brevkontrollen, og ingen sak er opprettet (F-4, U-5).
  await knapp('Se brevet før sending').click();
  await page.getByRole('group', { name: 'Det mangler noe før du kan se brevet' }).waitFor();
  await steg('ny-feil', true);

  await page.getByRole('button', { name: 'Endringer, jf. punkt 31 og 32' }).click();
  await page.getByRole('radio', { name: /^Irregulær endring/ }).click();
  await page.getByLabel('Tittel på saken').fill(SAKSTITTEL);
  await page.getByLabel('Dato du mottok pålegget').fill('2026-09-15');
  await knapp('Se brevet før sending').click();
  // Kjernen avviser påberopelsen uten beskrivelse (GR-U15), og feilen står ved feltet.
  await page.locator('p.feil', { hasText: 'Beskriv pålegget.' }).waitFor();
  await steg('ny-feil-beskrivelse', true);

  await page
    .getByLabel('Beskrivelse av pålegget')
    .fill('Byggherren påla i byggemøtet 15. september 2026 teglforblending i stedet for platekledning.');
  // Steg 4 og 4a: ja, med varselet som alt er sendt (D-8, OV-U79). Det kan ikke legges til før
  // lagringen finnes (#807, #1487), så TE går tilbake til nei.
  await page.getByRole('radio', { name: 'Ja', exact: true }).check();
  await page.getByRole('radio', { name: 'Brev', exact: true }).check();
  await page.getByRole('radio', { name: 'Som PDF i e-post', exact: true }).check();
  await page.getByLabel('Datoen det ble sendt').fill('2026-09-16');
  await page.getByLabel('Kort beskrivelse av varselet').fill('Varsel om endring på byggherrens skjema, sendt etter byggemøtet.');
  await steg('annen-maate', true);
  await knapp('Se brevet før sending').click();
  await page.locator('p.feil', { hasText: 'Varselet kan ikke legges til i saken ennå' }).waitFor();
  await steg('annen-maate-stanset', true);
  await page.getByRole('radio', { name: 'Nei', exact: true }).check();

  // Steg 5: brevkontrollen, tilbake uten å miste det som er skrevet, og sending.
  await knapp('Se brevet før sending').click();
  await page.getByRole('region', { name: 'Sending' }).waitFor();
  await page.getByText('Påberopelse av irregulær endring').first().waitFor();
  await steg('brev', true);
  await knapp('Tilbake til skjemaet').click();
  if ((await page.getByLabel('Tittel på saken').inputValue()) !== SAKSTITTEL)
    throw new Error('Tittelen ble borte da TE gikk tilbake fra brevkontrollen');
  await knapp('Se brevet før sending').click();
  await page.getByRole('checkbox', { name: 'Jeg har kontrollert brevet' }).check();
  await knapp('Send til byggherren').click();

  // Steg 6: saken står med påberopelsen sendt, og kvitteringen sier at brevet sendes til Catenda (F-6).
  await page.getByRole('heading', { name: SAKSTITTEL, level: 1 }).waitFor();
  await page.getByText('Brevet sendes til Catenda.').waitFor();
  await steg('sendt', true);

  // Steg 5a: avbryter TE, finnes ingen sak.
  await demopanel(true);
  await knapp('Start på nytt').click();
  await demopanel(false);
  await knapp('Avbryt').click();
  await knapp('Ja, slett det du har skrevet').click();
  await page.getByText('Brevet er ikke sendt, og ingen sak er opprettet.').waitFor();
  await steg('avbrutt', true);
  } else {
  const article = (name) => page.getByRole('article', { name });

  await page.goto(forloep(), { waitUntil: 'networkidle' });
  await page.getByRole('heading', { name: TITTEL, level: 1 }).waitFor();
  await steg('start-te');

  await page.goto(forloep('bh-har-mottatt-vederlagskravet'), { waitUntil: 'networkidle' });
  await page.getByRole('heading', { name: TITTEL, level: 1 }).waitFor();
  await demopanel(false);
  await steg('bh-har-mottatt-kravet');

  await knapp('Svar på kravet').click();
  await page.getByRole('radio', { name: 'Varslet for sent' }).check();
  await page.getByRole('radio', { name: 'Godkjenner fast sum (punkt 34.2.1)', exact: true }).check();
  await page.getByRole('radio', { name: 'Deler av beløpet' }).check();
  await page.getByRole('textbox', { name: 'Beløpet du godkjenner' }).fill('60000');
  await page
    .getByRole('textbox', { name: 'Begrunnelse' })
    .fill('Varselet etter § 34.1.2 kom for sent. Subsidiært godtas 60 000 kr.');
  // Beløpet viser til forutsetningene over oppgjørsformen, i samme lag (KA-U72).
  const gjelderHvis = await page.locator('[id*="-form-"][id$="-forutsetninger"] li').allInnerTexts();
  console.log(`Oppgjørsformen og beløpet gjelder hvis:\n${gjelderHvis.map((t) => `- ${t}`).join('\n')}`);
  if (
    gjelderHvis.length !== FORUTSETNINGER.length ||
    !FORUTSETNINGER.every((f, i) => f.test(gjelderHvis[i]))
  )
    throw new Error(`«Gjelder hvis» over oppgjørsformen har ikke punktene ${FORUTSETNINGER.join(', ')} i den rekkefølgen`);
  await steg('bh-vurderer', true);

  await knapp('Se brevet før sending').first().click();
  const tekst = await article('Svar på krav om vederlagsjustering').getByTestId('laast-tekst').innerText();
  console.log(`Brevet BH kontrollerer:\n${tekst}`);
  if (!brevetHarLagene(tekst))
    throw new Error(`Brevet sier ikke lagene ${ETIKETTER.join(', ')} og det subsidiære beløpet`);
  await steg('bh-kontrollerer-brevet', true);
  await page.getByRole('checkbox', { name: 'Jeg har kontrollert brevet' }).check();
  await knapp('Send svaret til totalentreprenøren').click();
  await page.getByRole('checkbox', { name: 'Jeg har kontrollert brevet' }).waitFor({ state: 'detached' });
  await steg('bh-har-sendt', true);

  await demopanel(true);
  await side('TE');
  await demopanel(false);
  await knapp(/^Godta svaret/).waitFor();
  await steg('te-har-mottatt-svaret', true);
  if (GODTAR) {
  await knapp(/^Godta svaret/).click();
  console.log(`Aksepten TE kontrollerer:\n${await article('Aksept av svaret').getByTestId('laast-tekst').innerText()}`);
  await steg('te-godtar');
  await page.getByRole('checkbox', { name: 'Jeg har kontrollert brevet' }).check();
  await knapp('Send aksepten til byggherren').click();
  await page.getByRole('checkbox', { name: 'Jeg har kontrollert brevet' }).waitFor({ state: 'detached' });
  if (await knapp(/^Godta svaret/).isVisible())
    throw new Error('TE får fortsatt tilbud om å godta svaret etter aksepten');
  await steg('te-har-godtatt');
  }

  await demopanel(true);
  await knapp('Start på nytt').click();
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
