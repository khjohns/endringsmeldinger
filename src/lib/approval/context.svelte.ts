import { SvelteDate } from 'svelte/reactivity';
import {
  deriveVederlagDomainConfig,
  deriveFristDomainConfig,
} from '$lib/components/kontraktsbord/derive';
import { getContext, setContext } from 'svelte';
import { apiFetch, ApiError } from '$lib/api/client';
import type { CaseWorkspace } from '$lib/kontraktsbord/context.svelte';
import { submissionRefs } from '$lib/kontraktsbord/submission.svelte';
import type { EventType, SporType } from '$lib/types/timeline';
import { transition, type ApprovalCommand } from './domain';
import {
  demoUsers,
  emptyApprovalState,
  type ApprovalState,
  type ApprovalUser,
  type ReviewItem,
} from './types';

const KEY = Symbol('approval-workspace');
export function createApprovalWorkspace(store: CaseWorkspace) {
  let state = $state<ApprovalState>(emptyApprovalState());
  let actor = $state(store.isDemo ? demoUsers[0].id : '');
  let chain = $state<ApprovalUser[]>(store.isDemo ? demoUsers.slice(1) : []);
  let canPrepare = $state(store.isDemo);
  let dailyRate = $state<number | null>(null);
  let error = $state('');
  let busy = $state(false);
  let loaded = $state(store.isDemo);
  let idle: Promise<void> = Promise.resolve();
  let restoreItem = $state<ReviewItem | null>(null);
  const endpoint = `/api/cases/${encodeURIComponent(store.sak.sak_id)}/approvals`;
  const headers: Record<string, string> = store.isDemo ? {} : { 'X-Project-ID': store.projectId };
  const claims = () =>
    Object.fromEntries(
      (['grunnlag', 'vederlag', 'frist'] as SporType[]).map((track) => [track, claimId(track)])
    );
  function claimId(track: SporType) {
    const teEvents = store.timeline.filter((e) => e.spor === track && e.actorrole === 'TE');
    return (
      teEvents.at(-1)?.id ??
      submissionRefs(store.timeline, track).claimId ??
      `demo-${track}-${store.sak[track].antall_versjoner}`
    );
  }
  const effectiveGrunnlag = $derived.by(() => {
    const ready = [...state.items]
      .reverse()
      .find(
        (i) =>
          i.track === 'grunnlag' &&
          i.owner === actor &&
          ['ferdigstilt', 'til_godkjenning'].includes(i.status)
      );
    if (!ready) return store.sak.grunnlag;
    return {
      ...store.sak.grunnlag,
      bh_resultat: ready.data.resultat as typeof store.sak.grunnlag.bh_resultat,
      grunnlag_varslet_i_tide: ready.data.grunnlag_varslet_i_tide as boolean | undefined,
    };
  });
  const effectiveCase = $derived({ ...store.sak, grunnlag: effectiveGrunnlag });
  let editClaim: { track: SporType; id: string } | null = null;
  function accept(result: {
    state: ApprovalState;
    actor: string;
    chain: ApprovalUser[];
    canPrepare: boolean;
    dailyRate?: number | null;
  }) {
    state = result.state;
    actor = result.actor;
    chain = result.chain;
    canPrepare = result.canPrepare;
    dailyRate = result.dailyRate ?? null;
    loaded = true;
  }
  async function load() {
    if (store.isDemo) return;
    try {
      accept(await apiFetch(endpoint, { headers }));
      error = '';
    } catch (cause) {
      error = cause instanceof Error ? cause.message : 'Kunne ikke hente godkjenninger.';
    }
  }
  async function command(command: ApprovalCommand) {
    const previous = idle;
    let finish!: () => void;
    idle = new Promise<void>((resolve) => {
      finish = resolve;
    });
    await previous;
    busy = true;
    error = '';
    try {
      if (store.isDemo) state = transition($state.snapshot(state), command, actor, chain, claims());
      else
        accept(
          await apiFetch(endpoint, {
            method: 'POST',
            headers,
            body: JSON.stringify({
              ...command,
              expectedVersion: state.version,
              commandId: crypto.randomUUID(),
            }),
          })
        );
      if (command.action === 'publish') {
        const p = state.packages.find((p) => p.id === command.packageId);
        if (p?.status === 'sendt') {
          if (store.isDemo) store.applyApprovedItems(p.letter.items, p.id, p.letter);
          else await store.refresh();
        }
      }
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 409) await load();
      error = cause instanceof Error ? cause.message : 'Handlingen kunne ikke fullføres.';
      throw cause;
    } finally {
      busy = false;
      finish();
    }
  }
  return {
    get state() {
      return state;
    },
    get actor() {
      return actor;
    },
    get chain() {
      return chain;
    },
    get canPrepare() {
      return canPrepare;
    },
    get dailyRate() {
      return dailyRate;
    },
    get error() {
      return error;
    },
    get busy() {
      return busy;
    },
    get loaded() {
      return loaded;
    },
    load,
    command,
    claimId,
    get vederlagConfig() {
      return deriveVederlagDomainConfig(effectiveCase);
    },
    get fristConfig() {
      return deriveFristDomainConfig(effectiveCase);
    },
    beginEdit(track: SporType) {
      if (editClaim?.track !== track) editClaim = { track, id: claimId(track) };
    },
    endEdit() {
      editClaim = null;
    },
    outdated(items: ReviewItem[]) {
      const includedGround = items.find((i) => i.track === 'grunnlag');
      const result = includedGround ? includedGround.data.resultat : store.sak.grunnlag.bh_resultat;
      const timely = includedGround
        ? includedGround.data.grunnlag_varslet_i_tide
        : store.sak.grunnlag.grunnlag_varslet_i_tide;
      return items.some(
        (i) =>
          i.claimId !== claimId(i.track) ||
          (i.track !== 'grunnlag' &&
            i.basis &&
            (i.basis.claimId !== claimId('grunnlag') ||
              i.basis.resultat !== (result ?? null) ||
              i.basis.varsletITide !== (timely ?? null)))
      );
    },
    setActor(id: string) {
      if (store.isDemo) {
        actor = id;
        canPrepare = id === demoUsers[0].id;
      }
    },
    restored(track: SporType) {
      return restoreItem?.track === track
        ? restoreItem
        : [...state.items]
            .reverse()
            .find((i) => i.track === track && i.owner === actor && i.status === 'kladd');
    },
    async revise(item: ReviewItem) {
      if (item.owner !== actor) throw new Error('Vurderingen tilhører en annen saksbehandler.');
      if (item.status === 'ferdigstilt') await command({ action: 'revise', itemId: item.id });
      const draft =
        [...state.items]
          .reverse()
          .find((i) => i.previousId === item.id && i.owner === actor && i.status === 'kladd') ??
        item;
      restoreItem = structuredClone($state.snapshot(draft));
    },
    async prepare(
      track: SporType,
      eventType: EventType,
      data: Record<string, unknown>,
      form: Record<string, unknown>
    ) {
      if (!loaded) await load();
      if (!canPrepare)
        throw new Error(error || 'Du har ikke tilgang til å ferdigstille vurderinger.');
      const source =
        restoreItem ??
        [...state.items]
          .reverse()
          .find((i) => i.track === track && i.owner === actor && i.status === 'kladd');
      await command({
        action: 'prepare',
        item: {
          id: crypto.randomUUID(),
          track,
          eventType,
          data: JSON.parse(JSON.stringify(data)),
          form: JSON.parse(JSON.stringify(form)),
          claimId: editClaim?.track === track ? editClaim.id : claimId(track),
          claimVersion: store.sak[track].antall_versjoner,
          basis: {
            claimId: claimId('grunnlag'),
            resultat: effectiveGrunnlag.bh_resultat ?? null,
            varsletITide: effectiveGrunnlag.grunnlag_varslet_i_tide ?? null,
            hovedkategori: effectiveGrunnlag.hovedkategori ?? null,
          },
          status: 'ferdigstilt',
          owner: actor,
          createdAt: new SvelteDate().toISOString(),
          previousId: source?.previousId ?? source?.id,
        },
      });
      restoreItem = null;
    },
  };
}
export type ApprovalWorkspace = ReturnType<typeof createApprovalWorkspace>;
export const setApprovalWorkspace = (workspace: ApprovalWorkspace) => setContext(KEY, workspace);
export const getApprovalWorkspace = () => getContext<ApprovalWorkspace | undefined>(KEY);
