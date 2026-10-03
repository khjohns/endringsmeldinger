// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import { flushSync } from 'svelte';
import CaseWorkspace from '../CaseWorkspace.svelte';
import { createDemoStore } from '$lib/mockup/store.svelte';
import { apiFetch } from '$lib/api/client';
import type { CaseContextResponse } from '$lib/types/api';
import type { WorkspaceView } from '../viewState';

vi.mock('$lib/api/vedlegg', async (importOriginal) => ({
  ...(await importOriginal<typeof import('$lib/api/vedlegg')>()),
  hentVedlegg: vi.fn().mockResolvedValue({ vedlegg: [], minRolle: 'BH' }),
}));
vi.mock('$lib/api/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('$lib/api/client')>()),
  apiFetch: vi.fn(),
}));

let consoleError: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  vi.mocked(apiFetch).mockResolvedValue({
    state: { version: 0, items: [], packages: [] },
    actor: 'handler@test',
    chain: [],
    canPrepare: true,
  } as never);
  consoleError = vi.spyOn(console, 'error');
});
afterEach(() => consoleError.mockRestore());

function response(version: number, tittel: string): CaseContextResponse {
  const demo = createDemoStore();
  const state = JSON.parse(JSON.stringify(demo.sak));
  state.sakstittel = tittel;
  return {
    state,
    timeline: JSON.parse(JSON.stringify(demo.timeline)),
    version,
    historikk: { grunnlag: [], vederlag: [], frist: [] },
  };
}

function props(r: CaseContextResponse, view: WorkspaceView) {
  return {
    response: r,
    projectId: 'p',
    refetch: async () => r,
    view,
    onviewchange: () => {},
    onnewcase: () => {},
  };
}

function expectNoEffectLoop() {
  const loop = consoleError.mock.calls.some((args: unknown[]) =>
    args.some((arg) => String(arg).includes('effect_update_depth_exceeded'))
  );
  expect(loop).toBe(false);
}

const views: WorkspaceView[] = [
  { track: 'ansvar', mode: 'read', role: 'TE' },
  { track: 'ansvar', mode: 'read', role: 'BH' },
  { track: 'ansvar', mode: 'form', role: 'TE' },
  { track: 'ansvar', mode: 'form', role: 'BH' },
  { track: 'vederlag', mode: 'form', role: 'TE' },
  { track: 'vederlag', mode: 'form', role: 'BH' },
  { track: 'frist', mode: 'form', role: 'TE' },
  { track: 'frist', mode: 'form', role: 'BH' },
];

describe('CaseWorkspace', () => {
  it.each(views)('rendrer saken uten effektløkke ($role, $track, $mode)', (view) => {
    render(CaseWorkspace, props(response(4, 'Sak fra API'), view));
    flushSync();
    expect(screen.getByText('Sak fra API')).toBeInTheDocument();
    expectNoEffectLoop();
  });

  it('tar inn en nyere respons fra ruta og ruller ikke tilbake til en eldre', () => {
    const view: WorkspaceView = { track: 'ansvar', mode: 'read', role: 'BH' };
    const { rerender } = render(CaseWorkspace, props(response(4, 'Versjon 4'), view));
    rerender(props(response(5, 'Versjon 5'), view));
    flushSync();
    expect(screen.getByText('Versjon 5')).toBeInTheDocument();
    rerender(props(response(3, 'Versjon 3'), view));
    flushSync();
    expect(screen.getByText('Versjon 5')).toBeInTheDocument();
    expect(screen.queryByText('Versjon 3')).not.toBeInTheDocument();
    expectNoEffectLoop();
  });
});
