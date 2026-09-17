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
  await page.locator('.approval-view').waitFor();
  assert.match(await page.locator('.decision').innerText(), /Prinsipalt avslått/);
  assert.match(await page.locator('.decision').innerText(), /Subsidiært:/);
}
const panel = page => page.locator('.approval-panel');
const actAs = (page, id) => page.getByLabel('Demo · vis som').selectOption(id);
async function sendForApproval(page) {
  const send = page.getByRole('button', { name: 'Send til godkjenning', exact: true });
  assert.equal(await send.isDisabled(), true, 'Sending krever bekreftet kontroll');
  await panel(page).getByRole('checkbox').check();
  await send.click();
  await page.getByText('behandler brevet', { exact: false }).waitFor();
}
async function approve(page) {
  await actAs(page, 'prosjektleder@example.test');
  await panel(page).getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Godkjenn', exact: true }).click();
  assert.equal(await page.getByRole('button', { name: 'Godkjenn', exact: true }).count(), 0);
  await actAs(page, 'prosjekteier@example.test');
  await panel(page).getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Godkjenn og send', exact: true }).click();
  await page.getByText('Svaret er sendt', { exact: true }).waitFor();
}
try {
  const page = await open();
  await prepareEconomy(page);
  // No modal: the panel sits in the page's right column, beside the letter.
  assert.equal(await page.getByRole('dialog').count(), 0);
  const letterBox = await page.locator('.letter-paper').boundingBox();
  const panelBox = await panel(page).boundingBox();
  assert.ok(panelBox.x > letterBox.x + letterBox.width, 'Panelet skal stå til høyre for brevet');
  // The chain is derived from the amount: 2 930 000 kr needs both approvers, Avdelingsleder decides.
  assert.match(await panel(page).innerText(), /Avdelingsleder må godkjenne/);
  assert.match(await panel(page).innerText(), /AVGJØR|Avgjør/);
  await panel(page).getByText('Se beregning · fullmaktsmatrise januar 2026').click();
  assert.match(await panel(page).innerText(), /Subsidiært standpunkt/);
  await page.getByRole('button', { name: 'Rediger innledning', exact: true }).click();
  await page.getByRole('textbox', { name: 'Innledning', exact: true }).fill('Vi viser til gjennomgangen av grunnforholdene.');
  await page.locator('.letter-paper h1').click();
  await page.getByText('Brevutkast lagret.', { exact: false }).waitFor();
  await sendForApproval(page);
  const original = await page.locator('.letter-paper').innerText();
  await actAs(page, 'prosjektleder@example.test');
  await page.getByRole('button', { name: 'Returner', exact: true }).click();
  assert.equal(await page.getByRole('button', { name: 'Returner til saksbehandler', exact: true }).isDisabled(), true);
  await page.getByRole('textbox', { name: 'Hva må saksbehandler endre?' }).fill('Utdyp vurderingen av produktivitetstap.');
  await page.getByRole('button', { name: 'Returner til saksbehandler', exact: true }).click();
  await actAs(page, 'saksbehandler@example.test');
  await page.getByRole('button', { name: 'Revider vurdering', exact: true }).click();
  assert.match(await page.locator('[contenteditable="true"]').innerText(), /Kostnadsdokumentasjonen er kontrollert/);
  await page.locator('[contenteditable="true"]').fill('Produktivitetstapet er dokumentert gjennom timelistene.');
  await page.getByRole('button', { name: 'Ferdigstill vurdering', exact: true }).click();
  await sendForApproval(page);
  await page.getByRole('button', { name: 'Se endringer siden forrige behandling', exact: true }).click();
  assert.match(await page.locator('.approval-view').innerText(), /Kostnadsdokumentasjonen er kontrollert/);
  await approve(page);
  await page.getByRole('button', { name: 'Se PDF', exact: true }).click();
  const sentText = (await page.locator('.letter-modal .letter-section-text').allTextContents()).join('\n');
  assert.match(sentText, /Vi viser til gjennomgangen av grunnforholdene/);
  assert.match(sentText, /Produktivitetstapet er dokumentert/);
  assert.doesNotMatch(sentText, /Utdyp vurderingen av produktivitetstap/);
  assert.doesNotMatch(sentText, /Kostnadsdokumentasjonen er kontrollert/);
  await page.getByRole('button', { name: 'Lukk', exact: true }).click();
  assert.match(original, /Vi viser til gjennomgangen/);
  assert.match(original, /Kostnadsdokumentasjonen er kontrollert/);
  await page.close();
  console.log('PASS: ferdigstilling, panel i siden, utledet kjede, lagret brevutkast, retur, ny revisjon, endringsvisning, to godkjenningstrinn, frosset brev.');

  const te = await open('TE', 'ansvar');
  await te.getByRole('button', { name: 'Oppdater begrunnelse', exact: true }).click();
  await te.locator('[contenteditable="true"]').fill('Nye grunnundersøkelser bekrefter avviket fra kontraktsgrunnlaget.');
  await te.getByRole('button', { name: 'Se brev og send', exact: true }).click();
  await te.getByRole('region', { name: 'Brevkontroll' }).waitFor();
  assert.equal(await te.getByRole('dialog').count(), 0, 'Brevkontrollen er ikke en modal');
  await te.getByRole('button', { name: 'Tilbake til kravet', exact: true }).click();
  assert.match(await te.locator('[contenteditable="true"]').innerText(), /Nye grunnundersøkelser/);
  await te.getByRole('button', { name: 'Se brev og send', exact: true }).click();
  const teSend = te.getByRole('button', { name: 'Send til byggherren', exact: true });
  assert.equal(await teSend.isDisabled(), true, 'Sending krever bekreftet kontroll');
  await te.getByRole('checkbox', { name: 'Jeg har kontrollert brevet og vedleggene.' }).check();
  await teSend.click();
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
  const dimensions = await mobile.locator('.approval-view').evaluate(el => ({ width: el.getBoundingClientRect().width, viewport: innerWidth, scroll: el.scrollWidth }));
  assert.ok(dimensions.width <= dimensions.viewport + 1);
  assert.ok(dimensions.scroll <= dimensions.viewport + 1);
  await mobile.getByRole('button', { name: 'Til saken', exact: true }).click();
  await mobile.locator('.approval-view').waitFor({ state: 'detached' });
  await mobile.close();
  console.log('PASS: mobilbredde og tilbake til saken.');
  assert.deepEqual(errors, []);
  console.log('PASS: ingen JavaScript-feil. Ingen skjermbilder tatt.');
} finally { await browser.close(); }
