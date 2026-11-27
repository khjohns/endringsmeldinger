/**
 * Korrespondansen lagt til i tråden (G-13 og G-12 i BF-49): kategorien, merket for skjemaet som
 * ikke er fylt ut, «Legg til på nytt» ved dokumentasjon fra egen side og henvisningene mellom
 * registreringen og den som retter den (U-10–U-12), i forløpet BF-49 i minnet.
 */
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/svelte';
import Demoforloep from '#lib/components/brukerforlop/Demoforloep.svelte';
import { finnForloep } from '#lib/kjernesak/demosak.ts';
import { LEGG_TIL } from '#lib/components/varden/tekster/index.ts';

afterEach(cleanup);

async function aapneSom(punkt: string, part: 'TE' | 'BH') {
  render(Demoforloep, { forloep: finnForloep('BF-49')!, punkt, onpunkt: () => {} });
  const panel = within(screen.getByRole('complementary', { name: 'Demo av brukerforløpet' }));
  await fireEvent.click(panel.getByRole('radio', { name: part }));
  await fireEvent.click(await screen.findByRole('button', { name: /^Vederlagsjustering/ }));
}

const raden = (tittel: string) =>
  screen.getByRole('heading', { level: 4, name: new RegExp(`^${tittel}`) }).closest('li')!;

describe('korrespondansen lagt til i tråden (BF-49)', () => {
  it('dokumentasjonen fra et skjema som ikke er fylt ut, har merket og «Legg til på nytt» for totalentreprenøren som la den til (U-11, U-12, variant E)', async () => {
    await aapneSom('skjemaet-er-ikke-fylt-ut', 'TE');
    const rad = within(raden('Krav om justerte enhetspriser for omleggingen'));
    expect(rad.getByText(LEGG_TIL.ikkeFyltUt)).toBeInTheDocument();
    expect(rad.getByText(LEGG_TIL.merke.dokumentasjon)).toBeInTheDocument();
    expect(rad.getByText(/^Brev fra totalentreprenøren\. Sendt 11\. oktober 2026/)).toBeTruthy();
    await fireEvent.click(rad.getByRole('button', { name: /^Legg til på nytt/ }));
    expect(screen.getByRole('heading', { name: LEGG_TIL.tittelPaaNytt })).toBeInTheDocument();
    expect(screen.getByLabelText('Datoen det ble sendt')).toHaveValue('2026-10-11');
    expect(screen.getByRole('radio', { name: 'Totalentreprenøren' })).toBeChecked();
  });

  it('kontrollsak: byggherren får ikke «Legg til på nytt» ved totalentreprenørens dokumentasjon (OV-U17, D-13)', async () => {
    await aapneSom('skjemaet-er-ikke-fylt-ut', 'BH');
    const rad = within(raden('Krav om justerte enhetspriser for omleggingen'));
    expect(rad.queryByRole('button', { name: /^Legg til på nytt/ })).toBeNull();
  });

  it('etter kravet lagt til på nytt viser tråden at registreringen er erstattet, uten merket og handlingen (U-11, U-12)', async () => {
    await aapneSom('kravet-retter-dokumentasjonen', 'TE');
    const rader = screen
      .getAllByRole('heading', { level: 4 })
      .map((h) => h.closest('li')!)
      .filter((li) => /Lagt til på nytt|Erstattet av/.test(li.textContent ?? ''));
    const tekst = rader.map((li) => li.textContent).join('\n');
    expect(tekst).toMatch(/Erstattet av korrespondansen lagt til på nytt/);
    expect(tekst).toMatch(/Lagt til på nytt i stedet for korrespondansen lagt til/);
    for (const li of rader) {
      expect(within(li).queryByText(LEGG_TIL.ikkeFyltUt)).toBeNull();
      expect(within(li).queryByRole('button', { name: /^Legg til på nytt/ })).toBeNull();
    }
    expect(
      within(rader.find((li) => /i stedet for/.test(li.textContent ?? ''))!).getByText(
        LEGG_TIL.merke.krav
      )
    ).toBeInTheDocument();
  });
});
