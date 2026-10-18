/**
 * PDF-en av brevet (L-1c1, #371 del 2): teksten fra `gjengiOppdrag` satt på A4-sider
 * med Noto Sans, og teksten lest ut igjen av PDF-en, så leveringen kan kontrollere at
 * den gjengir den frosne brevteksten tro (LV-U2, merknaden 12.10 i #371).
 *
 * Skriften er bygd inn som delmengde med Identity-H, så hvert tegn Noto Sans har, kan
 * settes (oppdragsgiver 18.10, #764 og #799). Lisensen står i `skrift/OFL.txt`.
 *
 * Lesingen følger sidetreet og leser tekstoperatorene i sideinnholdet, slik en leser
 * viser dem, og gjør glyfene om til tekst med skriftens `ToUnicode`. Den kjenner bare
 * formen `skrivBrevPdf` lager, og kaster for annet.
 */

import { readFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';
import fontkit from '@pdf-lib/fontkit';
import { beginMarkedContent, endMarkedContent, PDFDocument } from 'pdf-lib';

const A4 = [595.28, 841.89] as const;
const MARG = 56;
const SKRIFTSTOERRELSE = 11;
const LINJEAVSTAND = 15;
const DELT = 'Delt';
const SKRIFT = readFileSync(new URL('./skrift/NotoSans-Regular.ttf', import.meta.url));
const tegnsett = fontkit.create(SKRIFT);

/** Brevteksten har et tegn skriften ikke har, som emoji. */
export class TegnUtenforSkriften extends Error {}

/**
 * Bryter et avsnitt på ord, så hver linje holder seg innenfor `bredde`. Et ord som er for
 * langt, deles, og delen som fortsetter på neste linje, er `delt`.
 */
function linjer(
  avsnitt: string,
  bredde: number,
  maal: (t: string) => number
): { tekst: string; delt: boolean }[] {
  const ut: { tekst: string; delt: boolean }[] = [];
  let linje = '';
  for (const ord of avsnitt.split(/ +/)) {
    let rest = [...ord];
    for (;;) {
      let n = 0;
      for (let b = 0; n < rest.length && (b += maal(rest[n])) <= bredde; ) n++;
      if (n === rest.length) break;
      n = Math.max(n, 1);
      if (linje) ut.push({ tekst: linje, delt: false });
      ut.push({ tekst: rest.slice(0, n).join(''), delt: true });
      linje = '';
      rest = rest.slice(n);
    }
    const kandidat = linje ? `${linje} ${rest.join('')}` : rest.join('');
    if (maal(kandidat) <= bredde) linje = kandidat;
    else {
      ut.push({ tekst: linje, delt: false });
      linje = rest.join('');
    }
  }
  ut.push({ tekst: linje, delt: false });
  return ut;
}

/**
 * Brevet som PDF. Tidspunktet i metadataene er brevets, så samme tekst gir samme fil.
 * Tab, CR, FF og VT settes som mellomrom og linjeskift, som `gjengirTro` tåler.
 * Et delt ord merkes `/Delt`, så lesingen setter delene sammen igjen.
 *
 * @throws TegnUtenforSkriften når skriften mangler et tegn, i stedet for å sette en tom glyf
 */
export async function skrivBrevPdf(
  tekst: string,
  tittel: string,
  tidspunkt: Date
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(tittel);
  pdf.setProducer('Endringsmeldinger');
  pdf.setCreator('Endringsmeldinger');
  pdf.setCreationDate(tidspunkt);
  pdf.setModificationDate(tidspunkt);
  pdf.registerFontkit(fontkit);
  const skrift = await pdf.embedFont(SKRIFT, { subset: true });
  const maal = (t: string) => skrift.widthOfTextAtSize(t, SKRIFTSTOERRELSE);
  const bredde = A4[0] - 2 * MARG;

  let side = pdf.addPage([...A4]);
  let y = A4[1] - MARG;
  const normalisert = tekst.replace(/\r\n?/g, '\n').replace(/[\t\f\v]/g, ' ');
  for (const tegn of normalisert.replace(/\n/g, ''))
    if (!tegnsett.hasGlyphForCodePoint(tegn.codePointAt(0)!))
      throw new TegnUtenforSkriften(
        `Brevteksten har tegnet U+${tegn.codePointAt(0)!.toString(16).toUpperCase().padStart(4, '0')}, som skriften i PDF-en ikke har`
      );
  for (const avsnitt of normalisert.split('\n')) {
    for (const linje of linjer(avsnitt, bredde, maal)) {
      if (linje.tekst) {
        if (y < MARG) {
          side = pdf.addPage([...A4]);
          y = A4[1] - MARG;
        }
        if (linje.delt) side.pushOperators(beginMarkedContent(DELT));
        side.drawText(linje.tekst, { x: MARG, y, size: SKRIFTSTOERRELSE, font: skrift });
        if (linje.delt) side.pushOperators(endMarkedContent());
      }
      y -= LINJEAVSTAND;
    }
  }
  return pdf.save({ useObjectStreams: false });
}

const latin1 = new TextDecoder('latin1');

/** Objektene i en PDF uten objektstrømmer: nummer til ordbok og eventuell strøm. */
function objekter(pdf: Uint8Array): Map<number, { ordbok: string; stroem: Uint8Array | null }> {
  const tekst = latin1.decode(pdf);
  const ut = new Map<number, { ordbok: string; stroem: Uint8Array | null }>();
  for (const treff of tekst.matchAll(/(\d+) 0 obj\s*([\s\S]*?)endobj/g)) {
    const kropp = treff[2];
    const start = kropp.indexOf('stream');
    if (start < 0) {
      ut.set(Number(treff[1]), { ordbok: kropp, stroem: null });
      continue;
    }
    const ordbok = kropp.slice(0, start);
    const lengde = Number(/\/Length (\d+)/.exec(ordbok)?.[1]);
    const fra = treff.index + treff[0].indexOf(kropp) + start + 'stream'.length;
    const data = pdf.subarray(fra + (tekst[fra] === '\r' ? 2 : 1)).subarray(0, lengde);
    ut.set(Number(treff[1]), {
      ordbok,
      stroem: ordbok.includes('/FlateDecode') ? inflateSync(data) : data,
    });
  }
  return ut;
}

/** Glyf til tekst fra `ToUnicode`, i formen pdf-lib skriver: bare `bfchar` med UTF-16BE. */
function tilUnicode(cmap: string): Map<string, string> {
  if (/beginbfrange/.test(cmap))
    throw new Error('ToUnicode har et område, som lesingen ikke kjenner');
  const ut = new Map<string, string>();
  for (const [, blokk] of cmap.matchAll(/beginbfchar([\s\S]*?)endbfchar/g))
    for (const [, glyf, hex] of blokk.matchAll(/<([0-9A-Fa-f]{4})>\s*<([0-9A-Fa-f]+)>/g)) {
      const enheter = (hex.match(/..../g) ?? []).map((e) => parseInt(e, 16));
      ut.set(glyf.toLowerCase(), String.fromCharCode(...enheter));
    }
  return ut;
}

const referanse = (ordbok: string, navn: string) => {
  const r = new RegExp(`/${navn} (\\d+) 0 R`).exec(ordbok);
  if (!r) throw new Error(`PDF-en mangler /${navn}`);
  return Number(r[1]);
};

/** Teksten i PDF-en, side for side og én linje per tekstoperator, med et delt ord satt sammen. */
export function lesBrevPdf(pdf: Uint8Array): string {
  const obj = objekter(pdf);
  const hent = (n: number) => {
    const o = obj.get(n);
    if (!o) throw new Error(`PDF-en mangler objekt ${n}`);
    return o;
  };
  const trailer = latin1.decode(pdf).split('trailer').at(-1)!;
  const sider = hent(referanse(hent(referanse(trailer, 'Root')).ordbok, 'Pages')).ordbok;
  const barn = /\/Kids \[([^\]]*)\]/.exec(sider)?.[1] ?? '';
  let tekst = '';
  let delt: 'ingen' | 'aapnet' | 'lest' = 'ingen';
  for (const [, n] of barn.matchAll(/(\d+) 0 R/g)) {
    const side = hent(Number(n));
    if (!/\/Type \/Page\b/.test(side.ordbok)) throw new Error('PDF-en har sider i flere nivåer');
    const innhold = /\/Contents (\[[^\]]*\]|\d+ 0 R)/.exec(side.ordbok)?.[1];
    if (!innhold) throw new Error('Siden har ikke noe innhold');
    // pdf-lib gir hver tekstoperator et eget navn, men alle viser til samme skrift.
    const skrifter = new Set(
      [...(/\/Font\s*<<([^>]*)>>/.exec(side.ordbok)?.[1] ?? '').matchAll(/(\d+) 0 R/g)].map(
        ([, n]) => Number(n)
      )
    );
    if (skrifter.size !== 1) throw new Error('Siden har ikke nøyaktig én skrift');
    const skrift = hent([...skrifter][0]).ordbok;
    if (!/\/Encoding\s*\/Identity-H\b/.test(skrift))
      throw new Error('Skriften er ikke kodet med Identity-H');
    const cmap = hent(referanse(skrift, 'ToUnicode')).stroem;
    if (!cmap) throw new Error('ToUnicode er ikke en strøm');
    const glyfer = tilUnicode(latin1.decode(cmap));
    for (const [, m] of innhold.matchAll(/(\d+) 0 R/g)) {
      const stroem = hent(Number(m)).stroem;
      if (!stroem) throw new Error('Sideinnholdet er ikke en strøm');
      for (const [, merke, annet, hex, slutt] of latin1
        .decode(stroem)
        .matchAll(/\/(\w+) BMC|\b(BDC|MP|DP)\b|<([0-9A-Fa-f]*)> Tj|\b(EMC)\b/g)) {
        if (annet) throw new Error(`PDF-en har det ukjente merket ${annet}`);
        if (merke !== undefined) {
          if (merke !== DELT || delt !== 'ingen')
            throw new Error(`PDF-en har merket /${merke} der det ikke hører hjemme`);
          delt = 'aapnet';
        } else if (slutt) {
          if (delt !== 'lest') throw new Error('PDF-en har et delt ord uten tekst');
          delt = 'ingen';
        } else {
          if (delt === 'lest') throw new Error('PDF-en har mer enn én linje i et delt ord');
          if (hex.length % 4) throw new Error('Teksten har en glyf som ikke er to byte');
          for (const glyf of hex.toLowerCase().match(/..../g) ?? []) {
            const t = glyfer.get(glyf);
            if (t === undefined) throw new Error(`Glyfen ${glyf} står ikke i ToUnicode`);
            tekst += t;
          }
          if (delt === 'aapnet') delt = 'lest';
          else tekst += '\n';
        }
      }
    }
  }
  if (delt !== 'ingen') throw new Error('PDF-en har et delt ord som ikke er avsluttet');
  return tekst.replace(/\n$/, '');
}
