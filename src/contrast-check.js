#!/usr/bin/env node
// @ts-nocheck

/**
 * Kontrastsjekk for KOE (Krav om Endringsordre) designtokens.
 *
 * Beregner WCAG 2.1 kontrastforhold for alle tekst/bakgrunn-kombinasjoner
 * i designsystemet og rapporterer brudd — for lyst og mørkt tema.
 *
 * Tokens hentet fra: src/app.css (:root + .dark)
 * Bruk: node src/contrast-check.js
 */

// ── Tokens (fra src/app.css) ───────────────────────────────────────

const light = {
  surfaces: {
    canvas: '#f3f1ec',
    felt: '#faf8f4',
    'felt-raised': '#f3f1ec',
    'felt-hover': '#efede7',
    'felt-active': '#e5e2da',
    'score-high-bg': '#eff5ee',
    'score-low-bg': '#f5eeef',
    'vekt-bg': null, // rgba — beregnes via compositeRgba
    'vekt-bg-strong': null, // rgba — beregnes via compositeRgba
  },
  surfacesRgba: {
    'vekt-bg': { r: 146, g: 86, b: 9, a: 0.06 },
    'vekt-bg-strong': { r: 146, g: 86, b: 9, a: 0.12 },
  },
  inks: {
    ink: '#21201c',
    'ink-secondary': '#57524b',
    'ink-muted': '#655f56',
    'ink-ghost': '#8d8578',
  },
  accents: {
    vekt: '#8e5409',
    'vekt-dim': '#7c4a0a',
    'score-high': '#047d56',
    'score-mid': '#655f56',
    'score-low': '#c01b3d',
  },
};

const dark = {
  surfaces: {
    canvas: '#0f0d0a',
    felt: '#16140f',
    'felt-raised': '#1e1b16',
    'felt-hover': '#1a1815',
    'felt-active': '#282520',
    'score-high-bg': null, // rgba — beregnes
    'score-low-bg': null, // rgba — beregnes
    'vekt-bg': null,
    'vekt-bg-strong': null,
  },
  surfacesRgba: {
    'score-high-bg': { r: 16, g: 185, b: 129, a: 0.1 },
    'score-low-bg': { r: 240, g: 62, b: 95, a: 0.08 },
    'vekt-bg': { r: 245, g: 158, b: 11, a: 0.08 },
    'vekt-bg-strong': { r: 245, g: 158, b: 11, a: 0.14 },
  },
  inks: {
    ink: '#f5f3ee',
    'ink-secondary': '#a8a29a',
    'ink-muted': '#908b82',
    'ink-ghost': '#666157',
  },
  accents: {
    vekt: '#f59e0b',
    'vekt-dim': '#d97706',
    'score-high': '#10b981',
    'score-mid': '#908b82',
    'score-low': '#f03e5f',
  },
};

// ── Faktisk bruk i KOE-kodebasen ──────────────────────────────────

const usages = [
  // Seksjonstitler og labels (.section-label i app.css)
  {
    fg: 'ink-muted',
    bg: 'canvas',
    size: 10,
    weight: 600,
    label: 'Seksjonstittel på canvas (.section-label)',
  },
  {
    fg: 'ink-muted',
    bg: 'felt',
    size: 10,
    weight: 600,
    label: 'Seksjonstittel på felt (.section-label)',
  },
  { fg: 'ink-muted', bg: 'canvas', size: 11, weight: 600, label: 'RTE-label / NumberInput-label' },
  { fg: 'ink-muted', bg: 'felt', size: 11, weight: 600, label: 'SectionHeading / Sporkort header' },
  { fg: 'ink-ghost', bg: 'canvas', size: 11, weight: 400, label: 'Hjemmelreferanse (§-nummer)' },
  { fg: 'ink-ghost', bg: 'felt', size: 11, weight: 400, label: 'Hjemmelreferanse på felt' },

  // Brødtekst
  { fg: 'ink', bg: 'canvas', size: 14, weight: 400, label: 'RTE-brødtekst / editor' },
  { fg: 'ink', bg: 'felt', size: 13, weight: 500, label: 'Primærtekst på felt (K/V-verdi)' },
  { fg: 'ink', bg: 'canvas', size: 13, weight: 500, label: 'Primærtekst på canvas' },
  { fg: 'ink-secondary', bg: 'canvas', size: 13, weight: 500, label: 'Sekundærtekst (K/V-label)' },
  { fg: 'ink-secondary', bg: 'felt', size: 13, weight: 500, label: 'Sekundærtekst på felt' },
  { fg: 'ink-secondary', bg: 'felt', size: 11, weight: 400, label: 'Hendelse-kontekst (Sporkort)' },
  { fg: 'ink-secondary', bg: 'canvas', size: 14, weight: 400, label: 'Blockquote-tekst i RTE' },
  { fg: 'ink-muted', bg: 'canvas', size: 14, weight: 400, label: 'RTE-placeholder' },
  { fg: 'ink-muted', bg: 'felt', size: 12, weight: 400, label: 'Checkbox-beskrivelse' },
  { fg: 'ink-muted', bg: 'felt', size: 13, weight: 400, label: 'Checkbox §-referanse' },

  // Ghosttekst — små metadata
  { fg: 'ink-ghost', bg: 'felt', size: 10, weight: 400, label: 'Hendelsedato i logg' },
  { fg: 'ink-ghost', bg: 'felt', size: 9, weight: 400, label: 'Revisjonsnummer (Rev. N)' },
  { fg: 'ink-ghost', bg: 'felt', size: 10, weight: 400, label: 'Aktørnavn i hendelseslinje' },
  { fg: 'ink-ghost', bg: 'canvas', size: 12, weight: 400, label: 'NumberInput-suffiks (NOK)' },

  // Knapper
  { fg: 'canvas', bg: 'vekt', size: 13, weight: 600, label: 'Primærknapp (tekst på vekt-bg)' },
  { fg: 'ink', bg: 'canvas', size: 13, weight: 600, label: 'Sekundærknapp' },
  { fg: 'score-low', bg: 'score-low-bg', size: 13, weight: 600, label: 'Destruktiv knapp (slett)' },
  { fg: 'score-high', bg: 'score-high-bg', size: 13, weight: 600, label: 'Godkjenn-knapp' },

  // Badges / stempel
  { fg: 'score-high', bg: 'score-high-bg', size: 10, weight: 600, label: 'Badge godkjent' },
  { fg: 'score-low', bg: 'score-low-bg', size: 10, weight: 600, label: 'Badge avslått' },
  { fg: 'vekt', bg: 'vekt-bg', size: 10, weight: 600, label: 'Badge delvis godkjent' },
  { fg: 'ink-muted', bg: 'felt-active', size: 10, weight: 600, label: 'Badge uavklart' },
  { fg: 'score-high', bg: 'felt', size: 10, weight: 600, label: 'Stempel godkjent (border-only)' },
  { fg: 'score-low', bg: 'felt', size: 10, weight: 600, label: 'Stempel avslått (border-only)' },
  { fg: 'vekt', bg: 'felt', size: 10, weight: 600, label: 'Stempel krever handling' },

  // Aksentfarger på canvas
  { fg: 'vekt', bg: 'canvas', size: 13, weight: 600, label: 'Vekt-tall (primær amber)' },
  { fg: 'vekt-dim', bg: 'canvas', size: 11, weight: 500, label: 'Vekt-dim (sekundær amber)' },
  { fg: 'score-high', bg: 'canvas', size: 13, weight: 600, label: 'Score høy på canvas' },
  { fg: 'score-low', bg: 'canvas', size: 13, weight: 600, label: 'Score lav på canvas' },
  { fg: 'score-high', bg: 'felt', size: 11, weight: 400, label: 'Diff positiv (+%)' },
  { fg: 'score-low', bg: 'felt', size: 11, weight: 400, label: 'Diff negativ (-%)' },

  // Alerts / callouts
  { fg: 'ink', bg: 'score-high-bg', size: 13, weight: 400, label: 'Alert-tekst positiv' },
  { fg: 'ink', bg: 'score-low-bg', size: 13, weight: 400, label: 'Alert-tekst fare' },
  { fg: 'vekt', bg: 'vekt-bg', size: 12, weight: 500, label: 'Snuoperasjon-varsling' },
  { fg: 'ink-secondary', bg: 'vekt-bg', size: 11, weight: 400, label: 'Internt notat brødtekst' },
  { fg: 'vekt', bg: 'vekt-bg', size: 10, weight: 600, label: 'KUN INTERNT-label' },

  // Toolbar (RichTextEditor)
  { fg: 'ink-secondary', bg: 'felt-raised', size: 16, weight: 400, label: 'Toolbar-ikon inaktiv' },
  { fg: 'vekt', bg: 'vekt-bg', size: 16, weight: 400, label: 'Toolbar-ikon aktiv' },

  // Segmented controls
  { fg: 'ink-secondary', bg: 'canvas', size: 12, weight: 500, label: 'SegmentedControl inaktiv' },
  { fg: 'vekt', bg: 'vekt-bg-strong', size: 12, weight: 600, label: 'SegmentedControl aktiv' },

  // Tabs (BegrunnelseThread)
  { fg: 'ink-muted', bg: 'canvas', size: 12, weight: 600, label: 'Tab inaktiv' },
  { fg: 'ink', bg: 'canvas', size: 12, weight: 600, label: 'Tab aktiv' },

  // Historikk-panel
  { fg: 'ink-secondary', bg: 'canvas', size: 12, weight: 600, label: 'Partsnavn i historikk' },
  { fg: 'ink-ghost', bg: 'canvas', size: 11, weight: 500, label: 'Versjonsnummer (v1, v2)' },
  { fg: 'ink-ghost', bg: 'canvas', size: 11, weight: 400, label: 'Dato i historikk-oppføring' },
  {
    fg: 'ink-secondary',
    bg: 'canvas',
    size: 14,
    weight: 400,
    label: 'Begrunnelse-brødtekst i historikk',
  },

  // Filopplasting
  { fg: 'ink-secondary', bg: 'canvas', size: 13, weight: 400, label: 'Opplastingssone-tekst' },
  { fg: 'ink-ghost', bg: 'canvas', size: 11, weight: 400, label: 'Filformat-hint (PDF, DOCX…)' },
  { fg: 'ink', bg: 'felt', size: 12, weight: 500, label: 'Vedleggsfilnavn' },
  { fg: 'ink-muted', bg: 'felt', size: 10, weight: 400, label: 'Filstørrelse' },
];

// ── WCAG-beregning ─────────────────────────────────────────────────

function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return [
    parseInt(h.substring(0, 2), 16) / 255,
    parseInt(h.substring(2, 4), 16) / 255,
    parseInt(h.substring(4, 6), 16) / 255,
  ];
}

function rgbToHex(r, g, b) {
  const c = (v) =>
    Math.round(v * 255)
      .toString(16)
      .padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`;
}

function compositeRgba(rgba, bgHex) {
  const [bgR, bgG, bgB] = hexToRgb(bgHex);
  const { r, g, b, a } = rgba;
  const fR = r / 255,
    fG = g / 255,
    fB = b / 255;
  return rgbToHex(fR * a + bgR * (1 - a), fG * a + bgG * (1 - a), fB * a + bgB * (1 - a));
}

function linearize(c) {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function relativeLuminance(hex) {
  const [r, g, b] = hexToRgb(hex).map(linearize);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(fg, bg) {
  const l1 = relativeLuminance(fg);
  const l2 = relativeLuminance(bg);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

// WCAG 2.1:
//   Normal tekst (<18pt / <14pt bold): 4.5:1 (AA), 7:1 (AAA)
//   Stor tekst (>=18pt / >=14pt bold):  3:1 (AA), 4.5:1 (AAA)
//   1pt = 1.333px -> 18pt = 24px, 14pt = 18.67px

function isLargeText(sizePx, weight) {
  return sizePx >= 24 || (sizePx >= 18.67 && weight >= 700);
}

function wcagLevel(ratio, sizePx, weight) {
  const large = isLargeText(sizePx, weight);
  if (large) {
    if (ratio >= 4.5) return 'AAA';
    if (ratio >= 3.0) return 'AA';
    return 'FAIL';
  }
  if (ratio >= 7.0) return 'AAA';
  if (ratio >= 4.5) return 'AA';
  return 'FAIL';
}

// ── Resolve surface hex ────────────────────────────────────────────

function resolveSurface(theme, name) {
  if (theme.surfaces[name]) return theme.surfaces[name];
  if (theme.surfacesRgba?.[name]) {
    // Composite rgba over canvas
    return compositeRgba(theme.surfacesRgba[name], theme.surfaces['canvas']);
  }
  return null;
}

// ── analyzeTheme ───────────────────────────────────────────────────

function analyzeTheme(themeName, theme) {
  const allColors = { ...theme.inks, ...theme.accents };
  // Also include 'canvas' as a foreground (for primary buttons with canvas text on vekt bg)
  const fgWithCanvas = { ...allColors, canvas: theme.surfaces['canvas'] };

  console.log(`\n${'='.repeat(68)}`);
  console.log(`  ${themeName}`);
  console.log(`${'='.repeat(68)}\n`);

  // Token-par matrise
  const solidSurfaces = ['canvas', 'felt', 'felt-raised', 'felt-hover', 'felt-active'];
  console.log('-- Ink-tokens mot overflater --\n');
  console.log('Farge'.padEnd(16) + solidSurfaces.map((s) => s.padEnd(13)).join('') + '  Hex');
  console.log('-'.repeat(16 + solidSurfaces.length * 13 + 10));

  for (const [inkName, inkHex] of Object.entries(allColors)) {
    let line = inkName.padEnd(16);
    for (const sName of solidSurfaces) {
      const bgHex = resolveSurface(theme, sName);
      if (!bgHex) {
        line += '  n/a'.padEnd(13);
        continue;
      }
      const ratio = contrastRatio(inkHex, bgHex);
      const marker = ratio < 3 ? ' X' : ratio < 4.5 ? ' ~' : ratio < 7 ? ' o' : ' *';
      line += `${ratio.toFixed(2)}:1${marker}`.padEnd(13);
    }
    line += `  ${inkHex}`;
    console.log(line);
  }

  console.log(
    '\n  * >= 7:1 (AAA)  o >= 4.5:1 (AA)  ~ >= 3:1 (stor tekst)  X < 3:1 (utilstrekkelig)\n'
  );

  // Bruksspesifikk rapport
  console.log('-- Faktisk bruk i KOE-kodebasen --\n');

  const failures = [];
  const warnings = [];

  for (const u of usages) {
    const fgHex = fgWithCanvas[u.fg] || allColors[u.fg];
    const bgHex = resolveSurface(theme, u.bg);
    if (!fgHex || !bgHex) continue;

    const ratio = contrastRatio(fgHex, bgHex);
    const level = wcagLevel(ratio, u.size, u.weight);
    const entry = {
      ...u,
      ratio: ratio.toFixed(2),
      level,
      fgHex,
      bgHex,
    };

    if (level === 'FAIL') failures.push(entry);
    else if (level === 'AA') warnings.push(entry);
  }

  if (failures.length > 0) {
    console.log(`  X BRUDD (${failures.length} stk -- under WCAG AA):\n`);
    for (const f of failures) {
      console.log(`    ${f.ratio}:1  ${f.fg} -> ${f.bg}  (${f.size}px/${f.weight}w)`);
      console.log(`    +-- ${f.label}`);
      const needed = isLargeText(f.size, f.weight) ? '3.0:1' : '4.5:1';
      console.log(`       Trenger minst ${needed} for WCAG AA\n`);
    }
  }

  if (warnings.length > 0) {
    console.log(`  ~ Passerer AA, men ikke AAA (${warnings.length} stk):\n`);
    for (const w of warnings) {
      console.log(`    ${w.ratio}:1  ${w.fg} -> ${w.bg}  (${w.size}px/${w.weight}w)`);
      console.log(`    +-- ${w.label}\n`);
    }
  }

  const passes = usages.length - failures.length - warnings.length;
  console.log(`  * Godkjent AAA: ${passes}/${usages.length}`);
  console.log(`  o Godkjent AA:  ${warnings.length}/${usages.length}`);
  console.log(`  X Brudd:        ${failures.length}/${usages.length}\n`);

  if (failures.length > 0) {
    console.log('-- Forslag --\n');
    for (const f of failures) {
      const needed = isLargeText(f.size, f.weight) ? '3.0:1' : '4.5:1';
      console.log(`  ${f.fg}: Juster hex for minst ${needed} kontrast mot ${f.bg} (${f.bgHex})`);
    }
    console.log('');
  }
}

// ── Kjor audit ─────────────────────────────────────────────────────

console.log('\n' + '='.repeat(68));
console.log('  KOE -- Kontrastsjekk (WCAG 2.1)');
console.log('  Tokens fra: src/app.css (:root + .dark)');
console.log('='.repeat(68));

analyzeTheme('LYST TEMA (:root)', light);
analyzeTheme('MORKT TEMA (.dark)', dark);
