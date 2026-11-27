/**
 * Innlegget i Varden (BF-03, #1377): lenken i hodet til tråden, skjemaet, brevkontrollen,
 * kvitteringen, innlegget i tråden og innleggene i brevkontrollen for aksepten. Saken er BF-01
 * ved kontrollpunktet der totalentreprenøren har mottatt svaret, som utgangspunktet i BF-03.
 * Forventningene har kilden i bestillingen BF-03 og vedtakene den viser til.
 */
import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/svelte';
import { finnForloep, lagDemosak } from '#lib/kjernesak/demosak.ts';
import { lagKjernesak } from '#lib/kjernesak/kontekst.svelte.ts';
import type { Part } from '#kjerne/typer.ts';
import Vardensak from '#lib/components/varden/Vardensak.svelte';
import { registrerOppsett, sendBrevet } from './vardenOppsett.ts';

registrerOppsett();

async function aapneSaken(
  part: Part,
  forloep = 'BF-01',
  punkt = 'te-har-mottatt-svaret',
  spor: 'forhold' | 'vederlag' = 'vederlag'
) {
  const demosak = lagDemosak(finnForloep(forloep)!, punkt, part);
  const kjernesak = lagKjernesak({
    sakId: demosak.sakId,
    prosjektId: 'demo',
    part,
    hent: demosak.hent,
    send: demosak.send,
  });
  await kjernesak.last();
  render(Vardensak, { kjernesak, spor });
  return { demosak, kjernesak };
}

async function skrivInnlegget(tittel: string, tekst: string) {
  await fireEvent.click(await screen.findByRole('button', { name: 'Send innlegg' }));
  await fireEvent.input(screen.getByRole('textbox', { name: 'Tittel' }), {
    target: { value: tittel },
  });
  await fireEvent.input(screen.getByRole('textbox', { name: 'Tekst' }), {
    target: { value: tekst },
  });
}

describe('innlegget fra totalentreprenøren (BF-03 steg 1–5)', () => {
  it('U-2: lenken står i hodet til tråden, og skjemaet viser til byggherrens svar i brev 4', async () => {
    await aapneSaken('TE');
    const traaden = screen.getByRole('heading', { name: 'Brevene, nyeste først' }).parentElement!;
    // Unntaket 26.11 i #1377: handlingen er en lenke i hodet, som korrespondansen.
    expect(within(traaden).getByRole('button', { name: 'Send innlegg' })).toHaveClass(
      'knapp-lenke'
    );
    await fireEvent.click(within(traaden).getByRole('button', { name: 'Send innlegg' }));
    const valg = screen.getByRole('combobox', {
      name: 'Brevet innlegget viser til',
    }) as HTMLSelectElement;
    expect(valg.selectedOptions[0].textContent).toMatch(/^Brev 4 · .* · Byggherren · /);
    expect(screen.getAllByRole('option').length).toBe(4);
  });

  it('MM-U32: uten tittel og tekst står det som mangler, og brevkontrollen åpnes ikke', async () => {
    await aapneSaken('TE');
    await fireEvent.click(await screen.findByRole('button', { name: 'Send innlegg' }));
    await fireEvent.click(screen.getByRole('button', { name: 'Se brevet før sending' }));
    expect(screen.getAllByText('Skriv tittelen.').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Skriv teksten.').length).toBeGreaterThan(0);
    expect(screen.queryByRole('checkbox', { name: 'Jeg har kontrollert brevet' })).toBeNull();
  });

  it('U-3–U-6, D-3 og D-4: brevet, veien tilbake til utkastet, sendingen og svaret uendret', async () => {
    const { demosak, kjernesak } = await aapneSaken('TE');
    await skrivInnlegget('Varselet kom i tide', 'Varselet ble sendt samme dag som tegningene kom.');
    await fireEvent.click(screen.getByRole('button', { name: 'Se brevet før sending' }));

    // D-3: tittelen med sakens kode, henvisningen og teksten.
    const brev = await screen.findByRole('article', { name: 'Varselet kom i tide i sak KOE-17' });
    const tekst = within(brev).getByTestId('laast-tekst').textContent ?? '';
    expect(tekst).toMatch(/^Totalentreprenøren viser til brev K201-KOE-017-04 av /);
    expect(tekst).toContain('Varselet ble sendt samme dag som tegningene kom.');
    // U-3: innlegget endrer ikke svaret, og TE kan fortsatt godta det (MM-U47 punkt 4).
    expect(
      screen.getByText(
        'Innlegget sendes til byggherren og står i saken. Det endrer ikke svaret i brev 4 eller beløpet etter svaret.'
      )
    ).toBeVisible();
    expect(
      screen.getByText('Du kan fortsatt godta svaret eller sende en ny versjon av kravet.')
    ).toBeVisible();

    // U-5: tilbake til utkastet uten å miste det som er skrevet (G-3).
    await fireEvent.click(screen.getByRole('link', { name: /Tilbake til utkastet/ }));
    expect(screen.getByRole('textbox', { name: 'Tittel' })).toHaveValue('Varselet kom i tide');
    await fireEvent.click(screen.getByRole('button', { name: 'Se brevet før sending' }));
    await screen.findByRole('article', { name: 'Varselet kom i tide i sak KOE-17' });

    const svaretFoer = kjernesak.utledning!.spor.vederlag.gjeldendeSvar!.id;
    await sendBrevet('Send til byggherren');
    expect(
      await screen.findByText(
        'Innlegget er sendt til byggherren. Svaret i brev 4 står uendret. Du kan fortsatt godta det eller sende en ny versjon av kravet.'
      )
    ).toBeVisible();
    // D-4: svaret står som gjeldende svar.
    expect(kjernesak.utledning!.spor.vederlag.gjeldendeSvar!.id).toBe(svaretFoer);
    const sist = demosak.journal().at(-1)!;
    expect(sist.event_type).toBe('dokument_registrert');

    // U-6 og D-9: innlegget øverst i tråden med henvisningen, og linja under betegnelsen.
    await fireEvent.click(screen.getByRole('button', { name: /Tilbake til saken/ }));
    const rader = screen
      .getByRole('list', { name: 'Brevene, nyeste først' })
      .querySelectorAll(':scope > li');
    const oeverst = within(rader[0] as HTMLElement);
    expect(oeverst.getByText('Innlegg')).toBeVisible();
    expect(oeverst.getByRole('heading', { name: /^Varselet kom i tide/ })).toBeVisible();
    expect(oeverst.getByText('Viser til brev 4')).toBeVisible();
    // I hodet på siden og under betegnelsen i sporlista.
    expect(screen.getAllByText(/^Totalentreprenøren har sendt et innlegg \d/).length).toBe(2);
  });

  it('U-7 og D-8: brevkontrollen for aksepten viser innlegget som viser til svaret', async () => {
    await aapneSaken('TE');
    await skrivInnlegget('Varselet kom i tide', 'Varselet ble sendt samme dag.');
    await fireEvent.click(screen.getByRole('button', { name: 'Se brevet før sending' }));
    await screen.findByRole('article', { name: 'Varselet kom i tide i sak KOE-17' });
    await sendBrevet('Send til byggherren');
    await fireEvent.click(await screen.findByRole('button', { name: /Tilbake til saken/ }));

    await fireEvent.click(screen.getByRole('button', { name: /^Godta svaret/ }));
    const liste = await screen.findByRole('list', { name: 'Innlegg som viser til brev 4' });
    expect(within(liste).getByText(/^Brev 5 · Totalentreprenøren · .* · Varselet kom i tide$/));
    expect(
      screen.getByText(
        'Innlegget inngår ikke i aksepten. Aksepten frafaller ikke andre krav eller innsigelser.'
      )
    ).toBeVisible();
  });
});

describe('innlegget og sporet til brevet det viser til', () => {
  it('G-7 og U-3: et innlegg fra vederlagsjusteringen som viser til svaret på påberopelsen, nevner det svaret', async () => {
    await aapneSaken('TE');
    await skrivInnlegget('Om forholdet', 'Tegningene kom tre uker for sent.');
    const valg = screen.getByRole('combobox', { name: 'Brevet innlegget viser til' });
    const brev2 = [...(valg as HTMLSelectElement).options].find((o) =>
      o.textContent!.startsWith('Brev 2 ·')
    )!;
    await fireEvent.change(valg, { target: { value: brev2.value } });
    await fireEvent.click(screen.getByRole('button', { name: 'Se brevet før sending' }));
    await screen.findByRole('article', { name: 'Om forholdet i sak KOE-17' });
    expect(
      screen.getByText(
        'Innlegget sendes til byggherren og står i saken. Det endrer ikke svaret i brev 2 eller utfallet av det.'
      )
    ).toBeVisible();
  });

  it('D-9 og D-4: med akseptfrist står både fristen og innlegget under betegnelsen (BF-44)', async () => {
    await aapneSaken('TE', 'BF-44');
    await skrivInnlegget('Om svaret', 'Totalentreprenøren er uenig.');
    await fireEvent.click(screen.getByRole('button', { name: 'Se brevet før sending' }));
    await screen.findByRole('article', { name: 'Om svaret i sak KOE-17' });
    await sendBrevet('Send til byggherren');
    await fireEvent.click(await screen.findByRole('button', { name: /Tilbake til saken/ }));
    expect(
      screen.getByText(/^Akseptfrist 15\. oktober 2026 · Totalentreprenøren har sendt et innlegg /)
    ).toBeTruthy();
  });
});

describe('innlegget fra byggherren (BF-03 steg 6–7)', () => {
  it('U-8 og U-10: byggherren sender et innlegg uten å endre standpunktene i svaret (KA-U46 punkt 9)', async () => {
    const { kjernesak } = await aapneSaken('BH');
    await skrivInnlegget('Begrunnelse for svaret', 'Varselet kom tre uker etter tegningene.');
    await fireEvent.click(screen.getByRole('button', { name: 'Se brevet før sending' }));
    const brev = await screen.findByRole('article', {
      name: 'Begrunnelse for svaret i sak KOE-17',
    });
    expect(within(brev).getByTestId('laast-tekst').textContent).toMatch(
      /^Byggherren viser til brev K201-KOE-017-03 av /
    );
    expect(
      screen.getByText(
        'Et innlegg endrer ikke standpunktene i svaret, heller ikke når det sier at et varsel kom for sent. Vil du endre standpunktene, sender du et nytt svar.'
      )
    ).toBeVisible();
    const svaret = kjernesak.utledning!.spor.vederlag.gjeldendeSvar!;
    await sendBrevet('Send til totalentreprenøren');
    expect(
      await screen.findByText(
        'Innlegget er sendt til totalentreprenøren. Svaret i brev 4 står uendret. Vil du endre standpunktene, sender du et nytt svar.'
      )
    ).toBeVisible();
    expect(kjernesak.utledning!.spor.vederlag.gjeldendeSvar).toEqual(svaret);
  });

  it('U-10: etter et godtatt avslag tilbyr kjernen ikke et nytt svar, og teksten nevner det ikke (GR-U27, BF-02D)', async () => {
    const { kjernesak } = await aapneSaken('BH', 'BF-02D', 'saken-er-lukket', 'forhold');
    expect(kjernesak.handlinger).not.toContain('revidere:forhold');
    await skrivInnlegget('Om korrigeringen', 'Byggherren står ved svaret.');
    await fireEvent.click(screen.getByRole('button', { name: 'Se brevet før sending' }));
    await screen.findByRole('article', { name: /^Om korrigeringen i sak / });
    expect(
      screen.getByText(
        'Et innlegg endrer ikke standpunktene i svaret, heller ikke når det sier at et varsel kom for sent.'
      )
    ).toBeVisible();
    expect(screen.queryByText(/sender du et nytt svar/)).toBeNull();
  });
});
