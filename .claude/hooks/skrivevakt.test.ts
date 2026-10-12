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

  it('bruker skrivevakten i et agentarbeidstre når agent_type mangler', () => {
    const tre = path.join(rot, '.claude', 'worktrees', 'agent-1');
    mkdirSync(path.dirname(tre), { recursive: true });
    git(rot, 'worktree', 'add', '-q', '--detach', tre);
    try {
      const svar = etterAgent({
        tool_name: 'Edit',
        tool_input: { file_path: path.join(tre, 'kjerne', 'versjon.ts') },
        cwd: tre,
      });
      expect(svar.status).toBe(2);
      const annenAgent = etterAgent({
        tool_name: 'Edit',
        tool_input: { file_path: path.join(tre, 'kjerne', 'versjon.ts') },
        cwd: tre,
        agent_type: 'general-purpose',
      });
      expect(annenAgent.status).toBe(0);
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
});
