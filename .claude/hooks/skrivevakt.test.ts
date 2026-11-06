import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const SKRIPT = path.resolve(__dirname, 'skrivevakt.mjs');

let rot: string;

function kjor(input: object, ...flagg: string[]) {
  return spawnSync('node', [SKRIPT, ...flagg], { input: JSON.stringify(input), encoding: 'utf8' });
}

beforeAll(() => {
  rot = mkdtempSync(path.join(tmpdir(), 'skrivevakt-'));
});

afterAll(() => rmSync(rot, { recursive: true, force: true }));

describe('vaktvalget fra settings.json', () => {
  function etterAgent(input: object) {
    return kjor(input, '--etter-agent');
  }

  it('slipper hovedøktas kall gjennom, også i kjerne/', () => {
    const skriving = { tool_name: 'Write', tool_input: { file_path: 'kjerne/a.ts' }, cwd: rot };
    expect(etterAgent(skriving).status).toBe(0);
    const bash = { tool_name: 'Bash', tool_input: { command: 'rm -rf kjerne' }, cwd: rot };
    expect(etterAgent(bash).status).toBe(0);
  });

  it('slipper kall fra andre agenter enn diffkontroll gjennom, også fra mekanisk-pr (#1639)', () => {
    const skriving = { tool_name: 'Write', tool_input: { file_path: 'kjerne/a.ts' }, cwd: rot };
    const bash = { tool_name: 'Bash', tool_input: { command: 'rm -rf kjerne' }, cwd: rot };
    for (const agent_type of ['mekanisk-pr', 'Explore', 'general-purpose', 'ci-logg']) {
      expect(etterAgent({ ...skriving, agent_type }).status, agent_type).toBe(0);
      expect(etterAgent({ ...bash, agent_type }).status, agent_type).toBe(0);
    }
  });

  it('bruker lesevakten for diffkontroll', () => {
    const docs = { tool_name: 'Write', tool_input: { file_path: 'docs/b.md' }, cwd: rot };
    expect(etterAgent({ ...docs, agent_type: 'diffkontroll' }).status).toBe(2);
    const les = { tool_name: 'Bash', tool_input: { command: 'git log --oneline -5' }, cwd: rot };
    expect(etterAgent({ ...les, agent_type: 'diffkontroll' }).status).toBe(0);
    const cat = { tool_name: 'Bash', tool_input: { command: 'cat docs/a.md' }, cwd: rot };
    const svar = etterAgent({ ...cat, agent_type: 'diffkontroll' });
    expect(svar.status).toBe(2);
    expect(svar.stderr).toContain('diffkontroll leser bare');
  });
});

describe('lesevakten for diffkontroll', () => {
  function les(command: string) {
    return kjor({ tool_name: 'Bash', tool_input: { command }, cwd: rot });
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
