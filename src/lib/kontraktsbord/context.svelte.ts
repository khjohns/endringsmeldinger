import { getContext, setContext } from 'svelte';
import type { DemoCaseWorkspace } from '$lib/mockup/store.svelte';
import type { KjernesakArbeidsflate } from '$lib/kjernesak/arbeidsflate.svelte';

const CONTEXT_KEY = Symbol('case-workspace');

export type CaseWorkspace = DemoCaseWorkspace | KjernesakArbeidsflate;

export function setCaseWorkspace<T extends CaseWorkspace>(workspace: T): T {
  return setContext<T>(CONTEXT_KEY, workspace);
}

export function getCaseWorkspace(): CaseWorkspace {
  const workspace = getContext<CaseWorkspace | undefined>(CONTEXT_KEY);
  if (!workspace)
    throw new Error('Sakskontekst mangler. Opprett kontekst før kontrollrommet vises.');
  return workspace;
}
