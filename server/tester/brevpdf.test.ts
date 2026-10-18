/**
 * PDF-en av brevet (L-1c1, #371 del 2). Kilde: merknaden 12.10 i #371 og LV-U2: PDF-en
 * gjengir den frosne brevteksten tro, uten utelatelser ved sidebrekk eller skrift.
 */

import { describe, expect, it } from 'vitest';
import { gjengirTro } from '../../kjerne/frosset/brevtekst.ts';
import type { Avsnitt } from '../../kjerne/typer.ts';
import { lesBrevPdf, skrivBrevPdf } from '../brevpdf.ts';
import { brevdokument, gjengiOppdrag, UgjengivbartBrev } from '../levering.ts';

const TIDSSTEMPEL = '2026-10-01T10:00:00.000Z';

const oppdrag = (brevtekst: Avsnitt[] | null) => ({
  brev: {
    sak_id: 'sak-1',
    saksversjon: 2,
    tidsstempel: TIDSSTEMPEL,
    avsender: { part: 'TE' },
    brevtekst,
  },
  dokument: brevtekst ? { noekkel: 'noekkel-1', filnavn: 'brev-sak-1-2.pdf' } : null,
});

/** Nok tekst til flere sider, med tegnene utenfor ASCII som brevene bruker. */
const LANG: Avsnitt[] = Array.from({ length: 40 }, (_, i) => ({
  gjelder: `a${i}`,
  laast: `Avsnitt ${i}: Totalentreprenøren krever endring etter NS 8407 § 33.4 – «varsel» om ÆØÅ æøå.`,
  utdypning: `Utdypning ${i}: ${'Byggherren har pålagt en annen fundamentering. '.repeat(6)}`,
}));

describe('PDF-en av brevet (#371 del 2)', () => {
  it('gjengir en tekst over flere sider tro, med hodet først, og har navnet med dokumentnøkkelen', async () => {
    const dokument = await brevdokument(oppdrag(LANG), 'noekkel-1');
    const lest = lesBrevPdf(dokument.innhold);
    expect(dokument.navn).toBe('brev-sak-1-2-noekkel-1.pdf');
    expect(new TextDecoder().decode(dokument.innhold.subarray(0, 8))).toBe('%PDF-1.7');
    expect((lest.match(/\n/g) ?? []).length).toBeGreaterThan(60);
    expect(gjengirTro(lest, LANG)).toBe(true);
    expect(lest.replace(/\s+/g, ' ')).toBe(gjengiOppdrag(oppdrag(LANG))!.replace(/\s+/g, ' '));
  });

  it('lesingen ser at en side mangler, så kontrollen ikke godtar en utelatelse ved sidebrekk', async () => {
    const tekst = gjengiOppdrag(oppdrag(LANG))!;
    const hel = await skrivBrevPdf(tekst, 'x', new Date(TIDSSTEMPEL));
    const sider = (latin1(hel).match(/\/Type \/Page\b/g) ?? []).length;
    expect(sider).toBeGreaterThan(1);
    const utenSisteSide = latin1(hel).replace(/\/Kids \[ ((?:\d+ 0 R )+)\d+ 0 R \]/, '/Kids [ $1]');
    const kortere = lesBrevPdf(new Uint8Array(Buffer.from(utenSisteSide, 'latin1')));
    expect(gjengirTro(kortere, LANG)).toBe(false);
  });

  it('samme oppdrag gir samme fil', async () => {
    const [a, b] = await Promise.all([1, 2].map(() => brevdokument(oppdrag(LANG), 'n')));
    expect(a.innhold).toEqual(b.innhold);
  });

  it('gjengir et ord som er lengre enn linjen, tro, når det deles over flere linjer', async () => {
    const tekst: Avsnitt[] = [
      {
        gjelder: 'a',
        laast: 'Se tegningen.',
        utdypning: `Se https://example.com/${'x'.repeat(300)} nå.`,
      },
    ];
    const lest = lesBrevPdf((await brevdokument(oppdrag(tekst), 'n')).innhold);
    expect(lest).toContain(`https://example.com/${'x'.repeat(300)} nå.`);
    expect(gjengirTro(lest, tekst)).toBe(true);
  });

  it('setter tab og CR som mellomrom og linjeskift og gjengir teksten tro', async () => {
    const tekst: Avsnitt[] = [{ gjelder: 'a', laast: 'Post\t1:\r\nMengde\r2' }];
    const lest = lesBrevPdf((await brevdokument(oppdrag(tekst), 'n')).innhold);
    expect(gjengirTro(lest, tekst)).toBe(true);
  });

  it('lager ingen tom side for tomme linjer over et sidebrekk', async () => {
    const tekst: Avsnitt[] = [
      { gjelder: 'a', laast: 'Tekst', utdypning: `Slutt${'\n'.repeat(80)}` },
    ];
    const pdf = (await brevdokument(oppdrag(tekst), 'n')).innhold;
    expect((latin1(pdf).match(/\/Type \/Page\b/g) ?? []).length).toBe(1);
    expect(gjengirTro(lesBrevPdf(pdf), tekst)).toBe(true);
  });

  it('setter sammen et ord som er delt over et sidebrekk, på neste side', async () => {
    const ord = `ref-${'y'.repeat(200)}`;
    const tekst: Avsnitt[] = [
      { gjelder: 'a', laast: 'Start', utdypning: `${'linje\n'.repeat(45)}${ord} slutt.` },
    ];
    const pdf = (await brevdokument(oppdrag(tekst), 'n')).innhold;
    expect((latin1(pdf).match(/\/Type \/Page\b/g) ?? []).length).toBe(2);
    expect(lesBrevPdf(pdf)).toContain(`${ord} slutt.`);
  });

  it('beholder hardt mellomrom, som skriften har', async () => {
    const tekst: Avsnitt[] = [{ gjelder: 'a', laast: 'Etter §\u00a033.8 gjelder 21\u00a0dager.' }];
    expect(lesBrevPdf((await brevdokument(oppdrag(tekst), 'n')).innhold)).toContain(
      'Etter §\u00a033.8 gjelder 21\u00a0dager.'
    );
  });

  it('avviser et tegn skriften ikke har, i stedet for å utelate det', async () => {
    const tekst: Avsnitt[] = [{ gjelder: 'a', laast: 'Fristen er 3 uker → 21 dager.' }];
    await expect(brevdokument(oppdrag(tekst), 'n')).rejects.toBeInstanceOf(UgjengivbartBrev);
  });

  it('avviser et oppdrag uten dokument, som et registrert brev (LV-U11)', async () => {
    await expect(brevdokument(oppdrag(null), 'n')).rejects.toBeInstanceOf(UgjengivbartBrev);
  });
});

function latin1(b: Uint8Array): string {
  return Buffer.from(b).toString('latin1');
}
