import { getContext, setContext } from 'svelte';
import { fetchCaseContext } from '$lib/api/state';
import { submitEvent } from '$lib/api/events';
import type { CaseContextResponse } from '$lib/types/api';
import type { EventType } from '$lib/types/timeline';
import type { DemoCaseWorkspace } from '$lib/mockup/store.svelte';
import type { SporKey, SporUIState } from '$lib/components/kontraktsbord/types';
import type { Draft } from '$lib/components/kontraktsbord/types';
import {
  deriveTrackDisplay,
  deriveVederlagDomainConfig,
  deriveFristDomainConfig,
  deriveGrunnlagDomainConfig,
} from '$lib/components/kontraktsbord/derive';
import { getPartsNavn } from '$lib/utils/partsNavn';

const CONTEXT_KEY = Symbol('case-workspace');
const TRACKS: SporKey[] = ['ansvar', 'vederlag', 'frist'];

export interface WorkspaceOptions {
  projectId: string;
  refetch?: () => Promise<CaseContextResponse>;
  sendEvent?: typeof submitEvent;
}

/** One workspace per mounted case. API state changes only after confirmed writes. */
export function createCaseWorkspace(initial: CaseContextResponse, options: WorkspaceOptions) {
  const sakId = initial.state.sak_id;
  let response = $state(initial);
  let submitting = $state(false);
  let submissionError = $state<string | null>(null);
  let needsRefresh = $state(false);
  let editKey: string | null = null;
  let editVersion: number | null = null;
  let requiredVersion: number | null = null;
  const ui = $state<Record<SporKey, SporUIState>>({
    ansvar: { draft: null, att: [], note: null },
    vederlag: { draft: null, att: [], note: null },
    frist: { draft: null, att: [], note: null },
  });

  const displays = $derived({
    ansvar: deriveTrackDisplay(response.state, 'ansvar'),
    vederlag: deriveTrackDisplay(response.state, 'vederlag'),
    frist: deriveTrackDisplay(response.state, 'frist'),
  });
  const vederlagConfig = $derived(deriveVederlagDomainConfig(response.state));
  const fristConfig = $derived(deriveFristDomainConfig(response.state));
  const grunnlagConfig = $derived(deriveGrunnlagDomainConfig(response.state));
  const teNavn = $derived(getPartsNavn('TE', response.state.entreprenor, response.state.byggherre));
  const bhNavn = $derived(getPartsNavn('BH', response.state.entreprenor, response.state.byggherre));
  const timeline = $derived(
    [...response.timeline].sort(
      (a, b) => (Date.parse(a.time ?? '') || 0) - (Date.parse(b.time ?? '') || 0)
    )
  );

  function replace(next: CaseContextResponse) {
    if (next.state.sak_id !== sakId)
      throw new Error('Kan ikke bytte sak i en eksisterende sakskontekst.');
    // A slower request must never roll the workspace back after a confirmed update.
    if (next.version < response.version) return;
    response = next;
  }

  async function refresh() {
    const next = await (options.refetch?.() ?? fetchCaseContext(sakId, options.projectId));
    if (requiredVersion !== null && next.version < requiredVersion) {
      throw new Error('Saken viser ennå ikke den lagrede endringen. Last saken på nytt.');
    }
    replace(next);
    needsRefresh = false;
    requiredVersion = null;
    submissionError = null;
  }

  async function submit(eventType: EventType, data: Record<string, unknown>) {
    if (submitting) throw new Error('En innsending pågår allerede.');
    if (needsRefresh) {
      throw new Error('Svaret er lagret. Last saken på nytt før du sender flere endringer.');
    }
    submitting = true;
    submissionError = null;
    let saved = false;
    try {
      const result = await (options.sendEvent ?? submitEvent)(sakId, eventType, data, {
        expectedVersion: editVersion ?? response.version,
        projectId: options.projectId,
      });
      if (!result.success) throw new Error(result.message ?? 'Endringen kunne ikke lagres.');
      saved = true;
      needsRefresh = true;
      requiredVersion = result.new_version ?? response.version + 1;
      await refresh();
      if (editKey !== null) editVersion = response.version;
    } catch (error) {
      submissionError = saved
        ? 'Endringen er lagret, men saken kunne ikke oppdateres. Last saken på nytt før du fortsetter.'
        : error instanceof Error
          ? error.message
          : 'Endringen kunne ikke lagres.';
      throw new Error(submissionError, { cause: error });
    } finally {
      submitting = false;
    }
  }

  return {
    isDemo: false as const,
    projectId: options.projectId,
    demo: undefined,
    get sak() {
      return response.state;
    },
    get timeline() {
      return timeline;
    },
    get version() {
      return response.version;
    },
    get teNavn() {
      return teNavn;
    },
    get bhNavn() {
      return bhNavn;
    },
    get vederlagDomainConfig() {
      return vederlagConfig;
    },
    get fristDomainConfig() {
      return fristConfig;
    },
    get grunnlagDomainConfig() {
      return grunnlagConfig;
    },
    get draftCount() {
      return TRACKS.filter((track) => ui[track].draft !== null).length;
    },
    get submitting() {
      return submitting;
    },
    get submissionError() {
      return submissionError;
    },
    display: (track: SporKey) => displays[track],
    getUI: (track: SporKey) => ui[track],
    setDraft(track: SporKey, draft: Draft | null) {
      ui[track].draft = draft;
    },
    beginEdit(key: string) {
      if (editKey !== key) {
        editKey = key;
        editVersion = response.version;
      }
    },
    endEdit() {
      editKey = null;
      editVersion = null;
    },
    replace,
    refresh,
    submit,
  };
}

export type LiveCaseWorkspace = ReturnType<typeof createCaseWorkspace>;
export type CaseWorkspace = LiveCaseWorkspace | DemoCaseWorkspace;

export function setCaseWorkspace<T extends CaseWorkspace>(workspace: T): T {
  return setContext<T>(CONTEXT_KEY, workspace);
}

export function getCaseWorkspace(): CaseWorkspace {
  const workspace = getContext<CaseWorkspace | undefined>(CONTEXT_KEY);
  if (!workspace)
    throw new Error('Sakskontekst mangler. Opprett kontekst før kontrollrommet vises.');
  return workspace;
}
