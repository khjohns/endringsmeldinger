/**
 * To vakter for fargetokenene (#1184).
 *
 * **Udefinerte tokens.** Hver `var(--x)` i `src/` skal være definert i en stilfil
 * eller en komponent (`--x: …`) eller satt med `style:--x={…}` eller
 * `setProperty('--x', …)` med navnet som streng.
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
 *
 * Varden har egne tokens i `.tema-varden` (Blekk, #1391), lagt over lys modus, og i
 * `:root.dark .tema-varden` for mørk modus (#1465). Der prøves også utkastfargen på sin
 * bakgrunn, feltkanten på flatene, teksten på primærknappen og teksten og
 * fokusmarkeringen i det mørke panelet.
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
    const kode = tekst
      .replace(/\/\*[\s\S]*?\*\/|<!--[\s\S]*?-->/g, '')
      .replace(/(?<!:)\/\/.*$/gm, '');
    const utenBruk = kode.replace(/var\(\s*--[\w-]+/g, '');
    for (const m of utenBruk.matchAll(
      /style:(--[\w-]+)\s*=|setProperty\(\s*['"](--[\w-]+)['"]\s*,|(?<![\w-])(--[\w-]+)(?:['"]:|\s*:)/g
    ))
      definert.add(m[1] ?? m[2] ?? m[3]);
    for (const m of kode.matchAll(/var\(\s*(--[\w-]+)/g)) {
      if (!brukt.has(m[1])) brukt.set(m[1], new Set());
      brukt.get(m[1])!.add(fil);
    }
  }
  return Object.fromEntries(
    [...brukt].filter(([t]) => !definert.has(t)).map(([t, filer]) => [t, [...filer].sort()])
  );
}

type Modus = 'lys' | 'mørk' | 'varden' | 'varden-mørk';
type Rgba = [number, number, number, number];

/**
 * Tokenene i lys modus (alle `:root { … }`), i mørk modus (lys med `:root.dark` over),
 * i Varden (lys med `.tema-varden` over) og i Varden i mørk modus (mørk med
 * `.tema-varden` og `:root.dark .tema-varden` over).
 */
export function tokenverdier(css: string): Record<Modus, Record<string, string>> {
  const kode = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const les = (selektor: RegExp) => {
    const verdier: Record<string, string> = {};
    for (const blokk of kode.matchAll(selektor))
      for (const m of blokk[1].matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) verdier[m[1]] = m[2].trim();
    return verdier;
  };
  const lys = les(/(?<=^|\})\s*:root\s*\{([^}]*)\}/g);
  const mørk = { ...lys, ...les(/:root\.dark\s*,\s*\.mockup\.dark\s*\{([^}]*)\}/g) };
  const varden = les(/(?<=^|\})\s*\.tema-varden\s*\{([^}]*)\}/g);
  return {
    lys,
    mørk,
    varden: { ...lys, ...varden },
    'varden-mørk': {
      ...mørk,
      ...varden,
      ...les(/:root\.dark\s+\.tema-varden\s*\{([^}]*)\}/g),
    },
  };
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
  const [lysest, mørkest] = [luminans(a), luminans(b)].sort((x, y) => y - x);
  return (lysest + 0.05) / (mørkest + 0.05);
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
  for (const modus of ['lys', 'mørk', 'varden', 'varden-mørk'] as const) {
    for (const bg of FLATER) {
      for (const fg of BLEKK) prov(modus, fg, bg, 4.5);
      prov(modus, '--control-focus', bg, 3);
    }
    for (const s of STATUS) prov(modus, s, `${s}-bg`, 4.5, '--surface');
  }
  for (const modus of ['varden', 'varden-mørk'] as const) {
    prov(modus, '--draft', '--draft-bg', 4.5);
    prov(modus, '--danger', '--danger-bg', 4.5);
    prov(modus, '--on-brand', '--brand', 4.5);
    for (const bg of ['--surface', '--surface-inset']) prov(modus, '--control-border-color', bg, 3);
    for (const bg of ['--sidebar-bg', '--sidebar-active']) {
      for (const fg of ['--sidebar-text', '--sidebar-muted']) prov(modus, fg, bg, 4.5);
      prov(modus, '--sidebar-focus', bg, 3);
    }
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

  it('blekknivåene, fokusmarkeringen og statusfargene i theme.css holder WCAG AA i lys og mørk modus og i Varden', () => {
    expect(brudd(tokenverdier(readFileSync(TEMA, 'utf8')))).toEqual([]);
  });

  it('--ink-ghost er pynt og har en annen verdi enn --ink-4 i begge modi', () => {
    const verdier = tokenverdier(readFileSync(TEMA, 'utf8'));
    for (const modus of ['lys', 'mørk', 'varden', 'varden-mørk'] as const)
      expect(verdier[modus]['--ink-ghost'], modus).not.toBe(verdier[modus]['--ink-4']);
  });
});

/**
 * Tokenene i `:root` og `:root[data-theme="dark"]` i prototypene i
 * `docs/design/prototyper/` (`vederlagssvar.html:17-52`, de samme i de andre). `--brand-bg`,
 * `--ink-ghost` og `--sidebar-border` står i sju av dem. Radiusen følger `system.md`, ikke
 * prototypenes `--r-kort: 8px` (oppdragsgiver 01.11, #1402).
 */
const PROTOTYPENE_LYS: Record<string, string> = {
  '--brand': '#15181d',
  '--brand-bg': '#e6e9ee',
  '--on-brand': '#ffffff',
  '--canvas': '#eef0f2',
  '--surface': '#ffffff',
  '--surface-warm': '#f6f7f8',
  '--surface-inset': '#f3f4f6',
  '--surface-selected': '#e6e9ee',
  '--ink': '#15181d',
  '--ink-2': '#343a43',
  '--ink-3': '#545b66',
  '--ink-4': '#5f6672',
  '--ink-ghost': '#8a909a',
  '--rule-color': '#dadde2',
  '--rule-subtle-color': '#e6e8eb',
  '--rule-strong-color': '#c3c8cf',
  '--control-bg': '#f3f4f6',
  '--control-border-color': '#80868f',
  '--control-focus': '#2457d6',
  '--control-focus-ring': '0 0 0 3px rgba(36, 87, 214, 0.25)',
  '--draft': '#5f4a00',
  '--draft-bg': '#fff3c4',
  '--draft-border': '#9e7f12',
  '--sidebar-bg': '#15181d',
  '--sidebar-active': '#262b33',
  '--sidebar-hover': '#1e2228',
  '--sidebar-text': '#f3f4f6',
  '--sidebar-muted': '#a9afb9',
  '--sidebar-border': '#2e333b',
  '--varden-ark': '760px',
  '--varden-stoette': '360px',
  '--r-knapp': '999px',
  '--r-felt': '4px',
};
const PROTOTYPENE_MØRK: Record<string, string> = {
  ...PROTOTYPENE_LYS,
  '--brand': '#eef0f3',
  '--brand-bg': '#2a2f37',
  '--on-brand': '#15181d',
  '--canvas': '#0f1114',
  '--surface': '#171a1f',
  '--surface-warm': '#1c2026',
  '--surface-inset': '#1a1d22',
  '--surface-selected': '#262b33',
  '--ink': '#eef0f3',
  '--ink-2': '#cdd2d9',
  '--ink-3': '#a9afb9',
  '--ink-4': '#9aa1ab',
  '--ink-ghost': '#6c727c',
  '--rule-color': '#2b3037',
  '--rule-subtle-color': '#23272d',
  '--rule-strong-color': '#3a4049',
  '--control-bg': '#121418',
  '--control-border-color': '#6c727c',
  '--control-focus': '#8fb0ff',
  '--control-focus-ring': '0 0 0 3px rgba(143, 176, 255, 0.3)',
  '--draft': '#f3d675',
  '--draft-bg': '#2f2810',
  '--draft-border': '#a88a2a',
  '--sidebar-bg': '#0b0d10',
  '--sidebar-active': '#1f242b',
  '--sidebar-hover': '#171b20',
  '--sidebar-border': '#23272d',
};

describe('Varden-tokenene i theme.css mot prototypene (#1465)', () => {
  const verdier = tokenverdier(readFileSync(TEMA, 'utf8'));
  /** Følger `var(--x)` til verdien, slik `--control-bg: var(--surface-inset)` står i theme.css. */
  const løs = (modus: Modus, token: string) => {
    let v = verdier[modus][token];
    for (let i = 0; v?.startsWith('var(') && i < 5; i++) v = verdier[modus][v.slice(4, -1).trim()];
    return v;
  };

  for (const [modus, fasit] of [
    ['varden', PROTOTYPENE_LYS],
    ['varden-mørk', PROTOTYPENE_MØRK],
  ] as const)
    it(`${modus}: hvert token i prototypene har prototypens verdi`, () => {
      const avvik = Object.entries(fasit)
        .filter(([t, v]) => løs(modus, t) !== v)
        .map(([t, v]) => `${t}: ${løs(modus, t)} (prototypen ${v})`);
      expect(avvik).toEqual([]);
    });

  it('feilfargene og streken settes i Varden selv, i lys og mørk modus, og arves ikke fra :root', () => {
    const css = readFileSync(TEMA, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    const lysBlokk = /(?<=^|\})\s*\.tema-varden\s*\{([^}]*)\}/.exec(css)![1];
    const mørkBlokk = /:root\.dark\s+\.tema-varden\s*\{([^}]*)\}/.exec(css)![1];
    for (const token of ['--danger', '--danger-bg', '--danger-border', '--rule-subtle-color']) {
      expect(lysBlokk, token).toMatch(new RegExp(`${token}\\s*:`));
      expect(mørkBlokk, token).toMatch(new RegExp(`${token}\\s*:`));
    }
  });

  it('ingen fil i varden/ eller om-varden/ nevner font-mono, så tallene står i Inter (oppdragsgiver 07.11, system.md «Typografi»)', () => {
    const brukere = ['varden', 'om-varden']
      .flatMap((m) => kildefiler(join(SRC, 'lib', 'components', m)))
      .filter((f) => readFileSync(f, 'utf8').includes('font-mono'));
    expect(brukere).toEqual([]);
    expect(verdier.lys['--font-mono']).toMatch(/^'JetBrains Mono',/);
  });
});

describe('kontrollene i vaktene', () => {
  it('et token som bare brukes, også med fallback over flere linjer, definert bare i en kommentar, nevnt i en streng eller likt navnet på en BEM-modifikator, regnes som udefinert', () => {
    expect(
      udefinerteTokens({
        'a.css': ':root { --ink: #000; }\n/* --gammel: #fff; */\n.x { color: var(--ink); }',
        'b.svelte':
          '<div style:--bredde="4px" style="--hoyde: 2px"></div>\n<style>.y { width: var(--bredde); height: var(--hoyde); border: var(--line, var(--ink)); color: var(--gammel); }</style>',
        'c.ts': "el.style.setProperty('--satt', '1px');\nconst v = 'var(--satt) var(--wire)';",
        'e.ts':
          "// --linje: #fff\nconst f = fare ? '--rod' : '--ink';\nconst v = 'var(--linje) var(--rod)';",
        'f.svelte': '<!-- --ramme: 1px -->\n<style>.r { border: var(--ramme); }</style>',
        'd.css':
          '.stempel--advarsel:hover, .stempel--fare, .z { color: var(--advarsel); border: var(\n    --fare,\n    1px solid red\n  ); }',
      })
    ).toEqual({
      '--advarsel': ['d.css'],
      '--fare': ['d.css'],
      '--gammel': ['b.svelte'],
      '--line': ['b.svelte'],
      '--linje': ['e.ts'],
      '--ramme': ['f.svelte'],
      '--rod': ['e.ts'],
      '--wire': ['c.ts'],
    });
  });

  it('kontrasten regnes etter WCAG: svart på hvitt er 21:1, og en farge med alfa legges over flaten', () => {
    expect(kontrast([0, 0, 0, 1], [255, 255, 255, 1])).toBeCloseTo(21, 5);
    expect(kontrast([119, 119, 119, 1], [255, 255, 255, 1])).toBeCloseTo(4.48, 2);
  });

  it('et par under kravet meldes med modus og forholdstall, og mørk modus og Varden arver det de ikke setter selv', () => {
    const verdier = tokenverdier(
      [
        ':root {\n  --ink: #000000; --ink-2: #000000; --ink-3: #000000; --ink-4: #777777;',
        '  --control-focus: var(--ink);',
        ...FLATER.map((f) => `  ${f}: #ffffff;`),
        ...STATUS.map((s) => `  ${s}: #000000; ${s}-bg: rgba(0, 0, 0, 0.1);`),
        '}',
        ':root.dark,\n.mockup.dark {\n  --ink-4: #ffffff;\n  --canvas: #000000;\n}',
        '.tema-varden {\n  --draft: #999999; --draft-bg: #ffffff; --control-border-color: #eeeeee;',
        '  --sidebar-bg: #000000; --sidebar-active: #000000; --sidebar-text: #ffffff;',
        '  --sidebar-muted: #444444; --sidebar-focus: #ffffff;',
        '  --brand: #000000; --on-brand: #ffffff;\n}',
        ':root.dark .tema-varden {\n  --on-brand: #111111;\n}',
      ].join('\n')
    );
    expect(verdier.mørk['--ink-2']).toBe('#000000');
    const funn = brudd(verdier);
    expect(funn).toContain('lys: --ink-4 på --surface (4.48)');
    expect(funn).toContain('mørk: --ink-4 på --surface (1.00)');
    expect(funn).toContain('mørk: --ink på --canvas (1.00)');
    expect(funn).toContain('varden: --ink-4 på --surface (4.48)');
    expect(funn).toContain('varden: --draft på --draft-bg (2.85)');
    expect(funn).toContain('varden: --control-border-color på --surface-inset (1.16)');
    expect(funn).toContain('varden: --sidebar-muted på --sidebar-bg (2.16)');
    expect(funn).toContain('varden-mørk: --on-brand på --brand (1.11)');
    expect(funn).toContain('varden-mørk: --ink på --canvas (1.00)');
    expect(verdier.varden['--on-brand']).toBe('#ffffff');
    expect(funn.filter((f) => f.includes('--success'))).toEqual([]);
  });
});
