#!/usr/bin/env node
// PreToolUse-hook for subagentene mekanisk-pr og diffkontroll (#439). Leser
// hook-input som JSON på stdin og avslutter med kode 2 og en melding på stderr
// når kallet ville skrive i en sperret mappe eller utenfor arbeidstreet. Med
// --bare-lesing slipper den bare lesende kommandoer gjennom i Bash (git, gh api,
// grep og rg). Med --etter-agent, slik .claude/settings.json kaller den, velger den vakt etter
// agent_type og slipper alle andre kall gjennom (#442). Hva den ikke fanger,
// står i .claude/agents/mekanisk-pr.md.
import { execFileSync } from 'node:child_process';
import { lstatSync, readFileSync, realpathSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const SKRIVEVERKTOY = ['Edit', 'Write', 'MultiEdit', 'NotebookEdit'];

const SPERREDE_MAPPER = ['kjerne', 'server', 'backend', 'supabase', 'sprakprove'];

// Skallet avslutter et ord også ved `;`, `&`, `|`, `)` og backtick, så de avgrenser mappenavnet.
const SPERRET_MAPPE = new RegExp(
  `(^|[\\s'"=:(/<>;&|{\`])\\.?/?(${SPERREDE_MAPPER.join('|')})(/|[\\s;&|)\`'"]|$)`
);

// Kommandoer og operatorer som kan skrive en fil som er nevnt i kommandoen.
const SKRIVENDE = [
  />/,
  /\btee\b/,
  /\bsed\b[^|;&]*\s-[a-zA-Z]*i/,
  /\bperl\b[^|;&]*\s-[a-zA-Z]*i/,
  /\b(mv|cp|rm|rmdir|touch|mkdir|ln|chmod|truncate|dd|install|rsync|unlink)\b/,
  /\bgit\s+(checkout|restore|rm|mv|reset|clean|stash|init|clone|submodule|worktree)\b/,
  /\b(python3?|node|ruby|perl)\b[^|;&]*\s-[a-zA-Z]*[ce]\b/,
  // --output (og forkortelser av det) skriver til fila i flagget.
  /--out\w*/,
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

// Kommandoledd: `;`, `&&`, `||`, `|` og linjeskift skiller dem. Miljøvariabler,
// `command` og `env` foran kommandoen fjernes, så `X=1 git push` kjennes igjen.
function ledd(kommando) {
  return kommando
    .split(/\s*(?:;|&&|\|\||\||\r?\n)\s*/)
    .map((del) => del.trim().replace(/^(?:(?:\w+=\S*|command|env|exec)\s+)+/, ''))
    .filter(Boolean);
}

// Omdirigering som ikke skriver: `2>&1` og `>/dev/null`. Alle andre `>` og `<` gjør leddet ukjent.
const UFARLIG_OMDIRIGERING = /^>(&\d+|\s*\/dev\/null(?=$|[\s;&|)]))/;
const ESCAPE_I_ANFORSEL = '$`"\\\n';

/**
 * Deler en kommando i ledd og ord med skallets regler for anførselstegn og escape.
 * `ukjent` settes når et ledd har substitusjon, variabler, globber, klammer, `#`,
 * subshell, heredoc eller omdirigering til fil: det kan ikke leses uten å kjøre skallet.
 */
function lekser(tekst) {
  const liste = [];
  let ord = [];
  let innhold = '';
  let harOrd = false;
  let ukjent = false;

  const avsluttOrd = () => {
    if (harOrd) ord.push(innhold);
    innhold = '';
    harOrd = false;
  };
  const avsluttLedd = () => {
    avsluttOrd();
    if (ord.length || ukjent) liste.push({ ord, ukjent });
    ord = [];
    ukjent = false;
  };

  for (let i = 0; i < tekst.length; i++) {
    const tegn = tekst[i];
    if (tegn === "'") {
      harOrd = true;
      const slutt = tekst.indexOf("'", i + 1);
      if (slutt === -1) {
        ukjent = true;
        innhold += tekst.slice(i + 1);
        break;
      }
      innhold += tekst.slice(i + 1, slutt);
      i = slutt;
    } else if (tegn === '"') {
      harOrd = true;
      let j = i + 1;
      for (; j < tekst.length && tekst[j] !== '"'; j++) {
        const inni = tekst[j];
        const neste = tekst[j + 1];
        if (inni === '\\' && neste !== undefined && ESCAPE_I_ANFORSEL.includes(neste)) {
          innhold += neste;
          j++;
        } else {
          if (inni === '$' || inni === '`') ukjent = true;
          innhold += inni;
        }
      }
      if (j >= tekst.length) ukjent = true;
      i = j;
    } else if (tegn === '\\') {
      harOrd = true;
      if (i + 1 >= tekst.length || tekst[i + 1] === '\n') ukjent = true;
      else innhold += tekst[i + 1];
      i++;
    } else if (tegn === '>') {
      const ufarlig = UFARLIG_OMDIRIGERING.exec(tekst.slice(i));
      if (ufarlig) {
        if (harOrd && /^\d+$/.test(innhold)) {
          innhold = '';
          harOrd = false;
        }
        i += ufarlig[0].length - 1;
      } else {
        ukjent = true;
        avsluttOrd();
      }
    } else if (tegn === '<') {
      ukjent = true;
      avsluttOrd();
    } else if (tegn === ';' || tegn === '&' || tegn === '|' || tegn === '\n') {
      avsluttLedd();
    } else if (tegn === ' ' || tegn === '\t') {
      avsluttOrd();
    } else if ('$`(){*?[#'.includes(tegn)) {
      // `#` er kommentar i ett skall og et vanlig ord i et annet, så leddet er ukjent.
      ukjent = true;
      harOrd = true;
      innhold += tegn;
    } else {
      harOrd = true;
      innhold += tegn;
    }
  }
  avsluttLedd();
  return liste;
}

// Flagg som er lesende for git-kommandoene under. git godtar forkortede lange flagg,
// så flaggene står på en tillatelsesliste, ikke en sperreliste.
const LESENDE_FLAGG = [
  /^(--stat|--shortstat|--numstat|--name-only|--name-status|--oneline|--no-color|--cached|--short|--porcelain|--abbrev-ref|--verify|--quiet|--no-patch|--no-ext-diff|--graph|--all|--no-merges|--first-parent|--others|--exclude-standard|--modified|-p|-q|-s)$/,
  /^(-n|-\d+|-U\d+|--stat=\d+|--unified=\d+|--diff-filter=[A-Za-z]+|--format=.*|--pretty=.*|--grep=.*|--author=.*|--since=.*|--until=.*)$/,
];
// git grep: `-O` og `--open-files-in-pager` starter et program, og er ikke med.
const GREP_FLAGG = [
  /^-[nilcEFGPwIHhsa]+$/,
  /^-[ABC]\d*$/,
  /^(-e|--cached|--no-color|--untracked|--no-index|--line-number|--files-with-matches|--count|--ignore-case|--word-regexp|--fixed-strings|--extended-regexp|--perl-regexp|--name-only)$/,
];
const GIT_LESENDE = new Map([
  ['diff', LESENDE_FLAGG],
  ['log', LESENDE_FLAGG],
  ['show', LESENDE_FLAGG],
  ['status', LESENDE_FLAGG],
  ['rev-parse', LESENDE_FLAGG],
  ['merge-base', LESENDE_FLAGG],
  ['ls-files', LESENDE_FLAGG],
  ['fetch', LESENDE_FLAGG],
  ['grep', GREP_FLAGG],
]);
// gh api uten -f, -F, --field, --raw-field og --input, og uten metode som ikke er GET.
const GH_API_LESENDE =
  /^(-i|--include|-q|--jq(=.*)?|-t|--template(=.*)?|-p|--preview(=.*)?|--paginate|--slurp|--cache(=.*)?|--verbose|--silent|-H|--header(=.*)?|--hostname(=.*)?)$/;

function ulovligFlagg(argumenter, tillatte) {
  let etterSkille = false;
  for (const o of argumenter) {
    if (o === '--') etterSkille = true;
    else if (!etterSkille && o.startsWith('-') && !tillatte.some((r) => r.test(o))) return o;
  }
  return null;
}

function lesingGit(argumenter) {
  const start = argumenter[0] === '-C' ? 2 : 0;
  if (start === 2 && argumenter.length < 2) return 'git -C mangler mappe.';
  const underkommando = argumenter[start];
  const tillatte = GIT_LESENDE.get(underkommando);
  if (!tillatte) return `git ${underkommando ?? '(mangler)'} er ikke en lesende git-kommando.`;
  const resten = argumenter.slice(start + 1);
  const ulovlig = ulovligFlagg(resten, tillatte);
  if (ulovlig) return `Flagget ${ulovlig} står ikke på listen over lesende flagg.`;
  if (underkommando === 'fetch' && resten.some((o) => !/^[\w./-]+$/.test(o) || o === 'tag')) {
    return 'fetch bare med navngitte grener, uten refspec eller tagger.';
  }
  return null;
}

function lesingGhApi(argumenter) {
  if (argumenter[0] !== 'api') return 'gh er bare lesende som gh api.';
  const resten = argumenter.slice(1);
  for (let i = 0; i < resten.length; i++) {
    const o = resten[i];
    if (o === '-X' || o === '--method') {
      if (resten[i + 1] !== 'GET') return 'gh api er bare lesende med metoden GET.';
      i++;
    } else if (o.startsWith('-') && !/^(-X|--method=)GET$/.test(o) && !GH_API_LESENDE.test(o)) {
      return `Flagget ${o} i gh api kan skrive.`;
    }
  }
  return null;
}

/** Begrunnelsen når et ledd ikke er lesende, ellers null. */
function lesingsBegrunnelse({ ord, ukjent }) {
  if (ukjent) return 'Skallsyntaksen kan ikke leses statisk.';
  const [kommando, ...argumenter] = ord;
  if (kommando === 'grep') return null;
  if (kommando === 'rg') {
    return argumenter.some((o) => /^--(pre|hostname-bin)/.test(o))
      ? 'rg med --pre eller --hostname-bin kjører et program.'
      : null;
  }
  if (kommando === 'gh') return lesingGhApi(argumenter);
  if (kommando === 'git') return lesingGit(argumenter);
  return `${kommando} er ikke en lesende kommando.`;
}

/** For diffkontroll: bare lesende kommandoer i Bash, ledd for ledd. */
function vurderLesing(input) {
  if (SKRIVEVERKTOY.includes(input.tool_name)) return 'Skriveverktøy er ikke tillatt.';
  if (input.tool_name !== 'Bash') return null;
  const leddene = lekser(String(input.tool_input?.command ?? ''));
  if (!leddene.length) return 'Tom kommando.';
  for (const del of leddene) {
    const begrunnelse = lesingsBegrunnelse(del);
    if (begrunnelse) return begrunnelse;
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
    for (const tre of [arbeidstreet(naermesteMappe(absolutt)), rot]) {
      if (!tre || !innenfor(absolutt, tre)) continue;
      const relativ = path.relative(tre, absolutt);
      if (sperretSti(relativ)) return `${relativ} ligger i en sperret mappe.`;
    }
    if (rot && innenfor(absolutt, rot)) return null;
    if (innenfor(absolutt, ekteSti(tmpdir())) || innenfor(absolutt, ekteSti('/tmp'))) return null;
    if (!rot) return `Ikke i et git-arbeidstre: ${cwd}.`;
    return `${absolutt} ligger utenfor arbeidstreet ${rot}. Skriv bare i ditt eget arbeidstre.`;
  }

  if (verktoy !== 'Bash') return null;
  const rakKommando = String(parametre.command ?? '');
  const kommando = rakKommando
    .replace(/[\r\n]+/g, ' ; ')
    .replace(/\d*>&\d|\d*>\s*\/dev\/null/g, '');

  // Når hvert ledd er lesende, skriver kallet ikke, selv om et argument ligner en skrivende
  // kommando (`grep "ruff format"`). Ellers gjelder de tekstbaserte reglene som før.
  const leddene = lekser(rakKommando);
  const lesende = leddene.length > 0 && leddene.every((del) => lesingsBegrunnelse(del) === null);
  if (!lesende) {
    if (SPERRET_MAPPE.test(kommando) && SKRIVENDE.some((m) => m.test(kommando))) {
      return 'Kommandoen nevner en sperret mappe og kan skrive.';
    }
    const utenSti = SKRIVENDE_UTEN_STI.find((m) => m.test(kommando));
    if (utenSti) return `Kommandoen kan skrive filer den ikke nevner (${utenSti}).`;
  }

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
// hvert kall, og den velger selv etter agent_type.
function vaktEtterAgent(input) {
  if (input.agent_type === 'diffkontroll') return 'lesing';
  if (input.agent_type === 'mekanisk-pr') return 'skriving';
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
