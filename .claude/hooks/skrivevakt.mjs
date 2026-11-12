#!/usr/bin/env node
// PreToolUse-hook for subagenten diffkontroll (#442, #460). Leser hook-input som JSON på stdin og
// avslutter med kode 2 og en melding på stderr når kallet ikke er lesende: skriveverktøy, og i
// Bash alt annet enn lesende git-kommandoer, gh api uten skrivende flagg, grep og rg, ledd for
// ledd. Med --etter-agent, slik .claude/settings.json kaller den, vurderer den bare kall fra
// diffkontroll og slipper alle andre gjennom (#442).
import { readFileSync } from 'node:fs';

const SKRIVEVERKTOY = ['Edit', 'Write', 'MultiEdit', 'NotebookEdit'];

const GRAPHQL = /(^|\/)graphql\/?$/;

// Omdirigering som ikke skriver: `2>&1` og `>/dev/null`. Alle andre `>` og `<` gjør leddet ukjent.
const UFARLIG_OMDIRIGERING = /^>(&\d+(?=$|[\s;&|)])|\s*\/dev\/null(?=$|[\s;&|)]))/;
const ESCAPE_I_ANFORSEL = '$`"\\';

// Om parentesen ved `i` åpner aritmetikk (`((…))`): den neste parentesen lukkes rett før
// denne. Ellers er `$((…) )` en kommandosubstitusjon med et subskall.
function aapnerAritmetikk(tekst, i) {
  if (tekst[i + 1] !== '(') return false;
  let dybde = 0;
  let indre = -1;
  for (let j = i; j < tekst.length; j++) {
    if (tekst[j] === '(') dybde++;
    else if (tekst[j] === ')') {
      dybde--;
      if (dybde === 1 && indre === -1) indre = j;
      if (dybde === 0) return indre === j - 1;
    }
  }
  return false;
}

/**
 * Deler en kommando i ledd og ord med skallets regler for anførselstegn og escape.
 * `ukjent` settes når leddet ikke kan leses uten å kjøre skallet: substitusjon, variabler,
 * globber, klammer, `#`, subshell, heredoc eller omdirigering til fil. `ukjentSyntaks` er
 * den delen som ikke er omdirigering, og `ukjentKommando` er satt når kommandoordet selv
 * ikke kan leses. Hver linje i en heredoc-kropp lekses for seg, slik at en anførsel i kroppen
 * ikke sluker avgrenserlinja, og leddene merkes `kropp`. Uten anførselstegn eller escape i
 * avgrenseren kan skallet ekspandere kroppen, så da er både heredocen og kroppsleddene ukjente
 * (#753). Kroppen er også ukjent når et skall eller et annet program enn `TEKSTMOTTAKERE` kan
 * lese den, direkte eller gjennom et rør. En kommentar lekses for seg, og `<<` i
 * aritmetikk åpner ingen heredoc, så linjene etter leses som kommandoer. `iKropp` er satt når
 * `tekst` er en kroppslinje.
 */
function lekser(tekst, iKropp = false) {
  const liste = [];
  let ord = [];
  let innhold = '';
  let harOrd = false;
  let ukjent = false;
  let ukjentSyntaks = false;
  let ukjentKommando = false;
  let heredoc = false;
  // Leddet får data fra en heredoc, selv eller gjennom et rør fra et ledd som får det.
  let mottar = false;
  let aritmetikk = 0;
  let linjestart = 0;
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
      // Står `\` før `'` i `$'…'`, avslutter `'` teksten i dash, men ikke i bash.
      if (innhold.endsWith('$') && tekst[slutt - 1] === '\\') {
        merkUkjent();
        ukjentKommando = true;
      }
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
          // En kommandosubstitusjon kjører kommandoer vakten ikke ser.
          if (inni === '`' || (inni === '$' && neste === '(' && !aapnerAritmetikk(tekst, j + 1))) {
            ukjentKommando = true;
          }
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
      if (tekst[i + 1] === '(' && !aritmetikk) ukjentKommando = true;
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
      const undertrykt = aritmetikk > 0;
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
      // Prosessubstitusjon kjører kommandoer vakten ikke ser.
      if (tekst[i + 1] === '(' && !aritmetikk) ukjentKommando = true;
    } else if (tegn === '\n') {
      avsluttLedd();
      const linja = liste.slice(linjestart);
      // `mottar` som står igjen, er et rør som fortsetter etter kroppen.
      const kjoeres = mottar || linja.some((del) => del.mottar && !leserSomTekst(del));
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
        for (const del of lekser(linje, true)) {
          const ukjentKropp = bokstavelig && !kjoeres ? {} : { ukjent: true, ukjentSyntaks: true };
          liste.push({ ...del, ...ukjentKropp, kropp: true });
        }
      }
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
      // En kommandosubstitusjon kjører kommandoer vakten ikke ser.
      if (
        tegn === '`' ||
        (tegn === '$' && tekst[i + 1] === '(' && !aapnerAritmetikk(tekst, i + 1))
      ) {
        ukjentKommando = true;
      }
      // Skallet hopper over resten av linja etter en `#` som begynner et ord. Et skall som leser
      // `#` som et ord, leser den, så den lekses også for seg.
      if (tegn === '#' && (!harOrd || /[(`]$/.test(innhold))) {
        const nl = tekst.indexOf('\n', i);
        const slutt = nl === -1 ? tekst.length : nl;
        for (const del of lekser(tekst.slice(i + 1, slutt), true)) {
          liste.push({ ...del, ukjent: true, ukjentSyntaks: true });
        }
        i = slutt - 1;
        continue;
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

// Kommandoer som leser stdin som tekst og aldri kjører den.
const TEKSTMOTTAKERE = new Set([
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
  'tee',
]);

function leserSomTekst(del) {
  if (del.ukjentKommando) return false;
  const k = kommandoordet(del.ord);
  return k !== null && k < del.ord.length && TEKSTMOTTAKERE.has(del.ord[k].split('/').pop());
}

// Alt som går galt, stopper kallet: kode 1 ville sluppet det gjennom.
try {
  const input = JSON.parse(readFileSync(0, 'utf8'));
  // Hooks i frontmatter til prosjektagenter kjører bare i en mappe som er klarert i dialogen,
  // og skyøkta har ingen (#442). Derfor kalles vakten for hvert kall og velger selv etter
  // agent_type.
  if (process.argv.includes('--etter-agent') && input.agent_type !== 'diffkontroll') {
    process.exit(0);
  }
  const begrunnelse = vurderLesing(input);
  if (begrunnelse) {
    process.stderr.write(`skrivevakt: ${begrunnelse} diffkontroll leser bare.\n`);
    process.exit(2);
  }
} catch (feil) {
  process.stderr.write(`skrivevakt: kunne ikke vurdere kallet (${feil.message}).\n`);
  process.exit(2);
}
