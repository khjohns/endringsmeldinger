/** Lokal nettleserprøve av demoflyten i /mockup; API-kall avbrytes og telles, ingen eksterne skrivinger. */
import assert from 'node:assert/strict';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({
  headless: true,
  ...(process.env.CHROMIUM_EXECUTABLE_PATH
    ? { executablePath: process.env.CHROMIUM_EXECUTABLE_PATH }
    : { channel: 'chrome' }),
});
const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:5173';
const errors = [];

/**
 * Demoordrene har uavklart eller høyt fullmaktsgrunnlag og skal gjennom godkjenningskjeden.
 * Hver godkjenner avgjør i tur, og siste godkjenning utsteder. Slutter på den utstedte ordren.
 */
async function utstedDemoordreGjennomKjeden(page) {
  await page.getByRole('button', { name: 'Send til godkjenning', exact: true }).click();
  await page.getByRole('link', { name: 'Følg godkjenningen' }).click();
  await page.waitForURL('**/mockup/endringsordre/godkjenning*');
  const siste = page.getByRole('button', { name: 'Godkjenn og utsted', exact: true });
  const godkjenn = page.getByRole('button', { name: 'Godkjenn', exact: true });
  for (const godkjenner of ['prosjektleder@example.test', 'prosjekteier@example.test']) {
    await page.getByLabel('Demo · vis som').selectOption(godkjenner);
    await page.getByRole('checkbox', { name: 'Jeg har kontrollert endringsordren.' }).check();
    await siste.or(godkjenn).first().waitFor();
    if (await siste.isVisible()) {
      await siste.click();
      break;
    }
    await godkjenn.click();
  }
  await page.getByLabel('Demo · vis som').selectOption('saksbehandler@example.test');
  await page.getByRole('link', { name: 'Åpne utstedt endringsordre' }).click();
  await page.waitForURL('**/mockup/endringsordre/demo-eo-*');
}

try {
  const demoContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const demo = await demoContext.newPage();
  const demoApiCalls = [];
  demo.on('pageerror', (e) => errors.push(e.message));
  await demoContext.route(
    (url) => url.pathname.startsWith('/api/'),
    (route) => {
      demoApiCalls.push(route.request().url());
      return route.abort();
    }
  );
  await demo.goto(`${base}/mockup/oversikt`, { waitUntil: 'networkidle' });
  await demo.getByRole('button', { name: 'Byggherre BH' }).click();
  await demo.getByRole('link', { name: 'Ny endringsordre', exact: true }).click();
  await demo
    .getByLabel('Beskriv endringen som pålegges')
    .fill('Demopålegg om endret fundamentering.');
  const firstNumber = await demo.getByLabel('Endringsordrenummer').inputValue();
  await demo.getByRole('button', { name: 'Kontroller endringsordre', exact: true }).click();
  await demo.getByRole('checkbox').check();
  await utstedDemoordreGjennomKjeden(demo);
  await demo.getByRole('article', { name: 'Utstedt endringsordre' }).waitFor();
  await demo.reload({ waitUntil: 'networkidle' });
  assert.equal(await demo.getByText('Uavklart', { exact: true }).count(), 2);
  await demo.getByRole('link', { name: 'Ny endringsordre', exact: true }).click();
  await demo.getByRole('button', { name: /Formaliser avtalte KOE-krav/ }).click();
  // #445: utkastet til ordren som ble utstedt fra godkjenningssiden, er forkastet.
  assert.equal(await demo.getByLabel('Beskriv avtalen som formaliseres').inputValue(), '');
  assert.notEqual(await demo.getByLabel('Endringsordrenummer').inputValue(), firstNumber);
  await demo.getByRole('checkbox', { name: /KOE-2024-019/ }).check();
  await demo
    .getByLabel('Beskriv avtalen som formaliseres')
    .fill('Den avtalte endringen formaliseres i demoen.');
  await demo.getByLabel('Oppgjørsform').selectOption('FASTPRIS_TILBUD');
  await demo.getByLabel('Samlet fristforlengelse (dager)').fill('15');
  await demo.screenshot({ path: join(tmpdir(), 'endringsordre-demo-andre.png'), fullPage: true });
  await demo.getByRole('button', { name: 'Kontroller endringsordre', exact: true }).click();
  assert.match(
    await demo.getByRole('link', { name: /KOE-2024-019/ }).getAttribute('href'),
    /^\/mockup\?scenario=/
  );
  await demo.getByRole('checkbox').check();
  await utstedDemoordreGjennomKjeden(demo);
  await demo.getByRole('article', { name: 'Utstedt endringsordre' }).waitFor();
  await demo.screenshot({
    path: join(tmpdir(), 'endringsordre-demo-andre-utstedt.png'),
    fullPage: true,
  });
  assert.deepEqual(demoApiCalls, []);
  assert.deepEqual(errors, []);
  await demoContext.close();
  console.log(
    'PASS: mockup overview entry, direct order, approval chain, reload, agreed KOE order, discarded draft; zero API calls.'
  );
} finally {
  await browser.close();
}
