/**
 * PDF-en av brevet (L-1c1, #371 del 2): teksten fra `gjengiOppdrag` satt på A4-sider
 * med Helvetica, og teksten lest ut igjen av PDF-en, så leveringen kan kontrollere at
 * den gjengir den frosne brevteksten tro (LV-U2, merknaden 12.10 i #371).
 *
 * Lesingen følger sidetreet og leser tekstoperatorene i sideinnholdet, slik en leser
 * viser dem. Den kjenner bare formen `skrivBrevPdf` lager, og kaster for annet.
 */

import { inflateSync } from 'node:zlib';
import { beginMarkedContent, endMarkedContent, PDFDocument, StandardFonts } from 'pdf-lib';

const A4 = [595.28, 841.89] as const;
const MARG = 56;
const SKRIFTSTOERRELSE = 11;
const LINJEAVSTAND = 15;
const DELT = 'Delt';

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
    let rest = ord;
    for (;;) {
      let n = 0;
      for (let b = 0; n < rest.length && (b += maal(rest[n])) <= bredde; ) n++;
      if (n === rest.length) break;
      n = Math.max(n, 1);
      if (linje) ut.push({ tekst: linje, delt: false });
      ut.push({ tekst: rest.slice(0, n), delt: true });
      linje = '';
      rest = rest.slice(n);
    }
    const kandidat = linje ? `${linje} ${rest}` : rest;
    if (maal(kandidat) <= bredde) linje = kandidat;
    else {
      ut.push({ tekst: linje, delt: false });
      linje = rest;
    }
  }
  ut.push({ tekst: linje, delt: false });
  return ut;
}

/**
 * Brevet som PDF. Tidspunktet i metadataene er brevets, så samme tekst gir samme fil.
 * Tab, CR, FF og VT settes som mellomrom og linjeskift, som `gjengirTro` tåler.
 * Et tegn Helvetica ellers ikke har (utenfor WinAnsi), gir en feil fra pdf-lib.
 * Et delt ord merkes `/Delt`, så lesingen setter delene sammen igjen.
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
  const skrift = await pdf.embedFont(StandardFonts.Helvetica);
  const maal = (t: string) => skrift.widthOfTextAtSize(t, SKRIFTSTOERRELSE);
  const bredde = A4[0] - 2 * MARG;

  let side = pdf.addPage([...A4]);
  let y = A4[1] - MARG;
  const normalisert = tekst.replace(/\r\n?/g, '\n').replace(/[\t\f\v]/g, ' ');
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

/** WinAnsi (cp1252) 0x80–0x9F; resten er Latin-1. Node uten full ICU dekoder `windows-1252` som Latin-1. */
const WINANSI_80 = '€\u0081‚ƒ„…†‡ˆ‰Š‹Œ\u008DŽ\u008F\u0090‘’“”•–—˜™š›œ\u009DžŸ';
const winAnsi = (bytes: number[]) =>
  String.fromCharCode(
    ...bytes.map((b) => (b >= 0x80 && b <= 0x9f ? WINANSI_80.charCodeAt(b - 0x80) : b))
  );

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
          tekst += winAnsi((hex.match(/../g) ?? []).map((b) => parseInt(b, 16)));
          if (delt === 'aapnet') delt = 'lest';
          else tekst += '\n';
        }
      }
    }
  }
  if (delt !== 'ingen') throw new Error('PDF-en har et delt ord som ikke er avsluttet');
  return tekst.replace(/\n$/, '');
}
