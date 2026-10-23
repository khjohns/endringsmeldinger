/**
 * Vakten for `docs/design/system.md` (#1080). Fila nevner tokenene, klassene og
 * komponentene visningen bruker, men verdiene står i `theme.css` og `app.css`.
 * Vakten feiler når fila nevner et token, en klasse eller en komponent som ikke
 * finnes, slik at den ikke glir fra koden.
 *
 * Den leser bare det som står i backticks: `--token`, `.klasse` og en sti som
 * slutter på `.svelte`, relativ til `src/lib/components/`. Den kontrollerer ikke
 * at prosaen om et token er riktig, og ikke at et token komponentene bruker, er
 * definert (#1184).
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

/** Det systemfila nevner i backticks, sortert på art. */
export function henvisninger(tekst: string): {
  tokens: string[];
  klasser: string[];
  komponenter: string[];
} {
  const koder = [...tekst.matchAll(/`([^`\n]+)`/g)].map((m) => m[1].trim());
  return {
    tokens: koder.filter((k) => /^--[a-z0-9-]+$/.test(k)),
    klasser: koder.filter((k) => /^\.[a-z][a-z0-9-]*$/.test(k)),
    komponenter: koder.filter((k) => /^[\w/-]+\.svelte$/.test(k)),
  };
}

/** Tokenene som nevnes, men ikke er definert i stilene. */
export function udefinerteTokens(tokens: string[], css: string): string[] {
  return tokens.filter((t) => !new RegExp(`(^|[\\s;{])${t}\\s*:`, 'm').test(css));
}

/** Klassene som nevnes, men ikke finnes i en selektor. */
export function manglendeKlasser(klasser: string[], css: string): string[] {
  return klasser.filter((k) => !new RegExp(`\\${k}(?![\\w-])`).test(css));
}

describe('systemfila for designet', () => {
  const tekst = readFileSync(SYSTEMFIL, 'utf8');
  const css = STILFILER.map((f) => readFileSync(f, 'utf8')).join('\n');
  const funnet = henvisninger(tekst);

  it('nevner tokens, klasser og komponenter, så vakten har noe å kontrollere', () => {
    expect(funnet.tokens.length).toBeGreaterThan(20);
    expect(funnet.klasser.length).toBeGreaterThan(0);
    expect(funnet.komponenter.length).toBeGreaterThan(5);
  });

  it('hvert token den nevner, er definert i theme.css eller app.css', () => {
    expect(udefinerteTokens(funnet.tokens, css)).toEqual([]);
  });

  it('hver klasse den nevner, finnes i en selektor', () => {
    expect(manglendeKlasser(funnet.klasser, css)).toEqual([]);
  });

  it('hver komponent den nevner, finnes under src/lib/components', () => {
    expect(funnet.komponenter.filter((k) => !existsSync(join(KOMPONENTER, k)))).toEqual([]);
  });
});

describe('kontrollene i vakten', () => {
  const css =
    ':root {\n  --ink: #000;\n  --rule: 1px solid red;\n}\n.mockup .btn-primary { color: var(--ink); }';

  it('et token som bare brukes eller bare er et prefiks, regnes som udefinert', () => {
    expect(udefinerteTokens(['--ink', '--line', '--ru'], css)).toEqual(['--line', '--ru']);
  });

  it('en klasse som bare er et prefiks av en selektor, regnes som manglende', () => {
    expect(manglendeKlasser(['.btn-primary', '.btn'], css)).toEqual(['.btn']);
  });

  it('henvisningene leses bare fra backticks', () => {
    const h = henvisninger(
      '`--ink` og --rule, `.btn`, `patterns/Kort.svelte` og `kontraktsbord/theme.css`'
    );
    expect(h).toEqual({
      tokens: ['--ink'],
      klasser: ['.btn'],
      komponenter: ['patterns/Kort.svelte'],
    });
  });
});
