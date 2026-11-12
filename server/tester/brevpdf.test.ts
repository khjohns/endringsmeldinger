/**
 * PDF-en av brevet (L-1c1, #371 del 2). Kilde: merknaden 12.10 i #371 og LV-U2: PDF-en
 * gjengir den frosne brevteksten tro, uten utelatelser ved sidebrekk eller skrift.
 */

import { describe, expect, it } from 'vitest';
import { gjengirTro } from '../../kjerne/frosset/brevtekst.ts';
import type { Avsnitt } from '../../kjerne/typer.ts';
import { readFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';
import { tegnSomIkkeKanVises } from '../../kjerne/format/skjema.ts';
import { createHash } from 'node:crypto';
import {
  brevprofil,
  fraWoff,
  lesBrevPdf,
  objekter,
  settBrevPdf,
  skriftFor,
  skriftnavn,
  skrivBrevPdf,
  TegnUtenforSkriften,
} from '../brevpdf.ts';
import { TEGNSETTFIL, tegnsettfil, utelatteTegn } from '../tegnsett.ts';
import { brevdokument, gjengiOppdrag, UgjengivbartBrev } from '../levering.ts';

const TIDSSTEMPEL = '2026-10-01T10:00:00.000Z';

const oppdrag = (brevtekst: Avsnitt[] | null, part: 'TE' | 'BH' = 'TE') => ({
  brev: {
    tidsstempel: TIDSSTEMPEL,
    avsender: { part },
    brevtekst,
    merking: brevtekst ? 'K201-KOE-005-03' : null,
    brevprofil: brevtekst ? brevprofil(part) : null,
  },
  dokument: brevtekst ? { noekkel: 'noekkel-1', filnavn: 'K201-KOE-005-03.pdf' } : null,
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
    expect(dokument.navn).toBe('K201-KOE-005-03-noekkel-1.pdf');
    expect(lest.startsWith('Vår ref.: K201-KOE-005-03\n')).toBe(true);
    expect(lest).not.toContain('Deres ref.');
    expect(new TextDecoder().decode(dokument.innhold.subarray(0, 8))).toBe('%PDF-1.7');
    expect((lest.match(/\n/g) ?? []).length).toBeGreaterThan(60);
    expect(gjengirTro(lest, LANG)).toBe(true);
    expect(lest.replace(/\s+/g, ' ')).toBe(gjengiOppdrag(oppdrag(LANG))!.replace(/\s+/g, ' '));
  });

  it('gjengir tittelen og Deres ref. kjernen frøs, med én kode per linje (#1533 punkt 2, LV-U23, LV-U49, U-2 i BF-07)', async () => {
    const medHode = {
      ...oppdrag(LANG.slice(0, 2)),
      brev: {
        ...oppdrag(LANG.slice(0, 2)).brev,
        dokument: {
          brevtittel: 'Svar på krav om vederlagsjustering i sak KOE-5',
          deres_ref: ['K201-KOE-005-01', 'K201-KOE-005-02'],
        },
      },
    };
    const lest = lesBrevPdf((await brevdokument(medHode, 'n')).innhold);
    expect(lest.split('\n').slice(0, 5)).toEqual([
      'Svar på krav om vederlagsjustering i sak KOE-5',
      'Deres ref.: K201-KOE-005-01',
      'K201-KOE-005-02',
      'Vår ref.: K201-KOE-005-03',
      'Fra: Totalentreprenøren (TE)',
    ]);
  });

  it('lesingen ser at en side mangler, så kontrollen ikke godtar en utelatelse ved sidebrekk', async () => {
    const tekst = gjengiOppdrag(oppdrag(LANG))!;
    const hel = await skrivBrevPdf(tekst, 'x', new Date(TIDSSTEMPEL), 'TE');
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

  // Kilde: #1672. → ≥ ≤ og № fra Noto-skriftene var blanke i poppler, selv om tekstlesingen
  // gav dem tilbake: i delmengden mistet en glyf med odde lengde den siste byten, og glyfene
  // etter den fikk feil start. Hver glyf skal stå hel i delmengden, med delene den er satt
  // sammen av.
  it.each([
    ['BH', ['', 'NotoSans-Regular.ttf', 'NotoSansMath-Regular.ttf']],
    ['TE', ['SourceSerif4-Regular.ttf', 'NotoSans-Regular.ttf', 'NotoSansMath-Regular.ttf']],
  ] as const)(
    'tar med hver glyf fra en TrueType-delmengde i brevet fra %s hel (#1672)',
    async (part, filer) => {
      /** Tabellen med merket i et TrueType-program. */
      const tabell = (b: Buffer, merke: string) => {
        for (let i = 0; i < b.readUInt16BE(4); i++)
          if (b.toString('latin1', 12 + 16 * i, 16 + 16 * i) === merke) {
            const fra = b.readUInt32BE(20 + 16 * i);
            return b.subarray(fra, fra + b.readUInt32BE(24 + 16 * i));
          }
        throw new Error(`skriftprogrammet har ingen ${merke}`);
      };
      /** Glyfene i et TrueType-program, avgrenset av `loca`. */
      const glyfer = (b: Buffer) => {
        const lang = tabell(b, 'head').readInt16BE(50) === 1;
        const [loca, glyf] = [tabell(b, 'loca'), tabell(b, 'glyf')];
        const fra = (i: number) => (lang ? loca.readUInt32BE(4 * i) : 2 * loca.readUInt16BE(2 * i));
        return Array.from({ length: loca.length / (lang ? 4 : 2) - 1 }, (_, i) =>
          glyf.subarray(fra(i), fra(i + 1))
        );
      };
      /** Glyf-ID-en for et tegn i planet BMP, fra delen i `cmap` med format 4 for Unicode. */
      const glyfIdFor = (b: Buffer, kode: number) => {
        const cmap = tabell(b, 'cmap');
        for (let i = 0; i < cmap.readUInt16BE(2); i++) {
          const [plattform, koding] = [cmap.readUInt16BE(4 + 8 * i), cmap.readUInt16BE(6 + 8 * i)];
          const t = cmap.subarray(cmap.readUInt32BE(8 + 8 * i));
          if (!(plattform === 3 && koding === 1) || t.readUInt16BE(0) !== 4) continue;
          const n = t.readUInt16BE(6) / 2;
          const felt = (start: number, j: number) => start + 2 * j;
          for (let j = 0; j < n; j++) {
            const slutt = t.readUInt16BE(felt(14, j));
            if (slutt < kode) continue;
            const start = t.readUInt16BE(felt(16 + 2 * n, j));
            if (start > kode) return 0;
            const delta = t.readInt16BE(felt(16 + 4 * n, j));
            const rangePlass = felt(16 + 6 * n, j);
            const range = t.readUInt16BE(rangePlass);
            if (range === 0) return (kode + delta) & 0xffff;
            const id = t.readUInt16BE(rangePlass + range + 2 * (kode - start));
            return id === 0 ? 0 : (id + delta) & 0xffff;
          }
        }
        throw new Error('skriftprogrammet har ingen cmap med format 4 for Unicode');
      };
      /** Glyf-ID-ene til delene i en sammensatt glyf, med plassen de står på. */
      const deler = (g: Buffer) => {
        const ut: { plass: number; id: number }[] = [];
        if (g.length === 0 || g.readInt16BE(0) >= 0) return ut;
        for (let p = 10, flagg = 0x20; flagg & 0x20; ) {
          flagg = g.readUInt16BE(p);
          ut.push({ plass: p + 2, id: g.readUInt16BE(p + 2) });
          p += 4 + (flagg & 1 ? 4 : 2) + (flagg & 8 ? 2 : flagg & 0x40 ? 4 : flagg & 0x80 ? 8 : 0);
        }
        return ut;
      };
      /** Glyfen med ID-ene til delene satt til 0, så en glyf fra delmengden kan sammenlignes. */
      const utenIder = (g: Buffer) => {
        const kopi = Buffer.from(g);
        for (const { plass } of deler(g)) kopi.writeUInt16BE(0, plass);
        return kopi;
      };
      const tegn = ['→', '≥', '≤', '№', '⇒', 'α', 'Ω', String.fromCodePoint(0xad), 'Æ', 'g'];
      const tekst = `Krav ${tegn.join(' ')} slutt.`;
      const pdf = (await brevdokument(oppdrag([{ gjelder: 'a', laast: tekst }], part), 'n'))
        .innhold;
      const iBrevet = [...latin1(pdf).matchAll(/\/FlateDecode[^]*?stream\r?\n([^]*?)endstream/g)]
        .map((m) => inflateSync(Buffer.from(m[1], 'latin1')))
        .filter((b) => ['true', '\0\x01\0\0'].includes(b.subarray(0, 4).toString('latin1')))
        .flatMap(glyfer)
        .map(utenIder);
      expect(iBrevet.length, 'forutsetningen: brevet har en TrueType-delmengde').toBeGreaterThan(0);
      const brevskrift = part === 'BH' ? 'osloSans' : 'sourceSerif4';
      let proevd = 0;
      for (const t of tegn) {
        const fil = filer[skriftFor(t, brevskrift)];
        if (!fil) continue;
        const skrift = readFileSync(new URL(`../skrift/${fil}`, import.meta.url));
        const iFila = glyfer(skrift);
        const kontroller = (id: number, hva: string) => {
          const glyf = iFila[id];
          expect(glyf.length, `forutsetningen: ${hva} har omriss i ${fil}`).toBeGreaterThan(0);
          const ventet = utenIder(glyf);
          expect(
            iBrevet.some((g) => g.subarray(0, ventet.length).equals(ventet)),
            `${hva} fra ${fil} står hel i delmengden`
          ).toBe(true);
          for (const del of deler(glyf)) kontroller(del.id, `en del av ${hva}`);
        };
        kontroller(glyfIdFor(skrift, t.codePointAt(0)!), t);
        proevd++;
      }
      expect(proevd, 'forutsetningen: tegn fra reserveskriftene er prøvd').toBeGreaterThan(3);
    }
  );

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

  it('kjernen og `skriftFor` for hver brevskrift er enige om hvert kodepunkt, utenom tegnene PDF-en ikke gjengir tro', async () => {
    const utelatt = await utelatteTegn();
    const settes = (tegn: string) => {
      try {
        return skriftnavn.every((navn) => skriftFor(tegn, navn) >= 0);
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

  it.each(skriftnavn)(
    'hvert tegn kjernen godtar, kommer tilbake fra PDF-en som det ble skrevet, også sammen med de andre, med brevskriften %s',
    async (brevskrift) => {
      // Kilden er LV-U2: PDF-en skal gjengi brevteksten tro. Ett brev med alle tegnene, så et
      // tegn som deler glyf med et annet eller endres av en substitusjon, også blir funnet.
      const linjer = ['ﬁ og fi', 'i\u0301 og ı', 'Thị, ọ og ẹ', 'a\u0328 og ą', 'ö og o\u0308'];
      for (let kode = 0x21; kode <= 0x2ffff; kode++) {
        if (kode >= 0xd800 && kode <= 0xdfff) continue;
        const tegn = String.fromCodePoint(kode);
        if (
          tegnSomIkkeKanVises(tegn, 'x') !== null ||
          /\p{Default_Ignorable_Code_Point}/u.test(tegn)
        )
          continue;
        linjer.push(/\p{M}/u.test(tegn) ? `a a${tegn} b` : `a ${tegn} b`);
      }
      for (const linje of linjer.slice(0, 5))
        expect(tegnSomIkkeKanVises(linje, 'x'), linje).toBeNull();
      const tekst = linjer.join('\n');
      const tilbake = lesBrevPdf(
        await settBrevPdf(tekst, 'x', new Date(TIDSSTEMPEL), brevskrift, false)
      ).split('\n');
      expect(tilbake.length, 'like mange linjer tilbake').toBe(linjer.length);
      expect(tilbake.filter((l, i) => l !== linjer[i])).toEqual([]);
      expect(linjer.length, 'kontroll: skriftene har noen tusen tegn').toBeGreaterThan(4000);
    },
    120000
  );

  it.each(skriftnavn)(
    'svake og nøytrale tegn fra høyre-mot-venstre-skrift ved siden av hverandre og av tall kommer tilbake i samme rekkefølge, med brevskriften %s (#1138 punkt 4)',
    async (brevskrift) => {
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
      const tilbake = lesBrevPdf(
        await settBrevPdf(tekst, 'x', new Date(TIDSSTEMPEL), brevskrift, false)
      ).split('\n');
      expect(tilbake).toEqual(linjer);
    }
  );

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

// Kilde: LV-U26 for byggherrens skrift, LV-U58 for totalentreprenørens, LV-U59 for hodet
// (#1658, kravene i #1652) og `.interface-design/system.md`,
// «Typografi»: hele brevet står i avsenderens skrift, byggherrens i Oslo Sans i 11 pt og
// totalentreprenørens i Source Serif 4 i 16 px (12 pt), begge med linjehøyde 1,6. Oslo Sans
// brukes aldri i totalentreprenørens brev.
describe('brevskriften følger avsenderen (#1658, LV-U58, LV-U59)', () => {
  const tekst: Avsnitt[] = [
    { gjelder: 'a', laast: 'Første linje.', utdypning: 'Andre linje.\nTredje linje.' },
  ];
  /** Sideinnholdet, pakket ut av strømmene med FlateDecode. */
  const sideinnhold = (pdf: Uint8Array) =>
    [...latin1(pdf).matchAll(/\/FlateDecode[^]*?stream\r?\n([^]*?)endstream/g)]
      .map((m) => {
        try {
          return inflateSync(Buffer.from(m[1], 'latin1')).toString('latin1');
        } catch {
          return '';
        }
      })
      .join('\n');
  const linjeavstand = (pdf: Uint8Array) => {
    const hoeyder = [...sideinnhold(pdf).matchAll(/(-?[\d.]+) Tm/g)].map((m) => Number(m[1]));
    return Math.round((hoeyder[0] - hoeyder[1]) * 100) / 100;
  };

  it('setter byggherrens brev i Oslo Sans i 11 pt med linjehøyde 1,6', async () => {
    const pdf = (await brevdokument(oppdrag(tekst, 'BH'), 'n')).innhold;
    expect(latin1(pdf)).toMatch(/\/BaseFont \/OsloSans-Regular-/);
    expect(sideinnhold(pdf)).toMatch(/ 11 Tf/);
    expect(linjeavstand(pdf)).toBe(17.6);
    expect(gjengirTro(lesBrevPdf(pdf), tekst)).toBe(true);
  });

  it('setter totalentreprenørens brev i Source Serif 4 i 12 pt med linjehøyde 1,6, uten Oslo Sans', async () => {
    const pdf = (await brevdokument(oppdrag(tekst, 'TE'), 'n')).innhold;
    expect(latin1(pdf)).toMatch(/\/BaseFont \/SourceSerif4-Regular-/);
    expect(sideinnhold(pdf)).toMatch(/ 12 Tf/);
    expect(linjeavstand(pdf)).toBe(19.2);
    expect(latin1(pdf)).not.toContain('OsloSans');
    expect(gjengirTro(lesBrevPdf(pdf), tekst)).toBe(true);
  });

  const linje = 'Myk\u00adbindestrek, 2-3, 2\u20113, §\u00a033.8, 3 → 4, a ≥ b ≤ c, № 5.';

  it.each(['TE', 'BH'] as const)(
    'gjengir myk bindestrek, bindestrek, hardt mellomrom og → ≥ ≤ № tro i brevet fra %s',
    async (part) => {
      const pdf = (await brevdokument(oppdrag([{ gjelder: 'a', laast: linje }], part), 'n'))
        .innhold;
      expect(lesBrevPdf(pdf)).toContain(linje);
      expect(latin1(pdf), 'myk bindestrek med Noto Sans').toMatch(/\/BaseFont \/NotoSans-Regular-/);
    }
  );

  it.each(skriftnavn)(
    'gjengir myk bindestrek, bindestrek, hardt mellomrom og → ≥ ≤ № tro med brevskriften %s',
    async (brevskrift) => {
      const pdf = await settBrevPdf(linje, 'x', new Date(TIDSSTEMPEL), brevskrift, false);
      expect(lesBrevPdf(pdf)).toBe(linje);
    }
  );

  it('setter apostrofen og enkle anførselstegn med Source Serif 4 når brevet ikke har tegnet som deler glyfen (#1661)', async () => {
    // Source Serif 4 har samme glyf for U+2019 og U+02BC, og for U+2018 og U+02BB.
    const tekst = 'TE\u2019s krav om \u2018tillegg\u2019.';
    const pdf = await settBrevPdf(tekst, 'x', new Date(TIDSSTEMPEL), 'sourceSerif4', false);
    expect(lesBrevPdf(pdf)).toBe(tekst);
    expect(latin1(pdf)).not.toMatch(/\/BaseFont \/NotoSans/);
  });

  it('gjengir hvert tegn med delt glyf i Source Serif 4 tro når brevet ikke har et lavere tegn med glyfen (#1661)', async () => {
    // De høyere kodepunktene i gruppene med delt glyf i Source Serif 4: U+0020/U+00A0,
    // U+002D/U+00AD/U+2010/U+2011, U+00B5/U+03BC, U+02BB/U+2018, U+02BC/U+2019,
    // U+0394/U+2206, U+03A9/U+2126, U+2009/U+202F og U+2044/U+2215.
    const delte = [
      0xa0, 0xad, 0x2010, 0x2011, 0x3bc, 0x2018, 0x2019, 0x2206, 0x2126, 0x202f, 0x2215,
    ];
    for (const kode of delte) {
      const tekst = `a${String.fromCodePoint(kode)}b`;
      const pdf = await settBrevPdf(tekst, 'x', new Date(TIDSSTEMPEL), 'sourceSerif4', false);
      expect(lesBrevPdf(pdf), `U+${kode.toString(16)}`).toBe(tekst);
    }
  });

  it('gjengir apostrofen tro når brevet også har tegnet som deler glyfen (#1661)', async () => {
    const tekst = 'TE\u2019s og \u02bcokina\u02bc, \u2018a\u2019 og \u02bbb.';
    const pdf = await settBrevPdf(tekst, 'x', new Date(TIDSSTEMPEL), 'sourceSerif4', false);
    expect(lesBrevPdf(pdf)).toBe(tekst);
    expect(latin1(pdf), 'forutsetningen: Source Serif 4 deler glyfen').toMatch(
      /\/BaseFont \/NotoSans-Regular-/
    );
  });

  it('avviser en avsender uten brevskrift', async () => {
    await expect(
      skrivBrevPdf('Tekst.', 'x', new Date(TIDSSTEMPEL), 'EO' as unknown as 'TE')
    ).rejects.toThrow('avsenderen EO');
  });
});

describe('logoen følger avsenderen (#1177, LV-U25, LV-U26)', () => {
  const tekst: Avsnitt[] = [{ gjelder: 'a', laast: 'Første linje.' }];
  const sideinnhold = (pdf: Uint8Array) =>
    [...latin1(pdf).matchAll(/\/FlateDecode[^]*?stream\r?\n([^]*?)endstream/g)]
      .map((m) => {
        try {
          return inflateSync(Buffer.from(m[1], 'latin1')).toString('latin1');
        } catch {
          return '';
        }
      })
      .join('\n');
  /** Elementene i SVG-en i pakken som fylles: stiene og rektangelet. */
  const svg = readFileSync(
    new URL(
      '../../node_modules/@oslokommune/punkt-assets/dist/logos/oslologo.svg',
      import.meta.url
    ),
    'utf8'
  );
  const elementer = (svg.match(/<(path|rect)\b/g) ?? []).length;

  it('setter Oslo kommunes logo fra pakken i byggherrens brev, i fargen fra SVG-en, over teksten', async () => {
    const pdf = (await brevdokument(oppdrag(tekst, 'BH'), 'n')).innhold;
    const innhold = sideinnhold(pdf);
    expect(elementer, 'forutsetningen: SVG-en har stier').toBeGreaterThan(1);
    expect((innhold.match(/^f\*$/gm) ?? []).length).toBe(elementer);
    const [r, g, b] = /([\d.]+) ([\d.]+) ([\d.]+) rg/.exec(innhold)!.slice(1).map(Number);
    expect([r * 255, g * 255, b * 255].map(Math.round)).toEqual([0x2a, 0x28, 0x59]);
    const foersteLinje = Number(/(-?[\d.]+) Tm/.exec(innhold)![1]);
    const logoensTopp = Number(/^1 0 0 1 [\d.]+ ([\d.]+) cm$/m.exec(innhold)![1]);
    const skala = Number(/^([\d.]+) 0 0 -[\d.]+ 0 0 cm$/m.exec(innhold)![1]);
    const hoeydeISvg = Number(/viewBox="0 0 [\d.]+ ([\d.]+)"/.exec(svg)![1]);
    expect(foersteLinje).toBeLessThan(logoensTopp - skala * hoeydeISvg);
    expect(gjengirTro(lesBrevPdf(pdf), tekst)).toBe(true);
  });

  it('setter ingen logo i totalentreprenørens brev', async () => {
    const pdf = (await brevdokument(oppdrag(tekst, 'TE'), 'n')).innhold;
    expect(sideinnhold(pdf)).not.toMatch(/^f\*?$/m);
  });
});

describe('brevprofilen fryser skriften og logoen med brevet (#1177, LV-U26)', () => {
  // Kilde: LV-U26, «skriften og logoen … fryses med brevet, så den nedlastede PDF-en blir
  // lik den leverte», og oppdragsgiver 07.11 i #1177: navn og sha256 for hver fil, og
  // fail-closed ved avvik eller når profilen mangler.
  const tekst: Avsnitt[] = [{ gjelder: 'a', laast: 'Første linje.' }];
  const sum = (sti: string) =>
    createHash('sha256')
      .update(readFileSync(new URL(sti, import.meta.url)))
      .digest('hex');
  const PAKKE = '../../node_modules/@oslokommune/punkt-assets/dist/';

  it('byggherrens profil har Oslo Sans, reserveskriftene og logoen fra pakken, med summen av filene', () => {
    expect(brevprofil('BH')).toEqual({
      skrift: 'osloSans',
      filer: {
        'OsloSans-Regular.woff': sum(`${PAKKE}fonts/OsloSans-Regular.woff`),
        'NotoSans-Regular.ttf': sum('../skrift/NotoSans-Regular.ttf'),
        'NotoSansMath-Regular.ttf': sum('../skrift/NotoSansMath-Regular.ttf'),
        'oslologo.svg': sum(`${PAKKE}logos/oslologo.svg`),
      },
    });
  });

  it('totalentreprenørens profil har Source Serif 4 og reserveskriftene, uten logo', () => {
    expect(brevprofil('TE')).toEqual({
      skrift: 'sourceSerif4',
      filer: {
        'SourceSerif4-Regular.ttf': sum('../skrift/SourceSerif4-Regular.ttf'),
        'NotoSans-Regular.ttf': sum('../skrift/NotoSans-Regular.ttf'),
        'NotoSansMath-Regular.ttf': sum('../skrift/NotoSansMath-Regular.ttf'),
      },
    });
  });

  it('lager ikke PDF-en når en fil har en annen sum enn den brevet ble sendt med', async () => {
    const o = oppdrag(tekst, 'BH');
    const profil = brevprofil('BH');
    const endret = { ...profil, filer: { ...profil.filer, 'oslologo.svg': '0'.repeat(64) } };
    const feil = await brevdokument({ ...o, brev: { ...o.brev, brevprofil: endret } }, 'n').catch(
      (f: unknown) => f
    );
    expect(feil).toBeInstanceOf(UgjengivbartBrev);
    expect((feil as Error).message).toContain('endret siden brevet ble sendt');
  });

  it('lager ikke PDF-en når brevet ble sendt med en annen brevskrift', async () => {
    const o = oppdrag(tekst, 'BH');
    await expect(
      brevdokument({ ...o, brev: { ...o.brev, brevprofil: brevprofil('TE') } }, 'n')
    ).rejects.toBeInstanceOf(UgjengivbartBrev);
  });

  it('lager ikke PDF-en av et oppdrag uten brevprofil', async () => {
    const o = oppdrag(tekst, 'BH');
    await expect(
      brevdokument({ ...o, brev: { ...o.brev, brevprofil: undefined } }, 'n')
    ).rejects.toThrow('ingen brevprofil');
  });
});

describe('Oslo Sans bygges inn hel, ikke som delmengde (#1670)', () => {
  /** `numGlyphs` i `maxp`, fra tabellkatalogen i et skriftprogram (OpenType). */
  const glyferISfnt = (b: Buffer) => {
    for (let i = 0; i < b.readUInt16BE(4); i++)
      if (b.toString('latin1', 12 + 16 * i, 16 + 16 * i) === 'maxp')
        return b.readUInt16BE(b.readUInt32BE(20 + 16 * i) + 4);
    throw new Error('skriftprogrammet har ingen maxp');
  };
  /** `numGlyphs` i `maxp`, fra tabellkatalogen i en woff-fil (WOFF 1.0). */
  const glyferIWoff = (b: Buffer) => {
    for (let i = 0; i < b.readUInt16BE(12); i++)
      if (b.toString('latin1', 44 + 20 * i, 48 + 20 * i) === 'maxp') {
        const [fra, lengde, utpakket] = [4, 8, 12].map((d) => b.readUInt32BE(44 + 20 * i + d));
        const tabell = b.subarray(fra, fra + lengde);
        return (lengde < utpakket ? inflateSync(tabell) : tabell).readUInt16BE(4);
      }
    throw new Error('woff-fila har ingen maxp');
  };
  // Kilde: #1670. Delmengden fontkit lager av CFF-skriften, kan ikke leses av poppler, så
  // byggherrens brev skal ha hele skriftprogrammet fra pakken, med alle glyfene.
  it('byggherrens brev har Oslo Sans som OpenType med like mange glyfer som skriften i pakken', async () => {
    const pdf = (await brevdokument(oppdrag([{ gjelder: 'a', laast: 'Æ, ø og å.' }], 'BH'), 'n'))
      .innhold;
    const programmer = [...latin1(pdf).matchAll(/\/FlateDecode[^]*?stream\r?\n([^]*?)endstream/g)]
      .map((m) => inflateSync(Buffer.from(m[1], 'latin1')))
      .filter((b) => b.subarray(0, 4).toString('latin1') === 'OTTO');
    expect(programmer, 'ett skriftprogram i OpenType med CFF').toHaveLength(1);
    const program = programmer[0];
    const woff = readFileSync(
      new URL(
        '../../node_modules/@oslokommune/punkt-assets/dist/fonts/OsloSans-Regular.woff',
        import.meta.url
      )
    );
    expect(glyferISfnt(program)).toBe(glyferIWoff(woff));
    expect(glyferIWoff(woff), 'forutsetningen: skriften har glyfer').toBeGreaterThan(100);
  });

  // Kilde: OpenType-spesifikasjonen, `head`: summen av hele skriftprogrammet, regnet som
  // uint32, er 0xB1B0AFBA når `checkSumAdjustment` er riktig.
  it('skriftprogrammet fra woff-fila har riktig sum for hele skriften', () => {
    const woff = readFileSync(
      new URL(
        '../../node_modules/@oslokommune/punkt-assets/dist/fonts/OsloSans-Regular.woff',
        import.meta.url
      )
    );
    const program = Buffer.from(fraWoff(woff));
    let sum = 0;
    for (let i = 0; i < program.length; i += 4) sum = (sum + program.readUInt32BE(i)) >>> 0;
    expect(sum.toString(16)).toBe('b1b0afba');
    // Bare checkSumAdjustment, bytene 8–11 i head, skal skille seg fra head-tabellen i woff-fila.
    const tabell = (b: Buffer, katalog: number, post: number, antall: number, merke: string) => {
      for (let i = 0; i < antall; i++)
        if (b.toString('latin1', katalog + post * i, katalog + post * i + 4) === merke) return i;
      throw new Error(`ingen ${merke}`);
    };
    const iProgram = tabell(program, 12, 16, program.readUInt16BE(4), 'head');
    const fraProgram = program.readUInt32BE(12 + 16 * iProgram + 8);
    const headIProgram = program.subarray(fraProgram, fraProgram + 54);
    const iWoff = tabell(woff, 44, 20, woff.readUInt16BE(12), 'head');
    const [fra, lengde, utpakket] = [4, 8, 12].map((d) => woff.readUInt32BE(44 + 20 * iWoff + d));
    const pakket = woff.subarray(fra, fra + lengde);
    const headIWoff = lengde < utpakket ? inflateSync(pakket) : pakket;
    expect(headIProgram.subarray(0, 8)).toEqual(headIWoff.subarray(0, 8));
    expect(headIProgram.subarray(12, 54)).toEqual(headIWoff.subarray(12, 54));
  });
});

describe('skriftobjektene har typen skriftprogrammet har (#1689)', () => {
  /** Hver CID-skrift med typen, `CIDToGIDMap`, nøkkelen for programmet og programmets merke. */
  const cidSkrifter = (pdf: Uint8Array) => {
    const alle = objekter(pdf);
    return [...alle.values()]
      .filter((o) => /\/Subtype \/CIDFontType/.test(o.ordbok))
      .map((o) => {
        const beskrivelse = alle.get(Number(/\/FontDescriptor (\d+) 0 R/.exec(o.ordbok)![1]))!;
        const [, nokkel, nr] = /\/(FontFile\d?) (\d+) 0 R/.exec(beskrivelse.ordbok)!;
        const program = alle.get(Number(nr))!;
        return {
          navn: /\/BaseFont \/([A-Za-z0-9]+)-/.exec(o.ordbok)![1],
          type: /\/Subtype \/(CIDFontType\d)/.exec(o.ordbok)![1],
          cidTilGid: o.ordbok.includes('/CIDToGIDMap'),
          nokkel,
          programtype: /\/Subtype \/(\w+)/.exec(program.ordbok)?.[1],
          merke: program.stroem && Buffer.from(program.stroem.subarray(0, 4)).toString('hex'),
        };
      })
      .sort((a, b) => a.navn.localeCompare(b.navn));
  };
  const TRUETYPE = expect.stringMatching(/^(00010000|74727565)$/);
  const MED_RESERVETEGN: Avsnitt[] = [
    { gjelder: 'a', laast: 'Fundamentering\u00adsarbeidet tar 3 uker → 21 dager.' },
  ];

  // Kilde: ISO 32000-1, 9.7.4 og tabell 126. Et OpenType-program med CFF står i `FontFile3`
  // med `/Subtype /OpenType` under en `CIDFontType0`, og `CIDToGIDMap` hører bare til
  // `CIDFontType2`. Et TrueType-program står i `FontFile2` under en `CIDFontType2`; merket er
  // 0x00010000, eller `true`, som fontkit skriver i delmengden. `OTTO` er 0x4f54544f.
  it('byggherrens brev har Oslo Sans som CIDFontType0 med OpenType i FontFile3, og Noto som TrueType', async () => {
    const pdf = (await brevdokument(oppdrag(MED_RESERVETEGN, 'BH'), 'n')).innhold;
    const trueType = {
      type: 'CIDFontType2',
      cidTilGid: true,
      nokkel: 'FontFile2',
      programtype: undefined,
      merke: TRUETYPE,
    };
    expect(cidSkrifter(pdf)).toEqual([
      { navn: 'NotoSans', ...trueType },
      { navn: 'NotoSansMath', ...trueType },
      {
        navn: 'OsloSans',
        type: 'CIDFontType0',
        cidTilGid: false,
        nokkel: 'FontFile3',
        programtype: 'OpenType',
        merke: '4f54544f',
      },
    ]);
  });

  it('totalentreprenørens brev har bare TrueType-skrifter, i FontFile2 under CIDFontType2', async () => {
    const pdf = (await brevdokument(oppdrag(MED_RESERVETEGN, 'TE'), 'n')).innhold;
    const skrifter = cidSkrifter(pdf);
    expect(skrifter.map((s) => s.navn)).toContain('SourceSerif4');
    expect(skrifter.length, 'forutsetningen: brevet har en reserveskrift').toBeGreaterThan(1);
    for (const s of skrifter)
      expect(s).toMatchObject({
        type: 'CIDFontType2',
        cidTilGid: true,
        nokkel: 'FontFile2',
        merke: TRUETYPE,
      });
  });
});
