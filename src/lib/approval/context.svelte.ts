import { SvelteDate } from 'svelte/reactivity';
import {
  deriveVederlagDomainConfig,
  deriveFristDomainConfig,
} from '$lib/components/kontraktsbord/derive';
import { getContext, setContext } from 'svelte';
import type { CaseWorkspace } from '$lib/kontraktsbord/context.svelte';
import { submissionRefs } from '$lib/kontraktsbord/submission.svelte';
import type { EventType, SporType } from '$lib/types/timeline';
import { forsteUnderkategori } from '$lib/domain/grunnlagDomain';
import { kravFraSak } from './authority';
import { transition, type ApprovalCommand } from './domain';
import {
  demoUsers,
  emptyApprovalState,
  type ApprovalState,
  type ApprovalUser,
  type ReviewItem,
} from './types';

const KEY = Symbol('approval-workspace');
// Byggherrens interne godkjenning finnes bare i demoen til den er bygget i TS (#818).
const IKKE_BYGGET = 'Byggherrens interne godkjenning er ikke tilgjengelig for denne saken ennå.';
export function createApprovalWorkspace(store: CaseWorkspace) {
  let state = $state<ApprovalState>(emptyApprovalState());
  let actor = $state(store.isDemo ? demoUsers[0].id : '');
  const chain: ApprovalUser[] = store.isDemo ? demoUsers.slice(1) : [];
  const sender: ApprovalUser | null = store.isDemo ? demoUsers[0] : null;
  let canPrepare = $state(store.isDemo);
  let error = $state('');
  let busy = $state(false);
  let idle: Promise<void> = Promise.resolve();
  let restoreItem = $state<ReviewItem | null>(null);
  const demoDailyRate = () => store.sak.dagmulktsats || null;
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
      if (!store.isDemo) throw new Error(IKKE_BYGGET);
      state = transition($state.snapshot(state), command, actor, chain, claims(), undefined, {
        sender: demoUsers[0],
        dailyRate: demoDailyRate(),
        krav: kravFraSak(store.sak),
      });
      if (command.action === 'publish') {
        const p = state.packages.find((p) => p.id === command.packageId);
        if (p?.status === 'sendt') store.applyApprovedItems(p.letter.items, p.id, p.letter);
      }
    } catch (cause) {
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
    /** The handler's own identity and matrix role, when the server policy defines it */
    get sender() {
      return sender;
    },
    get canPrepare() {
      return canPrepare;
    },
    get dailyRate() {
      return store.isDemo ? demoDailyRate() : null;
    },
    get error() {
      return error;
    },
    get busy() {
      return busy;
    },
    get loaded() {
      return store.isDemo;
    },
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
            underkategori: forsteUnderkategori(effectiveGrunnlag.underkategori) ?? null,
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
