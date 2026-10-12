#!/usr/bin/env node
// PreToolUse-hook for subagentene mekanisk-pr og diffkontroll (#439). Leser
// hook-input som JSON på stdin og avslutter med kode 2 og en melding på stderr
// når kallet ville skrive i en sperret mappe eller utenfor arbeidstreet. Med
// --bare-lesing slipper den bare lesende git-kommandoer gjennom i Bash. Hva den
// ikke fanger, står i .claude/agents/mekanisk-pr.md.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

export const SPERREDE_MAPPER = ['kjerne', 'server', 'backend', 'supabase', 'sprakprove'];

const SPERRET_MAPPE = new RegExp(
  `(^|[\\s'"=:(/])\\.?/?(${SPERREDE_MAPPER.join('|')})(/|\\s|$|['"])`
);

// Kommandoer og operatorer som kan skrive en fil som er nevnt i kommandoen.
const SKRIVENDE = [
  />/,
  /\btee\b/,
  /\bsed\b[^|;&]*\s-[a-zA-Z]*i/,
  /\bperl\b[^|;&]*\s-[a-zA-Z]*i/,
  /\b(mv|cp|rm|rmdir|touch|mkdir|ln|chmod|truncate|dd|install|rsync|unlink)\b/,
  /\bgit\s+(checkout|restore|rm|mv|reset|clean|stash)\b/,
];

// Skriver filer uten at stien står i kommandoen.
const SKRIVENDE_UTEN_STI = [
  /\bprettier\b[^|;&]*--write/,
  /\beslint\b[^|;&]*--fix/,
  /\bnpm\s+run\s+format\b/,
  /\bruff\b[^|;&]*(--fix|\bformat\b)/,
  /\bgit\s+(apply|am|cherry-pick)\b/,
  /(^|[\s;&|])patch\b/,
];

function sperretSti(relativ) {
  const forste = relativ.split(/[\\/]/)[0];
  return SPERREDE_MAPPER.includes(forste);
}

function git(cwd, ...argumenter) {
  return execFileSync('git', ['-C', cwd, ...argumenter], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  }).trim();
}

function arbeidstreet(cwd) {
  try {
    return git(cwd, 'rev-parse', '--show-toplevel');
  } catch {
    return null;
  }
}

function innenfor(sti, mappe) {
  const relativ = path.relative(mappe, sti);
  return relativ === '' || (!relativ.startsWith('..') && !path.isAbsolute(relativ));
}

function sperredeFiler(filer) {
  return filer
    .split('\n')
    .filter(Boolean)
    .filter((fil) => sperretSti(fil));
}

const LESENDE_GIT =
  /^git(\s+-C\s+\S+)?\s+(diff|log|show|status|fetch|rev-parse|merge-base|ls-files|ls-tree|cat-file|blame|grep)\b[^;&|<>`$]*$/;

/** For diffkontroll: bare enkle, lesende git-kommandoer i Bash. */
export function vurderLesing(input) {
  if (input.tool_name !== 'Bash') return null;
  const kommando = (input.tool_input?.command ?? '').trim();
  if (/\s--output\b|\s-o\s/.test(kommando)) return 'Kommandoen skriver til fil.';
  return LESENDE_GIT.test(kommando) ? null : 'Bare enkle, lesende git-kommandoer er tillatt.';
}

/** Returnerer en begrunnelse når kallet skal stoppes, ellers null. */
export function vurder(input) {
  const verktoy = input.tool_name ?? '';
  const parametre = input.tool_input ?? {};
  const cwd = input.cwd ?? process.cwd();
  const rot = arbeidstreet(cwd);

  if (['Edit', 'Write', 'MultiEdit', 'NotebookEdit'].includes(verktoy)) {
    const fil = parametre.file_path ?? parametre.notebook_path;
    if (!fil) return 'Fant ingen filsti i kallet.';
    const absolutt = path.resolve(cwd, fil);
    if (rot && innenfor(absolutt, rot)) {
      const relativ = path.relative(rot, absolutt);
      return sperretSti(relativ) ? `${relativ} ligger i en sperret mappe.` : null;
    }
    if (innenfor(absolutt, tmpdir()) || innenfor(absolutt, '/tmp')) return null;
    if (!rot) return `Ikke i et git-arbeidstre: ${cwd}.`;
    return `${absolutt} ligger utenfor arbeidstreet ${rot}. Skriv bare i ditt eget arbeidstre.`;
  }

  if (verktoy !== 'Bash') return null;
  const kommando = (parametre.command ?? '').replace(/\d*>&\d|\d*>\s*\/dev\/null/g, '');

  if (SPERRET_MAPPE.test(kommando) && SKRIVENDE.some((m) => m.test(kommando))) {
    return 'Kommandoen nevner en sperret mappe og kan skrive.';
  }
  const utenSti = SKRIVENDE_UTEN_STI.find((m) => m.test(kommando));
  if (utenSti) return `Kommandoen kan skrive filer den ikke nevner (${utenSti}).`;

  // Siste vern: det som committes eller pushes, kontrolleres i git.
  if (rot && /\bgit\b[^|;&]*\bcommit\b/.test(kommando)) {
    const filer = sperredeFiler(git(rot, 'diff', '--name-only', 'HEAD'));
    if (filer.length) return `Endringer i sperrede mapper: ${filer.join(', ')}.`;
  }
  if (rot && /\bgit\b[^|;&]*\bpush\b/.test(kommando)) {
    let filer;
    try {
      filer = sperredeFiler(git(rot, 'diff', '--name-only', 'origin/main...HEAD'));
    } catch {
      return 'Kunne ikke sammenligne med origin/main. Kjør `git fetch origin main` først.';
    }
    if (filer.length) return `Grenen endrer sperrede mapper: ${filer.join(', ')}.`;
  }
  return null;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  let input;
  try {
    input = JSON.parse(readFileSync(0, 'utf8'));
  } catch {
    process.stderr.write('skrivevakt: ugyldig hook-input.\n');
    process.exit(2);
  }
  if (process.argv.includes('--bare-lesing')) {
    const begrunnelse = vurderLesing(input);
    if (begrunnelse) {
      process.stderr.write(`skrivevakt: ${begrunnelse} diffkontroll leser bare.\n`);
      process.exit(2);
    }
  } else {
    const begrunnelse = vurder(input);
    if (begrunnelse) {
      process.stderr.write(
        `skrivevakt: ${begrunnelse} mekanisk-pr skriver ikke i ${SPERREDE_MAPPER.join(', ')} ` +
          'eller utenfor sitt eget arbeidstre. Trengs endringen, stopp og meld det i rapporten.\n'
      );
      process.exit(2);
    }
  }
}
