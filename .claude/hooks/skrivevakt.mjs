#!/usr/bin/env node
// PreToolUse-hook for subagentene mekanisk-pr og diffkontroll (#439). Leser
// hook-input som JSON på stdin og avslutter med kode 2 og en melding på stderr
// når kallet ville skrive i en sperret mappe eller utenfor arbeidstreet. Med
// --bare-lesing slipper den bare lesende git-kommandoer gjennom i Bash. Med
// --etter-agent, slik .claude/settings.json kaller den, velger den vakt etter
// agent_type og slipper alle andre kall gjennom (#442). Hva den ikke fanger,
// står i .claude/agents/mekanisk-pr.md.
import { execFileSync } from 'node:child_process';
import { lstatSync, readFileSync, realpathSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const SKRIVEVERKTOY = ['Edit', 'Write', 'MultiEdit', 'NotebookEdit'];

const SPERREDE_MAPPER = ['kjerne', 'server', 'backend', 'supabase', 'sprakprove'];

const SPERRET_MAPPE = new RegExp(
  `(^|[\\s'"=:(/<>;&|{])\\.?/?(${SPERREDE_MAPPER.join('|')})(/|\\s|$|['"])`
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

function finnes(sti) {
  try {
    lstatSync(sti);
    return true;
  } catch {
    return false;
  }
}

// Stien med symbolske lenker løst opp, også når fila ikke finnes ennå. En
// lenke som peker til noe som ikke finnes, kaster, og kallet stoppes.
function ekteSti(sti) {
  const rest = [];
  let del = sti;
  while (!finnes(del) && path.dirname(del) !== del) {
    rest.unshift(path.basename(del));
    del = path.dirname(del);
  }
  return path.join(realpathSync(del), ...rest);
}

function naermesteMappe(sti) {
  let mappe = path.dirname(sti);
  while (!finnes(mappe) && path.dirname(mappe) !== mappe) mappe = path.dirname(mappe);
  return mappe;
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

// Kommandoledd: `;`, `&&`, `||`, `|` og linjeskift skiller dem.
function ledd(kommando) {
  return kommando
    .split(/\s*(?:;|&&|\|\||\||\r?\n)\s*/)
    .map((del) => del.trim())
    .filter(Boolean);
}

// For diffkontroll: et lite sett lesende git-kommandoer med flagg fra en
// tillatelsesliste. git godtar forkortede lange flagg, så en sperreliste holder ikke.
const LESENDE_GIT =
  /^git(?:\s+-C\s+\S+)?\s+(diff|log|show|status|rev-parse|merge-base|ls-files|fetch)((?:\s+\S+)*)$/;
const LESENDE_FLAGG =
  /^(--stat|--name-only|--name-status|--oneline|--no-color|--cached|--short|--abbrev-ref|--verify|--quiet|-q|-p|-n|-\d+|-U\d+|--)$/;

/** For diffkontroll: bare enkle, lesende git-kommandoer i Bash. */
function vurderLesing(input) {
  if (SKRIVEVERKTOY.includes(input.tool_name)) return 'Skriveverktøy er ikke tillatt.';
  if (input.tool_name !== 'Bash') return null;
  const kommando = String(input.tool_input?.command ?? '').trim();
  const treff = /[\r\n;&|<>`$()]/.test(kommando) ? null : kommando.match(LESENDE_GIT);
  if (!treff) return 'Bare enkle, lesende git-kommandoer er tillatt.';
  const [, underkommando, resten] = treff;
  const ord = resten.trim().split(/\s+/).filter(Boolean);
  const flagg = ord.filter((o) => o.startsWith('-'));
  if (flagg.some((o) => !LESENDE_FLAGG.test(o)))
    return 'Flagget står ikke på listen over lesende flagg.';
  if (underkommando === 'fetch' && ord.some((o) => !/^[\w./-]+$/.test(o) || o === 'tag')) {
    return 'fetch bare med navngitte grener, uten refspec eller tagger.';
  }
  return null;
}

// Bare `git push [-u] origin <utsjekket gren>`, uten force eller sletting, og bare
// når grenen ikke endrer sperrede mapper.
function vurderPush(argumenter, rot) {
  const ord = argumenter.trim().split(/\s+/).filter(Boolean);
  if (ord.some((o) => /^--(force|delete|mirror|all|tags)|^-[a-zA-Z]*[fd]/.test(o))) {
    return 'Push med force, sletting eller flere grener er ikke tillatt.';
  }
  const gren = git(rot, 'rev-parse', '--abbrev-ref', 'HEAD');
  const [fjern, refspec, ...resten] = ord.filter((o) => !o.startsWith('-'));
  if (gren === 'main' || resten.length || fjern !== 'origin' || refspec !== gren) {
    return `Push bare den utsjekkede grenen til origin, ikke main (utsjekket: ${gren}).`;
  }
  let filer;
  try {
    filer = sperredeFiler(git(rot, 'diff', '--name-only', 'origin/main...HEAD'));
  } catch {
    return 'Kunne ikke sammenligne med origin/main. Kjør `git fetch origin main` først.';
  }
  return filer.length ? `Grenen endrer sperrede mapper: ${filer.join(', ')}.` : null;
}

/** Returnerer en begrunnelse når kallet skal stoppes, ellers null. */
function vurder(input) {
  const verktoy = input.tool_name ?? '';
  const parametre = input.tool_input ?? {};
  const cwd = input.cwd ?? process.cwd();
  const rot = arbeidstreet(cwd);

  if (SKRIVEVERKTOY.includes(verktoy)) {
    const fil = parametre.file_path ?? parametre.notebook_path;
    if (!fil) return 'Fant ingen filsti i kallet.';
    const absolutt = ekteSti(path.resolve(cwd, fil));
    // Arbeidstrærne ligger inne i hovedkopien, så stien måles også fra treet fila ligger i.
    const filrot = arbeidstreet(naermesteMappe(absolutt)) ?? rot;
    const relativ = filrot && path.relative(filrot, absolutt);
    if (relativ && innenfor(absolutt, filrot) && sperretSti(relativ)) {
      return `${relativ} ligger i en sperret mappe.`;
    }
    if (rot && innenfor(absolutt, rot)) return null;
    if (innenfor(absolutt, ekteSti(tmpdir())) || innenfor(absolutt, ekteSti('/tmp'))) return null;
    if (!rot) return `Ikke i et git-arbeidstre: ${cwd}.`;
    return `${absolutt} ligger utenfor arbeidstreet ${rot}. Skriv bare i ditt eget arbeidstre.`;
  }

  if (verktoy !== 'Bash') return null;
  const kommando = String(parametre.command ?? '')
    .replace(/[\r\n]+/g, ' ; ')
    .replace(/\d*>&\d|\d*>\s*\/dev\/null/g, '');

  if (SPERRET_MAPPE.test(kommando) && SKRIVENDE.some((m) => m.test(kommando))) {
    return 'Kommandoen nevner en sperret mappe og kan skrive.';
  }
  const utenSti = SKRIVENDE_UTEN_STI.find((m) => m.test(kommando));
  if (utenSti) return `Kommandoen kan skrive filer den ikke nevner (${utenSti}).`;

  const deler = ledd(kommando);
  if (
    deler.some((del) => /^gh\b.*(\/pulls\/\S+\/merge\b|\bpr\s+merge\b|\/update-branch\b)/.test(del))
  ) {
    return 'mekanisk-pr merger ikke og oppdaterer ikke PR-en mot main.';
  }
  if (deler.some((del) => /^git\s+(-c\b|config\b)/.test(del))) {
    return 'mekanisk-pr endrer ikke git-oppsettet.';
  }

  // Siste vern: det som committes eller pushes, kontrolleres i git.
  const pusher = deler.filter((del) => /^git(\s+-C\s+\S+)?\s+push\b/.test(del));
  const commiter = deler.some((del) => /^git(\s+-C\s+\S+)?\s+(commit|add)\b/.test(del));
  if (pusher.length && commiter) return 'Kjør commit og push i hver sin kommando.';
  if (rot && commiter) {
    const endret = git(rot, 'diff', '--name-only', 'HEAD');
    const nye = git(rot, 'ls-files', '--others', '--exclude-standard');
    const filer = sperredeFiler(`${endret}\n${nye}`);
    if (filer.length) return `Endringer i sperrede mapper: ${filer.join(', ')}.`;
  }
  for (const del of pusher) {
    if (!rot) return 'Ikke i et git-arbeidstre.';
    const begrunnelse = vurderPush(del.replace(/^.*?\bpush\b/, ''), rot);
    if (begrunnelse) return begrunnelse;
  }
  return null;
}

// Hooks i frontmatter til prosjektagenter kjører bare i en mappe som er klarert
// i dialogen, og skyøkta har ingen (#442). Derfor kaller settings.json vakten for
// hvert kall, og den velger selv. Agentens arbeidstre er reserven når
// agent_type mangler.
function vaktEtterAgent(input) {
  if (input.agent_type === 'diffkontroll') return 'lesing';
  if (input.agent_type === 'mekanisk-pr') return 'skriving';
  if (input.agent_type !== undefined) return null;
  if (/[\\/]\.claude[\\/]worktrees[\\/]agent-/.test(String(input.cwd ?? ''))) return 'skriving';
  return null;
}

// Alt som går galt, stopper kallet: kode 1 ville sluppet det gjennom.
try {
  const input = JSON.parse(readFileSync(0, 'utf8'));
  const vakt = process.argv.includes('--etter-agent')
    ? vaktEtterAgent(input)
    : process.argv.includes('--bare-lesing')
      ? 'lesing'
      : 'skriving';
  if (!vakt) process.exit(0);
  const lesing = vakt === 'lesing';
  const begrunnelse = lesing ? vurderLesing(input) : vurder(input);
  if (begrunnelse) {
    process.stderr.write(
      lesing
        ? `skrivevakt: ${begrunnelse} diffkontroll leser bare.\n`
        : `skrivevakt: ${begrunnelse} mekanisk-pr skriver ikke i ${SPERREDE_MAPPER.join(', ')} ` +
            'eller utenfor sitt eget arbeidstre. Trengs endringen, stopp og meld det i rapporten.\n'
    );
    process.exit(2);
  }
} catch (feil) {
  process.stderr.write(`skrivevakt: kunne ikke vurdere kallet (${feil.message}).\n`);
  process.exit(2);
}
