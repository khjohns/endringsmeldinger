/**
 * PDF-en av brevet (L-1c1, #371 del 2): teksten fra `gjengiOppdrag` satt på A4-sider
 * i brevskriften til avsenderen (`BREVSKRIFT`), og teksten lest ut igjen av PDF-en, så
 * leveringen kan kontrollere at den gjengir den frosne brevteksten tro (LV-U2, merknaden
 * 12.10 i #371).
 *
 * Skriftene er bygd inn som delmengde med Identity-H (oppdragsgiver 18.10, #764 og #799).
 * Et tegn brevskriften ikke setter, settes med Noto Sans og deretter Noto Sans Math
 * (arbeidsvalget i #799). Lisensene står ved skriftene i `skrift/`.
 *
 * Lesingen følger sidetreet og leser tekstoperatorene i sideinnholdet, slik en leser
 * viser dem, og gjør glyfene om til tekst med `ToUnicode` for skriften i `Tf`. Løp med
 * samme `Tm`-høyde er én linje. Den kjenner bare formen `skrivBrevPdf` lager, og kaster
 * for annet.
 */

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { isDeepStrictEqual } from 'node:util';
import { pathToFileURL } from 'node:url';
import { inflateSync } from 'node:zlib';
import fontkit from '@pdf-lib/fontkit';
import {
  beginMarkedContent,
  drawSvgPath,
  endMarkedContent,
  PDFDocument,
  PDFOperator,
  PDFOperatorNames,
  type PDFPage,
  rgb,
} from 'pdf-lib';

const A4 = [595.28, 841.89] as const;
const MARG = 56;
const DELT = 'Delt';
/** Brevteksten har et tegn PDF-en ikke kan sette tro: emoji, eller et usynlig tegn som U+200B. */
export class TegnUtenforSkriften extends Error {}

const MYKT_BINDESTREK = 0xad;

/** Et usynlig tegn som settes med glyfen skriften har for det, og ikke som mellomrom. */
export const settesMedGlyfen = (kode: number): boolean => kode === MYKT_BINDESTREK;

/** Parten som sender brevet. Den avgjør brevskriften (`.interface-design/system.md`, «Typografi»). */
export type Avsender = 'TE' | 'BH';

type Skrift = {
  /** Filnavnet, uten mappen. */
  fil: string;
  /** sha256 av fila, for brevprofilen. */
  sum: string;
  /** Skriftprogrammet som bygges inn: TrueType eller OpenType, ikke woff. */
  bytes: Uint8Array;
  /** Om skriften bygges inn som delmengde. */
  delmengde: boolean;
  tegnsett: ReturnType<typeof fontkit.create>;
  /**
   * Kodepunktene skriften setter i et brev med tegnene `brukte`; resten går videre til neste
   * skrift. Uten `brukte` gjelder svaret et brev med alle tegnene.
   */
  setter: (kode: number, brukte?: ReadonlySet<number>) => boolean;
};

const fraPakken = (fil: string) =>
  pathToFileURL(createRequire(import.meta.url).resolve(`@oslokommune/punkt-assets/dist/${fil}`));

const lokal = (fil: string) => new URL(`./skrift/${fil}`, import.meta.url);

/**
 * Skriftene et brev kan settes i, med størrelsen i forhåndsvisningen i `Brev.svelte`
 * (`.interface-design/system.md`, «Typografi»). Oslo Sans hentes fra
 * `@oslokommune/punkt-assets`, med fast versjon, og brukes bare i byggherrens brev, på
 * grunn av lisensen (LV-U26). Source Serif 4 i 16 px er 12 pt.
 *
 * Oslo Sans bygges inn hel, fra woff: delmengden fontkit lager av en CFF-skrift, kan ikke
 * leses av poppler, og woff2 bygges inn som den er (#1670). `fsType` 8 tillater innbygging.
 */
const SKRIFTER = {
  osloSans: {
    fil: () => fraPakken('fonts/OsloSans-Regular.woff'),
    stoerrelse: 11,
    delmengde: false,
  },
  sourceSerif4: { fil: () => lokal('SourceSerif4-Regular.ttf'), stoerrelse: 12, delmengde: true },
} satisfies Record<string, { fil: () => URL; stoerrelse: number; delmengde: boolean }>;

/** Navnet på en skrift i `SKRIFTER`. */
export type Skriftnavn = keyof typeof SKRIFTER;

/**
 * Hele brevet, også hodet, står i avsenderens skrift: Oslo Sans for byggherren (LV-U26) og
 * Source Serif 4 for totalentreprenøren (LV-U58). Hodet følger brevets skrift (LV-U59).
 */
const BREVSKRIFT: Record<Avsender, Skriftnavn> = { BH: 'osloSans', TE: 'sourceSerif4' };

const LINJEHOEYDE = 1.6;

/** Byggherrens brev får Oslo kommunes logo, totalentreprenørens ikke (LV-U25, LV-U26). */
const MED_LOGO: Record<Avsender, boolean> = { BH: true, TE: false };

/** Bredden logoen settes i, omtrent 30 mm, øverst til venstre på første side. */
const LOGOBREDDE = 85;

type Logo = {
  fil: string;
  sum: string;
  breddeISvg: number;
  hoeydeISvg: number;
  stier: string[];
  farge: [number, number, number];
};

let lestLogo: Logo | undefined;

/**
 * Logoen fra `@oslokommune/punkt-assets` (LV-U26), lest fra SVG-en i pakken. Lesingen kjenner
 * bare formen pakken har: stier med `fill-rule="evenodd"` og rektangler, uten transformasjon,
 * i én farge. Alt annet kaster, så en ny versjon av pakken med en annen form stopper
 * oppstarten i stedet for å gi en logo som ser annerledes ut.
 */
function logo(): Logo {
  if (lestLogo) return lestLogo;
  const url = fraPakken('logos/oslologo.svg');
  const bytes = readFileSync(url);
  const svg = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  const viewBox = /<svg\b[^>]*\bviewBox="0 0 ([\d.]+) ([\d.]+)"/.exec(svg);
  if (!viewBox) throw new Error('logoen har ikke en viewBox som begynner i 0 0');
  const stier: string[] = [];
  const farger = new Set<string>();
  for (const [, navn, attr] of svg.matchAll(/<(\w+)\b([^>]*)>/g)) {
    if (navn === 'svg') continue;
    if (/\btransform=/.test(attr)) throw new Error(`logoen har en transformasjon i <${navn}>`);
    const farge = /\bfill="var\(--fg-color, (#[0-9A-Fa-f]{6})\)"/.exec(attr)?.[1];
    if (!farge) throw new Error(`logoen har en fyllfarge i <${navn}> som ikke kan leses`);
    farger.add(farge.toLowerCase());
    const tall = (a: string) => {
      const v = new RegExp(`\\b${a}="([\\d.]+)"`).exec(attr)?.[1];
      if (v === undefined) throw new Error(`logoen mangler ${a} i <${navn}>`);
      return v;
    };
    if (navn === 'path') {
      if (!/\bfill-rule="evenodd"/.test(attr)) throw new Error('logoen har en sti uten evenodd');
      stier.push(/\bd="([^"]+)"/.exec(attr)?.[1] ?? '');
    } else if (navn === 'rect') {
      stier.push(
        `M${tall('x')} ${tall('y')}h${tall('width')}v${tall('height')}h-${tall('width')}Z`
      );
    } else throw new Error(`logoen har elementet <${navn}>, som lesingen ikke kjenner`);
  }
  if (farger.size !== 1 || !stier.length || stier.includes(''))
    throw new Error('logoen er ikke stier i én farge');
  const hex = [...farger][0];
  const kanal = (i: number) => parseInt(hex.slice(1 + 2 * i, 3 + 2 * i), 16) / 255;
  return (lestLogo = {
    fil: filnavnI(url),
    sum: sha256(bytes),
    breddeISvg: Number(viewBox[1]),
    hoeydeISvg: Number(viewBox[2]),
    stier,
    farge: [kanal(0), kanal(1), kanal(2)],
  });
}

/** Høyden logoen tar øverst på første side. */
const logohoeyde = () => (LOGOBREDDE * logo().hoeydeISvg) / logo().breddeISvg;

/** Logoen øverst til venstre, fylt med evenodd som i SVG-en. */
function tegnLogo(side: PDFPage): void {
  const { breddeISvg, stier, farge } = logo();
  for (const sti of stier)
    side.pushOperators(
      ...drawSvgPath(sti, {
        x: MARG,
        y: A4[1] - MARG,
        scale: LOGOBREDDE / breddeISvg,
        color: rgb(...farge),
        borderColor: undefined,
        borderWidth: 0,
      }).map((op) =>
        op.toString() === PDFOperatorNames.FillNonZero
          ? PDFOperator.of(PDFOperatorNames.FillEvenOdd)
          : op
      )
    );
}

/**
 * Reserveskriftene, i rekkefølge, for tegnene brevskriften ikke setter: myk bindestrek,
 * som Oslo Sans mangler og Source Serif 4 deler glyf med bindestrek for, og → ≥ ≤ №.
 * De avgjør alene hvilke tegn brevet kan ha (`tegnsett.ts`), så tabellen i kjernen er den
 * samme for begge avsenderne (#801).
 */
const RESERVEFILER = ['NotoSans-Regular.ttf', 'NotoSansMath-Regular.ttf'] as const;

const filnavnI = (fil: URL) => fil.pathname.split('/').at(-1)!;

const sha256 = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');

/**
 * Skriftprogrammet i en woff-fil (WOFF 1.0): tabellene pakket ut med zlib og satt sammen
 * igjen med tabellkatalogen. Kaster for en fil som ikke har den formen.
 */
export function fraWoff(woff: Uint8Array): Uint8Array {
  const v = new DataView(woff.buffer, woff.byteOffset, woff.byteLength);
  if (v.getUint32(0) !== 0x774f4646) throw new Error('skriftfila er ikke woff');
  const antall = v.getUint16(12);
  const tabeller = Array.from({ length: antall }, (_, i) => {
    const p = 44 + 20 * i;
    const [fra, lengde, utpakket] = [v.getUint32(p + 4), v.getUint32(p + 8), v.getUint32(p + 12)];
    const pakket = woff.subarray(fra, fra + lengde);
    const data = lengde < utpakket ? new Uint8Array(inflateSync(pakket)) : pakket;
    if (data.length !== utpakket) throw new Error('en tabell i woff-fila har feil lengde');
    return { merke: v.getUint32(p), sjekksum: v.getUint32(p + 16), data };
  });
  const katalog = 12 + 16 * antall;
  const ut = new Uint8Array(
    katalog + tabeller.reduce((sum, t) => sum + Math.ceil(t.data.length / 4) * 4, 0)
  );
  const u = new DataView(ut.buffer);
  const potens = 2 ** Math.floor(Math.log2(antall));
  u.setUint32(0, v.getUint32(4));
  u.setUint16(4, antall);
  u.setUint16(6, potens * 16);
  u.setUint16(8, Math.log2(potens));
  u.setUint16(10, antall * 16 - potens * 16);
  let fra = katalog;
  tabeller.forEach((t, i) => {
    u.setUint32(12 + 16 * i, t.merke);
    u.setUint32(16 + 16 * i, t.sjekksum);
    u.setUint32(20 + 16 * i, fra);
    u.setUint32(24 + 16 * i, t.data.length);
    ut.set(t.data, fra);
    fra += Math.ceil(t.data.length / 4) * 4;
  });
  return ut;
}

const les = (fil: URL, delmengde: boolean) => {
  const filbytes = readFileSync(fil);
  const navn = filnavnI(fil);
  const bytes = navn.endsWith('.woff') ? fraWoff(filbytes) : filbytes;
  return { fil: navn, sum: sha256(filbytes), bytes, delmengde, tegnsett: fontkit.create(bytes) };
};

let lesteReserver: Skrift[] | undefined;
function reserver(): Skrift[] {
  return (lesteReserver ??= RESERVEFILER.map((fil) => {
    const s = les(lokal(fil), true);
    return { ...s, setter: (kode: number) => s.tegnsett.hasGlyphForCodePoint(kode) };
  }));
}

/**
 * Brevskriften setter et tegn reserveskriftene har, bare når tegnet er det laveste
 * kodepunktet med glyfen blant tegnene brevet bruker. PDF-en gir en delt glyf tilbake som
 * det første tegnet brevet bruker den for (#801), så myk bindestrek med glyfen til
 * bindestrek ville blitt lest som bindestrek. Source Serif 4 deler også glyf mellom
 * U+02BC og apostrofen U+2019, så valget gjøres per brev (#1661). Hardt mellomrom deler
 * glyf med mellomrom og leses tilbake som mellomrom når brevskriften setter det, så for
 * mellomrommene gjelder det laveste kodepunktet i skriften.
 */
function brevskrift(navn: Skriftnavn): Skrift {
  const s = les(SKRIFTER[navn].fil(), SKRIFTER[navn].delmengde);
  const tillatt = skriftenesKodepunkter();
  const medGlyf = new Map<number, number[]>();
  for (const kode of [...s.tegnsett.characterSet].sort((a, b) => a - b)) {
    if (!tillatt.has(kode)) continue;
    const glyf = s.tegnsett.glyphForCodePoint(kode).id;
    medGlyf.set(glyf, [...(medGlyf.get(glyf) ?? []), kode]);
  }
  return {
    ...s,
    setter: (kode, brukte) => {
      if (!tillatt.has(kode) || !s.tegnsett.hasGlyphForCodePoint(kode)) return false;
      const alle = medGlyf.get(s.tegnsett.glyphForCodePoint(kode).id)!;
      const perBrev = brukte && !/\s/u.test(String.fromCodePoint(kode));
      return (perBrev ? alle.find((k) => k === kode || brukte.has(k)) : alle[0]) === kode;
    },
  };
}

const lesteSkrifter = new Map<Skriftnavn, Skrift[]>();

/** Brevskriften og reserveskriftene; et tegn settes med den første som setter det. */
function skrifter(navn: Skriftnavn): Skrift[] {
  let s = lesteSkrifter.get(navn);
  if (!s) lesteSkrifter.set(navn, (s = [brevskrift(navn), ...reserver()]));
  return s;
}

let kodepunkter: Set<number> | undefined;

/** Kodepunktene reserveskriftene har, for tabellen i kjernen (`tegnsett.ts`, #801). */
export function skriftenesKodepunkter(): Set<number> {
  return (kodepunkter ??= new Set(reserver().flatMap((s) => s.tegnsett.characterSet)));
}

/**
 * Kodepunktene som deler glyf med et lavere kodepunkt i reserveskriften som setter dem. PDF-en
 * gir glyfen tilbake som det første av dem brevet bruker, så bare det laveste beholdes (#801).
 * Brevskriften setter bare det laveste kodepunktet med en glyf blant tegnene brevet bruker
 * (`brevskrift`); de andre går til reserveskriftene.
 */
export function kodepunkterMedDeltGlyf(): Set<number> {
  const perGlyf = new Map<string, number[]>();
  for (const kode of [...skriftenesKodepunkter()].sort((a, b) => a - b)) {
    const skrift = reserver().findIndex((s) => s.setter(kode));
    const glyf = `${skrift}:${reserver()[skrift].tegnsett.glyphForCodePoint(kode).id}`;
    perGlyf.set(glyf, [...(perGlyf.get(glyf) ?? []), kode]);
  }
  return new Set([...perGlyf.values()].flatMap((k) => k.slice(1)));
}

/**
 * Uten substitusjonene i GSUB: en ligatur som «ﬁ» og en oppdeling i `ccmp` gir glyfer uten
 * `ToUnicode` eller med `ToUnicode` for et annet tegn, så PDF-en ikke gjengir brevet tro (#801).
 */
const UTEN_SUBSTITUSJON = { ccmp: false, liga: false, clig: false, calt: false, rlig: false };

/** fontkit der mykt bindestrek settes med glyfen skriften har for det. */
function medBindestrek(data: Uint8Array) {
  const font = fontkit.create(data);
  const motor = (font as unknown as { _layoutEngine: { isDefaultIgnorable(k: number): boolean } })
    ._layoutEngine;
  const usynlig = motor.isDefaultIgnorable.bind(motor);
  motor.isDefaultIgnorable = (k) => !settesMedGlyfen(k) && usynlig(k);
  return font;
}

/**
 * fontkit der mykt bindestrek settes med glyfen skriften har for det, så `ToUnicode` gir
 * U+00AD tilbake (orkestratoren 18.10, #802). fontkit selv setter det som mellomrom.
 * Endringen går gjennom en privat del av fontkit, så `create` kaster hvis den ikke virker.
 * Prøven settes med en egen instans: fontkit husker glyfen med tegnet den først ble satt
 * for, og Source Serif 4 har samme glyf for bindestrek og myk bindestrek (#1658).
 */
const fontkitMedBindestrek: Parameters<PDFDocument['registerFontkit']>[0] = {
  create(data) {
    const proeve = medBindestrek(data);
    if (
      proeve.hasGlyphForCodePoint(MYKT_BINDESTREK) &&
      proeve.layout('\u00ad').glyphs[0]?.codePoints[0] !== MYKT_BINDESTREK
    )
      throw new Error('fontkit setter ikke mykt bindestrek med glyfen i skriften');
    return medBindestrek(data);
  },
};

/**
 * Kalles av `start.ts` før serveren lytter, så en skrift eller en logo som ikke kan brukes,
 * stopper oppstarten.
 */
export function kontrollerSkrifter(): void {
  try {
    logo();
    if (!reserver()[0].setter(MYKT_BINDESTREK))
      throw new Error('den første reserveskriften har ikke myk bindestrek');
    for (const navn of skriftnavn)
      for (const s of skrifter(navn)) fontkitMedBindestrek.create(s.bytes);
  } catch (feil) {
    throw new Error(`Skriftene til brev-PDF-en kan ikke brukes: ${(feil as Error).message}`);
  }
}

/** Skriftene i `SKRIFTER`. Tegntabellen og oppstarten prøver alle, også de som venter på et valg. */
export const skriftnavn = Object.keys(SKRIFTER) as Skriftnavn[];

const skriftPerKode = new Map<Skriftnavn, Map<number, number>>();

/**
 * Skriften for tegnet, som indeks i `skrifter(navn)`, i et brev med tegnene `brukte`. Kjernen
 * avviser tegnet før brevet skrives (`SETTBARE_TEGN` i `kjerne/format/tegnsett.ts`, #801), så
 * dette er en sikring.
 */
export function skriftFor(
  tegn: string,
  brevskrift: Skriftnavn,
  brukte?: ReadonlySet<number>
): number {
  const kode = tegn.codePointAt(0)!;
  if (!skriftPerKode.has(brevskrift)) skriftPerKode.set(brevskrift, new Map());
  const kjent = brukte ? undefined : skriftPerKode.get(brevskrift)!.get(kode);
  if (kjent !== undefined) return kjent;
  const navn = () => `U+${kode.toString(16).toUpperCase().padStart(4, '0')}`;
  const i = skrifter(brevskrift).findIndex((s) => s.setter(kode, brukte));
  if (i < 0)
    throw new TegnUtenforSkriften(
      `Brevteksten har tegnet ${navn()}, som skriftene i PDF-en ikke har`
    );
  // fontkit setter et usynlig tegn som mellomrom eller utelater det.
  if (!settesMedGlyfen(kode) && /\p{Default_Ignorable_Code_Point}/u.test(tegn))
    throw new TegnUtenforSkriften(
      `Brevteksten har det usynlige tegnet ${navn()}, som PDF-en ikke kan sette tro`
    );
  if (!brukte) skriftPerKode.get(brevskrift)!.set(kode, i);
  return i;
}

/** Teksten delt i løp med samme skrift. */
function loep(
  tekst: string,
  brevskrift: Skriftnavn,
  brukte: ReadonlySet<number>
): { tekst: string; skrift: number }[] {
  const ut: { tekst: string; skrift: number }[] = [];
  for (const tegn of tekst) {
    const skrift = skriftFor(tegn, brevskrift, brukte);
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
  tidspunkt: Date,
  avsender: Avsender
): Promise<Uint8Array> {
  if (!Object.hasOwn(BREVSKRIFT, avsender))
    throw new Error(`Brevet har avsenderen ${String(avsender)}, som ikke har noen brevskrift`);
  return settBrevPdf(tekst, tittel, tidspunkt, BREVSKRIFT[avsender], MED_LOGO[avsender]);
}

/**
 * Skriften og filene et brev fra avsenderen settes med: brevskriften, reserveskriftene og,
 * for byggherren, logoen, hver med sha256 av bytene PDF-en lages av. Oppdraget fryser den
 * (`brevprofil` i `lagOppdrag`), og `brevdokument` lager ikke PDF-en når den ikke er lik, så
 * den nedlastede PDF-en blir lik den leverte (LV-U26, oppdragsgiver 07.11 i #1177).
 */
export interface Brevprofil {
  skrift: Skriftnavn;
  /** Filnavn til sha256 i heksadesimal. */
  filer: Record<string, string>;
}

const profiler = new Map<Avsender, Brevprofil>();

export function brevprofil(avsender: Avsender): Brevprofil {
  if (!Object.hasOwn(BREVSKRIFT, avsender))
    throw new Error(`Brevet har avsenderen ${String(avsender)}, som ikke har noen brevskrift`);
  let profil = profiler.get(avsender);
  if (!profil) {
    const skrift = BREVSKRIFT[avsender];
    const filer = [...skrifter(skrift), ...(MED_LOGO[avsender] ? [logo()] : [])];
    profil = {
      skrift,
      filer: Object.fromEntries(filer.map((f) => [f.fil, f.sum])),
    };
    profiler.set(avsender, profil);
  }
  return profil;
}

/** Sann når profilen er den brev fra avsenderen settes med nå. */
export const sammeBrevprofil = (profil: unknown, avsender: Avsender): boolean =>
  isDeepStrictEqual(profil, brevprofil(avsender));

/**
 * Brevet som PDF i skriften `brevskrift`, med eller uten logoen, som `skrivBrevPdf`.
 * Tegntabellen prøver hver skrift.
 */
export async function settBrevPdf(
  tekst: string,
  tittel: string,
  tidspunkt: Date,
  brevskrift: Skriftnavn,
  medLogo: boolean
): Promise<Uint8Array> {
  const { stoerrelse } = SKRIFTER[brevskrift];
  const pdf = await PDFDocument.create();
  pdf.setTitle(tittel);
  pdf.setProducer('Endringsmeldinger');
  pdf.setCreator('Endringsmeldinger');
  pdf.setCreationDate(tidspunkt);
  pdf.setModificationDate(tidspunkt);
  pdf.registerFontkit(fontkitMedBindestrek);
  const normalisert = tekst.replace(/\r\n?/g, '\n').replace(/[\t\f\v]/g, ' ');
  const tegn = normalisert.replace(/\n/g, '');
  const brukte = new Set([...tegn].map((t) => t.codePointAt(0)!));
  const brukt = new Set(loep(tegn, brevskrift, brukte).map((l) => l.skrift));
  // En skrift som ikke brukes, bygges ikke inn, så brev uten reservetegn er uendret.
  const innbygd = await Promise.all(
    skrifter(brevskrift).map((s, i) =>
      brukt.has(i)
        ? pdf.embedFont(s.bytes, { subset: s.delmengde, features: UTEN_SUBSTITUSJON })
        : null
    )
  );
  const settes = (t: string) =>
    loep(t, brevskrift, brukte).map((l) => {
      const skrift = innbygd[l.skrift]!;
      return { ...l, skrift, bredde: skrift.widthOfTextAtSize(l.tekst, stoerrelse) };
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
  if (medLogo) {
    tegnLogo(side);
    y -= logohoeyde() + stoerrelse * LINJEHOEYDE * 2;
  }
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
          side.drawText(l.tekst, { x, y, size: stoerrelse, font: l.skrift });
          x += l.bredde;
        }
        if (linje.delt) side.pushOperators(endMarkedContent());
      }
      y -= stoerrelse * LINJEHOEYDE;
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
