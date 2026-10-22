/**
 * Lager `kjerne/format/tegnsett.ts`, tegnene brev-PDF-en kan sette (#801): kodepunktene
 * skriftene i `brevpdf.ts` har, uten de usynlige, som `skriftFor` avviser. Kjøres med
 * `node server/tegnsett.ts` når skriftene endres. Testen i `tester/brevpdf.test.ts`
 * feiler når fila ikke stemmer med skriftene.
 */
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { settesMedGlyfen, skriftenesKodepunkter } from './brevpdf.ts';

export const TEGNSETTFIL = new URL('../kjerne/format/tegnsett.ts', import.meta.url);

/** Kodepunktene PDF-en kan sette, som stigende, ikke-overlappende intervaller `[fra, til]`. */
export function settbareIntervaller(): [number, number][] {
  const koder = [...skriftenesKodepunkter()].filter(
    (kode) =>
      settesMedGlyfen(kode) || !/\p{Default_Ignorable_Code_Point}/u.test(String.fromCodePoint(kode))
  );
  const ut: [number, number][] = [];
  for (const kode of koder.sort((a, b) => a - b))
    if (ut.at(-1)?.[1] === kode - 1) ut.at(-1)![1] = kode;
    else ut.push([kode, kode]);
  return ut;
}

const heks = (n: number) => `0x${n.toString(16)}`;

export function tegnsettfil(): string {
  const par = settbareIntervaller().map(([fra, til]) => `${heks(fra)}, ${heks(til)}`);
  return `// Generert av \`node server/tegnsett.ts\` fra skriftene i \`server/brevpdf.ts\` (#801). Ikke rediger.

/** Kodepunktene brev-PDF-en kan sette, som par av første og siste kodepunkt i stigende rekkefølge. */
export const SETTBARE_TEGN: readonly number[] = [
${par.map((p) => `  ${p},`).join('\n')}
];
`;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) writeFileSync(TEGNSETTFIL, tegnsettfil());
