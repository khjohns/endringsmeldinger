/**
 * WCAG Contrast Checker — Mockup (Kontraktsbordet) light + dark mode
 *
 * WCAG AA Requirements:
 * - Normal text (< 18pt / < 14pt bold): 4.5:1
 * - Large text (≥ 18pt or ≥ 14pt bold) & UI components: 3:1
 */

function hexToRgb(hex) {
  const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return r
    ? { r: parseInt(r[1], 16), g: parseInt(r[2], 16), b: parseInt(r[3], 16) }
    : null;
}

function getLuminance({ r, g, b }) {
  const [rs, gs, bs] = [r, g, b].map((v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function contrast(hex1, hex2) {
  const l1 = getLuminance(hexToRgb(hex1));
  const l2 = getLuminance(hexToRgb(hex2));
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

// ── Light mode tokens ─────────────────────────────────────

const lightSurfaces = {
  canvas:       '#fefdfb',
  paper:        '#f5f3ee',
  'paper-inset':'#efede7',
  'paper-sub':  '#f9f8f4',
  plate:        '#1c1917',
  'gold-bg':    '#fff8e8',
  'green-bg':   '#ecf5f3',
  'red-bg':     '#fff0ee',
  'draft-bg':   '#f6f7f2',
};

const lightText = {
  ink:    '#1c1917',
  'ink-2':'#4a4945',
  'ink-3':'#6b6a66',
  'ink-4':'#898780',
  gold:   '#a98015',
  green:  '#034b45',
  red:    '#cc3030',
  draft:  '#5a6048',
  white:  '#ffffff',
};

// ── Dark mode tokens (Kveldsskiftet) ──────────────────────

const darkSurfaces = {
  canvas:       '#000000',
  paper:        '#111110',
  'paper-inset':'#1a1918',
  'paper-sub':  '#141312',
  plate:        '#000000',
  'gold-bg':    '#1e1a0e',
  'green-bg':   '#0e1e1a',
  'red-bg':     '#1e1010',
  'draft-bg':   '#141410',
};

const darkText = {
  ink:    '#f0ede5',
  'ink-2':'#b8b4a8',
  'ink-3':'#878380',
  'ink-4':'#6a6662',
  gold:   '#f0c840',
  green:  '#50d0b8',
  red:    '#ea3e3e',
  draft:  '#909080',
  white:  '#ffffff',
};

// ── Shared combination definitions ────────────────────────

const combos = [
  // Primary text on all surfaces
  { cat: 'Tekst på overflater', name: 'ink on canvas',        fg: 'ink',    bg: 'canvas',        type: 'normal' },
  { cat: 'Tekst på overflater', name: 'ink on paper',         fg: 'ink',    bg: 'paper',         type: 'normal' },
  { cat: 'Tekst på overflater', name: 'ink on paper-inset',   fg: 'ink',    bg: 'paper-inset',   type: 'normal' },
  { cat: 'Tekst på overflater', name: 'ink on paper-sub',     fg: 'ink',    bg: 'paper-sub',     type: 'normal' },
  { cat: 'Tekst på overflater', name: 'ink on draft-bg',      fg: 'ink',    bg: 'draft-bg',      type: 'normal' },
  { cat: 'Tekst på overflater', name: 'ink on green-bg',      fg: 'ink',    bg: 'green-bg',      type: 'normal' },
  { cat: 'Tekst på overflater', name: 'ink on gold-bg',       fg: 'ink',    bg: 'gold-bg',       type: 'normal' },
  { cat: 'Tekst på overflater', name: 'ink on red-bg',        fg: 'ink',    bg: 'red-bg',        type: 'normal' },

  // Secondary text (ink-2)
  { cat: 'Sekundær tekst',      name: 'ink-2 on canvas',      fg: 'ink-2',  bg: 'canvas',        type: 'normal' },
  { cat: 'Sekundær tekst',      name: 'ink-2 on paper',       fg: 'ink-2',  bg: 'paper',         type: 'normal' },
  { cat: 'Sekundær tekst',      name: 'ink-2 on paper-inset', fg: 'ink-2',  bg: 'paper-inset',   type: 'normal' },
  { cat: 'Sekundær tekst',      name: 'ink-2 on paper-sub',   fg: 'ink-2',  bg: 'paper-sub',     type: 'normal' },
  { cat: 'Sekundær tekst',      name: 'ink-2 on draft-bg',    fg: 'ink-2',  bg: 'draft-bg',      type: 'normal' },
  { cat: 'Sekundær tekst',      name: 'ink-2 on green-bg',    fg: 'ink-2',  bg: 'green-bg',      type: 'normal' },

  // Muted text (ink-3) — labels, helptext
  { cat: 'Dempet tekst (ink-3)', name: 'ink-3 on canvas',      fg: 'ink-3',  bg: 'canvas',       type: 'normal' },
  { cat: 'Dempet tekst (ink-3)', name: 'ink-3 on paper',       fg: 'ink-3',  bg: 'paper',        type: 'normal' },
  { cat: 'Dempet tekst (ink-3)', name: 'ink-3 on paper-inset', fg: 'ink-3',  bg: 'paper-inset',  type: 'normal' },
  { cat: 'Dempet tekst (ink-3)', name: 'ink-3 on paper-sub',   fg: 'ink-3',  bg: 'paper-sub',    type: 'normal' },
  { cat: 'Dempet tekst (ink-3)', name: 'ink-3 on draft-bg',    fg: 'ink-3',  bg: 'draft-bg',     type: 'normal' },
  { cat: 'Dempet tekst (ink-3)', name: 'ink-3 on green-bg',    fg: 'ink-3',  bg: 'green-bg',     type: 'normal' },
  // ink-3 as large text / label (≥ 14pt bold)
  { cat: 'Dempet tekst (ink-3)', name: 'ink-3 on canvas (large)',      fg: 'ink-3', bg: 'canvas',      type: 'large' },
  { cat: 'Dempet tekst (ink-3)', name: 'ink-3 on paper (large)',       fg: 'ink-3', bg: 'paper',       type: 'large' },
  { cat: 'Dempet tekst (ink-3)', name: 'ink-3 on paper-inset (large)', fg: 'ink-3', bg: 'paper-inset', type: 'large' },

  // Ghost text (ink-4) — UI only: inactive tabs, char count, scrollbar
  { cat: 'Spøkelsestekst (ink-4, kun UI)', name: 'ink-4 on canvas (UI)',      fg: 'ink-4', bg: 'canvas',      type: 'ui' },
  { cat: 'Spøkelsestekst (ink-4, kun UI)', name: 'ink-4 on paper (UI)',       fg: 'ink-4', bg: 'paper',       type: 'ui' },
  { cat: 'Spøkelsestekst (ink-4, kun UI)', name: 'ink-4 on paper-inset (UI)', fg: 'ink-4', bg: 'paper-inset', type: 'ui' },

  // Accent colors
  // Gold — stamps (11px 700), status labels, locked-value tokens → UI threshold
  { cat: 'Aksent-farger',       name: 'gold on canvas (UI)',   fg: 'gold',   bg: 'canvas',        type: 'ui' },
  { cat: 'Aksent-farger',       name: 'gold on paper (UI)',    fg: 'gold',   bg: 'paper',         type: 'ui' },
  { cat: 'Aksent-farger',       name: 'gold on gold-bg (UI)',  fg: 'gold',   bg: 'gold-bg',       type: 'ui' },
  { cat: 'Aksent-farger',       name: 'green on canvas',       fg: 'green',  bg: 'canvas',        type: 'normal' },
  { cat: 'Aksent-farger',       name: 'green on paper',        fg: 'green',  bg: 'paper',         type: 'normal' },
  { cat: 'Aksent-farger',       name: 'green on green-bg',     fg: 'green',  bg: 'green-bg',      type: 'normal' },
  { cat: 'Aksent-farger',       name: 'red on canvas',         fg: 'red',    bg: 'canvas',        type: 'normal' },
  { cat: 'Aksent-farger',       name: 'red on paper',          fg: 'red',    bg: 'paper',         type: 'normal' },
  { cat: 'Aksent-farger',       name: 'red on red-bg',         fg: 'red',    bg: 'red-bg',        type: 'normal' },
  { cat: 'Aksent-farger',       name: 'draft on canvas',       fg: 'draft',  bg: 'canvas',        type: 'normal' },
  { cat: 'Aksent-farger',       name: 'draft on draft-bg',     fg: 'draft',  bg: 'draft-bg',      type: 'normal' },
  { cat: 'Aksent-farger',       name: 'gold on gold-bg (large)', fg: 'gold', bg: 'gold-bg',       type: 'large' },

  // White/ink on plate
  { cat: 'Plate',               name: 'white on plate',        fg: 'white',  bg: 'plate',         type: 'normal' },
  { cat: 'Plate',               name: 'gold on plate (UI)',    fg: 'gold',   bg: 'plate',         type: 'ui' },
];

// ── Runner ────────────────────────────────────────────────

function runCheck(modeName, textMap, surfaceMap) {
  console.log('');
  console.log('='.repeat(72));
  console.log(`WCAG AA KONTRASTSJEKK — ${modeName}`);
  console.log('='.repeat(72));
  console.log('');
  console.log('Krav: Normal tekst ≥ 4.5:1 | Stor tekst / UI ≥ 3:1');
  console.log('');

  let failures = [];
  let currentCat = '';

  for (const c of combos) {
    const fgHex = textMap[c.fg];
    const bgHex = surfaceMap[c.bg];
    if (!fgHex || !bgHex) continue; // skip if token missing in this mode

    if (c.cat !== currentCat) {
      currentCat = c.cat;
      console.log(`── ${currentCat} ${'─'.repeat(56 - currentCat.length)}`);
    }

    const ratio = contrast(fgHex, bgHex);
    const req = c.type === 'normal' ? 4.5 : 3.0;
    const pass = ratio >= req;
    const icon = pass ? '✅' : '❌';
    const label = c.type === 'normal' ? '' : ` [${c.type}]`;

    console.log(
      `  ${icon} ${ratio.toFixed(2)}:1  ${c.name}${label}  (${fgHex} / ${bgHex})${!pass ? `  ← behøver ${req}:1` : ''}`,
    );

    if (!pass) {
      failures.push({ ...c, fgHex, bgHex, ratio, req });
    }
  }

  console.log('');
  console.log('─'.repeat(72));
  if (failures.length === 0) {
    console.log('✅ Alle kombinasjoner består WCAG AA.');
  } else {
    console.log(`❌ ${failures.length} kombinasjon(er) feiler:`);
    for (const f of failures) {
      console.log(
        `   ${f.name}: ${f.ratio.toFixed(2)}:1 (trenger ${f.req}:1) — ${f.fgHex} på ${f.bgHex}`,
      );
    }
  }
  console.log('─'.repeat(72));

  return failures;
}

// ── Run both modes ────────────────────────────────────────

const lightFails = runCheck('Light mode', lightText, lightSurfaces);
const darkFails = runCheck('Dark mode (Kveldsskiftet)', darkText, darkSurfaces);

console.log('');
console.log('='.repeat(72));
const totalFails = lightFails.length + darkFails.length;
if (totalFails === 0) {
  console.log('✅ Begge moduser består WCAG AA.');
} else {
  if (lightFails.length) console.log(`Light: ${lightFails.length} feil`);
  if (darkFails.length) console.log(`Dark:  ${darkFails.length} feil`);
}
console.log('='.repeat(72));
