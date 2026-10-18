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

  it('samme oppdrag gir samme fil, også med reserveskriften', async () => {
    const medPil = LANG.map((a) => ({ ...a, laast: a.laast.replace(' om ', ' → ') }));
    for (const tekst of [LANG, medPil]) {
      const [a, b] = await Promise.all([1, 2].map(() => brevdokument(oppdrag(tekst), 'n')));
      expect(a.innhold).toEqual(b.innhold);
    }
  }, 20_000);

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

  // Kilde: #799 og oppdragsgiver 18.10 (#764): skriften er Noto Sans bygd inn, så tegn
  // utenfor WinAnsi leveres. Et tegn Noto Sans mangler, som →, settes med Noto Sans Math
  // (arbeidsvalget i #799). Emoji støttes ikke i første versjon og parkeres.
  it('gjengir gresk, hardt bindestrek (U+2011) og ligaturer tro med den innebygde skriften', async () => {
    const tekst: Avsnitt[] = [
      {
        gjelder: 'a',
        laast: 'Faktor α = 0,8 og Ω-profil i 2\u20113 etasje.',
        utdypning: 'Flere fiffige filer.',
      },
    ];
    const pdf = (await brevdokument(oppdrag(tekst), 'n')).innhold;
    expect(lesBrevPdf(pdf)).toContain('Faktor α = 0,8 og Ω-profil i 2\u20113 etasje.');
    expect(lesBrevPdf(pdf)).toContain('Flere fiffige filer.');
    expect(latin1(pdf)).toContain('/Encoding /Identity-H');
    expect(latin1(pdf)).not.toContain('Helvetica');
  });

  it('gjengir → og ⇒ med reserveskriften tro, også i et ord som deles over linjer', async () => {
    const langt = `A→B${'x→'.repeat(80)}`;
    const tekst: Avsnitt[] = [
      { gjelder: 'a', laast: 'Fristen er 3 uker → 21 dager, så ⇒ ny frist.', utdypning: langt },
    ];
    const pdf = (await brevdokument(oppdrag(tekst), 'n')).innhold;
    expect(lesBrevPdf(pdf)).toContain('Fristen er 3 uker → 21 dager, så ⇒ ny frist.');
    expect(lesBrevPdf(pdf).replace(/\n/g, '')).toContain(langt);
    expect(latin1(pdf)).toContain('/BaseFont /NotoSansMath-Regular');
  });

  it('bygger ikke inn reserveskriften når brevet ikke trenger den', async () => {
    const pdf = (await brevdokument(oppdrag([{ gjelder: 'a', laast: 'Tekst.' }]), 'n')).innhold;
    expect(latin1(pdf)).not.toContain('NotoSansMath');
  });

  it('avviser et tegn ingen av skriftene har, som emoji, og sier hvilket tegn', async () => {
    const svar = brevdokument(oppdrag([{ gjelder: 'a', laast: 'Bra → 😀' }]), 'n');
    await expect(svar).rejects.toBeInstanceOf(UgjengivbartBrev);
    await expect(svar).rejects.toThrow('U+1F600');
  });

  // Kilde: orkestratoren 18.10 (#802): hvert tegn i WinAnsi leveres, også U+00AD.
  it('leverer hvert tegn i WinAnsi, også mykt bindestrek, og leser teksten tilbake ordrett', async () => {
    const winAnsi = [
      ...new TextDecoder('windows-1252').decode(Uint8Array.from({ length: 224 }, (_, i) => i + 32)),
    ]
      .filter((t) => !/\p{Cc}/u.test(t))
      .join('');
    expect(winAnsi).toContain('\u00ad');
    const tekst: Avsnitt[] = [
      { gjelder: 'a', laast: 'Tekst.', utdypning: `${winAnsi} og myk\u00adbindestrek` },
    ];
    const lest = lesBrevPdf((await brevdokument(oppdrag(tekst), 'n')).innhold);
    expect(lest).toContain('myk\u00adbindestrek');
    expect(lest.replace(/\s+/g, ' ')).toContain(winAnsi.replace(/\s+/g, ' '));
    expect(gjengirTro(lest, tekst)).toBe(true);
  });

  it('avviser et usynlig tegn, som U+200B, i stedet for å sette det som mellomrom', async () => {
    for (const [laast, kode] of [
      ['null\u200bbredde', 'U+200B'],
      ['bom\ufeffmidt', 'U+FEFF'],
    ]) {
      const svar = brevdokument(
        oppdrag([{ gjelder: 'a', laast: 'Tekst.', utdypning: laast }]),
        'n'
      );
      await expect(svar).rejects.toBeInstanceOf(UgjengivbartBrev);
      await expect(svar).rejects.toThrow(kode);
    }
  });

  it('avviser ikke en feil som ikke gjelder skriften, som et tidsstempel som ikke kan tolkes, som skriftfeil (#795 punkt 3)', async () => {
    const o = oppdrag([{ gjelder: 'a', laast: 'Tekst.' }]);
    o.brev.tidsstempel = 'ikke en dato';
    const feil = await brevdokument(o, 'n').catch((f: unknown) => f);
    expect(feil).toBeInstanceOf(Error);
    expect(feil).not.toBeInstanceOf(UgjengivbartBrev);
  });

  it('avviser et oppdrag uten dokument, som et registrert brev (LV-U11)', async () => {
    await expect(brevdokument(oppdrag(null), 'n')).rejects.toBeInstanceOf(UgjengivbartBrev);
  });
});

function latin1(b: Uint8Array): string {
  return Buffer.from(b).toString('latin1');
}
