/**
 * Vederlagskravet fra Kontrollrommet for en TS-sak i Chromium (#667, #718), med skjermbilder.
 * API-et svares av skriptet: journalen skrives med kjernen (`forhaandsvis`), og
 * GET svarer med `part: "TE"`. Det prøver altså frontenden, ikke TS-serveren;
 * serveren prøves i `sprakprove/skrivesti/vederlagskrav.test.ts`.
 *
 * Med `vite dev` kjørende og bryteren på:
 *
 *   VITE_KOE_TS_STIEN=true npx vite dev --port 5174 --strictPort
 *   node scripts/test_kjernesak_vederlag.ts [--url http://localhost:5174] [--utdata /tmp/kjernesak-skjermbilder]
 *
 * Feiler ved JavaScript-feil i siden, eller når knappen står igjen etter sendingen.
 * Kommandoen nettleseren sendte, skrives til `kommando.json` i utdatamappa.
 */

import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { mkdirSync, realpathSync, writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { forhaandsvis } from '../kjerne/kommandoer/skriving.ts';
import { KJERNE } from '../kjerne/versjon.ts';
import type { Journalrad } from '../kjerne/typer.ts';

const { values } = parseArgs({
  options: {
    url: { type: 'string', default: 'http://localhost:5174' },
    utdata: { type: 'string', default: '/tmp/kjernesak-skjermbilder' },
  },
});
const UT = values.utdata!;
mkdirSync(UT, { recursive: true });

// Den globale playwright-pakken, som i mockup-nettleser-skillen.
const rot = execFileSync('npm', ['root', '-g']).toString().trim();
const krev = createRequire(join(realpathSync(join(rot, 'playwright')), 'package.json'));
const { chromium } = krev('playwright');

const SAK = 'sak-ts-1';
const journal: Journalrad[] = [
  {
    event_id: 'e-1',
    sak_id: SAK,
    event_type: 'sak_opprettet',
    versjon: 1,
    tidsstempel: new Date().toISOString(),
    aktor_id: 'te',
    aktor_rolle: 'TE',
    aktor_team_id: null,
    refererer_til_event_id: null,
    format: 1,
    data: { sakstittel: 'Ny peling ved akse C', sakstype: 'standard' },
  },
];

function skriv(kommando: Record<string, unknown>) {
  const utfall = forhaandsvis(
    kommando,
    {
      sakId: SAK,
      aktoerId: 'te',
      part: 'TE',
      teamId: null,
      tidspunkt: () => new Date(),
      nyId: () => crypto.randomUUID(),
    },
    journal,
    KJERNE
  );
  if (!utfall.godtatt) throw new Error(utfall.avvisning.melding);
  for (const h of utfall.hendelser) journal.push({ ...h, versjon: journal.length + 1 });
}

skriv({
  type: 'krav',
  spor: 'grunnlag',
  innhold: {
    hovedkategori: 'endring',
    underkategori: 'irregulaer_endring',
    paalegg_mottatt: '2026-10-01',
  },
  utdypning: 'Byggherren påla ny peling ved akse C.',
});

const linjer = () =>
  journal.map(({ event_id, versjon, event_type, tidsstempel, aktor_rolle, format, data }) => ({
    event_id,
    versjon,
    event_type,
    tidsstempel,
    aktor_rolle,
    format,
    data,
  }));

const nettleser = await chromium.launch();
const side = await nettleser.newPage({ viewport: { width: 1280, height: 1000 } });
const feil: string[] = [];
side.on('pageerror', (e: Error) => feil.push(e.message));

// Bare stier som begynner med /api/; modulene under src/lib/api/ skal fortsatt lastes.
await side.route(
  (u: URL) => u.pathname.startsWith('/api/'),
  async (rute: {
    request(): { url(): string; method(): string; postData(): string | null };
    fulfill(svar: { status: number; contentType: string; body: string }): Promise<void>;
  }) => {
    const req = rute.request();
    const sti = new URL(req.url()).pathname;
    const json = (kropp: unknown, status = 200) =>
      rute.fulfill({ status, contentType: 'application/json', body: JSON.stringify(kropp) });
    if (sti === '/api/auth/session')
      return json({ user: { id: 'u-te', email: 'te@example.no', name: 'TE' } });
    if (sti === '/api/csrf-token') return json({ csrfToken: 'prove' });
    if (sti.startsWith('/api/projects/'))
      return json({
        id: 'p-1',
        organisasjon_id: 'o-1',
        name: 'Prøveprosjekt',
        settings: {},
        created_at: '2026-10-01',
        is_active: true,
      });
    if (sti === `/api/kjerne/saker/${SAK}` && req.method() === 'GET')
      return json({
        versjon: journal.length,
        part: 'TE',
        visning: {},
        journal: linjer(),
        leveringsoppdrag: [],
      });
    if (sti === `/api/kjerne/saker/${SAK}/kommandoer`) {
      const { kommando } = JSON.parse(req.postData() ?? '{}');
      writeFileSync(join(UT, 'kommando.json'), JSON.stringify(kommando, null, 2));
      // Kjernen lager teksten selv; den låste teksten fra klienten skal ikke inn i kommandoen.
      delete kommando.brevtekst;
      skriv(kommando);
      return json(
        { event_id: `e-${journal.length}`, leveringsoppdrag: 'l-1', versjon: journal.length },
        201
      );
    }
    return json({}, 404);
  }
);

const knapp = side.getByRole('button', { name: 'Send krav om vederlagsjustering' });
await side.goto(`${values.url}/p-1/${SAK}`);
const sporene = side.getByRole('navigation', { name: 'Sakens spor' });
await sporene.waitFor({ timeout: 60_000 });
await side.screenshot({ path: join(UT, '1-grunnlag.png'), fullPage: true });
await sporene.getByRole('button', { name: /Vederlag/ }).click();
await knapp.waitFor();
await side.screenshot({ path: join(UT, '2-vederlag.png'), fullPage: true });
await knapp.click();
await side.getByLabel('Fast pris').fill('250000');
await side.locator('.tiptap').click();
await side.keyboard.type('Tilbudet omfatter peling, rigging og nedrigging av pelemaskin.');
await side.screenshot({ path: join(UT, '3-skjema.png'), fullPage: true });
await side.getByRole('button', { name: 'Se brev og send' }).click();
await side.getByRole('region', { name: 'Brevkontroll' }).waitFor();
await side.getByRole('checkbox', { name: 'Jeg har kontrollert brevet.' }).check();
await side.screenshot({ path: join(UT, '4-brevkontroll.png'), fullPage: true });
await side.getByRole('button', { name: 'Send til byggherren' }).click();
await sporene.getByRole('button', { name: /Krevd: 250/ }).waitFor();
await side.screenshot({ path: join(UT, '5-sendt.png'), fullPage: true });
await side.getByRole('button', { name: 'Historikk' }).click();
await side.getByTestId('journal-3').waitFor();
await side.screenshot({ path: join(UT, '6-historikk.png'), fullPage: true });
if (await knapp.count()) feil.push('Knappen for vederlagskravet står igjen etter sendingen.');
await nettleser.close();

if (feil.length) {
  console.error(feil.join('\n'));
  process.exit(1);
}
console.log(`Skjermbildene og kommandoen ligger i ${UT}.`);
