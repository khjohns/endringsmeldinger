/**
 * Vederlaget og fristen uten varsel eller krav fra totalentreprenøren (BF-51, #2410 steg 4).
 * Kildene er OV-U125 for betegnelsen og hvor den vises, OV-U126 for at byggherren ikke får mer enn
 * tilstanden, OV-U3 for det første kravet og påminnelsen, og U-1–U-6 i BF-51 for visningen.
 */

import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/svelte';
import type { Part } from '#kjerne/typer.ts';
import { minnebane } from '#kjerne/tester/bane.ts';
import { kjoer, type Forloep } from '#kjerne/tester/kjoerer.ts';
import type { Handling } from '#kjerne/tester/klient.ts';
import Foerstekrav from '#lib/components/varden/Foerstekrav.svelte';
import Vardensak from '#lib/components/varden/Vardensak.svelte';
import { brevene } from '#lib/components/varden/lesing.ts';
import { finnForloep, lagDemosak } from '#lib/kjernesak/demosak.ts';
import { lagKjernesak } from '#lib/kjernesak/kontekst.svelte.ts';

afterEach(cleanup);

const LINJE = {
  vederlag:
    'Totalentreprenøren har ikke sendt eller lagt til et varsel eller krav om vederlagsjustering i saken.',
  frist:
    'Totalentreprenøren har ikke sendt eller lagt til et varsel eller krav om fristforlengelse i saken.',
};

async function vis(punkt: string, part: Part, spor: 'forhold' | 'vederlag' | 'frist') {
  const demosak = lagDemosak(finnForloep('BF-51')!, punkt, part);
  const kjernesak = lagKjernesak({
    sakId: demosak.sakId,
    prosjektId: 'demo',
    part,
    hent: demosak.hent,
    send: demosak.send,
  });
  await kjernesak.last();
  render(Vardensak, { kjernesak, spor });
  await screen.findByRole('heading', { level: 1 });
  return kjernesak;
}

/** Hodet på siden for sporet, med betegnelsen og handlingene (U-2). */
const hodet = (tittel: RegExp) =>
  screen.getByRole('heading', { level: 2, name: tittel }).closest('header')!;

describe('et spor uten varsel eller krav (BF-51)', () => {
  it('TE ser betegnelsen og linja i hodet på siden for vederlaget, med det første kravet som hovedvalg og varselet etter punkt 34.1.2 ved siden av (U-1, U-2, OV-U125)', async () => {
    await vis('sporene-er-tomme', 'TE', 'vederlag');
    const hode = within(hodet(/^Vederlagsjustering/));
    expect(hode.getByText('Ingen varsel eller krav i saken')).toBeTruthy();
    expect(hode.getByText(LINJE.vederlag)).toBeTruthy();
    const krav = hode.getByRole('button', { name: 'Send krav om vederlagsjustering' });
    expect(krav.className).toContain('primaer');
    expect(hode.getByRole('button', { name: 'Send varsel etter punkt 34.1.2' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Oppdater kravet/ })).toBeNull();
    const andre = within(screen.getByRole('region', { name: 'Andre handlinger' }));
    expect(andre.getByRole('button', { name: /^Send varsel etter punkt.34\.1\.3/ })).toBeTruthy();
    expect(andre.queryByRole('button', { name: /^Send varsel etter punkt.34\.1\.2/ })).toBeNull();
    expect(andre.queryByRole('button', { name: /^Send krav/ })).toBeNull();
  });

  it('TE ser det samme i fristen, med varselet etter punkt 33.4 ved siden av (U-1, U-2)', async () => {
    await vis('sporene-er-tomme', 'TE', 'frist');
    const hode = within(hodet(/^Fristforlengelse/));
    expect(hode.getByText(LINJE.frist)).toBeTruthy();
    expect(hode.getByRole('button', { name: 'Send krav om fristforlengelse' })).toBeTruthy();
    expect(hode.getByRole('button', { name: /^Send varsel/ })).toBeTruthy();
  });

  it('hovedvalget åpner skjemaet for kravet med påminnelsen om at kravet er det første, og at saken ikke har et varsel (U-3, OV-U3)', async () => {
    await vis('sporene-er-tomme', 'TE', 'vederlag');
    await fireEvent.click(screen.getByRole('button', { name: 'Send krav om vederlagsjustering' }));
    const skjema = within(await screen.findByRole('form'));
    expect(
      skjema.getByText('Dette er det første kravet om vederlagsjustering i saken.')
    ).toBeTruthy();
    expect(
      skjema.getByRole('heading', { name: 'Varsler om vederlagsjustering i saken' })
    ).toBeTruthy();
    expect(
      skjema.getByText(
        'Saken har ikke et varsel om vederlagsjustering. Er varselet sendt på annen måte, kan du legge det til med datoen det ble sendt.'
      )
    ).toBeTruthy();
    // Registreringen av varselet i vederlaget er ikke bygget ennå (#2010), og knappen sier det.
    await fireEvent.click(
      skjema.getByRole('button', {
        name: /^Registrer et varsel som er sendt på annen måte etter punkt.(34\.1\.2|33\.4)$/,
      })
    );
    expect(skjema.getByText('Denne handlingen er ikke bygget i prøven ennå.')).toBeTruthy();
  });

  it('i fristen åpner «Registrer et varsel som er sendt på annen måte» i påminnelsen registreringen av varselet (U-3)', async () => {
    await vis('sporene-er-tomme', 'TE', 'frist');
    await fireEvent.click(screen.getByRole('button', { name: 'Send krav om fristforlengelse' }));
    const skjema = within(await screen.findByRole('form'));
    expect(
      skjema.getByText('Dette er det første kravet om fristforlengelse i saken.')
    ).toBeTruthy();
    await fireEvent.click(
      skjema.getByRole('button', {
        name: /^Registrer et varsel som er sendt på annen måte etter punkt.(34\.1\.2|33\.4)$/,
      })
    );
    expect(
      screen.queryByText('Dette er det første kravet om fristforlengelse i saken.')
    ).toBeNull();
    expect(within(screen.getByRole('form')).getByRole('heading', { level: 2 }).textContent).toMatch(
      /varsel/i
    );
  });

  it('BH ser betegnelsen og linja uten handlinger i hodet, og ingen frist eller melding (U-5, OV-U126)', async () => {
    await vis('sporene-er-tomme', 'BH', 'vederlag');
    const hode = hodet(/^Vederlagsjustering/);
    expect(within(hode).getByText(LINJE.vederlag)).toBeTruthy();
    expect(within(hode).queryAllByRole('button')).toHaveLength(0);
    expect(screen.queryByRole('button', { name: /^Send/ })).toBeNull();
    expect(screen.queryByText(/frist(en)? (er )?oversittet|dager siden/i)).toBeNull();
  });

  it('siden for forholdet viser begge sporene med betegnelsen (U-6, OV-U125)', async () => {
    await vis('sporene-er-tomme', 'BH', 'forhold');
    const kortet = within(screen.getByRole('region', { name: 'Tilknyttede krav' }));
    for (const navn of ['Vederlagsjustering', 'Fristforlengelse']) {
      const krav = kortet.getByRole('heading', { level: 3, name: navn }).closest('li')!;
      expect(within(krav).getByText('Ingen varsel eller krav i saken')).toBeTruthy();
    }
  });

  it('når kravet i vederlaget er avgjort, står fristen fortsatt uten varsel eller krav, med det første fristkravet som hovedvalg (U-4, OV-U3)', async () => {
    await vis('fristsporet-er-tomt', 'TE', 'frist');
    const hode = within(hodet(/^Fristforlengelse/));
    expect(hode.getByText('Ingen varsel eller krav i saken')).toBeTruthy();
    expect(hode.getByRole('button', { name: 'Send krav om fristforlengelse' })).toBeTruthy();
  });
});

describe('påminnelsen ved det første kravet (U-3 i BF-51)', () => {
  it('varselet i sporet står med brevet og datoen, og uten veien til å legge det til (OV-U3, OV-U5)', async () => {
    const steg: Handling[] = [
      {
        handling: 'krav',
        spor: 'forhold',
        hovedkategori: 'svikt',
        underkategori: 'medvirkning',
        navn: 'K-g1',
      },
      { handling: 'varsel', spor: 'frist', navn: 'V-f1' },
    ];
    const forloep: Forloep = { id: 'foerstekrav', rader: [], start: null, steg, kontroller: [] };
    const k = await kjoer(forloep, minnebane({ sakstittel: 'Tegningene' }));
    const u = await k.utledning();
    render(Foerstekrav, { u, spor: 'frist', hjemmel: '33.4' });
    const varselbrevet = brevene(u).find((b) => b.spor.includes('frist'))!;
    const linje = screen.getByRole('listitem').textContent!;
    expect(linje).toMatch(
      new RegExp(
        `^Varsel etter punkt.33\\.4 i brev ${varselbrevet.nummer}, sendt \\d{1,2}\\. \\S+ \\d{4}\\.$`
      )
    );
    expect(screen.queryByRole('button')).toBeNull();
  });
});
