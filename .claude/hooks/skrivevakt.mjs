#!/usr/bin/env node
// PreToolUse-hook for subagentene mekanisk-pr og diffkontroll (#439). Leser
// hook-input som JSON på stdin og avslutter med kode 2 og en melding på stderr
// når kallet ville skrive i en sperret mappe eller utenfor arbeidstreet. Med
// --bare-lesing slipper den bare lesende kommandoer gjennom i Bash (git, gh api,
// grep og rg). Med --etter-agent, slik .claude/settings.json kaller den, velger
// den vakt etter agent_type og slipper alle andre kall gjennom (#442). Hva den
// ikke fanger, står i .claude/agents/mekanisk-pr.md.
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

// Hookoppsettet nevnt med filnavn, eller hele `.claude`-mappa som mål.
const NEVNER_HOOKOPPSETT =
  /settings(\.local)?\.json|(^|[\s'"=:(<>;&|{`])\.?\/?\.claude\/?\.?(?=$|[\s;&|)`'"])/;

// Kommandoer og operatorer som kan skrive en fil som er nevnt i kommandoen.
const SKRIVENDE = [
  />/,
  /\btee\b/,
  /\bsed\b[^|;&]*(\s-[a-zA-Z]*i|--in-place)/,
  /\bperl\b[^|;&]*\s-[a-zA-Z]*i/,
  // `w` og `W` i et sed-skript skriver til fila etter kommandoen.
  /\bsed\b[^|&]*[^\w-][wW]/,
  /\b(mv|cp|rm|rmdir|touch|mkdir|ln|chmod|truncate|dd|install|rsync|unlink)\b/,
  /\bgit\s+(checkout|restore|rm|mv|reset|clean|stash|init|clone|submodule|worktree)\b/,
  /\b(python3?|node|ruby|perl)\b[^|;&]*\s-[a-zA-Z]*[cep]\b/,
  /\b(python3?|node|ruby|perl)\b[^|;&]*--(eval|print)\b/,
  /\bsort\b[^|;&]*\s-[a-zA-Z]*o\b/,
  /\b(curl|wget)\b[^|;&]*\s-[a-zA-Z]*[oO]\b/,
  // --output (og forkortelser av det) skriver til fila i flagget.
  /--out\w*/,
];

// Skriver filer uten at stien står i kommandoen.
const SKRIVENDE_UTEN_STI = [
  /(^|\s)--(write|fix)\b/,
  /\bprettier\b[^|;&]*\s-[a-zA-Z]*w/,
  /\bnpm\s+run\s+format\b/,
  /\b(tar|bsdtar|unzip|cpio)\b/,
  /\bruff\b[^|;&]*(--fix|\bformat\b)/,
  /\bgit\s+(apply|am|cherry-pick)\b/,
  /(^|[\s;&|])patch\b/,
];

// gh-kall som merger PR-en eller oppdaterer den mot main.
const GH_MERGE = /(\/pulls\/\S+\/merge\b|\bpr\s+merge\b|\/update-branch\b)/;

// Hookoppsettet, som mekanisk-pr ikke endrer.
const HOOKOPPSETT = ['.claude/settings.json', '.claude/settings.local.json'];

// Tekstreglene ser ikke underkommandoen bak `git -C <mappe>` eller `git --no-pager`, så de
// får også en variant der de globale valgene er fjernet.
const GIT_GLOBALE = /\bgit((?:\s+(?:-[Cc]\s+\S+|--[\w-]+(?:=\S+)?))+)/g;

function utenGitGlobale(tekst) {
  return tekst.replace(GIT_GLOBALE, 'git');
}

// Git-underkommandoer som endrer oppsettet, eller som snakker med en fjernkopi utenom push.
const GIT_OPPSETT = new Set(['config', 'remote', 'symbolic-ref', 'update-ref']);

// Git-underkommandoer som endrer arbeidstreet eller indeksen.
const TREENDRENDE = new Set([
  'am',
  'apply',
  'checkout',
  'cherry-pick',
  'clean',
  'merge',
  'mv',
  'pull',
  'rebase',
  'reset',
  'restore',
  'revert',
  'rm',
  'stash',
  'switch',
]);

function sperretSti(relativ) {
  const forste = relativ.split(/[\\/]/)[0];
  return SPERREDE_MAPPER.includes(forste);
}

function vernetSti(relativ) {
  return sperretSti(relativ) || HOOKOPPSETT.includes(relativ.split(path.sep).join('/'));
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
  return (
    relativ === '' ||
    (relativ !== '..' && !relativ.startsWith(`..${path.sep}`) && !path.isAbsolute(relativ))
  );
}

// Filnavn fra git skilles med NUL (`-z`), så anførsel og linjeskift i navnet ikke endrer dem.
function sperredeFiler(filer) {
  return filer
    .split('\0')
    .filter(Boolean)
    .filter((fil) => vernetSti(fil));
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
const UFARLIG_OMDIRIGERING = /^>(&\d+(?=$|[\s;&|)])|\s*\/dev\/null(?=$|[\s;&|)]))/;
const ESCAPE_I_ANFORSEL = '$`"\\';

/**
 * Deler en kommando i ledd og ord med skallets regler for anførselstegn og escape.
 * `ukjent` settes når leddet ikke kan leses uten å kjøre skallet: substitusjon, variabler,
 * globber, klammer, `#`, subshell, heredoc eller omdirigering til fil. `ukjentSyntaks` er
 * den delen som ikke er omdirigering, og `ukjentKommando` er satt når kommandoordet selv
 * ikke kan leses.
 */
function lekser(tekst) {
  const liste = [];
  let ord = [];
  let innhold = '';
  let harOrd = false;
  let ukjent = false;
  let ukjentSyntaks = false;
  let ukjentKommando = false;

  const merkUkjent = () => {
    ukjent = true;
    ukjentSyntaks = true;
    if (!ord.length) ukjentKommando = true;
  };
  // Ordet etter en omdirigering er målet, ikke et kommandoord, så det hoppes over.
  let venterPaaMaal = false;
  const merkOmdirigering = () => {
    ukjent = true;
    venterPaaMaal = true;
  };
  const avsluttOrd = () => {
    if (harOrd && venterPaaMaal) venterPaaMaal = false;
    else if (harOrd) ord.push(innhold);
    innhold = '';
    harOrd = false;
  };
  const avsluttLedd = () => {
    avsluttOrd();
    if (ord.length || ukjent) liste.push({ ord, ukjent, ukjentSyntaks, ukjentKommando });
    ord = [];
    ukjent = false;
    ukjentSyntaks = false;
    ukjentKommando = false;
    venterPaaMaal = false;
  };

  for (let i = 0; i < tekst.length; i++) {
    const tegn = tekst[i];
    if (tegn === "'") {
      harOrd = true;
      const slutt = tekst.indexOf("'", i + 1);
      if (slutt === -1) {
        merkUkjent();
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
        // `\` før linjeskift er en fortsettelse, og skallet fjerner begge.
        if (inni === '\\' && neste === '\n') {
          j++;
        } else if (inni === '\\' && neste !== undefined && ESCAPE_I_ANFORSEL.includes(neste)) {
          innhold += neste;
          j++;
        } else {
          if (inni === '$' || inni === '`') merkUkjent();
          innhold += inni;
        }
      }
      if (j >= tekst.length) merkUkjent();
      i = j;
    } else if (tegn === '\\') {
      harOrd = true;
      if (i + 1 >= tekst.length || tekst[i + 1] === '\n') merkUkjent();
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
        avsluttOrd();
        merkOmdirigering();
      }
    } else if (tegn === '<') {
      avsluttOrd();
      merkOmdirigering();
    } else if (tegn === ';' || tegn === '&' || tegn === '|' || tegn === '\n') {
      avsluttLedd();
    } else if (tegn === ' ' || tegn === '\t') {
      avsluttOrd();
    } else if ('$`(){*?[#'.includes(tegn)) {
      // `#` er kommentar i ett skall og et vanlig ord i et annet, så leddet er ukjent.
      merkUkjent();
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
  /^(--show-toplevel|--show-prefix|--show-cdup|--git-dir|--git-common-dir|--absolute-git-dir|--is-inside-work-tree|--stat|--shortstat|--numstat|--name-only|--name-status|--oneline|--no-color|--cached|--short|--porcelain|--abbrev-ref|--verify|--quiet|--no-patch|--no-ext-diff|--graph|--all|--no-merges|--first-parent|--others|--exclude-standard|--modified|-p|-q|-s)$/,
  /^(-n|-\d+|-U\d+|--stat=\d+|--unified=\d+|--diff-filter=[A-Za-z]+|--format=.*|--pretty=.*|--grep=.*|--author=.*|--since=.*|--until=.*)$/,
];
// fetch uten --prune, som sletter fjernsporingsgreiner.
const FETCH_FLAGG = [/^(-q|--quiet|--no-tags)$/];
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
  ['fetch', FETCH_FLAGG],
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

// Prefiks som skallet kjører kommandoen gjennom, med flaggene vakten kan tolke: `uten` tar
// ikke argument, `med` tar ett. Et annet flagg gjør kommandoordet ukjent, og kallet stoppes.
// xargs er ikke med: den legger til argumenter fra stdin, så kommandoen kan ikke leses.
const PREFIKS = new Map([
  ['builtin', { uten: [], med: [] }],
  ['command', { uten: ['-p', '-v', '-V'], med: [] }],
  ['env', { uten: ['-i', '--ignore-environment', '-'], med: ['-u', '--unset', '-C', '--chdir'] }],
  ['exec', { uten: ['-c', '-l'], med: ['-a'] }],
  ['nice', { uten: [], med: ['-n', '--adjustment'], tall: true }],
  ['nohup', { uten: [], med: [] }],
  ['sudo', { uten: [], med: [] }],
  ['time', { uten: ['-p'], med: [] }],
  [
    'timeout',
    {
      uten: ['--preserve-status', '--foreground', '-v', '--verbose'],
      med: ['-s', '--signal', '-k', '--kill-after'],
      varighet: true,
    },
  ],
]);
const SKALL = new Set(['sh', 'bash', 'zsh', 'dash']);

// Reserverte ord som står foran kommandoen i en sammensatt kommando, som `if` og `then`.
const RESERVERT = /^(!|if|then|else|elif|do|while|until)$/;

/** Indeksen etter prefiksets flagg og eventuelle varighet, eller null når de ikke kan tolkes. */
function etterPrefiks(ord, i, { uten, med, tall, varighet }) {
  for (; i < ord.length && ord[i].startsWith('-'); i++) {
    const o = ord[i];
    if (o === '--') {
      i++;
      break;
    }
    if (uten.includes(o) || (tall && /^-\d+$/.test(o))) continue;
    if (med.includes(o)) {
      if (++i >= ord.length) return null;
    } else if (
      o.startsWith('--')
        ? !med.includes(o.split('=')[0]) || !o.includes('=')
        : !med.includes(o.slice(0, 2))
    ) {
      return null;
    }
  }
  if (varighet) {
    if (!/^\d+(\.\d+)?[smhd]?$/.test(ord[i] ?? '')) return null;
    i++;
  }
  return i;
}

/** Indeksen til kommandoordet etter tilordninger, reserverte ord og prefiks, eller null. */
function kommandoordet(ord) {
  let k = 0;
  while (k < ord.length) {
    if (/^[A-Za-z_]\w*=/.test(ord[k]) || RESERVERT.test(ord[k])) {
      k++;
      continue;
    }
    const flagg = PREFIKS.get(ord[k].split('/').pop());
    if (!flagg) return k;
    k = etterPrefiks(ord, k + 1, flagg);
    if (k === null) return null;
  }
  return k;
}

// Ord i argumentene som kan starte git, gh eller et skall. Bare kommandoene i
// TEKSTKOMMANDOER kjører aldri argumentene sine.
const NEVNER_KJOERBAR = /(^|[\s'"`(;&|/])(git|gh|sh|bash|zsh|dash|eval)(?=$|[\s'"`);&|])/;
const TEKSTKOMMANDOER = new Set([
  'echo',
  'printf',
  'grep',
  'rg',
  'cat',
  'head',
  'tail',
  'wc',
  'ls',
  'git',
  'gh',
]);

// Innholdet i `-c` for et skall, etter eventuelle valg som `-o pipefail`.
function skallPayload(argumenter) {
  for (let j = 0; j < argumenter.length; j++) {
    const o = argumenter[j];
    if (/^-\w*c/.test(o)) return argumenter[j + 1] ?? '';
    if (o === '-o' || o === '+o') j++;
    else if (!/^[-+]/.test(o)) return undefined;
  }
  return undefined;
}

/**
 * Kommandoene skallet faktisk kjører: prefiks er fjernet, og innholdet i `sh -c`
 * og `eval` er lest på nytt. Ledd med ukjent kommandoord beholdes som de er.
 */
function effektiveKommandoer(leddene) {
  const ut = [];
  for (const del of leddene) {
    if (del.ukjentKommando) {
      ut.push(del);
      continue;
    }
    const { ord } = del;
    if (ord[0]?.split('/').pop() === 'env' && ord.some((o) => /^(-S|--split-string)/.test(o))) {
      const tekst = ord
        .slice(1)
        .join(' ')
        .replace(/(^|\s)(-S|--split-string)\s*/g, '$1');
      ut.push(...effektiveKommandoer(lekser(tekst)));
      continue;
    }
    const k = kommandoordet(ord);
    if (k === null) {
      ut.push({ ord, ukjentKommando: true, ukjentPrefiks: true });
      continue;
    }
    if (k >= ord.length) continue;
    const kommando = ord[k].split('/').pop();
    const resten = ord.slice(k + 1);
    const payload = SKALL.has(kommando) ? skallPayload(resten) : undefined;
    if (payload !== undefined) {
      ut.push(...effektiveKommandoer(lekser(payload)));
    } else if (kommando === 'eval') {
      ut.push(...effektiveKommandoer(lekser(resten.join(' '))));
    } else {
      ut.push({ ord: [kommando, ...resten], ukjentKommando: false });
    }
  }
  return ut;
}

/** Underkommando og argumenter for en git-kommando, etter globale valg som `-C` og `--no-pager`. */
function gitKommando(ord) {
  const globale = [];
  let i = 1;
  while (i < ord.length && ord[i].startsWith('-')) {
    globale.push(ord[i]);
    i += ['-C', '-c', '--git-dir', '--work-tree'].includes(ord[i]) ? 2 : 1;
  }
  return { underkommando: ord[i] ?? '', argumenter: ord.slice(i + 1), globale };
}

// Bare `git push [-u] origin <utsjekket gren>`, uten force, sletting eller andre flagg, og bare
// når grenen ikke endrer sperrede mapper.
function vurderPush(argumenter, rot) {
  const ord = argumenter.trim().split(/\s+/).filter(Boolean);
  if (ord.some((o) => /^--(force|delete|mirror|all|tags)|^-[a-zA-Z]*[fd]/.test(o))) {
    return 'Push med force, sletting eller flere grener er ikke tillatt.';
  }
  if (ord.some((o) => o.startsWith('-') && !['-u', '--set-upstream'].includes(o))) {
    return 'Push med andre flagg enn -u er ikke tillatt.';
  }
  const gren = git(rot, 'rev-parse', '--abbrev-ref', 'HEAD');
  const [fjern, refspec, ...resten] = ord.filter((o) => !o.startsWith('-'));
  if (gren === 'main' || resten.length || fjern !== 'origin' || refspec !== gren) {
    return `Push bare den utsjekkede grenen til origin, ikke main (utsjekket: ${gren}).`;
  }
  let filer;
  try {
    filer = sperredeFiler(
      git(rot, 'diff', '-z', '--name-only', '--no-renames', 'origin/main...HEAD')
    );
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
    if (rot && innenfor(absolutt, rot)) {
      const relativ = path.relative(rot, absolutt);
      if (HOOKOPPSETT.includes(relativ))
        return `${relativ} er hookoppsettet, og mekanisk-pr endrer det ikke.`;
      return null;
    }
    if (innenfor(absolutt, ekteSti(tmpdir())) || innenfor(absolutt, ekteSti('/tmp'))) return null;
    if (!rot) return `Ikke i et git-arbeidstre: ${cwd}.`;
    return `${absolutt} ligger utenfor arbeidstreet ${rot}. Skriv bare i ditt eget arbeidstre.`;
  }

  if (verktoy !== 'Bash') return null;
  const rakKommando = String(parametre.command ?? '');
  const leddene = lekser(rakKommando);
  // Når hvert ledd er lesende, kan kallet verken skrive eller pushe, selv om et argument
  // ligner en skrivende kommando (`grep "ruff format"`).
  if (leddene.length && leddene.every((del) => lesingsBegrunnelse(del) === null)) return null;

  const kommando = rakKommando
    .replace(/[\r\n]+/g, ' ; ')
    .replace(/\d*>&\d|\d*>\s*\/dev\/null/g, '');
  // Anførselstegn og escape kan skjule et mappenavn for tekstreglene (`kj""erne`).
  // Reglene kjøres derfor også på teksten uten dem.
  const varianter = [kommando, kommando.replace(/['"\\]/g, '')];
  const tekster = new Set(varianter.flatMap((t) => [t, utenGitGlobale(t)]));
  const nevnerSperret = [...tekster].some(
    (t) => SPERRET_MAPPE.test(t) || NEVNER_HOOKOPPSETT.test(t)
  );
  if (nevnerSperret && [...tekster].some((t) => SKRIVENDE.some((m) => m.test(t)))) {
    return 'Kommandoen nevner en sperret mappe eller hookoppsettet og kan skrive.';
  }
  for (const tekst of tekster) {
    const utenSti = SKRIVENDE_UTEN_STI.find((m) => m.test(tekst));
    if (utenSti) return `Kommandoen kan skrive filer den ikke nevner (${utenSti}).`;
  }

  const eff = effektiveKommandoer(leddene);
  if (eff.some((del) => del.ukjentPrefiks)) {
    return 'Kommandoen har et prefiks med flagg som vakten ikke kan tolke sikkert.';
  }
  if (eff.some((del) => del.ukjentKommando)) {
    return 'Kommandoen starter med skallsyntaks som ikke kan leses statisk.';
  }
  if (
    leddene.some((del) => del.ukjentSyntaks) &&
    [...SKRIVENDE, ...SKRIVENDE_UTEN_STI, /\b(git|gh)\b/].some((m) => m.test(kommando))
  ) {
    return 'Kommandoen har skallsyntaks som ikke kan leses statisk, og kan skrive.';
  }

  if (
    eff.some(
      (del) =>
        !TEKSTKOMMANDOER.has(del.ord[0]) && del.ord.slice(1).some((o) => NEVNER_KJOERBAR.test(o))
    )
  ) {
    return 'Kommandoen kan starte git, gh eller et skall gjennom et program vakten ikke kjenner.';
  }

  const deler = ledd(kommando);
  const gitene = eff.filter((del) => del.ord[0] === 'git').map((del) => gitKommando(del.ord));
  if (
    deler.some((del) => /^gh\b/.test(del) && GH_MERGE.test(del)) ||
    eff.some((del) => del.ord[0] === 'gh' && GH_MERGE.test(del.ord.join(' ')))
  ) {
    return 'mekanisk-pr merger ikke og oppdaterer ikke PR-en mot main.';
  }
  // GraphQL kan merge og slå på automatisk merge med en mutasjon, og trengs ikke for lesing.
  if (eff.some((del) => del.ord[0] === 'gh' && del.ord.includes('graphql'))) {
    return 'mekanisk-pr bruker ikke gh api graphql.';
  }
  if (
    deler.some((del) => /^git\s+(-c\b|config\b)/.test(del)) ||
    gitene.some((g) => GIT_OPPSETT.has(g.underkommando) || g.globale.includes('-c'))
  ) {
    return 'mekanisk-pr endrer ikke git-oppsettet.';
  }

  // Siste vern: det som committes eller pushes, kontrolleres i git.
  const pushArgumenter = [
    ...deler
      .filter((del) => /^git(\s+-C\s+\S+)?\s+push\b/.test(del))
      .map((del) => del.replace(/^.*?\bpush\b/, '')),
    ...gitene
      .filter((g) => g.underkommando === 'push' || g.underkommando === 'send-pack')
      .map((g) => g.argumenter.join(' ')),
  ];
  const commiter =
    deler.some((del) => /^git(\s+-C\s+\S+)?\s+(commit|add)\b/.test(del)) ||
    gitene.some((g) => g.underkommando === 'commit' || g.underkommando === 'add');
  if (pushArgumenter.length && commiter) return 'Kjør commit og push i hver sin kommando.';
  if (gitene.some((g) => TREENDRENDE.has(g.underkommando)) && (pushArgumenter.length || commiter)) {
    return 'Kommandoen endrer treet og committer eller pusher i samme kall. Kjør dem i hver sin kommando.';
  }
  if (rot && commiter) {
    const endret = git(rot, 'diff', '-z', '--name-only', '--no-renames', 'HEAD');
    const nye = git(rot, 'ls-files', '-z', '--others', '--exclude-standard');
    const filer = sperredeFiler(`${endret}\0${nye}`);
    if (filer.length) return `Endringer i sperrede mapper: ${filer.join(', ')}.`;
  }
  for (const argumenter of pushArgumenter) {
    if (!rot) return 'Ikke i et git-arbeidstre.';
    const begrunnelse = vurderPush(argumenter, rot);
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
