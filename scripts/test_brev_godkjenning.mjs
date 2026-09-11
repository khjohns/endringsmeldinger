/** Headless smoke test. No screenshots, recordings or external messages. */
import assert from 'node:assert/strict';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ headless: true, ...(process.env.CHROMIUM_EXECUTABLE_PATH ? { executablePath: process.env.CHROMIUM_EXECUTABLE_PATH } : { channel: 'chrome' }) });
const base = process.env.TEST_BASE_URL || 'http://localhost:5174';
const errors = [];
async function open(role = 'BH', track = 'vederlag', width = 1440) {
  const page = await browser.newPage({ viewport: { width, height: 1000 } });
  page.setDefaultTimeout(15000);
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(`${base}/mockup?rolle=${role}&spor=${track}`, { waitUntil: 'networkidle' });
  return page;
}
async function prepareEconomy(page) {
  await page.getByRole('button', { name: 'Oppdater svar', exact: true }).click();
  for (const button of await page.getByRole('radio', { name: 'Ja, i tide', exact: true }).all()) await button.click();
  await page.getByRole('radio', { name: 'Ja', exact: true }).click();
  for (const button of await page.getByRole('radio', { name: 'Fullt beløp', exact: true }).all()) await button.click();
  await page.locator('[contenteditable="true"]').fill('Kostnadsdokumentasjonen er kontrollert.');
  await page.getByRole('button', { name: 'Ferdigstill vurdering', exact: true }).click();
  await page.getByRole('dialog', { name: 'Brev og godkjenning' }).waitFor();
  assert.match(await page.locator('.decision').innerText(), /Prinsipalt avslått/);
  assert.match(await page.locator('.decision').innerText(), /Subsidiært:/);
}
async function sendForApproval(page) { await page.getByRole('button', { name: 'Send til godkjenning', exact: true }).click(); }
async function approve(page) {
  await page.getByLabel('Prøv godkjenningsflyten').selectOption('prosjektleder@example.test');
  await page.getByRole('button', { name: 'Godkjenn', exact: true }).click();
  assert.equal(await page.getByRole('button', { name: 'Godkjenn', exact: true }).count(), 0);
  await page.getByLabel('Prøv godkjenningsflyten').selectOption('prosjekteier@example.test');
  await page.getByRole('button', { name: 'Godkjenn og send', exact: true }).click();
  await page.locator('.status-chip').filter({ hasText: /^Sendt$/ }).waitFor();
}
try {
  const page = await open();
  await prepareEconomy(page);
  const bounds = await page.locator('.approval-dialog').boundingBox();
  const viewport = page.viewportSize();
  assert.ok(Math.abs(bounds.x - (viewport.width - bounds.width) / 2) < 2, 'Modalen skal være sentrert horisontalt');
  assert.ok(Math.abs(bounds.y - (viewport.height - bounds.height) / 2) < 2, 'Modalen skal være sentrert vertikalt');
  const authority = page.getByRole('region', { name: 'Fullmaktsgrunnlag', exact: true });
  await authority.getByText('Se beregning og fullmaktsmatrise · januar 2026').click();
  assert.match(await authority.innerText(), /Avdelingsleder/);
  assert.match(await authority.innerText(), /Subsidiært|subsidiært/);
  assert.match(await authority.innerText(), /Ubegrenset/);
  await page.getByRole('button', { name: 'Forhåndsvis', exact: true }).click();
  assert.equal(await page.locator('.letter-paper button, .letter-paper textarea, .letter-paper svg').count(), 0);
  assert.match(await page.locator('.letter-paper').innerText(), /Prinsipalt avslått/);
  await page.getByRole('button', { name: 'Rediger', exact: true }).click();
  await page.getByRole('button', { name: 'Rediger innledning', exact: true }).click();
  await page.getByRole('textbox', { name: 'Innledning', exact: true }).fill('Vi viser til gjennomgangen av grunnforholdene.');
  await page.locator('#approval-title').click();
  await page.getByText('Brevutkast lagret.', { exact: false }).waitFor();
  await sendForApproval(page);
  const original = await page.locator('.letter-paper').innerText();
  await page.getByLabel('Prøv godkjenningsflyten').selectOption('prosjektleder@example.test');
  await page.getByRole('button', { name: 'Returner', exact: true }).click();
  assert.equal(await page.getByRole('button', { name: 'Returner til saksbehandler', exact: true }).isDisabled(), true);
  await page.getByRole('textbox', { name: 'Hva må saksbehandler endre?' }).fill('Utdyp vurderingen av produktivitetstap.');
  await page.getByRole('button', { name: 'Returner til saksbehandler', exact: true }).click();
  await page.getByLabel('Prøv godkjenningsflyten').selectOption('saksbehandler@example.test');
  await page.getByRole('button', { name: 'Revider vurdering', exact: true }).click();
  assert.match(await page.locator('[contenteditable="true"]').innerText(), /Kostnadsdokumentasjonen er kontrollert/);
  await page.locator('[contenteditable="true"]').fill('Produktivitetstapet er dokumentert gjennom timelistene.');
  await page.getByRole('button', { name: 'Ferdigstill vurdering', exact: true }).click();
  await sendForApproval(page);
  await page.getByRole('button', { name: 'Se endringer siden forrige behandling', exact: true }).click();
  assert.match(await page.getByRole('dialog', { name: 'Brev og godkjenning' }).innerText(), /Kostnadsdokumentasjonen er kontrollert/);
  await approve(page);
  await page.getByRole('button', { name: 'Se PDF', exact: true }).click();
  const sentText = (await page.locator('.letter-modal .letter-section-text').allTextContents()).join('\n');
  assert.match(sentText, /Vi viser til gjennomgangen av grunnforholdene/);
  assert.match(sentText, /Produktivitetstapet er dokumentert/);
  assert.doesNotMatch(sentText, /Utdyp vurderingen av produktivitetstap/);
  assert.doesNotMatch(sentText, /Kostnadsdokumentasjonen er kontrollert/);
  await page.getByRole('button', { name: 'Lukk', exact: true }).click();
  await page.getByRole('button', { name: /Brev 1.*Returnert/ }).click();
  // Navigation labels may differ, but the recipient content remains unchanged.
  assert.match(await page.locator('.letter-paper').innerText(), /Kostnadsdokumentasjonen er kontrollert/);
  assert.match(original, /Vi viser til gjennomgangen/);
  await page.close();
  console.log('PASS: ferdigstilling, lagret brevutkast, retur, ny revisjon, endringsvisning, to godkjenningstrinn, frosset brev.');

  const te = await open('TE', 'ansvar');
  await te.getByRole('button', { name: 'Oppdater begrunnelse', exact: true }).click();
  await te.locator('[contenteditable="true"]').fill('Nye grunnundersøkelser bekrefter avviket fra kontraktsgrunnlaget.');
  await te.getByRole('button', { name: 'Se brev og send', exact: true }).click();
  await te.getByRole('dialog', { name: 'Kontroller brevet før sending' }).waitFor();
  await te.getByRole('button', { name: 'Tilbake til kravet', exact: true }).click();
  assert.match(await te.locator('[contenteditable="true"]').innerText(), /Nye grunnundersøkelser/);
  await te.getByRole('button', { name: 'Se brev og send', exact: true }).click();
  await te.getByRole('button', { name: 'Send til byggherren', exact: true }).click();
  await te.getByRole('button', { name: 'Historikk', exact: true }).click();
  await te.getByRole('button', { name: /Vis brev:/ }).last().click();
  await te.getByRole('dialog').waitFor();
  assert.equal(await te.locator('.letter-modal textarea').count(), 0);
  await te.close();
  console.log('PASS: entreprenørens brevkontroll, avbryt uten tap av kladd, innsending og låst historikk.');

  const mobile = await open('BH', 'vederlag', 390);
  await mobile.getByRole('button', { name: 'Vederlag', exact: false }).first().click().catch(() => {});
  // The desktop entry can be in the detail pane; selecting the assessment opens it.
  if (!await mobile.getByRole('button', { name: 'Åpne brev', exact: true }).isVisible()) {
    await mobile.locator('.m-row').filter({ hasText: 'Vederlag' }).click();
  }
  await mobile.getByRole('button', { name: 'Åpne brev', exact: true }).click();
  const dimensions = await mobile.locator('.approval-dialog').evaluate(el => ({ width: el.getBoundingClientRect().width, viewport: innerWidth, scroll: el.scrollWidth }));
  assert.ok(dimensions.width <= dimensions.viewport + 1);
  assert.ok(dimensions.scroll <= dimensions.viewport + 1);
  await mobile.keyboard.press('Escape');
  await mobile.getByRole('dialog').waitFor({ state: 'detached' });
  await mobile.close();
  console.log('PASS: mobilbredde og tastaturlukking.');
  assert.deepEqual(errors, []);
  console.log('PASS: ingen JavaScript-feil. Ingen skjermbilder tatt.');
} finally { await browser.close(); }
