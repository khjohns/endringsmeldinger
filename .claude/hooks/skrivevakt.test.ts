import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const SKRIPT = path.resolve(__dirname, 'skrivevakt.mjs');

let rot: string;
let fjern: string;

function git(cwd: string, ...argumenter: string[]) {
  execFileSync('git', ['-C', cwd, ...argumenter], { stdio: 'ignore' });
}

function kjor(input: object, ...flagg: string[]) {
  return spawnSync('node', [SKRIPT, ...flagg], { input: JSON.stringify(input), encoding: 'utf8' });
}

function skriv(fil: string, cwd = rot) {
  return kjor({ tool_name: 'Write', tool_input: { file_path: fil, content: 'x' }, cwd });
}

function bash(command: string) {
  return kjor({ tool_name: 'Bash', tool_input: { command }, cwd: rot });
}

beforeAll(() => {
  const base = mkdtempSync(path.join(tmpdir(), 'skrivevakt-'));
  fjern = path.join(base, 'fjern.git');
  rot = path.join(base, 'tre');
  execFileSync('git', ['init', '-q', '--bare', '-b', 'main', fjern]);
  execFileSync('git', ['init', '-q', '-b', 'main', rot]);
  git(rot, 'config', 'user.email', 'test@example.invalid');
  git(rot, 'config', 'user.name', 'test');
  mkdirSync(path.join(rot, 'docs'));
  writeFileSync(path.join(rot, 'docs', 'a.md'), 'a\n');
  git(rot, 'add', '.');
  git(rot, 'commit', '-q', '-m', 'start');
  git(rot, 'remote', 'add', 'origin', fjern);
  git(rot, 'push', '-q', 'origin', 'main');
  git(rot, 'switch', '-q', '-c', 'claude/test-1');
});

afterAll(() => rmSync(path.dirname(rot), { recursive: true, force: true }));

describe('skrivevakten for mekanisk-pr', () => {
  it('stopper Write i kjerne/ med kode 2 og en begrunnelse', () => {
    const svar = skriv(path.join(rot, 'kjerne', 'regler', 'a.ts'));
    expect(svar.status).toBe(2);
    expect(svar.stderr).toContain('kjerne/regler/a.ts ligger i en sperret mappe');
  });

  it('stopper Edit med relativ sti og NotebookEdit i de andre sperrede mappene', () => {
    for (const mappe of ['server', 'backend', 'supabase', 'sprakprove']) {
      const edit = kjor({ tool_name: 'Edit', tool_input: { file_path: `${mappe}/x` }, cwd: rot });
      expect(edit.status, mappe).toBe(2);
    }
    const notatbok = kjor({
      tool_name: 'NotebookEdit',
      tool_input: { notebook_path: path.join(rot, 'backend', 'n.ipynb') },
      cwd: rot,
    });
    expect(notatbok.status).toBe(2);
  });

  it('slipper Write i docs/ og i /tmp gjennom', () => {
    expect(skriv(path.join(rot, 'docs', 'ny.md')).status).toBe(0);
    expect(skriv(path.join(rot, 'docs', 'kjerne-notat.md')).status).toBe(0);
    expect(skriv('/tmp/kladd.txt').status).toBe(0);
  });

  it('stopper skriving utenfor arbeidstreet, også i et annet arbeidstre', () => {
    const svar = skriv('/home/user/endringsmeldinger/docs/a.md');
    expect(svar.status).toBe(2);
    expect(svar.stderr).toContain('utenfor arbeidstreet');
  });

  it('stopper skrivende Bash mot sperrede mapper og slipper lesing gjennom', () => {
    for (const kommando of [
      'echo x > kjerne/a.ts',
      'echo x >kjerne/a.ts',
      'true;rm -rf backend',
      'cat docs/a.md\ncp docs/a.md server/a.md',
      'gh api -X PUT repos/khjohns/endringsmeldinger/pulls/1/merge',
      "sed -i 's/a/b/' server/app.ts",
      'cp docs/a.md ./backend/a.md',
      'rm -rf supabase/migrations',
      'git checkout -- sprakprove/',
      'npm run format',
      'git apply /tmp/endring.patch',
      `python3 -c "open('kjerne/a.ts','w').write('x')"`,
      `node -e "require('fs').writeFileSync('kjerne/a.ts','x')"`,
    ]) {
      expect(bash(kommando).status, kommando).toBe(2);
    }
    for (const kommando of [
      'cat kjerne/versjon.ts',
      'grep -rn LESBART kjerne/ 2>/dev/null',
      'git diff --name-only origin/main...HEAD -- server/',
      'echo x > docs/b.md',
      'npm run lint',
      'git commit -m "rett push og merge i docs"',
      'gh api repos/khjohns/endringsmeldinger/pulls -f head=claude/merge-lenker-1 -f base=main',
    ]) {
      expect(bash(kommando).status, kommando).toBe(0);
    }
  });

  it('slipper lesende kommandoer gjennom, også når et argument ligner en skrivende', () => {
    for (const kommando of [
      'grep "ruff format" docs/a.md',
      'rg -n "ruff format" docs',
      'grep -n "=>" kjerne/a.ts',
      'git grep -n kjerne -- docs',
      'git diff origin/main...HEAD > /tmp/d.patch',
      'git log -1 2>&1 && grep x docs/a.md',
      'gh api -X GET repos/khjohns/endringsmeldinger/issues/460',
      'grep x kjerne/a.ts 2>/dev/null',
      'echo "git push origin main"',
    ]) {
      expect(bash(kommando).status, kommando).toBe(0);
    }
  });

  it('stopper den skrivende formen når den står sammen med lesende ledd', () => {
    for (const kommando of [
      'grep "ruff format" f; ruff format .',
      'rg "ruff format" docs && ruff format docs',
      'grep "rm" docs/a.md; cp docs/a.md kjerne/b.ts',
      'grep x docs/a.md | tee kjerne/out',
      'grep "kjerne" docs/a.md > kjerne/x',
      'git grep x && git push',
      'git log -1 && git push origin main',
      'gh api -X GET repos/x && rm -rf kjerne',
      'git show HEAD:kjerne/a.ts > /tmp/a.ts',
      'git log --output=kjerne/x.txt',
      'git diff --outp=kjerne/x',
      'rg --pre "rm -rf kjerne" x',
      'grep "$(rm -rf kjerne)" f',
      'echo `rm -rf kjerne`',
      'rm -rf kjerne;echo ok',
      'grep x docs/a.md;rm -rf backend',
    ]) {
      expect(bash(kommando).status, kommando).toBe(2);
    }
  });

  it('stopper skriving som skjuler en sperret mappe med anførsel eller escape', () => {
    for (const kommando of [
      'echo x > kj""erne/a.ts',
      "rm -rf kj''erne/a.ts",
      'echo x > kj\\erne/a.ts',
      'rm -rf kj"e"rne/a.ts',
      'rm -rf kjerne;echo ok',
    ]) {
      expect(bash(kommando).status, kommando).toBe(2);
    }
  });

  it('stopper skrivende kommandoer der kommandoordet eller målet ikke kan leses', () => {
    for (const kommando of [
      'rm -rf {kjerne,server}/a.ts',
      'rm -rf kjerne*',
      'k=kjer; n=ne; rm -rf $k$n/a.ts',
      'c=rm; $c -rf docs/a.md',
      '$(echo rm) -rf docs/a.md',
      'echo $(git push origin HEAD:main)',
    ]) {
      expect(bash(kommando).status, kommando).toBe(2);
    }
  });

  it('stopper push som er skjult av prefiks, sammensatte ledd eller skallnøsting', () => {
    for (const kommando of [
      'echo x & git push origin HEAD:main',
      'git --no-pager push origin HEAD:main',
      'nohup git push origin HEAD:main',
      'timeout 60 git push origin HEAD:main',
      'env -i git push origin HEAD:main',
      'X="a b" git push origin HEAD:main',
      "sh -c 'git push origin HEAD:main'",
      'eval "git push origin HEAD:main"',
      'echo x | xargs git push origin HEAD:main',
      'git push origin "HEAD:main"',
    ]) {
      expect(bash(kommando).status, kommando).toBe(2);
    }
  });

  it('sier at git commit og git push skal kjøres alene når et etterfølgende ledd står i kallet', () => {
    for (const kommando of [
      'git commit -qm x | tail -3',
      'git push -u origin claude/test-1; echo $?',
      'npm test && git commit -qm x',
      'command git commit -m "$(printf x)" && npm test',
    ]) {
      const resultat = bash(kommando);
      expect(resultat.status, kommando).toBe(2);
      expect(resultat.stderr, kommando).toContain(
        'hver i sitt eget kall, uten rør og uten andre kommandoer enn git og cd'
      );
    }
  });

  it('ber ikke om eget kall når kallet bare har git og cd og stoppes for skallsyntaks', () => {
    for (const kommando of [
      'git commit -m "$(cat <<EOF\nmelding\nEOF\n)"',
      'git commit -m "$(printf x)"',
      'git log --grep=push > "$(mktemp)"',
      'git add -A && git commit -m "$(printf x)"',
      'cd docs && git push -u origin "$(git branch --show-current)"',
    ]) {
      const resultat = bash(kommando);
      expect(resultat.status, kommando).toBe(2);
      expect(resultat.stderr, kommando).not.toContain('sitt eget kall');
    }
  });

  it('ber om eget kall for git add og git send-pack, som reglene regner som commit og push (#753)', () => {
    for (const kommando of [
      'printf "$(date)" && git add docs/a.md',
      'npm test; git send-pack origin "$(printf x)"',
    ]) {
      const resultat = bash(kommando);
      expect(resultat.status, kommando).toBe(2);
      expect(resultat.stderr, kommando).toContain('hver i sitt eget kall');
    }
  });

  it('stopper en heredoc uten anførselstegn som kjører kommandoer i kroppen (#753)', () => {
    for (const kommando of [
      "cat <<EOF\n'$(git push --force origin main)'\nEOF",
      "cat <<-EOF\n\t'`git push --force origin main`'\n\tEOF",
      "cat <<EOF | tail -1\n'$(git push --force origin main)'\nEOF",
      "cat <<A <<B\na\nA\n'$(git push --force origin main)'\nB",
      'cat <<\nrm -rf docs',
    ]) {
      expect(bash(kommando).status, kommando).toBe(2);
    }
  });

  it('leser heredoc-kroppen som tekst, ikke som kommandoledd (#753)', () => {
    const resultat = bash('git commit -F - <<EOF\nmelding\nEOF');
    expect(resultat.status).toBe(2);
    expect(resultat.stderr).not.toContain('melding står i samme kall');
    expect(resultat.stderr).toContain('skallsyntaks som ikke kan leses statisk');
  });

  it('slipper heredoc med enkel avgrenser i anførsel som skriver en fil i /tmp eller en PR-tekst (#753)', () => {
    for (const kommando of [
      "cat > /tmp/pr.md <<'EOF'\nlegg til lenke\nEOF",
      'cat > /tmp/pr.md <<"EOF"\nlegg til lenke\nEOF',
      "cat > /tmp/pr.md <<'EOF'\nflytt a << b\nEOF",
      "gh api repos/khjohns/endringsmeldinger/pulls/1 -X PATCH -F body=@- <<'EOF'\nlegg til lenke\nEOF",
    ]) {
      expect(bash(kommando).status, kommando).toBe(0);
    }
    for (const kommando of [
      'cat > /tmp/pr.md <<EOF\nlegg til lenke\nEOF',
      "cat > /tmp/pr.md <<'EOF'\n$(git push --force origin main)\nEOF",
      "cat > /tmp/pr.md <<'A' <<B\na\nA\n'$(git push --force origin main)'\nB",
      'cat > /tmp/a <<\'EOF\'\na"\nEOF\ngit --no-pager push --force origin HEAD:main #"',
      "cat > /tmp/a <<'EOF'\na'\nEOF\ngit reset --hard origin/main #'",
      "cat > /tmp/a <<'E F'\nE F\ngit push --force origin HEAD:main",
      "cat > /tmp/a <<$'EOF'\nEOF\ngit push --force origin HEAD:main",
      "cat > /tmp/a <<'EOF;'\nEOF;\ngit push --force origin HEAD:main",
    ]) {
      expect(bash(kommando).status, kommando).toBe(2);
    }
  });

  it('stopper heredoc med anførselstegn i samme kall som git commit, også med tom kropp (#753)', () => {
    for (const kommando of ["git commit -F - <<'EOF'\n\nEOF", "git commit -F - <<'EOF'\nEOF"]) {
      const resultat = bash(kommando);
      expect(resultat.status, kommando).toBe(2);
      expect(resultat.stderr, kommando).toContain('heredoc i samme kall som git commit');
    }
  });

  it('stopper fortsatt heredoc med anførselstegn og heredoc rundt git (#753)', () => {
    for (const kommando of [
      "git commit -F - <<'EOF'\nmelding\nEOF",
      'git commit -F - <<"EOF"\nmelding\nEOF',
      "cat <<'EOF'\ngit push origin HEAD:main\nEOF",
      'cat <<EOF | git commit -F -\nmelding\nEOF',
      'git commit -F - <<EOF\nmelding',
    ]) {
      expect(bash(kommando).status, kommando).toBe(2);
    }
  });

  it('stopper en kropp som leses som kommandoer, og sier at det er kroppen som stopper kallet (#970)', () => {
    for (const kommando of [
      "cat > /tmp/pr.md <<'EOF'\ngit commit -F fil\nEOF",
      "cat > /tmp/pr.md <<'EOF'\nkjør git push først\nEOF",
      "cat <<'EOF'\ngit push origin HEAD:main\nEOF",
      "cat > /tmp/a <<-'EOF'\n\tgit push --force origin HEAD:main\n\tEOF",
      "gh api repos/khjohns/endringsmeldinger/pulls/1 -X PATCH -F body=@- <<'EOF'\ngit push --force\nEOF",
      "cat > /tmp/pr.md <<'EOF'\nSett GIT_DIR=x først\nEOF",
      "cat > /tmp/pr.md <<'EOF'\nkjør bash først\nEOF",
    ]) {
      const resultat = bash(kommando);
      expect(resultat.status, kommando).toBe(2);
      expect(resultat.stderr, kommando).toContain('Kroppen i heredocen leses som kommandoer');
    }
  });

  it('sier ikke at kroppen stopper kallet når den kan kjøres eller resten av kallet stoppes (#970)', () => {
    for (const kommando of [
      "cat > /tmp/x.sh <<'EOF'\ngit push --force origin HEAD:main\nEOF\nbash /tmp/x.sh",
      "sh <<'EOF'\ngit status\nEOF",
      "cat <<'EOF' | bash\ngit push\nEOF",
      "cat > /tmp/a <<'EOF'\ngit push\n",
      "cat > /tmp/a <<'EOF'\nSett GIT_DIR=x\nEOF\ngit push --force origin HEAD:main",
    ]) {
      const resultat = bash(kommando);
      expect(resultat.status, kommando).toBe(2);
      expect(resultat.stderr, kommando).not.toContain('Kroppen i heredocen');
    }
  });

  it('leser kroppen som kommandoer når kallet også kan kjøre en fil eller heredocen ikke avsluttes (#970)', () => {
    for (const kommando of [
      "cat > /tmp/x.sh <<'EOF'\ngit push --force origin HEAD:main\nEOF\nbash /tmp/x.sh",
      "cat > /tmp/x.sh <<'EOF'\ngit push --force origin HEAD:main\nEOF\nsource /tmp/x.sh",
      "cat > /tmp/a <<'EOF'\ntekst\ngit push --force origin HEAD:main",
      "cat > /tmp/a <<-'EOF'\n\tEOF\ngit push --force origin HEAD:main",
      "cat > /tmp/a <<'EOF'\n tekst\nEOF \ngit push --force origin HEAD:main",
      "cat <<'EOF' > /tmp/a; git push --force origin HEAD:main\nx\nEOF",
    ]) {
      expect(bash(kommando).status, kommando).toBe(2);
    }
  });

  it('gjør kroppen ukjent når et skall eller et annet program leser den, også gjennom et rør (#970)', () => {
    for (const kommando of [
      "sh <<'EOF'\ngit status\nEOF",
      "cat <<'EOF' | bash\ngit status\nEOF",
      "cat <<'EOF' |& bash\ngit status\nEOF",
      "cat <<'EOF' | tee /tmp/a | sh\ngit status\nEOF",
      "cat <<'EOF' |\ngit status\nEOF\nbash",
      "exec <<'EOF'\ngit status\nEOF",
    ]) {
      const resultat = bash(kommando);
      expect(resultat.status, kommando).toBe(2);
      expect(resultat.stderr, kommando).toContain('skallsyntaks som ikke kan leses statisk');
    }
  });

  it('ser en heredoc i bash -c og eval i samme kall som git commit (#970)', () => {
    for (const kommando of [
      'bash -c "cat > /tmp/m <<\'EOF\'\nx\nEOF\ngit commit -F /tmp/m"',
      'eval "cat > /tmp/m <<\'EOF\'\nx\nEOF\ngit commit -F /tmp/m"',
    ]) {
      const resultat = bash(kommando);
      expect(resultat.status, kommando).toBe(2);
      expect(resultat.stderr, kommando).toContain('heredoc i samme kall som git commit');
    }
  });

  it('åpner ingen heredoc med << etter # eller i aritmetikk, så linjene etter er kommandoer (#970)', () => {
    for (const kommando of [
      'git commit -m x # <<EOF\nnpm test',
      'git commit -m $((1<<2))\nnpm test',
    ]) {
      const resultat = bash(kommando);
      expect(resultat.status, kommando).toBe(2);
      expect(resultat.stderr, kommando).toContain('hver i sitt eget kall');
    }
  });

  // Avgjørelsene på origin/main bd250d4 er kjørt med samme tre og lagt inn for hånd.
  it('nekter alt main nektet (#970)', () => {
    const korpus: [string, 0 | 2, 0 | 2][] = [
      ["cat > /tmp/pr.md <<'EOF'\ngit commit -F fil\nEOF", 2, 2],
      ["cat > /tmp/pr.md <<'EOF'\nkjør git push først\nEOF", 2, 2],
      ["cat <<'EOF'\ngit push origin HEAD:main\nEOF", 2, 2],
      ["cat > /tmp/a <<'A' <<'B'\ngit push\nA\ngit commit\nB", 2, 2],
      ["cat > /tmp/pr.md <<'EOF'\nlegg til lenke\nEOF", 0, 0],
      ["cat > /tmp/a <<-'EOF'\n\ttekst\n\tEOF", 0, 0],
      ["cat > /tmp/a <<'EOF'\nx\nEOF\nmkdir -p /tmp/b && cat /tmp/a", 0, 0],
      ["cat <<'EOF'\nkjerne/x\nEOF\nls", 0, 0],
      ["cat > /tmp/m <<'EOF'\nx\nEOF\ngit commit -F /tmp/m", 2, 2],
      ["bash <<'EOF'\ngit push --force origin HEAD:main\nEOF", 2, 2],
      ["python3 <<'EOF'\nimport os; os.system('git push')\nEOF", 2, 2],
      ["sh <<'EOF'\ngit status\nEOF", 0, 2],
      ["cat <<'EOF' | bash\ngit status\nEOF", 0, 2],
      ['echo $((1<<2))\ngit status', 2, 2],
      ["git status # <<'EOF'\ngit push --force origin HEAD:main\nEOF", 2, 2],
      ["cat > /tmp/pr.md <<'EOF'\nCloses #753 (RV-07)\nEOF", 2, 2],
      ["cat > /tmp/pr.md <<'EOF'\nTE's krav\nEOF", 2, 2],
      ["cat > /tmp/pr.md <<'EOF'\n* punkt\nEOF", 2, 2],
      ["cat <<'EOF'\n$(git push)\nEOF", 2, 2],
      ["cat <<'EOF'\nx (sh)\nEOF", 2, 2],
      ["cat > /tmp/a <<'EOF'\nGIT_SSH_COMMAND=x\nEOF", 2, 2],
      ["ls a#b <<'EOF'\n'x\ny'\nEOF", 2, 2],
      ["ls x$# <<'EOF'\n'x\ny'\nEOF", 2, 2],
    ];
    for (const [kommando, main, ny] of korpus) {
      if (main === 2) expect(ny, kommando).toBe(2);
      expect(bash(kommando).status, kommando).toBe(ny);
    }
  });

  it('stopper endring av treet i samme kall som commit eller push', () => {
    for (const kommando of [
      'git merge feat-kjerne --no-edit && git push -u origin claude/test-1',
      'git checkout -q main; git add docs/a.md',
      'git switch -q claude/test-1 && git commit -m x',
    ]) {
      expect(bash(kommando).status, kommando).toBe(2);
    }
  });

  it('stopper push med andre flagg enn -u', () => {
    for (const kommando of [
      'git push --no-verify origin claude/test-1',
      'git push --repo=/tmp/elsewhere origin claude/test-1',
    ]) {
      expect(bash(kommando).status, kommando).toBe(2);
    }
  });

  it('slipper et filnavn som begynner med .. inne i arbeidstreet', () => {
    expect(skriv(path.join(rot, '..notater.md')).status).toBe(0);
  });

  it('stopper skrivende git-kommandoer også med -C eller andre globale valg', () => {
    for (const kommando of [
      'git -C . apply /tmp/endring.patch',
      'git -C . restore kjerne/a.ts',
      'git -C kjerne checkout -- a.ts',
      'git --no-pager apply /tmp/endring.patch',
    ]) {
      expect(bash(kommando).status, kommando).toBe(2);
    }
    expect(bash('git -C . log --oneline -1').status).toBe(0);
  });

  it('stopper push som står etter en omdirigering eller et reservert ord', () => {
    for (const kommando of [
      '> /tmp/x git push origin HEAD:main',
      '! git push origin HEAD:main',
      'if true; then git push origin HEAD:main; fi',
      'true && ! git push origin HEAD:main',
    ]) {
      expect(bash(kommando).status, kommando).toBe(2);
    }
  });

  it('stopper push med sti som kommandoord, shell-valg foran -c eller env -S', () => {
    for (const kommando of [
      '/usr/bin/git push origin HEAD:main',
      'bash -o pipefail -c "git push origin HEAD:main"',
      'env -S "git push origin HEAD:main"',
      '/usr/bin/gh api -X PUT repos/x/pulls/1/merge',
    ]) {
      expect(bash(kommando).status, kommando).toBe(2);
    }
  });

  it('stopper flere skrivende verktøy som skriver til en sperret mappe', () => {
    for (const kommando of [
      'sed --in-place s/a/b/ kjerne/a.ts',
      'sort -o kjerne/a.ts docs/a.md',
      'curl -o kjerne/a.ts https://example.invalid/x',
      `node -p "require('fs').writeFileSync('kjerne/a.ts','x')"`,
    ]) {
      expect(bash(kommando).status, kommando).toBe(2);
    }
  });

  it('stopper linjeskift i anførsel som skjuler et push-kall', () => {
    expect(bash('git "pu\\\nsh" origin HEAD:main').status).toBe(2);
  });

  it('stopper send-pack og endring av fjernoppsett', () => {
    for (const kommando of [
      'git send-pack origin HEAD:refs/heads/main',
      'git remote set-url origin /tmp/elsewhere',
      'git update-ref refs/heads/main HEAD',
    ]) {
      expect(bash(kommando).status, kommando).toBe(2);
    }
  });

  it('stopper commit når en usporet fil i en sperret mappe har et navn som git setter i anførsel', () => {
    mkdirSync(path.join(rot, 'supabase'));
    writeFileSync(path.join(rot, 'supabase', 'æ.ts'), 'x\n');
    try {
      expect(bash('git add -A').status).toBe(2);
    } finally {
      rmSync(path.join(rot, 'supabase'), { recursive: true, force: true });
    }
  });

  it('stopper endring av hookoppsettet', () => {
    expect(skriv(path.join(rot, '.claude', 'settings.json')).status).toBe(2);
    expect(skriv(path.join(rot, '.claude', 'settings.local.json')).status).toBe(2);
  });

  it('stopper Write i kjerne/ også når stien går gjennom en symbolsk lenke', () => {
    const lenke = path.join(path.dirname(rot), 'lenke');
    symlinkSync(rot, lenke);
    expect(skriv(path.join(lenke, 'kjerne', 'a.ts'), lenke).status).toBe(2);
  });

  it('stopper kallet når input ikke kan leses', () => {
    const svar = spawnSync('node', [SKRIPT], { input: 'ikke json', encoding: 'utf8' });
    expect(svar.status).toBe(2);
  });

  it('stopper Write gjennom en lenke til en fil som ikke finnes ennå', () => {
    symlinkSync('../kjerne/ny.ts', path.join(rot, 'docs', 'lenke.ts'));
    expect(skriv(path.join(rot, 'docs', 'lenke.ts')).status).toBe(2);
  });

  it('stopper add og commit når en ny, usporet fil ligger i en sperret mappe', () => {
    mkdirSync(path.join(rot, 'server'));
    writeFileSync(path.join(rot, 'server', 'ny.ts'), 'x\n');
    try {
      expect(bash('git add -A').status).toBe(2);
      expect(bash('git commit -m x').status).toBe(2);
    } finally {
      rmSync(path.join(rot, 'server'), { recursive: true });
    }
  });

  it('stopper Bash som skriver hookoppsettet', () => {
    for (const kommando of [
      'cp /tmp/x .claude/settings.json',
      'echo {} > .claude/settings.local.json',
      'cp -r /tmp/x/. .claude/',
      'sed -i s/a/b/ .claude/settings.json',
      'cd .claude && mv /tmp/x settings.json',
      'git checkout origin/main -- .claude/settings.json',
      'cp /tmp/x .claude/sett""ings.json',
    ]) {
      expect(bash(kommando).status, kommando).toBe(2);
    }
    expect(bash('cat .claude/settings.json').status).toBe(0);
    expect(bash('cp /tmp/x .claude/hooks/ny.mjs').status).toBe(0);
  });

  it('stopper commit og push når hookoppsettet er endret, uansett hvordan det ble skrevet', () => {
    mkdirSync(path.join(rot, '.claude'));
    writeFileSync(path.join(rot, '.claude', 'settings.json'), '{}\n');
    try {
      const commit = bash('git commit -m x');
      expect(commit.status).toBe(2);
      expect(commit.stderr).toContain('.claude/settings.json');

      git(rot, 'switch', '-q', '-c', 'claude/innstillinger');
      git(rot, 'add', '.claude/settings.json');
      git(rot, 'commit', '-qm', 'forbi vakten');
      const push = bash('git push -u origin claude/innstillinger');
      expect(push.status).toBe(2);
      expect(push.stderr).toContain('.claude/settings.json');
    } finally {
      git(rot, 'switch', '-q', '-f', 'claude/test-1');
      git(rot, 'branch', '-q', '-D', 'claude/innstillinger');
      rmSync(path.join(rot, '.claude'), { recursive: true, force: true });
    }
  });

  it('stopper push og commit bak et prefiks med flagg som tar argument', () => {
    for (const kommando of [
      'timeout -s KILL 5 git push origin HEAD:main',
      'timeout --signal=KILL -k 2 5 git push origin HEAD:main',
      'env -C kjerne git push origin HEAD:main',
      'nice -n 5 git push origin HEAD:main',
      'exec -a navn git push origin HEAD:main',
      '/usr/bin/env -i git push origin HEAD:main',
    ]) {
      expect(bash(kommando).status, kommando).toBe(2);
    }
    // Commit og push står i et kall med bare git-ledd, så også et prefiks vakten tolker, stopper.
    expect(bash('timeout -s KILL 60 git push -u origin claude/test-1').status).toBe(2);
    expect(bash('env -u LANG npm test').status).toBe(0);
    // Bare den tolkede kommandoen bak `env -u` gir denne begrunnelsen; tekstreglene ser `env`.
    const env = bash('env -u LANG git -c alias.x=y status');
    expect(env.status).toBe(2);
    expect(env.stderr).toContain('endrer ikke git-oppsettet');
    expect(bash('timeout 300 npx vitest run docs').status).toBe(0);
  });

  it('stopper et prefiks eller et program som vakten ikke kan tolke (fail-closed)', () => {
    for (const kommando of [
      'sudo -u root git commit -m x',
      'timeout -x 5 ls',
      'timeout -s KILL git push origin HEAD:main',
      'env -iu HOME git push origin HEAD:main',
      'ionice -c 3 git push origin HEAD:main',
      'chrt 1 /usr/bin/git push origin HEAD:main',
      'echo push origin HEAD:main | xargs git',
      'find . -name x -exec git push origin HEAD:main \\;',
      "python3 -c \"import subprocess; subprocess.run(['git', 'push'])\"",
      'setsid sh -c "git push origin HEAD:main"',
    ]) {
      const svar = bash(kommando);
      expect(svar.status, kommando).toBe(2);
    }
    expect(bash('ionice -c 3 git push origin HEAD:main').stderr).toContain(
      'gjennom et program vakten ikke kjenner'
    );
    expect(bash('sudo -u root git commit -m x').stderr).toContain('prefiks med flagg');
  });

  it('stopper prettier -w, --fix og arkiver som pakkes ut', () => {
    for (const kommando of [
      'npx prettier -w docs/a.md',
      'npm run lint -- --fix',
      'tar -xf /tmp/a.tar',
      'tar -xf /tmp/a.tar -C kjerne',
      'unzip /tmp/a.zip',
    ]) {
      expect(bash(kommando).status, kommando).toBe(2);
    }
    expect(bash('npx prettier --check docs/a.md').status).toBe(0);
  });

  it('stopper gh api graphql, som kan merge med en mutasjon', () => {
    for (const kommando of [
      "gh api graphql -f query='mutation { mergePullRequest(input: {}) { clientMutationId } }'",
      'gh api graphql -F query=@/tmp/q.graphql',
    ]) {
      expect(bash(kommando).status, kommando).toBe(2);
    }
  });

  it('stopper commit og push i et annet tre enn cwd og globale git-valg vakten ikke tolker', () => {
    for (const kommando of [
      'git -C /tmp/klon commit -qm y',
      'git -C /tmp/klon push origin claude/test-1',
      'cd /tmp/klon && git push origin claude/test-1',
      'env -C /tmp/klon git push origin claude/test-1',
      'GIT_DIR=/tmp/klon/.git git push origin claude/test-1',
      'export GIT_WORK_TREE=/tmp/klon; git commit -m y',
      'git --git-dir=/tmp/klon/.git --work-tree=/tmp/klon commit -m y',
      'git --namespace x push --force origin main',
      'git --attr-source HEAD push origin claude/test-1:main2',
      'git --config-env alias.st=V st',
      'GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=alias.st GIT_CONFIG_VALUE_0=x git st',
    ]) {
      expect(bash(kommando).status, kommando).toBe(2);
    }
    expect(bash('git -C docs log --oneline -1').status).toBe(0);
    expect(bash('GIT_PAGER=cat git log --oneline -3').status).toBe(0);
    expect(bash('git --version').status).toBe(0);
    for (const kommando of [
      'GIT_DIR=/tmp/klon/.git; export GIT_DIR; git commit -m y',
      'set -a; GIT_DIR=/tmp/klon/.git; git push origin claude/test-1',
      'printf -v GIT_WORK_TREE /tmp/klon; export GIT_WORK_TREE; git commit -m y',
      `EDITOR='sh -c "git push origin HEAD:main; true"' git commit --allow-empty`,
      'export VISUAL=x; git commit',
      "GIT_PAGER='sh x' git log",
      "git clone -u 'sh x' /tmp/x /tmp/y",
      "git ls-remote -u 'sh x' /tmp/x",
    ]) {
      expect(bash(kommando).status, kommando).toBe(2);
    }
  });

  it('slipper commit og push med cd eller git -C til sitt eget arbeidstre', () => {
    expect(bash(`cd ${rot} && git add docs/a.md && git commit -m x`).status).toBe(0);
    expect(bash(`git -C ${rot} push -u origin claude/test-1`).status).toBe(0);
    expect(bash(`cd ${rot}/docs && git commit -m x`).status).toBe(0);
  });

  it('stopper git-kommandoer og rg-valg som kjører et program', () => {
    for (const kommando of [
      "git difftool -x 'git push origin HEAD:main' HEAD~1",
      "git rebase -x 'git push origin HEAD:main' HEAD~1",
      'git grep --open-files-in-pager=sh x',
      "git fetch --upload-pack='sh x' origin",
      'git submodule foreach git push origin HEAD:main',
      'rg --pre sh . docs',
      'rg --pre=git x',
    ]) {
      expect(bash(kommando).status, kommando).toBe(2);
    }
  });

  it('stopper gh-kall som merger uten PR, flytter en gren eller skriver filer på fjernsiden', () => {
    for (const kommando of [
      'gh api repos/o/r/merges -f base=main -f head=x',
      'gh api -X PATCH repos/o/r/git/refs/heads/main -f sha=abc -F force=true',
      'gh api -X PUT repos/o/r/contents/kjerne/x.ts -f content=eA==',
      'gh pr edit 1 --base main',
      'gh api graphql',
      'gh api /graphql -F query=@/tmp/q.txt',
      'gh api https://api.github.com/graphql -F query=@/tmp/q.txt',
      'gh api -X PATCH repos/o/r -f default_branch=claude/test-1',
      'gh repo edit --default-branch claude/test-1',
    ]) {
      expect(bash(kommando).status, kommando).toBe(2);
    }
    expect(
      bash('gh api repos/o/r/pulls -f title=x -f head=claude/contents-oversikt-12 -f base=main')
        .status
    ).toBe(0);
    expect(bash('gh api -X PATCH repos/o/r/pulls/12 -F body=@/tmp/b.md').status).toBe(0);
    expect(bash('gh api repos/o/r/issues/12/comments -F body=@/tmp/b.md').status).toBe(0);
    expect(
      bash('gh api repos/o/r/pulls -f title=x -f head=claude/test-1 -f base=main').status
    ).toBe(0);
    expect(bash('gh pr create --base main --title x --body y').status).toBe(0);
  });

  it('stopper sed med w i skriptet mot en sperret mappe, men ikke lesing med sed', () => {
    for (const kommando of [
      "sed -n 'w kjerne/ut' docs/a.md",
      "sed -n -e p -e 's/a/b/w kjerne/ut' docs/a.md",
      'sed -f /tmp/skript docs/a.md kjerne/x.ts',
      'cp /tmp/x .git/hooks/pre-push',
      'chmod +x ../.git/hooks/pre-push',
      "find docs/a.md -exec sed -n 'w kjerne/ut' docs/a.md ';'",
      "echo docs/a.md | xargs sed -n 'w kjerne/ut'",
      "sed -n -l 5 'w kjerne/ut' docs/a.md",
    ]) {
      expect(bash(kommando).status, kommando).toBe(2);
    }
    expect(skriv(path.join(rot, '.git', 'hooks', 'pre-push')).status).toBe(2);
    expect(
      kjor({ tool_name: 'Edit', tool_input: { file_path: '.git/config' }, cwd: rot }).status
    ).toBe(2);
    expect(bash('sed -n 1p kjerne/web.ts').status).toBe(0);
    expect(bash('sed -n 1,5p backend/x.py; echo work').status).toBe(0);
    expect(bash('cp /tmp/x .github/ny.yml').status).toBe(0);
  });

  it('stopper gh api med samlede kortflagg og PATCH av en PR utover tittel og beskrivelse', () => {
    for (const kommando of [
      'gh api -it repos/o/r/pulls/5 -X PATCH repos/o/r/git/refs/heads/main -f sha=abc -F force=true',
      'gh api -ip repos/o/r/pulls/5 -X PUT repos/o/r/contents/kjerne/x.ts -f content=eA==',
      'gh api -X PATCH repos/o/r/pulls/5 -f base=x',
      'gh api -X PATCH repos/o/r/pulls/5 -f state=closed',
      'gh api -X PATCH repos/o/r/pulls/5 --input /tmp/b.json',
      'gh api -X PATCH repos/o/r/pulls/5 -fbase=x',
    ]) {
      expect(bash(kommando).status, kommando).toBe(2);
    }
    expect(bash('gh api -X PATCH repos/o/r/pulls/5 -f title=x -F body=@/tmp/b.md').status).toBe(0);
  });

  it('stopper skriving i .claude med sti foran og i .husky, og HOME og XDG for git og rg', () => {
    for (const kommando of [
      `cp -r /tmp/c/. ${rot}/.claude`,
      'cp -r /tmp/c/. docs/../.claude/',
      'cp /tmp/x .husky/pre-push',
      'chmod +x .husky/pre-push',
      'HOME=/tmp/h git diff',
      'XDG_CONFIG_HOME=/tmp/h git log',
      'RIPGREP_CONFIG_PATH=/tmp/rc rg x docs',
    ]) {
      expect(bash(kommando).status, kommando).toBe(2);
    }
    expect(skriv(path.join(rot, '.husky', 'pre-push')).status).toBe(2);
    expect(
      kjor({ tool_name: 'Edit', tool_input: { file_path: '.husky/pre-commit' }, cwd: rot }).status
    ).toBe(2);
    expect(skriv(path.join(rot, 'docs', 'husky.md')).status).toBe(0);
  });

  it('stopper commit når en fil i .husky er endret', () => {
    mkdirSync(path.join(rot, '.husky'));
    writeFileSync(path.join(rot, '.husky', 'pre-push'), 'x\n');
    try {
      const commit = bash('git commit -m x');
      expect(commit.status).toBe(2);
      expect(commit.stderr).toContain('.husky/pre-push');
    } finally {
      rmSync(path.join(rot, '.husky'), { recursive: true, force: true });
    }
  });

  it('stopper alle skrivemåter av .claude som mål, men ikke en navngitt fil under hooks', () => {
    for (const kommando of [
      `cp -r /tmp/c/. ${rot}/.claude//`,
      'cp -r /tmp/c/. .claude/./',
      'cp -r /tmp/c/. .claude/hooks/..',
      'cd .claude/hooks && cp -r /tmp/c/. ..',
      'cp /tmp/x .claude/skills/x/../../settings.json',
    ]) {
      expect(bash(kommando).status, kommando).toBe(2);
    }
    expect(bash('cp /tmp/x .claude/agents/ny.md').status).toBe(0);
  });

  it('leser miljøvariabler bare som tilordning eller navn, ikke inne i en tekst', () => {
    for (const kommando of [
      'git commit -m "stopp HOME i vakten"',
      'gh api -X PATCH repos/o/r/pulls/5 -F "body=Retter HOME og XDG i vakten"',
    ]) {
      expect(bash(kommando).status, kommando).toBe(0);
    }
    for (const kommando of [
      'ZDOTDIR=/tmp/z zsh -c "git status"',
      'PATH=/tmp/x git status',
      'GH_PAGER=/tmp/x gh pr list',
      'LD_PRELOAD=/tmp/x.so git status',
      'NODE_OPTIONS=--require=/tmp/x.js npx prettier --check docs',
    ]) {
      expect(bash(kommando).status, kommando).toBe(2);
    }
  });

  it('tolker samlede kortflagg i gh api og stopper gh-underkommandoer som endrer tilstanden', () => {
    expect(bash('gh api -XPATCH repos/o/r/pulls/5 -F body=@/tmp/b.md').status).toBe(0);
    expect(bash('gh api -i -q .x -X PATCH repos/o/r/pulls/5 -f title=x').status).toBe(0);
    for (const kommando of [
      'gh api -XPATCH repos/o/r/pulls/5 -fstate=closed',
      'gh api -X POST repos/o/r/pulls -F issue=3 -f head=x -f base=main',
      'gh api -X DELETE repos/o/r/issues/comments/9',
      'gh api -iz repos/o/r/pulls/5',
      'gh pr close 5',
      'gh pr reopen 5',
      'gh pr ready 5',
      'gh issue close 5',
    ]) {
      expect(bash(kommando).status, kommando).toBe(2);
    }
  });

  it('stopper Edit i .husky i et arbeidstre inne i hovedkopien', () => {
    const tre = path.join(rot, 'docs', 'tre-husky');
    git(rot, 'worktree', 'add', '-q', '--detach', tre);
    try {
      const svar = kjor({
        tool_name: 'Edit',
        tool_input: { file_path: path.join(tre, '.husky', 'pre-commit') },
        cwd: rot,
      });
      expect(svar.status).toBe(2);
    } finally {
      git(rot, 'worktree', 'remove', '--force', tre);
    }
  });

  it('stopper gh api med spørrestreng eller prosentkoding som skjuler endepunktet', () => {
    for (const kommando of [
      "gh api -X POST 'repos/o/r/merges?x=/pulls' -f base=main -f head=claude/x",
      "gh api -X PUT 'repos/o/r/pulls/5/%6Derge?x=/pulls'",
      'gh api -X POST repos/o/r/merges/pulls -f base=main',
    ]) {
      expect(bash(kommando).status, kommando).toBe(2);
    }
  });

  it('stopper push når .husky har endringer som ikke er committet', () => {
    mkdirSync(path.join(rot, '.husky'));
    writeFileSync(path.join(rot, '.husky', 'pre-push'), 'x\n');
    try {
      const push = bash('git push -u origin claude/test-1');
      expect(push.status).toBe(2);
      expect(push.stderr).toContain('.husky/pre-push');
    } finally {
      rmSync(path.join(rot, '.husky'), { recursive: true, force: true });
    }
    expect(bash('git push -u origin claude/test-1').status).toBe(0);
  });

  it('stopper push til main, av en annen gren og med force', () => {
    for (const kommando of [
      'git push origin HEAD:main',
      'git push origin',
      'git push origin claude/test-1 && git push origin HEAD:main',
      'git -c remote.origin.push=HEAD:main push origin claude/test-1',
      'git config remote.origin.push HEAD:main',
      'git add -A && git commit -m x && git push -u origin claude/test-1',
      'git push origin main',
      'git push origin annen-gren',
      'git push --force origin claude/test-1',
      'git push -fu origin claude/test-1',
      'X=1 git push --force origin main',
      'command git push origin main',
      'env A=b git push origin main',
    ]) {
      expect(bash(kommando).status, kommando).toBe(2);
    }
  });

  it('stopper commit og push når grenen har endret en sperret mappe', () => {
    writeFileSync(path.join(rot, 'docs', 'a.md'), 'b\n');
    expect(bash('git commit -am "rett docs"').status).toBe(0);
    git(rot, 'commit', '-qam', 'rett docs');
    expect(bash('git push -u origin claude/test-1').status).toBe(0);

    mkdirSync(path.join(rot, 'kjerne'));
    writeFileSync(path.join(rot, 'kjerne', 'a.ts'), 'x\n');
    git(rot, 'add', 'kjerne/a.ts');
    const commit = bash('git commit -m "noe"');
    expect(commit.status).toBe(2);
    expect(commit.stderr).toContain('kjerne/a.ts');
    expect(bash('GIT_AUTHOR_NAME=x git commit -m "noe"').status).toBe(2);
    expect(bash('command git commit -m "noe"').status).toBe(2);

    git(rot, 'commit', '-qm', 'forbi vakten');
    const push = bash('git push -u origin claude/test-1');
    expect(push.status).toBe(2);
    expect(push.stderr).toContain('Grenen endrer sperrede mapper: kjerne/a.ts');
  });
});

describe('vaktvalget fra settings.json', () => {
  function etterAgent(input: object) {
    return kjor(input, '--etter-agent');
  }

  it('slipper hovedøktas kall gjennom, også i kjerne/', () => {
    const skriving = { tool_name: 'Write', tool_input: { file_path: 'kjerne/a.ts' }, cwd: rot };
    expect(etterAgent(skriving).status).toBe(0);
    expect(etterAgent({ ...skriving, agent_type: 'Explore' }).status).toBe(0);
    const bash = { tool_name: 'Bash', tool_input: { command: 'rm -rf kjerne' }, cwd: rot };
    expect(etterAgent(bash).status).toBe(0);
  });

  it('bruker skrivevakten for mekanisk-pr og lesevakten for diffkontroll', () => {
    const skriving = { tool_name: 'Write', tool_input: { file_path: 'kjerne/a.ts' }, cwd: rot };
    expect(etterAgent({ ...skriving, agent_type: 'mekanisk-pr' }).status).toBe(2);
    const docs = { tool_name: 'Write', tool_input: { file_path: 'docs/b.md' }, cwd: rot };
    expect(etterAgent({ ...docs, agent_type: 'mekanisk-pr' }).status).toBe(0);
    expect(etterAgent({ ...docs, agent_type: 'diffkontroll' }).status).toBe(2);
    const les = { tool_name: 'Bash', tool_input: { command: 'git log --oneline -5' }, cwd: rot };
    expect(etterAgent({ ...les, agent_type: 'diffkontroll' }).status).toBe(0);
    const cat = { tool_name: 'Bash', tool_input: { command: 'cat docs/a.md' }, cwd: rot };
    expect(etterAgent({ ...cat, agent_type: 'diffkontroll' }).status).toBe(2);
  });

  it('slipper hovedøkta gjennom også i et agentarbeidstre', () => {
    const tre = path.join(rot, '.claude', 'worktrees', 'agent-1');
    mkdirSync(path.dirname(tre), { recursive: true });
    git(rot, 'worktree', 'add', '-q', '--detach', tre);
    try {
      const svar = etterAgent({
        tool_name: 'Edit',
        tool_input: { file_path: path.join(tre, 'kjerne', 'versjon.ts') },
        cwd: tre,
      });
      expect(svar.status).toBe(0);
    } finally {
      git(rot, 'worktree', 'remove', '--force', tre);
    }
  });

  it('stopper skriving i et nøstet repo i kjerne/ og kommandoene som lager det', () => {
    const nostet = path.join(rot, 'kjerne', 'x');
    mkdirSync(nostet, { recursive: true });
    execFileSync('git', ['init', '-q', nostet]);
    try {
      const svar = etterAgent({
        tool_name: 'Write',
        tool_input: { file_path: path.join(nostet, 'a.ts') },
        cwd: rot,
        agent_type: 'mekanisk-pr',
      });
      expect(svar.status).toBe(2);
      for (const command of ['git init -q kjerne/y', 'git clone /tmp/r kjerne/v']) {
        const bash = { tool_name: 'Bash', tool_input: { command }, cwd: rot };
        expect(etterAgent({ ...bash, agent_type: 'mekanisk-pr' }).status, command).toBe(2);
      }
    } finally {
      rmSync(nostet, { recursive: true, force: true });
    }
  });

  it('stopper kjerne/ i et arbeidstre inne i hovedkopien, også når cwd er hovedkopien', () => {
    const tre = path.join(rot, '.claude', 'worktrees', 'agent-2');
    mkdirSync(path.dirname(tre), { recursive: true });
    git(rot, 'worktree', 'add', '-q', '--detach', tre);
    try {
      const svar = etterAgent({
        tool_name: 'Edit',
        tool_input: { file_path: path.join(tre, 'kjerne', 'versjon.ts') },
        cwd: rot,
        agent_type: 'mekanisk-pr',
      });
      expect(svar.status).toBe(2);
      expect(svar.stderr).toContain('kjerne/versjon.ts ligger i en sperret mappe');
    } finally {
      git(rot, 'worktree', 'remove', '--force', tre);
    }
  });
});

describe('lesevakten for diffkontroll', () => {
  function les(command: string) {
    return kjor({ tool_name: 'Bash', tool_input: { command }, cwd: rot }, '--bare-lesing');
  }

  it('slipper lesende git-kommandoer gjennom', () => {
    for (const kommando of [
      'git fetch origin claude/x-1',
      'git diff --name-only origin/main...origin/claude/x-1',
      'git -C /tmp/tre log --oneline -5',
      'git show HEAD:docs/a.md',
      'git diff --stat origin/main...HEAD -- docs/',
      'git rev-parse --show-toplevel',
      'git rev-parse --show-prefix --git-dir',
    ]) {
      expect(les(kommando).status, kommando).toBe(0);
    }
  });

  it('stopper alt annet', () => {
    for (const kommando of [
      'git checkout main',
      'git diff > /tmp/d.patch',
      'git diff --output=/tmp/d.patch',
      'git log; rm -rf docs',
      'git log\nrm -rf docs',
      'git grep --open-files-in-pager="rm -rf docs" foo',
      'git grep -O"rm -rf docs" foo',
      'git fetch --upload-pack="touch /tmp/x #" /tmp/repo',
      'git fetch origin claude/x-1:main',
      'git fetch origin tag v1',
      'git grep --open-files="touch x #" foo',
      'git diff --outp=/tmp/d.patch',
      'git fetch --upload=x origin',
      'git diff $(rm -rf docs)',
      'cat docs/a.md',
      'echo x > docs/a.md',
    ]) {
      expect(les(kommando).status, kommando).toBe(2);
    }
  });

  it('slipper gh api uten skrivende flagg og git grep gjennom', () => {
    for (const kommando of [
      'gh api repos/khjohns/endringsmeldinger/issues/460',
      'gh api -X GET repos/khjohns/endringsmeldinger/issues',
      "gh api 'repos/khjohns/endringsmeldinger/issues?state=all&per_page=100&page=2'",
      'gh api --paginate -H "Accept: application/vnd.github+json" repos/x/pulls',
      'gh api --method=GET --jq ".[].title" repos/x/pulls',
      'git grep -n LESBART -- kjerne docs',
      'git grep -e ruff -- .claude',
      'grep -rn "ruff format" docs',
      'rg "ruff format" docs',
    ]) {
      expect(les(kommando).status, kommando).toBe(0);
    }
  });

  it('stopper gh api med skrivende flagg eller en metode som ikke er GET', () => {
    for (const kommando of [
      'gh api graphql',
      'gh api /graphql -F query=@/tmp/q.txt',
      'gh api -X POST repos/khjohns/endringsmeldinger/issues',
      'gh api repos/khjohns/endringsmeldinger/issues/460/comments -f body=x',
      'gh api -XPOST repos/x/issues',
      'gh api --method=PATCH repos/x/issues/1',
      'gh api --method PUT repos/x/pulls/1/merge',
      'gh api repos/x --input body.json',
      'gh api repos/x -F body=@kladd.md',
      'gh api --raw-field body=x repos/x',
      'gh api --field body=x repos/x',
      'gh api -X GET repos/x -f body=x',
      'gh api -H "X: y" repos/x -f body=x',
    ]) {
      expect(les(kommando).status, kommando).toBe(2);
    }
  });

  it('stopper git-kommandoer som skriver eller starter et program', () => {
    for (const kommando of [
      'git grep -O"rm -rf docs" foo',
      'git grep --open-files-in-pager=rm foo',
      'git grep --textconv foo',
      'git diff --output=/tmp/d.patch',
      'git log -p --output=x',
      'git show --outp=/tmp/x HEAD',
      'git diff --ext-diff',
      'git fetch --upload-pack="touch /tmp/x #" /tmp/repo',
      'git fetch origin claude/x-1:main',
      'git fetch origin tag v1',
      'git fetch -p origin main',
      'git checkout main',
      'rg --pre "rm -rf docs" x',
    ]) {
      expect(les(kommando).status, kommando).toBe(2);
    }
  });

  it('stopper skallsyntaks som ikke kan leses statisk, også i anførsel', () => {
    for (const kommando of [
      'git diff $(rm -rf docs)',
      'grep "$(rm -rf docs)" f',
      'grep "`rm -rf docs`" f',
      'git log $HOME',
      'git log > /tmp/x',
      'git log -1 >&1x',
      'grep x docs/a.md >&1x',
      'git log >> /tmp/x',
      'git log < /etc/hosts',
      "git log <<'EOF'\nx\nEOF",
      'git log {a,b}',
      'git log *',
      'git log \\\nrm -rf docs',
      "git log'",
      'git log # "a\nrm -rf docs',
      'git log # kommentar; rm -rf docs',
    ]) {
      expect(les(kommando).status, kommando).toBe(2);
    }
  });

  it('vurderer sammensatte kommandoer ledd for ledd', () => {
    for (const kommando of [
      'git log --oneline -3 && git show HEAD:docs/a.md',
      'git log | grep x',
      'git log -1 2>&1; git log --oneline -2',
      'git log --grep="a;b" -- docs',
    ]) {
      expect(les(kommando).status, kommando).toBe(0);
    }
    for (const kommando of [
      'git log | head',
      'git log && rm -rf docs',
      'git log; rm -rf docs',
      'git log\nrm -rf docs',
      'git log | sh',
    ]) {
      expect(les(kommando).status, kommando).toBe(2);
    }
  });
});
