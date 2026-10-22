/**
 * Lager `kjerne/format/tegnsett.ts`, tegnene brev-PDF-en kan sette (#801): kodepunktene
 * skriftene i `brevpdf.ts` har, uten de usynlige, som `skriftFor` avviser, og uten
 * `utelatteTegn`. Kjøres med `node server/tegnsett.ts` når skriftene endres. Testen i
 * `tester/brevpdf.test.ts` feiler når fila ikke stemmer med skriftene.
 */
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  kodepunkterMedDeltGlyf,
  lesBrevPdf,
  settesMedGlyfen,
  skriftenesKodepunkter,
  skrivBrevPdf,
} from './brevpdf.ts';

export const TEGNSETTFIL = new URL('../kjerne/format/tegnsett.ts', import.meta.url);

/** Skrift fra høyre mot venstre, som fontkit setter baklengs i PDF-en. */
const HOEYRE_MOT_VENSTRE = /\p{sc=Arabic}|\p{sc=Hebrew}|\p{sc=Syriac}|\p{sc=Thaana}|\p{sc=Nko}/u;

/** Linjeskift og avsnittsskift som ikke er LF (U+2028, U+2029). */
const SKILLETEGN = /\p{Zl}|\p{Zp}/u;

/** En linje per tegn, med tegnet mellom to bokstaver, og et kombinerende tegn på en bokstav. */
const proeve = (koder: number[]) =>
  koder
    .map((k) => String.fromCodePoint(k))
    .map((t) => (/\p{M}/u.test(t) ? `a a${t} b` : `a ${t} b`))
    .join('\n');

/** Kodepunktene i `koder` som PDF-en ikke gir tilbake som de ble skrevet. */
async function ikkeTro(koder: number[]): Promise<number[]> {
  if (!koder.length) return [];
  const tekst = proeve(koder);
  try {
    if (lesBrevPdf(await skrivBrevPdf(tekst, 'tegnsett', new Date(0))) === tekst) return [];
  } catch {
    // `lesBrevPdf` kaster for en glyf uten `ToUnicode`; tegnet finnes ved delingen under.
  }
  if (koder.length === 1) return koder;
  const midt = koder.length >> 1;
  return [...(await ikkeTro(koder.slice(0, midt))), ...(await ikkeTro(koder.slice(midt)))];
}

let utelatte: Promise<Set<number>> | undefined;

/**
 * Tegnene skriftene har, men som PDF-en ikke gjengir tro, så brevet ikke kan leveres (#801):
 * skrift fra høyre mot venstre, U+2028 og U+2029, kodepunkter som deler glyf, og tegnene som
 * ikke kommer tilbake fra `lesBrevPdf` som de ble skrevet med `skrivBrevPdf`.
 */
export function utelatteTegn(): Promise<Set<number>> {
  return (utelatte ??= (async () => {
    const ut = kodepunkterMedDeltGlyf();
    const proeves: number[] = [];
    for (const kode of [...skriftenesKodepunkter()].sort((a, b) => a - b)) {
      const tegn = String.fromCodePoint(kode);
      if (HOEYRE_MOT_VENSTRE.test(tegn) || SKILLETEGN.test(tegn)) ut.add(kode);
      else if (kode > 0x20 && !/\p{Default_Ignorable_Code_Point}|\p{Cc}/u.test(tegn))
        proeves.push(kode);
    }
    for (let i = 0; i < proeves.length; i += 500)
      for (const kode of await ikkeTro(proeves.slice(i, i + 500))) ut.add(kode);
    return ut;
  })());
}

/** Kodepunktene PDF-en kan sette, som stigende, ikke-overlappende intervaller `[fra, til]`. */
export async function settbareIntervaller(): Promise<[number, number][]> {
  const utelatt = await utelatteTegn();
  const koder = [...skriftenesKodepunkter()].filter(
    (kode) =>
      !utelatt.has(kode) &&
      (settesMedGlyfen(kode) ||
        !/\p{Default_Ignorable_Code_Point}/u.test(String.fromCodePoint(kode)))
  );
  const ut: [number, number][] = [];
  for (const kode of koder.sort((a, b) => a - b))
    if (ut.at(-1)?.[1] === kode - 1) ut.at(-1)![1] = kode;
    else ut.push([kode, kode]);
  return ut;
}

const heks = (n: number) => `0x${n.toString(16)}`;

export async function tegnsettfil(): Promise<string> {
  const par = (await settbareIntervaller()).map(([fra, til]) => `${heks(fra)}, ${heks(til)}`);
  return `// Generert av \`node server/tegnsett.ts\` fra skriftene i \`server/brevpdf.ts\` (#801). Ikke rediger.

/** Kodepunktene brev-PDF-en kan sette, som par av første og siste kodepunkt i stigende rekkefølge. */
export const SETTBARE_TEGN: readonly number[] = [
${par.map((p) => `  ${p},`).join('\n')}
];
`;
}

if (process.argv[1] === fileURLToPath(import.meta.url))
  writeFileSync(TEGNSETTFIL, await tegnsettfil());
