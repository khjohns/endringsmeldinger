// Brokervakten (#806): endringer i token-brokeren og vernet rundt den avvises uten BROKERVAKT_AV=1.
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const SKRIPT = path.resolve(__dirname, 'brokervakt.mjs');
const ROT = '/repo';

function kjor(input: unknown, env: Record<string, string> = {}) {
  const arvet = { ...process.env };
  delete arvet.BROKERVAKT_AV;
  const svar = spawnSync('node', [SKRIPT], {
    input: typeof input === 'string' ? input : JSON.stringify(input),
    encoding: 'utf8',
    env: { ...arvet, ...env },
  });
  if (svar.status === 2) {
    expect(svar.stderr).toMatch(/#806/);
    return 'avvist';
  }
  expect(svar.status).toBe(0);
  return null;
}

const skriv = (file_path: string, tool_name = 'Write') =>
  kjor({ tool_name, tool_input: { file_path }, cwd: ROT });
const bash = (command: string) => kjor({ tool_name: 'Bash', tool_input: { command }, cwd: ROT });

describe('skriving', () => {
  it.each([
    ['verktoy/catenda-broker/broker.ts', 'Edit'],
    ['/repo/verktoy/catenda-broker/wrangler.toml', 'Write'],
    ['verktoy/catenda-broker/ny.ts', 'MultiEdit'],
    ['verktoy/../verktoy/catenda-broker/broker.ts', 'Edit'],
    ['.claude/settings.json', 'Edit'],
    ['.claude/settings.local.json', 'Write'],
    ['.claude/hooks/brokervakt.mjs', 'Edit'],
  ])('avviser %s (%s)', (fil, verktoy) => {
    expect(skriv(fil, verktoy)).toBe('avvist');
  });

  it.each([
    'server/catenda.ts',
    'verktoy/catenda-broker-kopi/broker.ts',
    '.claude/hooks/skrivevakt.mjs',
    'docs/settings.json.md',
  ])('slipper %s gjennom', (fil) => {
    expect(skriv(fil, 'Edit')).toBeNull();
  });
});

describe('Bash', () => {
  it.each([
    'sed -i "" s/a/b/ verktoy/catenda-broker/broker.ts',
    'npx wrangler@4.147.0 deploy',
    'cp x .claude/settings.json',
    'rm .claude/hooks/brokervakt.mjs',
  ])('avviser %s', (kommando) => {
    expect(bash(kommando)).toBe('avvist');
  });

  it.each(['npx vitest run verktoy', 'git status', 'ls server'])(
    'slipper %s gjennom',
    (kommando) => {
      expect(bash(kommando)).toBeNull();
    }
  );
});

it('avviser når kallet ikke kan leses', () => {
  expect(kjor('ikke json')).toBe('avvist');
});

describe('opplåsing', () => {
  it('slipper gjennom når Claude kjører med BROKERVAKT_AV=1', () => {
    const inn = {
      tool_name: 'Edit',
      tool_input: { file_path: 'verktoy/catenda-broker/broker.ts' },
      cwd: ROT,
    };
    expect(kjor(inn, { BROKERVAKT_AV: '1' })).toBeNull();
    expect(kjor(inn, { BROKERVAKT_AV: 'ja' })).toBe('avvist');
  });

  it('låses ikke opp av en variabel i selve kommandoen', () => {
    expect(bash('BROKERVAKT_AV=1 npx wrangler@4.147.0 deploy')).toBe('avvist');
  });
});
