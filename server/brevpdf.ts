/**
 * PDF-en av brevet (L-1c1, #371 del 2): teksten fra `gjengiOppdrag` satt på A4-sider
 * med Noto Sans, og teksten lest ut igjen av PDF-en, så leveringen kan kontrollere at
 * den gjengir den frosne brevteksten tro (LV-U2, merknaden 12.10 i #371).
 *
 * Skriften er bygd inn som delmengde med Identity-H (oppdragsgiver 18.10, #764 og #799).
 * Et tegn Noto Sans mangler, som →, settes med Noto Sans Math (arbeidsvalget i #799).
 * Lisensene står ved skriftene i `skrift/`.
 *
 * Lesingen følger sidetreet og leser tekstoperatorene i sideinnholdet, slik en leser
 * viser dem, og gjør glyfene om til tekst med `ToUnicode` for skriften i `Tf`. Løp med
 * samme `Tm`-høyde er én linje. Den kjenner bare formen `skrivBrevPdf` lager, og kaster
 * for annet.
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
/** Brevteksten har et tegn PDF-en ikke kan sette tro: emoji, eller et usynlig tegn som U+200B. */
export class TegnUtenforSkriften extends Error {}

const MYKT_BINDESTREK = 0xad;

/** Et usynlig tegn som settes med glyfen skriften har for det, og ikke som mellomrom. */
const settesMedGlyfen = (kode: number): boolean => kode === MYKT_BINDESTREK;

type Skrift = { bytes: Uint8Array; tegnsett: ReturnType<typeof fontkit.create> };
let lesteSkrifter: Skrift[] | undefined;

/** Hovedskriften først; et tegn settes med den første som har det. Leses når den første PDF-en lages. */
function skrifter(): Skrift[] {
  return (lesteSkrifter ??= ['NotoSans-Regular.ttf', 'NotoSansMath-Regular.ttf'].map((fil) => {
    const bytes = readFileSync(new URL(`./skrift/${fil}`, import.meta.url));
    return { bytes, tegnsett: fontkit.create(bytes) };
  }));
}

/**
 * fontkit der mykt bindestrek settes med glyfen skriften har for det, så `ToUnicode` gir
 * U+00AD tilbake (orkestratoren 18.10, #802). fontkit selv setter det som mellomrom.
 * Endringen går gjennom en privat del av fontkit, så `create` kaster hvis den ikke virker.
 */
const fontkitMedBindestrek: Parameters<PDFDocument['registerFontkit']>[0] = {
  create(data) {
    const font = fontkit.create(data);
    const motor = (font as unknown as { _layoutEngine: { isDefaultIgnorable(k: number): boolean } })
      ._layoutEngine;
    const usynlig = motor.isDefaultIgnorable.bind(motor);
    motor.isDefaultIgnorable = (k) => !settesMedGlyfen(k) && usynlig(k);
    if (font.layout('\u00ad').glyphs[0]?.codePoints[0] !== MYKT_BINDESTREK)
      throw new Error('fontkit setter ikke mykt bindestrek med glyfen i skriften');
    return font;
  },
};

const skriftPerKode = new Map<number, number>();

/** Skriften for tegnet, som indeks i `skrifter()`. */
function skriftFor(tegn: string): number {
  const kode = tegn.codePointAt(0)!;
  const kjent = skriftPerKode.get(kode);
  if (kjent !== undefined) return kjent;
  const navn = () => `U+${kode.toString(16).toUpperCase().padStart(4, '0')}`;
  const i = skrifter().findIndex((s) => s.tegnsett.hasGlyphForCodePoint(kode));
  if (i < 0)
    throw new TegnUtenforSkriften(
      `Brevteksten har tegnet ${navn()}, som skriftene i PDF-en ikke har`
    );
  // fontkit setter et usynlig tegn som mellomrom eller utelater det.
  if (!settesMedGlyfen(kode) && /\p{Default_Ignorable_Code_Point}/u.test(tegn))
    throw new TegnUtenforSkriften(
      `Brevteksten har det usynlige tegnet ${navn()}, som PDF-en ikke kan sette tro`
    );
  skriftPerKode.set(kode, i);
  return i;
}

/** Teksten delt i løp med samme skrift. */
function loep(tekst: string): { tekst: string; skrift: number }[] {
  const ut: { tekst: string; skrift: number }[] = [];
  for (const tegn of tekst) {
    const skrift = skriftFor(tegn);
    if (ut.at(-1)?.skrift === skrift) ut.at(-1)!.tekst += tegn;
    else ut.push({ tekst: tegn, skrift });
  }
  return ut;
}

/**
 * Bryter et avsnitt på ord, så hver linje holder seg innenfor `bredde`. Et ord som er for
 * langt, deles, og delen som fortsetter på neste linje, er `delt`. Bredden av en linje er
 * summen av ordene og mellomrommene, så `maal` kalles én gang per ord og tegn den ikke
 * har sett.
 */
function linjer(
  avsnitt: string,
  bredde: number,
  maal: (t: string) => number
): { tekst: string; delt: boolean }[] {
  const ut: { tekst: string; delt: boolean }[] = [];
  let linje = '';
  let linjebredde = 0;
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
      linjebredde = 0;
      rest = rest.slice(n);
    }
    const resten = rest.join('');
    const ordbredde = maal(resten);
    const kandidat = linje ? linjebredde + maal(' ') + ordbredde : ordbredde;
    if (kandidat <= bredde) {
      linje = linje ? `${linje} ${resten}` : resten;
      linjebredde = kandidat;
    } else {
      ut.push({ tekst: linje, delt: false });
      linje = resten;
      linjebredde = ordbredde;
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
 * @throws TegnUtenforSkriften når skriftene mangler et tegn eller tegnet er usynlig (unntatt
 *   mykt bindestrek), i stedet for å sette en tom glyf eller et mellomrom
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
  pdf.registerFontkit(fontkitMedBindestrek);
  const normalisert = tekst.replace(/\r\n?/g, '\n').replace(/[\t\f\v]/g, ' ');
  const brukt = new Set(loep(normalisert.replace(/\n/g, '')).map((l) => l.skrift));
  // En skrift som ikke brukes, bygges ikke inn, så brev uten reservetegn er uendret.
  const innbygd = await Promise.all(
    skrifter().map((s, i) => (brukt.has(i) ? pdf.embedFont(s.bytes, { subset: true }) : null))
  );
  const settes = (t: string) =>
    loep(t).map((l) => {
      const skrift = innbygd[l.skrift]!;
      return { ...l, skrift, bredde: skrift.widthOfTextAtSize(l.tekst, SKRIFTSTOERRELSE) };
    });
  const bredder = new Map<string, number>();
  const maal = (t: string) => {
    let b = bredder.get(t);
    if (b === undefined) bredder.set(t, (b = settes(t).reduce((sum, l) => sum + l.bredde, 0)));
    return b;
  };
  const bredde = A4[0] - 2 * MARG;

  let side = pdf.addPage([...A4]);
  let y = A4[1] - MARG;
  for (const avsnitt of normalisert.split('\n')) {
    for (const linje of linjer(avsnitt, bredde, maal)) {
      if (linje.tekst) {
        if (y < MARG) {
          side = pdf.addPage([...A4]);
          y = A4[1] - MARG;
        }
        if (linje.delt) side.pushOperators(beginMarkedContent(DELT));
        let x = MARG;
        for (const l of settes(linje.tekst)) {
          side.drawText(l.tekst, { x, y, size: SKRIFTSTOERRELSE, font: l.skrift });
          x += l.bredde;
        }
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

/** Teksten i PDF-en, side for side og én linje per `Tm`-høyde, med et delt ord satt sammen. */
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
  const tabeller = new Map<number, Map<string, string>>();
  const glyferI = (n: number) => {
    if (!tabeller.has(n)) {
      const skrift = hent(n).ordbok;
      if (!/\/Encoding\s*\/Identity-H\b/.test(skrift))
        throw new Error('Skriften er ikke kodet med Identity-H');
      const cmap = hent(referanse(skrift, 'ToUnicode')).stroem;
      if (!cmap) throw new Error('ToUnicode er ikke en strøm');
      tabeller.set(n, tilUnicode(latin1.decode(cmap)));
    }
    return tabeller.get(n)!;
  };
  const linjer: { tekst: string; delt: boolean }[] = [];
  let delt: 'ingen' | 'aapnet' | 'lest' = 'ingen';
  for (const [, n] of barn.matchAll(/(\d+) 0 R/g)) {
    const side = hent(Number(n));
    if (!/\/Type \/Page\b/.test(side.ordbok)) throw new Error('PDF-en har sider i flere nivåer');
    const innhold = /\/Contents (\[[^\]]*\]|\d+ 0 R)/.exec(side.ordbok)?.[1];
    if (!innhold) throw new Error('Siden har ikke noe innhold');
    const ressurser = new Map(
      [...(/\/Font\s*<<([^>]*)>>/.exec(side.ordbok)?.[1] ?? '').matchAll(/\/(\S+) (\d+) 0 R/g)].map(
        ([, navn, ref]) => [navn, Number(ref)]
      )
    );
    let glyfer: Map<string, string> | null = null;
    let hoeyde: string | null = null;
    let forrige: string | null = null;
    for (const [, m] of innhold.matchAll(/(\d+) 0 R/g)) {
      const stroem = hent(Number(m)).stroem;
      if (!stroem) throw new Error('Sideinnholdet er ikke en strøm');
      for (const [, navn, tm, merke, annet, hex, slutt] of latin1
        .decode(stroem)
        .matchAll(
          /\/([\w-]+) [\d.]+ Tf|(-?[\d.]+) Tm|\/(\w+) BMC|\b(BDC|MP|DP)\b|<([0-9A-Fa-f]*)> Tj|\b(EMC)\b/g
        )) {
        if (annet) throw new Error(`PDF-en har det ukjente merket ${annet}`);
        if (navn !== undefined) {
          const ref = ressurser.get(navn);
          if (ref === undefined) throw new Error(`Siden mangler skriften /${navn}`);
          glyfer = glyferI(ref);
        } else if (tm !== undefined) {
          hoeyde = tm;
        } else if (merke !== undefined) {
          if (merke !== DELT || delt !== 'ingen')
            throw new Error(`PDF-en har merket /${merke} der det ikke hører hjemme`);
          delt = 'aapnet';
        } else if (slutt) {
          if (delt !== 'lest') throw new Error('PDF-en har et delt ord uten tekst');
          delt = 'ingen';
        } else {
          if (!glyfer || hoeyde === null) throw new Error('Teksten har ingen skrift eller plass');
          if (hex.length % 4) throw new Error('Teksten har en glyf som ikke er to byte');
          let t = '';
          for (const glyf of hex.toLowerCase().match(/..../g) ?? []) {
            const tegn = glyfer.get(glyf);
            if (tegn === undefined) throw new Error(`Glyfen ${glyf} står ikke i ToUnicode`);
            t += tegn;
          }
          const sist = linjer.at(-1);
          if (hoeyde === forrige && sist) {
            if (sist.delt !== (delt === 'lest'))
              throw new Error('PDF-en har en linje som er delt bare for en del');
            sist.tekst += t;
          } else {
            if (delt === 'lest') throw new Error('PDF-en har mer enn én linje i et delt ord');
            linjer.push({ tekst: t, delt: delt === 'aapnet' });
            if (delt === 'aapnet') delt = 'lest';
          }
          forrige = hoeyde;
        }
      }
    }
  }
  if (delt !== 'ingen') throw new Error('PDF-en har et delt ord som ikke er avsluttet');
  return linjer
    .map((l) => (l.delt ? l.tekst : `${l.tekst}\n`))
    .join('')
    .replace(/\n$/, '');
}
