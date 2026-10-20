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

// Hookoppsettet nevnt med filnavn, git-mappa med hookene og oppsettet til git, eller `.husky`,
// der core.hooksPath (`.husky/_`) ligger. `.claude` leses av nevnerClaude.
const NEVNER_HOOKOPPSETT =
  /settings(\.local)?\.json|(^|[\s'"=:(<>;&|{`/])\.(git|husky)(\/|(?=$|[\s;&|)`'"]))/;
// Det som kan skrives i `.claude` med Bash: en navngitt fil under disse mappene.
const CLAUDE_TILLATT = /^\.claude\/(hooks|agents|skills|rules)(\/[\w-][\w.-]*)+$/;

/** Om teksten nevner `.claude` på en annen måte enn en navngitt fil under CLAUDE_TILLATT. */
function nevnerClaude(tekst) {
  return tekst
    .split(/[\s;&|()<>`'"=]+/)
    .filter((ord) => /(^|\/)\.claude(\/|$)/.test(ord))
    .some((ord) => {
      const del = ord.slice(ord.search(/\.claude(\/|$)/));
      return !CLAUDE_TILLATT.test(del) || del.split('/').some((s) => s === '.' || s === '..');
    });
}

// Kommandoer og operatorer som kan skrive en fil som er nevnt i kommandoen.
const SKRIVENDE = [
  />/,
  /\btee\b/,
  /\bsed\b[^|;&]*(\s-[a-zA-Z]*i|--in-place)/,
  /\bperl\b[^|;&]*\s-[a-zA-Z]*i/,
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

// Endepunktene mekanisk-pr kan skrive til med gh api, med feltene hvert av dem kan få. Stien
// etter `repos/<eier>/<repo>` må passe hele mønsteret.
const GH_SKRIVING_TILLATT = [
  [/^\/pulls$/, ['title', 'head', 'base', 'body', 'draft', 'maintainer_can_modify']],
  [/^\/pulls\/\d+$/, ['title', 'body']],
  [/^\/(issues|pulls)\/\d+\/labels$/, ['labels']],
  [/^\/pulls\/\d+\/requested_reviewers$/, ['reviewers', 'team_reviewers']],
  [/^\/(issues\/\d+\/comments|issues\/comments\/\d+|pulls\/comments\/\d+)$/, ['body']],
  [/^\/pulls\/\d+\/comments\/\d+\/replies$/, ['body']],
  [
    /^\/pulls\/\d+\/comments$/,
    [
      'body',
      'commit_id',
      'path',
      'line',
      'side',
      'start_line',
      'start_side',
      'in_reply_to',
      'subject_type',
    ],
  ],
];
const GH_REPO_STI = /^\/?repos\/[\w.-]+\/[\w.-]+(?=\/)/;
// Underkommandoene mekanisk-pr kan bruke i gh utenom api. Står det ingen liste, er alle tillatt.
// `pr merge` stoppes av GH_MERGE og `pr edit --base` for seg.
const GH_TILLATT = new Map([
  ['pr', ['create', 'view', 'list', 'diff', 'checks', 'status', 'comment', 'edit']],
  ['issue', ['view', 'list', 'status', 'comment']],
  ['search', null],
  ['status', null],
  ['label', ['list']],
  ['repo', ['view']],
  ['run', ['view', 'list']],
  ['workflow', ['view', 'list']],
  ['release', ['view', 'list']],
]);
// Flaggene i gh api. Kortflagg kan stå samlet (`-it`), og verdien kan henge på (`-XPATCH`).
const GH_KORT_UTEN = 'i';
const GH_KORT_MED = 'XHfFqtp';
const GH_LANG_UTEN = new Set(['--include', '--paginate', '--slurp', '--silent', '--verbose']);
const GH_LANG_MED = new Set([
  '--method',
  '--header',
  '--field',
  '--raw-field',
  '--input',
  '--jq',
  '--template',
  '--preview',
  '--hostname',
  '--cache',
]);
const GRAPHQL = /(^|\/)graphql\/?$/;

// Miljøvariabler som får git, gh, skallet eller et program til å kjøre noe annet eller bruke et
// annet tre. De leses som tilordning (`NAVN=…`) eller som navn alene (`export NAVN`).
const FARLIG_MILJOE =
  /^(GIT_\w+|GH_\w+|XDG_\w+|LD_\w+|NPM_CONFIG_\w+|npm_config_\w+|HOME|PATH|ZDOTDIR|EDITOR|VISUAL|PAGER|BROWSER|LESSOPEN|LESSCLOSE|BASH_ENV|ENV|SHELL|NODE_OPTIONS|PYTHONPATH|PYTHONSTARTUP|PERL5OPT|RUBYOPT|RIPGREP_CONFIG_PATH)(=|$)/;
const UFARLIG_MILJOE = /^(GIT_PAGER=(cat)?|PAGER=(cat)?|GIT_TERMINAL_PROMPT=0)$/;

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

// Git-underkommandoer og -flagg som kjører et program eller en kommando fra argumentene.
const GIT_KJOERER = new Set([
  'bisect',
  'credential',
  'daemon',
  'difftool',
  'filter-branch',
  'instaweb',
  'mergetool',
  'send-email',
  'submodule',
]);
const GIT_KJOERER_FLAGG =
  /^(-x|-O|--exec|--extcmd|--open-files-in-pager|--upload-pack|--receive-pack)/;

// Globale git-valg uten argument som vakten tolker. `-C` og `-c` tolkes for seg, og alle
// andre, som --git-dir, --namespace og --config-env, stopper kallet.
const GIT_GLOBALE_UTEN = [
  '--no-pager',
  '-p',
  '--paginate',
  '-P',
  '--no-optional-locks',
  '--version',
  '--help',
];

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
  const deler = relativ.split(/[\\/]/);
  return sperretSti(relativ) || deler[0] === '.husky' || HOOKOPPSETT.includes(deler.join('/'));
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
 * ikke kan leses. Hver linje i en heredoc-kropp lekses for seg, slik at en anførsel i kroppen
 * ikke sluker avgrenserlinja, og leddene merkes `kropp`. Uten anførselstegn eller escape i
 * avgrenseren kan skallet ekspandere kroppen, så da er både heredocen og kroppsleddene ukjente
 * (#753). Kroppen er også ukjent når et skall eller et annet program enn `TEKSTMOTTAKERE` kan
 * lese den, direkte eller gjennom et rør. Kroppslinjene står i `liste.kroppslinjer` som
 * [start, slutt). Den er null når en kropp ikke er bokstavelig, kan kjøres eller ikke avsluttes,
 * eller når heredoc-linja har ukjent syntaks (#970). `<<` etter en `#` som begynner et ord, og i
 * aritmetikk åpner ingen heredoc. Er det tvil om skallet åpner en heredoc eller leser en
 * anførsel (kommentar, aritmetikk eller ukjent syntaks på heredoc-linja), står også leddene fra
 * tre andre lesinger i lista: med hver `<<` som heredoc, uten noen heredoc og hver linje for
 * seg. `iKropp` er satt når `tekst` er en kroppslinje. `heredocer` er `'alle'` eller `'ingen'`
 * i de andre lesingene.
 */
function lekser(tekst, iKropp = false, heredocer = undefined) {
  const liste = [];
  liste.kroppslinjer = [];
  let ord = [];
  let innhold = '';
  let harOrd = false;
  let ukjent = false;
  let ukjentSyntaks = false;
  let ukjentKommando = false;
  let heredoc = false;
  // Leddet får data fra en heredoc, selv eller gjennom et rør fra et ledd som får det.
  let mottar = false;
  let kommentar = false;
  let aritmetikk = 0;
  let linjestart = 0;
  let tvil = false;
  // Avgrenserne til heredocene som er åpnet på linja, og dem kroppslinjene ennå venter på.
  let aapnede = [];
  const kropper = [];

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
  // Et tomt ledd, som det andre tegnet i `|&`, beholder `mottar` til neste ledd.
  const avsluttLedd = () => {
    avsluttOrd();
    if (ord.length || ukjent) {
      liste.push({ ord, ukjent, ukjentSyntaks, ukjentKommando, heredoc, mottar });
      mottar = false;
    }
    ord = [];
    heredoc = false;
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
    } else if (tegn === '<' && tekst.startsWith('<<<', i)) {
      avsluttOrd();
      merkOmdirigering();
      i += 2;
    } else if (tegn === '<' && tekst[i + 1] === '<' && !iKropp) {
      // Heredoc. Avgrenseren leses som målet til omdirigeringen; anførselstegn og
      // escape i den gjør kroppen bokstavelig.
      avsluttOrd();
      const undertrykt =
        heredocer === 'ingen' || (heredocer !== 'alle' && (kommentar || aritmetikk > 0));
      tvil ||= aritmetikk > 0;
      const fjernTab = tekst[i + 2] === '-';
      i += fjernTab ? 2 : 1;
      const raa = /^[ \t]*([^\s;&|<>()]*)/.exec(tekst.slice(i + 1))[1];
      const avgrenser = raa.replace(/['"\\]/g, '');
      // Bare enkle former, slik at vakten og skallet finner samme avgrenserlinje.
      const bokstavelig = /^(['"])[\w.-]+\1$|^\\[\w.-]+$/.test(raa);
      merkOmdirigering();
      heredoc = true;
      if (!undertrykt) {
        if (!bokstavelig) merkUkjent();
        mottar = true;
      }
      if (avgrenser && !undertrykt) aapnede.push({ avgrenser, fjernTab, bokstavelig });
    } else if (tegn === '<') {
      avsluttOrd();
      merkOmdirigering();
    } else if (tegn === '\n') {
      avsluttLedd();
      kommentar = false;
      const linja = liste.slice(linjestart);
      // `mottar` som står igjen, er et rør som fortsetter etter kroppen.
      const kjoeres = mottar || linja.some((del) => del.mottar && !leserSomTekst(del));
      // Har heredoc-linja ukjent syntaks, kan vakten ha åpnet en heredoc som skallet ikke åpner.
      const aapnetIUkjent = linja.some((del) => del.ukjentSyntaks);
      tvil ||= aapnede.length > 0 && aapnetIUkjent;
      kropper.push(...aapnede.map((h) => ({ ...h, kjoeres })));
      aapnede = [];
      while (kropper.length && i < tekst.length) {
        const start = i + 1;
        const slutt = tekst.indexOf('\n', start);
        const linje = tekst.slice(start, slutt === -1 ? tekst.length : slutt);
        i = slutt === -1 ? tekst.length : slutt;
        const { avgrenser, fjernTab, bokstavelig, kjoeres } = kropper[0];
        if ((fjernTab ? linje.replace(/^\t+/, '') : linje) === avgrenser) {
          kropper.shift();
          continue;
        }
        if (bokstavelig && !kjoeres && !aapnetIUkjent) liste.kroppslinjer?.push([start, i]);
        else liste.kroppslinjer = null;
        for (const del of lekser(linje, true)) {
          const ukjentKropp = bokstavelig && !kjoeres ? {} : { ukjent: true, ukjentSyntaks: true };
          liste.push({ ...del, ...ukjentKropp, kropp: true });
        }
      }
      // En heredoc uten avgrenserlinje kan bety at vakten og skallet leser avgrenseren ulikt.
      if (kropper.length) liste.kroppslinjer = null;
      linjestart = liste.length;
    } else if (tegn === '|' && tekst[i + 1] !== '|' && tekst[i - 1] !== '|') {
      const videre = mottar;
      avsluttLedd();
      mottar = videre;
    } else if (tegn === ';' || tegn === '&' || tegn === '|') {
      avsluttLedd();
    } else if (tegn === ' ' || tegn === '\t') {
      avsluttOrd();
    } else if ('$`(){*?[#'.includes(tegn)) {
      // `#` er kommentar i ett skall og et vanlig ord i et annet, så leddet er ukjent.
      merkUkjent();
      if (tegn === '#' && !harOrd) {
        kommentar = true;
        tvil = true;
      }
      // `$((` og `((` åpner aritmetikk, der `<<` er et skift. Den varer til parentesene er lukket.
      if (
        tegn === '(' &&
        (aritmetikk || (tekst[i + 1] === '(' && (!harOrd || innhold.endsWith('$'))))
      )
        aritmetikk++;
      else if (tegn === ')' && aritmetikk) aritmetikk--;
      harOrd = true;
      innhold += tegn;
    } else {
      harOrd = true;
      innhold += tegn;
    }
  }
  avsluttLedd();
  if (tvil && !heredocer && tekst.includes('\n')) {
    liste.kroppslinjer = null;
    liste.push(...lekser(tekst, iKropp, 'alle'), ...lekser(tekst, iKropp, 'ingen'));
    for (const linje of tekst.split('\n')) liste.push(...lekser(linje, iKropp, 'ingen'));
  }
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
  // En mutasjon i GraphQL kan merge, og GraphQL gir 403 i skyøkta uansett.
  if (resten.some((o) => GRAPHQL.test(o))) return 'gh api graphql er ikke tillatt.';
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
// Kommandoer som leser stdin som tekst og aldri kjører den.
const TEKSTMOTTAKERE = new Set([...TEKSTKOMMANDOER, 'tee']);
// Et kall med bare disse kommandoene kan ikke kjøre en heredoc-kropp det har skrevet til en fil.
const KJOERER_IKKE_FIL = new Set([...TEKSTMOTTAKERE, 'cd', 'mkdir']);

function leserSomTekst(del) {
  if (del.ukjentKommando) return false;
  const k = kommandoordet(del.ord);
  return k !== null && k < del.ord.length && TEKSTMOTTAKERE.has(del.ord[k].split('/').pop());
}

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
 * og `eval` er lest på nytt. Ledd med ukjent kommandoord beholdes som de er. `heredoc` og
 * `kropp` følger med, og det som leses på nytt, arver `kropp`.
 */
function effektiveKommandoer(leddene) {
  const ut = [];
  for (const del of leddene) {
    const { heredoc = false, kropp = false } = del;
    const arv = (indre) => ({ ...indre, kropp: kropp || indre.kropp });
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
      ut.push(...effektiveKommandoer(lekser(tekst)).map(arv));
      continue;
    }
    const k = kommandoordet(ord);
    if (k === null) {
      ut.push({ ord, ukjentKommando: true, ukjentPrefiks: true, heredoc, kropp });
      continue;
    }
    if (k >= ord.length) continue;
    const kommando = ord[k].split('/').pop();
    const resten = ord.slice(k + 1);
    const payload = SKALL.has(kommando) ? skallPayload(resten) : undefined;
    if (payload !== undefined) {
      ut.push(...effektiveKommandoer(lekser(payload)).map(arv));
    } else if (kommando === 'eval') {
      ut.push(...effektiveKommandoer(lekser(resten.join(' '))).map(arv));
    } else {
      ut.push({
        ord: [kommando, ...resten],
        ukjentKommando: false,
        forran: ord.slice(0, k),
        heredoc,
        kropp,
      });
    }
  }
  return ut;
}

/** Underkommando og argumenter for en git-kommando, etter globale valg som `-C` og `--no-pager`. */
function gitKommando(ord) {
  const globale = [];
  let ukjentGlobal = null;
  let i = 1;
  while (i < ord.length && ord[i].startsWith('-')) {
    const o = ord[i];
    globale.push(o);
    if (o === '-C' || o === '-c') {
      i += 2;
      continue;
    }
    if (!GIT_GLOBALE_UTEN.includes(o)) ukjentGlobal ??= o;
    i++;
  }
  return { underkommando: ord[i] ?? '', argumenter: ord.slice(i + 1), globale, ukjentGlobal };
}

/**
 * Om sed-kallet kan skrive med `w` eller `W` i skriptet. Skriptet er verdiene til `-e`, eller
 * første argument som ikke er et flagg. Med `-f` ligger skriptet i en fil og kan ikke leses.
 */
const SED_FLAGG =
  /^(-[nErsuz]+|--quiet|--silent|--regexp-extended|--separate|--unbuffered|--null-data|--posix|--debug|--sandbox|--line-length=\d+|--)$/;

function sedSkriver(argumenter) {
  const skript = [];
  let medE = false;
  for (let i = 0; i < argumenter.length; i++) {
    const o = argumenter[i];
    if (o === '-e' || o === '--expression') {
      skript.push(argumenter[++i] ?? '');
      medE = true;
    } else if (o.startsWith('--expression=') || /^-e./.test(o)) {
      skript.push(o.slice(o.startsWith('--') ? 13 : 2));
      medE = true;
    } else if (o === '-l') {
      i++;
    } else if (o.startsWith('-')) {
      // Et ukjent flagg kan ta en verdi, og da er skriptet ikke der det ser ut til å være.
      if (!SED_FLAGG.test(o)) return true;
    } else if (!medE && !skript.length) {
      skript.push(o);
    }
  }
  return skript.some((s) => /[wW]/.test(s));
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

/**
 * Endepunkt, metode og feltnavn i et gh api-kall. `ukjent` er et flagg vakten ikke kan tolke,
 * og `input` er satt når kroppen kommer fra en fil.
 */
function ghApiKall(argumenter) {
  const kall = { endepunkt: '', metode: '', felt: [], input: false, ukjent: null };
  const merk = (flagg, verdi) => {
    if (['f', 'F', '--field', '--raw-field'].includes(flagg)) kall.felt.push(verdi);
    if (flagg === 'X' || flagg === '--method') kall.metode = verdi.toUpperCase();
    if (flagg === '--input') kall.input = true;
  };
  for (let i = 0; i < argumenter.length; i++) {
    const o = argumenter[i];
    if (o.startsWith('--')) {
      const [navn, ...verdi] = o.split('=');
      if (GH_LANG_MED.has(navn))
        merk(navn, verdi.length ? verdi.join('=') : (argumenter[++i] ?? ''));
      else if (!GH_LANG_UTEN.has(o)) kall.ukjent ??= o;
    } else if (o.startsWith('-') && o.length > 1) {
      for (let j = 1; j < o.length; j++) {
        if (GH_KORT_UTEN.includes(o[j])) continue;
        if (!GH_KORT_MED.includes(o[j])) {
          kall.ukjent ??= o;
          break;
        }
        merk(o[j], o.slice(j + 1) || (argumenter[++i] ?? ''));
        break;
      }
    } else if (!kall.endepunkt) {
      kall.endepunkt = o;
    } else {
      kall.ukjent ??= o;
    }
  }
  kall.felt = kall.felt.map((f) => f.split(/\[|=/)[0]);
  return kall;
}

/** Begrunnelsen når et gh-kall fra mekanisk-pr kan skrive noe annet enn PR-en, ellers null. */
function ghSkriving([underkommando, ...resten]) {
  if (underkommando === 'api') {
    if (lesingGhApi([underkommando, ...resten]) === null) return null;
    const kall = ghApiKall(resten);
    if (kall.ukjent) return `${kall.ukjent} i gh api kan vakten ikke tolke sikkert.`;
    if (GRAPHQL.test(kall.endepunkt)) return 'mekanisk-pr bruker ikke gh api graphql.';
    if (kall.metode === 'DELETE') return 'mekanisk-pr sletter ikke med gh api.';
    // GitHub ser bort fra spørrestrengen og dekoder prosentkoding, så de kan skjule endepunktet.
    if (/[?#%]/.test(kall.endepunkt)) {
      return `Endepunktet ${kall.endepunkt} har ?, # eller %, som kan skjule hvor kallet skriver.`;
    }
    const sti = kall.endepunkt.replace(GH_REPO_STI, '');
    const tillatte = GH_REPO_STI.test(kall.endepunkt)
      ? GH_SKRIVING_TILLATT.find(([monster]) => monster.test(sti))?.[1]
      : undefined;
    if (!tillatte) {
      return `mekanisk-pr skriver med gh api bare til PR-er og kommentarer, ikke ${kall.endepunkt}.`;
    }
    if (kall.input) return 'gh api med --input skjuler feltene som skrives.';
    const ulovlig = kall.felt.find((f) => !tillatte.includes(f));
    if (ulovlig) return `Feltet ${ulovlig} kan ikke skrives til ${kall.endepunkt}.`;
    return null;
  }
  if (!GH_TILLATT.has(underkommando)) return `gh ${underkommando} er ikke tillatt for mekanisk-pr.`;
  const tillatte = GH_TILLATT.get(underkommando);
  if (tillatte && !tillatte.includes(resten[0])) {
    return `gh ${underkommando} ${resten[0] ?? ''} er ikke tillatt for mekanisk-pr.`;
  }
  if (
    underkommando === 'pr' &&
    resten[0] === 'edit' &&
    resten.some((o) => /^(-B|--base)/.test(o))
  ) {
    return 'mekanisk-pr bytter ikke basen til PR-en.';
  }
  return null;
}

const ALENE =
  'Kjør git commit og git push hver i sitt eget kall, uten rør og uten andre kommandoer enn git og cd.';

/**
 * Begrunnelsen når et kall med commit eller push kan virke på et annet tre enn det kontrollen
 * leser. Kallet kan bare ha git-ledd og `cd` som ender i samme arbeidstre som cwd.
 */
function utenforTreet(leddene, cwd, rot) {
  let mappe = cwd;
  for (const { ord } of leddene) {
    if (ord[0] === 'cd' && ord.length === 2 && !ord[1].startsWith('-')) {
      mappe = path.resolve(mappe, ord[1]);
      if (arbeidstreet(mappe) !== rot) return `cd ${ord[1]} går ut av arbeidstreet.`;
    } else if (ord[0] !== 'git') {
      return `${ord[0] ?? 'Skallsyntaks'} står i samme kall som git commit eller git push. ${ALENE}`;
    } else {
      let gitMappe = mappe;
      for (let i = 1; i < ord.length && ord[i].startsWith('-'); i++) {
        if (ord[i] === '-C') gitMappe = path.resolve(gitMappe, ord[++i] ?? '');
        else if (ord[i] === '-c') i++;
      }
      if (arbeidstreet(gitMappe) !== rot) return 'git -C peker på et annet tre.';
    }
  }
  return null;
}

// Teksten uten linjene i `linjer`, som er [start, slutt).
function utenLinjer(tekst, linjer) {
  let ut = '';
  let fra = 0;
  for (const [start, slutt] of linjer) {
    ut += tekst.slice(fra, start);
    fra = slutt;
  }
  return ut + tekst.slice(fra);
}

/** Returnerer en begrunnelse når kallet skal stoppes, ellers null. */
function vurderKall(input) {
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
      if (vernetSti(relativ) || relativ.split(path.sep).includes('.git'))
        return `${relativ} er hookoppsettet eller git-mappa, og mekanisk-pr endrer det ikke.`;
    }
    if (rot && innenfor(absolutt, rot)) return null;
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
    (t) => SPERRET_MAPPE.test(t) || NEVNER_HOOKOPPSETT.test(t) || nevnerClaude(t)
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
  if (nevnerSperret && eff.some((del) => del.ord[0] === 'sed' && sedSkriver(del.ord.slice(1)))) {
    return 'sed-skriptet kan skrive med w eller W, og kommandoen nevner en sperret mappe.';
  }
  if (
    nevnerSperret &&
    eff.some((del) => del.ord.slice(1).some((o) => o.split('/').pop() === 'sed'))
  ) {
    return 'sed kjøres gjennom et annet program, og kommandoen nevner en sperret mappe.';
  }
  const alleOrd = [
    ...leddene.flatMap((del) => del.ord),
    ...eff.flatMap((del) => [...del.ord, ...(del.forran ?? [])]),
  ];
  const deler = ledd(kommando);
  const gitene = eff.filter((del) => del.ord[0] === 'git').map((del) => gitKommando(del.ord));
  // Det kallet committer og pusher. Både meldingen og reglene under leser disse.
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
  const miljoe = alleOrd.find((o) => !UFARLIG_MILJOE.test(o) && FARLIG_MILJOE.test(o));
  if (miljoe) return `mekanisk-pr setter ikke miljøvariabelen i ${miljoe}.`;
  if (
    eff.some((del) => del.ord[0] === 'rg' && del.ord.some((o) => /^--(pre|hostname-bin)/.test(o)))
  ) {
    return 'rg med --pre eller --hostname-bin kjører et program.';
  }
  if (
    leddene.some((del) => del.ukjentSyntaks) &&
    [...SKRIVENDE, ...SKRIVENDE_UTEN_STI, /\b(git|gh)\b/].some((m) =>
      [...tekster].some((t) => m.test(t))
    )
  ) {
    const blandet =
      (pushArgumenter.length > 0 || commiter) &&
      eff.some((del) => !del.kropp && !['git', 'cd'].includes(del.ord[0]));
    return `Kommandoen har skallsyntaks som ikke kan leses statisk, og kan skrive.${blandet ? ` ${ALENE}` : ''}`;
  }

  if (
    eff.some(
      (del) =>
        !TEKSTKOMMANDOER.has(del.ord[0]) && del.ord.slice(1).some((o) => NEVNER_KJOERBAR.test(o))
    )
  ) {
    return 'Kommandoen kan starte git, gh eller et skall gjennom et program vakten ikke kjenner.';
  }

  if (
    deler.some((del) => /^gh\b/.test(del) && GH_MERGE.test(del)) ||
    eff.some((del) => del.ord[0] === 'gh' && GH_MERGE.test(del.ord.join(' ')))
  ) {
    return 'mekanisk-pr merger ikke og oppdaterer ikke PR-en mot main.';
  }
  const gh = eff
    .filter((del) => del.ord[0] === 'gh')
    .map((del) => ghSkriving(del.ord.slice(1)))
    .find(Boolean);
  if (gh) return gh;
  const ukjentGlobal = gitene.find((g) => g.ukjentGlobal)?.ukjentGlobal;
  if (ukjentGlobal) return `Det globale git-valget ${ukjentGlobal} kan vakten ikke tolke sikkert.`;
  if (
    gitene.some(
      (g) =>
        GIT_KJOERER.has(g.underkommando) ||
        g.argumenter.some((o) => GIT_KJOERER_FLAGG.test(o)) ||
        // `-u` er kortformen av --upload-pack i clone og ls-remote.
        (['clone', 'ls-remote'].includes(g.underkommando) &&
          g.argumenter.some((o) => /^-[a-zA-Z]*u/.test(o)))
    )
  ) {
    return 'git-kommandoen kan kjøre et program fra argumentene.';
  }
  if (
    deler.some((del) => /^git\s+(-c\b|config\b)/.test(del)) ||
    gitene.some((g) => GIT_OPPSETT.has(g.underkommando) || g.globale.includes('-c'))
  ) {
    return 'mekanisk-pr endrer ikke git-oppsettet.';
  }

  // Siste vern: det som committes eller pushes, kontrolleres i git.
  if ((pushArgumenter.length || commiter) && [...leddene, ...eff].some((del) => del.heredoc)) {
    return 'Kommandoen har en heredoc i samme kall som git commit eller git push. Skriv teksten til en fil i /tmp med Write og vis til filen, for eksempel med git commit -F.';
  }
  if (pushArgumenter.length && commiter) return 'Kjør commit og push i hver sin kommando.';
  if (pushArgumenter.length || commiter) {
    const utenfor = utenforTreet(leddene, cwd, rot);
    if (utenfor) return utenfor;
  }
  if (gitene.some((g) => TREENDRENDE.has(g.underkommando)) && (pushArgumenter.length || commiter)) {
    return 'Kommandoen endrer treet og committer eller pusher i samme kall. Kjør dem i hver sin kommando.';
  }
  if (rot && commiter) {
    const endret = git(rot, 'diff', '-z', '--name-only', '--no-renames', 'HEAD');
    const nye = git(rot, 'ls-files', '-z', '--others', '--exclude-standard');
    const filer = sperredeFiler(`${endret}\0${nye}`);
    if (filer.length) return `Endringer i sperrede mapper: ${filer.join(', ')}.`;
  }
  // Husky kjører `.husky/pre-push` fra arbeidstreet, så den må være committet før push.
  if (rot && pushArgumenter.length) {
    const endret = git(rot, 'diff', '-z', '--name-only', '--no-renames', 'HEAD', '--', '.husky');
    const nye = git(rot, 'ls-files', '-z', '--others', '--exclude-standard', '--', '.husky');
    const husky = `${endret}\0${nye}`.split('\0').filter(Boolean);
    if (husky.length) return `Endringer i .husky som ikke er committet: ${husky.join(', ')}.`;
  }
  for (const argumenter of pushArgumenter) {
    if (!rot) return 'Ikke i et git-arbeidstre.';
    const begrunnelse = vurderPush(argumenter, rot);
    if (begrunnelse) return begrunnelse;
  }
  return null;
}

/**
 * Kroppen i en heredoc leses som kommandoer. Er kroppen bare tekst, og slipper kallet uten den,
 * sier begrunnelsen at det er kroppen som stopper kallet (#970).
 */
function vurder(input) {
  const begrunnelse = vurderKall(input);
  if (!begrunnelse || input.tool_name !== 'Bash') return begrunnelse;
  const rakKommando = String(input.tool_input?.command ?? '');
  const { kroppslinjer } = lekser(rakKommando);
  if (!kroppslinjer?.length) return begrunnelse;
  const command = utenLinjer(rakKommando, kroppslinjer);
  const eff = effektiveKommandoer(lekser(command));
  if (eff.some((del) => del.ukjentKommando || !KJOERER_IKKE_FIL.has(del.ord[0]))) {
    return begrunnelse;
  }
  const utenKropp = vurderKall({ ...input, tool_input: { ...input.tool_input, command } });
  if (utenKropp) return utenKropp;
  const raad = begrunnelse.includes('Write')
    ? ''
    : ' Skriv teksten til en fil i /tmp med Write og vis til filen, for eksempel med -F body=@/tmp/<fil>.';
  return `Kroppen i heredocen leses som kommandoer, og der finner vakten dette: ${begrunnelse} Kallet slipper uten kroppen.${raad}`;
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
