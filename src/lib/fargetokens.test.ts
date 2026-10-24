/**
 * To vakter for fargetokenene (#1184).
 *
 * **Udefinerte tokens.** Hver `var(--x)` i `src/` skal være definert i en stilfil
 * eller en komponent (`--x: …`), satt med `style:--x` eller med `setProperty`.
 * Et token som bare brukes, faller stille tilbake til fallbacken eller til ingenting,
 * også når `var()` har en fallback. Vakten ser ikke hvilken selektor som definerer
 * tokenet, så et token som bare finnes i én komponent eller bare i mørk modus,
 * regnes som definert.
 *
 * **Kontrast.** Fargeparene leses fra `theme.css` i lys og mørk modus og prøves mot
 * WCAG 2.1 AA (1.4.3 og 1.4.11): 4,5:1 for tekst og 3:1 for fokusmarkeringen. En farge
 * med alfa legges over flaten den står på. Parene er blekknivåene på flatene og
 * statusfargene på sin egen bakgrunn. `--warning`, `--gold`, `--draft` og
 * `--control-border` holder ikke kravet ennå og står i #1258.
 */

import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TEMA = join(SRC, 'lib', 'components', 'kontraktsbord', 'theme.css');

function kildefiler(mappe: string): string[] {
  return readdirSync(mappe, { withFileTypes: true }).flatMap((e) => {
    const sti = join(mappe, e.name);
    if (e.isDirectory()) return kildefiler(sti);
    return /\.(css|svelte|ts|js)$/.test(e.name) && !/\.test\.ts$/.test(e.name) ? [sti] : [];
  });
}

/** Tokenene tekstene bruker med `var()`, men ingen av dem definerer, med filene de står i. */
export function udefinerteTokens(tekster: Record<string, string>): Record<string, string[]> {
  const definert = new Set<string>();
  const brukt = new Map<string, Set<string>>();
  for (const [fil, tekst] of Object.entries(tekster)) {
    const kode = tekst.replace(/\/\*[\s\S]*?\*\//g, '');
    for (const m of kode.matchAll(/(?:style:|setProperty\(\s*['"])?(--[\w-]+)\s*['"]?\s*[:,=]/g))
      if (!/var\(\s*$/.test(kode.slice(Math.max(0, m.index - 6), m.index))) definert.add(m[1]);
    for (const m of kode.matchAll(/var\(\s*(--[\w-]+)/g)) {
      if (!brukt.has(m[1])) brukt.set(m[1], new Set());
      brukt.get(m[1])!.add(fil);
    }
  }
  return Object.fromEntries(
    [...brukt].filter(([t]) => !definert.has(t)).map(([t, filer]) => [t, [...filer].sort()])
  );
}

type Modus = 'lys' | 'mørk';
type Rgba = [number, number, number, number];

/** Tokenene i lys modus (alle `:root { … }`) og i mørk modus (lys med `:root.dark` over). */
export function tokenverdier(css: string): Record<Modus, Record<string, string>> {
  const kode = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const les = (selektor: RegExp) => {
    const verdier: Record<string, string> = {};
    for (const blokk of kode.matchAll(selektor))
      for (const m of blokk[1].matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) verdier[m[1]] = m[2].trim();
    return verdier;
  };
  const lys = les(/(?<=^|\})\s*:root\s*\{([^}]*)\}/g);
  return { lys, mørk: { ...lys, ...les(/:root\.dark\s*,\s*\.mockup\.dark\s*\{([^}]*)\}/g) } };
}

function farge(verdier: Record<string, string>, token: string): Rgba {
  let verdi = verdier[token];
  for (let i = 0; verdi?.startsWith('var('); i++) {
    if (i > 5) throw new Error(`${token} viser til seg selv`);
    verdi = verdier[verdi.slice(4, -1).trim()];
  }
  if (!verdi) throw new Error(`${token} er ikke definert`);
  const hex = /^#([0-9a-f]{6})$/i.exec(verdi);
  if (hex) return [0, 2, 4].map((i) => parseInt(hex[1].slice(i, i + 2), 16)).concat(1) as Rgba;
  const rgba = /^rgba?\(([^)]+)\)$/.exec(verdi);
  if (rgba) {
    const [r, g, b, a = 1] = rgba[1].split(',').map(Number);
    return [r, g, b, a];
  }
  throw new Error(`${token} har en verdi vakten ikke kan lese: ${verdi}`);
}

function over(forgrunn: Rgba, bakgrunn: Rgba): Rgba {
  const [r, g, b, a] = forgrunn;
  return [
    r * a + bakgrunn[0] * (1 - a),
    g * a + bakgrunn[1] * (1 - a),
    b * a + bakgrunn[2] * (1 - a),
    1,
  ];
}

function luminans([r, g, b]: Rgba): number {
  const kanal = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * kanal(r) + 0.7152 * kanal(g) + 0.0722 * kanal(b);
}

/** Kontrastforholdet etter WCAG 2.1. */
export function kontrast(a: Rgba, b: Rgba): number {
  const [lys, moerk] = [luminans(a), luminans(b)].sort((x, y) => y - x);
  return (lys + 0.05) / (moerk + 0.05);
}

const BLEKK = ['--ink', '--ink-2', '--ink-3', '--ink-4'];
const FLATER = [
  '--canvas',
  '--surface',
  '--surface-warm',
  '--surface-inset',
  '--surface-selected',
  '--overlay-1',
];
const STATUS = ['--danger', '--success', '--info', '--green'];

/** Parene under kravet, som «modus: forgrunn på bakgrunn (forholdstall)». */
export function brudd(verdier: Record<Modus, Record<string, string>>): string[] {
  const funn: string[] = [];
  const prov = (modus: Modus, fg: string, bg: string, krav: number, underlag = bg) => {
    const flate = over(farge(verdier[modus], bg), farge(verdier[modus], underlag));
    const forhold = kontrast(over(farge(verdier[modus], fg), flate), flate);
    if (forhold < krav) funn.push(`${modus}: ${fg} på ${bg} (${forhold.toFixed(2)})`);
  };
  for (const modus of ['lys', 'mørk'] as const) {
    for (const bg of FLATER) {
      for (const fg of BLEKK) prov(modus, fg, bg, 4.5);
      prov(modus, '--control-focus', bg, 3);
    }
    for (const s of STATUS) prov(modus, s, `${s}-bg`, 4.5, '--surface');
  }
  return funn;
}

describe('fargetokenene i src/', () => {
  it('hver var(--x) i src/ er definert eller satt med style:', () => {
    const tekster = Object.fromEntries(
      kildefiler(SRC).map((f) => [f.slice(SRC.length + 1), readFileSync(f, 'utf8')])
    );
    expect(udefinerteTokens(tekster)).toEqual({});
  });

  it('blekknivåene, fokusmarkeringen og statusfargene i theme.css holder WCAG AA i lys og mørk modus', () => {
    expect(brudd(tokenverdier(readFileSync(TEMA, 'utf8')))).toEqual([]);
  });

  it('--ink-ghost er pynt og har en annen verdi enn --ink-4 i begge modi', () => {
    const verdier = tokenverdier(readFileSync(TEMA, 'utf8'));
    for (const modus of ['lys', 'mørk'] as const)
      expect(verdier[modus]['--ink-ghost'], modus).not.toBe(verdier[modus]['--ink-4']);
  });
});

describe('kontrollene i vaktene', () => {
  it('et token som bare brukes, også med fallback eller definert bare i en kommentar, regnes som udefinert', () => {
    expect(
      udefinerteTokens({
        'a.css': ':root { --ink: #000; }\n/* --gammel: #fff; */\n.x { color: var(--ink); }',
        'b.svelte':
          '<div style:--bredde="4px" style="--hoyde: 2px"></div>\n<style>.y { width: var(--bredde); height: var(--hoyde); border: var(--line, var(--ink)); color: var(--gammel); }</style>',
        'c.ts': "el.style.setProperty('--satt', '1px');\nconst v = 'var(--satt) var(--wire)';",
      })
    ).toEqual({ '--gammel': ['b.svelte'], '--line': ['b.svelte'], '--wire': ['c.ts'] });
  });

  it('kontrasten regnes etter WCAG: svart på hvitt er 21:1, og en farge med alfa legges over flaten', () => {
    expect(kontrast([0, 0, 0, 1], [255, 255, 255, 1])).toBeCloseTo(21, 5);
    expect(kontrast([119, 119, 119, 1], [255, 255, 255, 1])).toBeCloseTo(4.48, 2);
  });

  it('et par under kravet meldes med modus og forholdstall, og mørk modus arver det den ikke setter selv', () => {
    const verdier = tokenverdier(
      [
        ':root {\n  --ink: #000000; --ink-2: #000000; --ink-3: #000000; --ink-4: #777777;',
        '  --control-focus: var(--ink);',
        ...FLATER.map((f) => `  ${f}: #ffffff;`),
        ...STATUS.map((s) => `  ${s}: #000000; ${s}-bg: rgba(0, 0, 0, 0.1);`),
        '}',
        ':root.dark,\n.mockup.dark {\n  --ink-4: #ffffff;\n  --canvas: #000000;\n}',
      ].join('\n')
    );
    expect(verdier.mørk['--ink-2']).toBe('#000000');
    const funn = brudd(verdier);
    expect(funn).toContain('lys: --ink-4 på --surface (4.48)');
    expect(funn).toContain('mørk: --ink-4 på --surface (1.00)');
    expect(funn).toContain('mørk: --ink på --canvas (1.00)');
    expect(funn.filter((f) => f.includes('--success'))).toEqual([]);
  });
});
