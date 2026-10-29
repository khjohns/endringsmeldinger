/**
 * Vakten for `docs/design/system.md` (#1080). Systemfila nevner tokenene, klassene og
 * komponentene visningen bruker, men verdiene står i
 * `theme.css` og `app.css`. Vakten feiler når en av dem nevner et token eller en
 * klasse som ikke finnes, eller systemfila en komponent som ikke finnes.
 *
 * Den leser bare det som står i backticks: `--token`, `.klasse` og, i systemfila,
 * en sti som slutter på `.svelte`, relativ til `src/lib/components/`. Et token
 * regnes som definert bare i en blokk for lys modus (`:root` eller `@theme`),
 * og en klasse bare i en selektor, ikke i en kommentar. Avgjørelsen går på
 * plassering: stilene har ingen nøstet CSS og ingen `:root` i `@media` eller `@layer`.
 * En filtype i backticks («`.svelte`-filer», «`.css`») er ikke en klasse.
 * Vakten kontrollerer ikke at prosaen er riktig. At et token komponentene bruker,
 * er definert, kontrollerer `fargetokens.test.ts` (#1184).
 */

import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const ROT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SYSTEMFIL = join(ROT, 'docs', 'design', 'system.md');
const STILFILER = [
  join(ROT, 'src', 'lib', 'components', 'kontraktsbord', 'theme.css'),
  join(ROT, 'src', 'app.css'),
];
const KOMPONENTER = join(ROT, 'src', 'lib', 'components');
const FILTYPER = new Set(['.svelte', '.css', '.ts', '.js', '.json', '.md', '.html', '.py']);

/** Det en tekst nevner i backticks, sortert på art. */
export function henvisninger(tekst: string): {
  tokens: string[];
  klasser: string[];
  komponenter: string[];
} {
  const koder = [...tekst.matchAll(/`([^`\n]+)`/g)].map((m) => m[1].trim());
  return {
    tokens: koder.filter((k) => /^--[a-z0-9-]+$/.test(k)),
    klasser: koder.filter((k) => /^\.[a-z][a-z0-9-]*$/.test(k) && !FILTYPER.has(k)),
    komponenter: koder.filter((k) => /^[\w/-]+\.svelte$/.test(k)),
  };
}

function utenKommentarer(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, '');
}

/** Innholdet i blokkene som gjelder i lys modus: `:root { … }` og `@theme … { … }`. */
function blokkerForLysModus(css: string): string {
  return [...utenKommentarer(css).matchAll(/(?<=^|[};])\s*(:root|@theme[^{]*?)\s*\{([^}]*)\}/g)]
    .map((m) => m[2])
    .join('\n');
}

/** Tokenene som nevnes, men ikke er definert for lys modus i stilene. */
export function udefinerteTokens(tokens: string[], css: string): string[] {
  const blokker = blokkerForLysModus(css);
  return tokens.filter((t) => !new RegExp(`(^|[\\s;{])${t}\\s*:`, 'm').test(blokker));
}

/** Klassene som nevnes, men ikke finnes i en selektor. */
export function manglendeKlasser(klasser: string[], css: string): string[] {
  const selektorer = [...utenKommentarer(css).matchAll(/([^{}]+)\{/g)].map((m) => m[1]).join('\n');
  return klasser.filter((k) => !new RegExp(`\\${k}(?![\\w-])`).test(selektorer));
}

describe('systemfila for visningen', () => {
  const css = STILFILER.map((f) => readFileSync(f, 'utf8')).join('\n');
  const system = henvisninger(readFileSync(SYSTEMFIL, 'utf8'));

  it('nevner tokens, klasser og komponenter, så vakten har noe å kontrollere', () => {
    expect(system.tokens.length).toBeGreaterThan(20);
    expect(system.klasser.length).toBeGreaterThan(0);
    expect(system.komponenter.length).toBeGreaterThan(5);
  });

  it('hvert token systemfila nevner, er definert for lys modus i theme.css eller app.css', () => {
    expect(udefinerteTokens(system.tokens, css)).toEqual([]);
  });

  it('hver klasse systemfila nevner, finnes i en selektor', () => {
    expect(manglendeKlasser(system.klasser, css)).toEqual([]);
  });

  it('hver komponent systemfila nevner, finnes under src/lib/components', () => {
    expect(system.komponenter.filter((k) => !existsSync(join(KOMPONENTER, k)))).toEqual([]);
  });
});

describe('kontrollene i vakten', () => {
  const css = [
    '/* --gammel: #fff; se .stamp-gammel */',
    ':root {\n  --ink: #000;\n  --rule: 1px solid red;\n}',
    ':root.dark {\n  --bare-moerk: #111;\n}',
    '@theme inline {\n  --spacing-1: 4px;\n}',
    '.mockup .btn-primary { color: var(--ink); }',
  ].join('\n');

  it('et token som bare brukes, bare er et prefiks, bare finnes i mørk modus eller i en kommentar, regnes som udefinert', () => {
    expect(
      udefinerteTokens(['--ink', '--spacing-1', '--line', '--ru', '--bare-moerk', '--gammel'], css)
    ).toEqual(['--line', '--ru', '--bare-moerk', '--gammel']);
  });

  it('en klasse som bare er et prefiks av en selektor, eller bare står i en kommentar, regnes som manglende', () => {
    expect(manglendeKlasser(['.btn-primary', '.btn', '.stamp-gammel'], css)).toEqual([
      '.btn',
      '.stamp-gammel',
    ]);
  });

  it('henvisningene leses bare fra backticks, også foran bindestrek, og en filtype er ikke en klasse', () => {
    const h = henvisninger(
      '`--ink` og --rule, `--ink-2`-nivået, `.btn`, `.svelte`-filer, `.css`, `patterns/Kort.svelte` og `kontraktsbord/theme.css`'
    );
    expect(h).toEqual({
      tokens: ['--ink', '--ink-2'],
      klasser: ['.btn'],
      komponenter: ['patterns/Kort.svelte'],
    });
  });
});
