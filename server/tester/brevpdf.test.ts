/**
 * PDF-en av brevet (L-1c1, #371 del 2). Kilde: merknaden 12.10 i #371 og LV-U2: PDF-en
 * gjengir den frosne brevteksten tro, uten utelatelser ved sidebrekk eller skrift.
 */

import { describe, expect, it } from 'vitest';
import { gjengirTro } from '../../kjerne/frosset/brevtekst.ts';
import type { Avsnitt } from '../../kjerne/typer.ts';
import { readFileSync } from 'node:fs';
import { tegnSomIkkeKanVises } from '../../kjerne/format/skjema.ts';
import { lesBrevPdf, skriftFor, skrivBrevPdf, TegnUtenforSkriften } from '../brevpdf.ts';
import { TEGNSETTFIL, tegnsettfil, utelatteTegn } from '../tegnsett.ts';
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

/**
 * #801: kjernen avviser et tegn PDF-en ikke kan vise, før brevet skrives, etter tabellen i
 * `kjerne/format/tegnsett.ts`. Tabellen og skriftene skal ikke gli fra hverandre.
 */
describe('tegnene kjernen godtar, er tegnene PDF-en kan sette (#801)', () => {
  it('tabellen i kjernen er den `node server/tegnsett.ts` lager av skriftene', async () => {
    expect(readFileSync(TEGNSETTFIL, 'utf8'), 'kjør `node server/tegnsett.ts`').toBe(
      await tegnsettfil()
    );
  }, 120000);

  it('kjernen og `skriftFor` er enige om hvert kodepunkt, utenom tegnene PDF-en ikke gjengir tro', async () => {
    const utelatt = await utelatteTegn();
    const settes = (tegn: string) => {
      try {
        skriftFor(tegn);
        return true;
      } catch (feil) {
        if (feil instanceof TegnUtenforSkriften) return false;
        throw feil;
      }
    };
    const uenige: string[] = [];
    let godtatt = 0;
    // Skriftene har ingen tegn over plan 1; at tabellen heller ikke har det, prøves over.
    for (let kode = 0; kode <= 0x2ffff; kode++) {
      // Surrogatene er ikke tegn, og tab, LF, VT, FF og CR settes om før `skriftFor`.
      if ((kode >= 0xd800 && kode <= 0xdfff) || (kode >= 0x9 && kode <= 0xd)) continue;
      const tegn = String.fromCodePoint(kode);
      const kjernen = tegnSomIkkeKanVises(tegn, 'x') === null;
      if (kjernen) godtatt++;
      if (kjernen !== (settes(tegn) && !utelatt.has(kode))) uenige.push(kode.toString(16));
    }
    expect(uenige).toEqual([]);
    expect(godtatt, 'kontroll: skriftene har noen tusen tegn').toBeGreaterThan(4000);
  }, 120000);

  it('hvert tegn kjernen godtar, kommer tilbake fra PDF-en som det ble skrevet, også sammen med de andre', async () => {
    // Kilden er LV-U2: PDF-en skal gjengi brevteksten tro. Ett brev med alle tegnene, så et
    // tegn som deler glyf med et annet eller endres av en substitusjon, også blir funnet.
    const linjer = ['ﬁ og fi', 'i\u0301 og ı', 'Thị, ọ og ẹ', 'a\u0328 og ą', 'ö og o\u0308'];
    for (let kode = 0x21; kode <= 0x2ffff; kode++) {
      if (kode >= 0xd800 && kode <= 0xdfff) continue;
      const tegn = String.fromCodePoint(kode);
      if (tegnSomIkkeKanVises(tegn, 'x') !== null || /\p{Default_Ignorable_Code_Point}/u.test(tegn))
        continue;
      linjer.push(/\p{M}/u.test(tegn) ? `a a${tegn} b` : `a ${tegn} b`);
    }
    for (const linje of linjer.slice(0, 5))
      expect(tegnSomIkkeKanVises(linje, 'x'), linje).toBeNull();
    const tekst = linjer.join('\n');
    const tilbake = lesBrevPdf(await skrivBrevPdf(tekst, 'x', new Date(TIDSSTEMPEL))).split('\n');
    expect(tilbake.length, 'like mange linjer tilbake').toBe(linjer.length);
    expect(tilbake.filter((l, i) => l !== linjer[i])).toEqual([]);
    expect(linjer.length, 'kontroll: skriftene har noen tusen tegn').toBeGreaterThan(4000);
  }, 120000);

  it('svake og nøytrale tegn fra høyre-mot-venstre-skrift ved siden av hverandre og av tall kommer tilbake i samme rekkefølge (#1138 punkt 4)', async () => {
    // Kilden er LV-U2: PDF-en skal gjengi brevteksten tro. Arabisk komma (U+060C) er et
    // skilletegn i tall etter Unicode-bidi, og en leser som ordner om etter bidi, kunne
    // flytte det. De andre tegnene med arabisk skrift kjernen godtar, er U+204F og U+2E41.
    const linjer = [
      '1،2',
      '1،2،3',
      '1 ، 2',
      'a،b',
      '،،،',
      '(،)',
      '«،» og [،]',
      '-1،+2',
      '§ 33.8، 12 000،50 kr',
      'a ، ⁏ ⹁ b',
      '1⁏2⹁3',
      '، 1',
      '1 ،',
    ];
    for (const linje of linjer) expect(tegnSomIkkeKanVises(linje, 'x'), linje).toBeNull();
    const tekst = linjer.join('\n');
    const tilbake = lesBrevPdf(await skrivBrevPdf(tekst, 'x', new Date(TIDSSTEMPEL))).split('\n');
    expect(tilbake).toEqual(linjer);
  });

  it('arabisk skrift, U+2028 og en matematisk bokstav som deler glyf med en lavere, avvises', () => {
    // `abc اب def` kommer tilbake som `abc با def`, og 𝗔 (U+1D5D4) som 𝐀 (U+1D400).
    for (const tegn of ['ب', '\u2028', '𝗔'])
      expect(tegnSomIkkeKanVises(`abc ${tegn} def`, 'x'), tegn).not.toBeNull();
    // Kilden er arbeidsvalg 2 og 22.10 i #801: norske bokstaver, pilen og myk bindestrek vises.
    expect(
      tegnSomIkkeKanVises('Nguyễn, ø, æ, å, Å, →, ∑, 𝐀 og myk\u00adbindestrek', 'x')
    ).toBeNull();
  });
});
