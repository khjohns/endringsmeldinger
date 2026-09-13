/** Local browser smoke test; all API requests are intercepted, no external writes. */
import assert from 'node:assert/strict';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ headless: true, channel: 'chrome' });
const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:5173';
const errors = [];
const candidates = [
  { sak_id: 'KOE-1', tittel: 'Endret fundament', overordnet_status: 'OMFORENT', sum_godkjent: 120000, godkjent_dager: 7, har_vederlagskrav: true, har_fristkrav: true },
  { sak_id: 'KOE-2', tittel: 'Fasadetilpasning', overordnet_status: 'OMFORENT', sum_godkjent: 30000, godkjent_dager: 5, har_vederlagskrav: true, har_fristkrav: true },
];

async function setup(width) {
  const context = await browser.newContext({ viewport: { width, height: 1000 } });
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  page.on('pageerror', e => errors.push(e.message));
  const orders = [];
  await context.route(url => url.pathname.startsWith('/api/'), async route => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    const json = data => route.fulfill({ json: data });
    if (path === '/api/auth/session') return json({ user: { id: 'user', name: 'Byggherre', email: 'bh@example.test' } });
    if (path === '/api/csrf-token') return json({ csrfToken: 'local-test' });
    if (path === '/api/projects/test') return json({ id: 'test', name: 'Skoleprosjektet', settings: {}, created_at: '', is_active: true });
    assert.equal(request.headers()['x-project-id'], 'test', `project header on ${path}`);
    if (path === '/api/cases') return json({ cases: [] });
    if (path === '/api/endringsordre/neste-nummer') return json({ neste_nummer: 'EO-001' });
    if (path === '/api/endringsordre/kandidater') return json({ kandidat_saker: candidates });
    if (path === '/api/endringsordre/opprett') {
      assert.equal(request.headers()['x-csrf-token'], 'local-test');
      orders.push(request.postDataJSON());
      return json({ success: true, sak_id: 'EO-created', catenda_synced: false });
    }
    if (path === '/api/cases/EO-created/context') {
      const payload = orders.at(-1);
      return json({ version: 3, state: { sak_id: 'EO-created', sakstittel: 'Endringsordre EO-001', sakstype: 'endringsordre', endringsordre_data: { ...payload, relaterte_koe_saker: payload.koe_sak_ids, status: 'utstedt', dato_utstedt: '2026-09-13', utstedt_av: 'Byggherre', revisjon_nummer: 0 } }, historikk: { grunnlag: [], vederlag: [], frist: [] }, timeline: [{ specversion: '1.0', id: 'event', source: '/test', type: 'no.oslo.koe.eo_utstedt', time: '2026-09-13T08:00:00Z', actor: 'Byggherre', summary: 'Endringsordre utstedt' }] });
    }
    if (path === '/api/endringsordre/EO-created/kontekst') return json({ sak_states: Object.fromEntries(candidates.map(c => [c.sak_id, { sak_id: c.sak_id, sakstittel: c.tittel }])) });
    errors.push(`Unexpected API request: ${path}`);
    return route.fulfill({ status: 500, json: { message: 'Unexpected test request' } });
  });
  return { page, context, orders };
}

try {
  const direct = await setup(1440);
  await direct.page.goto(`${base}/test`, { waitUntil: 'networkidle' });
  await direct.page.getByRole('link', { name: 'Ny endringsordre' }).click();
  await direct.page.getByLabel('Beskriv endringen som pålegges').fill('Byggherren pålegger endret fundamentering. Pris og frist avklares senere.');
  await direct.page.getByRole('button', { name: 'Kontroller endringsordre', exact: true }).click();
  assert.equal(await direct.page.getByText('Uavklart', { exact: true }).count(), 2);
  assert.equal(await direct.page.getByRole('button', { name: 'Utsted endringsordre', exact: true }).isDisabled(), true);
  await direct.page.getByRole('checkbox').check();
  await direct.page.getByRole('button', { name: 'Utsted endringsordre', exact: true }).click();
  await direct.page.waitForURL('**/test/EO-created?rolle=BH');
  await direct.page.getByRole('article', { name: 'Utstedt endringsordre' }).waitFor();
  assert.equal(direct.orders.length, 1);
  assert.deepEqual(direct.orders[0].koe_sak_ids, []);
  assert.equal(direct.orders[0].kompensasjon_belop, undefined);
  assert.equal(direct.orders[0].frist_dager, undefined);
  await direct.page.reload({ waitUntil: 'networkidle' });
  assert.equal(await direct.page.getByText('Uavklart', { exact: true }).count(), 2);
  await direct.page.screenshot({ path: '/private/tmp/endringsordre-direkte.png', fullPage: true });
  await direct.context.close();
  console.log('PASS: overview entry, direct unresolved order, review, one submission, reload.');

  const agreed = await setup(390);
  await agreed.page.goto(`${base}/test/endringsordre/ny?koe=KOE-1`, { waitUntil: 'networkidle' });
  assert.equal(await agreed.page.getByRole('checkbox', { name: /KOE-1/ }).isChecked(), true);
  await agreed.page.getByRole('checkbox', { name: /KOE-2/ }).check();
  assert.equal(await agreed.page.getByLabel('Tillegg (kr ekskl. mva.)').inputValue(), '150000');
  assert.equal(await agreed.page.getByLabel('Samlet fristforlengelse (dager)').inputValue(), '');
  await agreed.page.getByLabel('Beskriv avtalen som formaliseres').fill('Enigheten om fundament og fasade formaliseres. Forsinkelsene overlapper.');
  await agreed.page.getByLabel('Oppgjørsform').selectOption('FASTPRIS_TILBUD');
  await agreed.page.getByLabel('Samlet fristforlengelse (dager)').fill('8');
  await agreed.page.getByRole('button', { name: 'Kontroller endringsordre', exact: true }).click();
  await agreed.page.getByRole('button', { name: 'Tilbake til utfylling' }).click();
  assert.equal(await agreed.page.getByLabel('Samlet fristforlengelse (dager)').inputValue(), '8');
  await agreed.page.reload({ waitUntil: 'networkidle' });
  assert.equal(await agreed.page.getByRole('checkbox', { name: /KOE-2/ }).isChecked(), true);
  assert.equal(await agreed.page.getByLabel('Samlet fristforlengelse (dager)').inputValue(), '8');
  await agreed.page.getByRole('button', { name: 'Kontroller endringsordre', exact: true }).click();
  assert.ok(await agreed.page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'mobile horizontal overflow');
  await agreed.page.getByRole('checkbox').check();
  await agreed.page.getByRole('button', { name: 'Utsted endringsordre', exact: true }).click();
  await agreed.page.waitForURL('**/test/EO-created?rolle=BH');
  await agreed.page.getByRole('article', { name: 'Utstedt endringsordre' }).waitFor();
  assert.deepEqual(agreed.orders[0].koe_sak_ids, ['KOE-1', 'KOE-2']);
  assert.equal(agreed.orders[0].frist_dager, 8);
  assert.equal(agreed.orders[0].kompensasjon_belop, 150000);
  assert.equal(await agreed.page.getByRole('link', { name: /KOE-1 Endret fundament/ }).count(), 1);
  await agreed.page.screenshot({ path: '/private/tmp/endringsordre-mobil.png', fullPage: true });
  assert.deepEqual(errors, []);
  await agreed.context.close();
  console.log('PASS: mobile KOE preselection, multiple claims, explicit aggregate days, preserved draft, issue and backlinks.');

  const demoContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const demo = await demoContext.newPage();
  const demoApiCalls = [];
  demo.on('pageerror', e => errors.push(e.message));
  await demoContext.route(url => url.pathname.startsWith('/api/'), route => {
    demoApiCalls.push(route.request().url());
    return route.abort();
  });
  await demo.goto(`${base}/mockup/oversikt`, { waitUntil: 'networkidle' });
  await demo.getByRole('button', { name: 'Byggherre BH' }).click();
  await demo.getByRole('link', { name: 'Ny endringsordre', exact: true }).click();
  await demo.getByLabel('Beskriv endringen som pålegges').fill('Demopålegg om endret fundamentering.');
  await demo.getByRole('button', { name: 'Kontroller endringsordre', exact: true }).click();
  await demo.getByRole('checkbox').check();
  await demo.getByRole('button', { name: 'Utsted endringsordre', exact: true }).click();
  await demo.waitForURL('**/mockup/endringsordre/demo-eo-*');
  await demo.getByRole('article', { name: 'Utstedt endringsordre' }).waitFor();
  await demo.reload({ waitUntil: 'networkidle' });
  assert.equal(await demo.getByText('Uavklart', { exact: true }).count(), 2);
  const orderPath = new URL(demo.url()).pathname;
  await demo.getByRole('link', { name: 'Krav og endringer', exact: true }).click();
  await demo.getByLabel('Sakstype').selectOption('endringsordre');
  await demo.getByRole('link', { name: /Åpne sak demo-eo-/ }).click();
  await demo.waitForURL('**/mockup/endringsordre/demo-eo-*');
  assert.equal(new URL(demo.url()).pathname, orderPath);
  await demo.getByRole('link', { name: 'Ny endringsordre', exact: true }).click();
  await demo.getByRole('button', { name: /Formaliser avtalte KOE-krav/ }).click();
  await demo.getByRole('checkbox', { name: /KOE-2024-019/ }).check();
  await demo.getByLabel('Beskriv avtalen som formaliseres').fill('Den avtalte endringen formaliseres i demoen.');
  await demo.getByLabel('Oppgjørsform').selectOption('FASTPRIS_TILBUD');
  await demo.getByLabel('Samlet fristforlengelse (dager)').fill('15');
  await demo.getByRole('button', { name: 'Kontroller endringsordre', exact: true }).click();
  assert.match(await demo.getByRole('link', { name: /KOE-2024-019/ }).getAttribute('href'), /^\/mockup\?scenario=/);
  await demo.getByRole('checkbox').check();
  await demo.getByRole('button', { name: 'Utsted endringsordre', exact: true }).click();
  await demo.waitForURL('**/mockup/endringsordre/demo-eo-*');
  await demo.getByRole('article', { name: 'Utstedt endringsordre' }).waitFor();
  assert.deepEqual(demoApiCalls, []);
  assert.deepEqual(errors, []);
  await demoContext.close();
  console.log('PASS: mockup overview entry, local direct and agreed orders, reload, register links; zero API calls.');
} finally { await browser.close(); }
