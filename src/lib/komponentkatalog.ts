/**
 * Komponentkatalogen for Varden (#2117): `.interface-design/komponenter.md`, generert av
 * hodekommentaren i hver komponent som to filer eller flere importerer. Hodekommentaren er den ene
 * kilden, og `komponentkatalog.test.ts` feiler når katalogen ikke er skrevet på nytt.
 *
 * Skriv katalogen på nytt med `node src/lib/komponentkatalog.ts`.
 */

import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const KATALOG = join(ROT, '.interface-design', 'komponenter.md');
const SRC = join(ROT, 'src');
const VARDEN = join(SRC, 'lib', 'components', 'varden');

/** Testene og komponentdemoen viser komponentene, men bruker dem ikke. */
const TELLES_IKKE = [
  /__tests__/,
  /\.(test|spec)(\.svelte)?\.ts$/,
  /[/\\]routes[/\\]demo[/\\]komponenter[/\\]/,
];

const IMPORT =
  /\b(?:import|export)\b[^'";]*?\bfrom\s*['"]([^'"]+)['"]|\bimport\s*\(\s*['"]([^'"]+)['"]/g;

/** Stien importen `spesifikator` i fila `fra` peker på, eller `null` for en pakke. */
function loes(spesifikator: string, fra: string): string | null {
  if (spesifikator.startsWith('#lib/')) return join(SRC, 'lib', spesifikator.slice(5));
  if (spesifikator.startsWith('.')) return resolve(dirname(fra), spesifikator);
  return null;
}

/** Hodekommentaren øverst i en komponent, uten `<!--` og `-->`, eller `null`. */
export function hodekommentar(kilde: string): string | null {
  const treff = /^\s*<!--([\s\S]*?)-->/.exec(kilde);
  const tekst = treff?.[1].trim();
  return tekst ? tekst : null;
}

const FORKORTELSER = new Set([
  'jf.',
  'f.eks.',
  'bl.a.',
  'pkt.',
  'nr.',
  'ca.',
  'dvs.',
  'mv.',
  'kl.',
]);

/** Første setning i hodekommentaren, på én linje. */
export function foersteSetning(kommentar: string): string {
  const tekst = kommentar.replace(/\s+/g, ' ').trim();
  for (const t of tekst.matchAll(/[.!?](?=\s+[A-ZÆØÅ«`(])/g)) {
    const ordet = /\S*$/.exec(tekst.slice(0, t.index + 1))![0].toLowerCase();
    if (!FORKORTELSER.has(ordet)) return tekst.slice(0, t.index + 1);
  }
  return tekst;
}

export type Komponent = {
  navn: string;
  fil: string;
  importoerer: number;
  kommentar: string | null;
};

/**
 * Komponentene i `varden/` som to filer eller flere i `kilder` importerer, sortert på navnet.
 * `kilder` går fra den absolutte stien til innholdet.
 */
export function felleskomponenter(kilder: ReadonlyMap<string, string>): Komponent[] {
  const importoerer = new Map<string, Set<string>>();
  for (const [fil, kilde] of kilder) {
    if (TELLES_IKKE.some((m) => m.test(fil))) continue;
    for (const t of kilde.matchAll(IMPORT)) {
      const maal = loes(t[1] ?? t[2], fil);
      if (!maal?.endsWith('.svelte') || !kilder.has(maal) || dirname(maal) !== VARDEN) continue;
      importoerer.set(maal, (importoerer.get(maal) ?? new Set()).add(fil));
    }
  }
  return [...importoerer]
    .filter(([, filer]) => filer.size >= 2)
    .map(([fil, filer]) => ({
      navn: fil.slice(VARDEN.length + 1, -'.svelte'.length),
      fil,
      importoerer: filer.size,
      kommentar: hodekommentar(kilder.get(fil) ?? ''),
    }))
    .sort((a, b) => (a.navn < b.navn ? -1 : 1));
}

/** Komponentene uten hodekommentar, som katalogen ikke kan beskrive. */
export const utenHodekommentar = (k: readonly Komponent[]) =>
  k.filter((x) => !x.kommentar).map((x) => x.navn);

const lenke = (fil: string) => relative(dirname(KATALOG), fil).split(sep).join('/');

export function katalog(komponenter: readonly Komponent[]): string {
  const rader = komponenter.map(
    (k) =>
      `| [\`${k.navn}\`](${lenke(k.fil)}) | ${k.importoerer} | ${foersteSetning(k.kommentar ?? '').replace(/\|/g, '\\|')} |`
  );
  return [
    '# Komponentene i Varden',
    '',
    '_Generert av [`komponentkatalog.ts`](../src/lib/komponentkatalog.ts) fra hodekommentaren i hver',
    'komponent. Rett hodekommentaren, ikke denne fila, og skriv fila på nytt med',
    '`node src/lib/komponentkatalog.ts`._',
    '',
    'En komponent i `src/lib/components/varden/` står her når to filer eller flere i `src/`',
    'importerer den. Testene og komponentdemoen i `src/routes/demo/komponenter/` telles ikke.',
    'Kolonnen til høyre er første setning i hodekommentaren. Beslutningene om hvordan et mønster',
    'virker, står i [«Mønstre» i `system.md`](system.md#mønstre).',
    '',
    '| Komponent | Importører | Hva den er |',
    '| --- | ---: | --- |',
    ...rader,
    '',
  ].join('\n');
}

/** Filene i `src/` som kan importere en komponent, med innholdet. */
export function kildene(mappe = SRC, kilder = new Map<string, string>()): Map<string, string> {
  for (const e of readdirSync(mappe, { withFileTypes: true })) {
    const sti = join(mappe, e.name);
    if (e.isDirectory()) kildene(sti, kilder);
    else if (/\.(svelte|ts|js)$/.test(e.name)) kilder.set(sti, readFileSync(sti, 'utf8'));
  }
  return kilder;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const k = felleskomponenter(kildene());
  const uten = utenHodekommentar(k);
  if (uten.length) {
    console.error(`Uten hodekommentar: ${uten.join(', ')}`);
    process.exit(1);
  }
  writeFileSync(KATALOG, katalog(k));
  console.log(`${relative(ROT, KATALOG)}: ${k.length} komponenter`);
}
