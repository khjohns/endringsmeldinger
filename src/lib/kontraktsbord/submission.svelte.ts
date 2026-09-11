import { LetterCancelled } from '$lib/approval/claimReview.svelte';
import type { TimelineEvent, SporType } from '$lib/types/timeline';
import { onMount } from 'svelte';
import { draftKey, loadDraft, saveDraft, clearDraft } from '$lib/utils/draft';

/** Resolve claims explicitly: a track's siste_event_id may point to a BH response. */
export function submissionRefs(timeline: TimelineEvent[], spor: SporType) {
  timeline = [...timeline].sort(
    (a, b) => (Date.parse(a.time ?? '') || 0) - (Date.parse(b.time ?? '') || 0)
  );
  const claimTypes =
    spor === 'grunnlag'
      ? ['grunnlag_opprettet', 'grunnlag_oppdatert']
      : [`${spor}_krav_sendt`, `${spor}_krav_oppdatert`, `${spor}_krav_spesifisert`];
  const matches = (event: TimelineEvent, names: string[]) =>
    names.some((name) => event.type === name || event.type.endsWith(`.${name}`));
  const claimIndex = timeline.findLastIndex(
    (event) =>
      matches(event, claimTypes) &&
      !(
        spor === 'vederlag' &&
        event.data &&
        'varsel_type' in event.data &&
        event.data.varsel_type === 'varsel'
      )
  );
  const responseIndex = timeline.findLastIndex((event) =>
    matches(event, [`respons_${spor}`, `respons_${spor}_oppdatert`])
  );
  const response =
    responseIndex > claimIndex
      ? {
          ...timeline[responseIndex],
          // Response revisions can be partial; restore all fields of this claim's response.
          data: Object.assign(
            {},
            ...timeline
              .slice(claimIndex + 1, responseIndex + 1)
              .filter((event) => matches(event, [`respons_${spor}`, `respons_${spor}_oppdatert`]))
              .map((event) => event.data)
          ),
        }
      : undefined;
  return {
    claimId: claimIndex >= 0 ? timeline[claimIndex].id : undefined,
    responseId: responseIndex > claimIndex ? timeline[responseIndex].id : undefined,
    response,
  };
}

export function requireEventId(id: string | undefined): string {
  if (!id) throw new Error('Fant ikke innsendt krav i sakshistorikken. Last saken på nytt.');
  return id;
}

/** Keep failed submissions open, and ignore repeated clicks while saving. */
export function createSubmission(onSuccess?: () => void) {
  let pending = $state(false);
  let error = $state<string | null>(null);
  return {
    get pending() {
      return pending;
    },
    get error() {
      return error;
    },
    async run(action: () => void | Promise<void>, complete: () => void = () => {}) {
      if (pending) return;
      pending = true;
      error = null;
      try {
        await action();
        onSuccess?.();
        complete();
      } catch (cause) {
        if (cause instanceof LetterCancelled) return;
        error = cause instanceof Error ? cause.message : 'Kunne ikke sende. Prøv igjen.';
      } finally {
        pending = false;
      }
    },
  };
}

export function createFormDraft<T extends Record<string, unknown>>(
  enabled: boolean,
  key: string,
  read: () => T,
  restore: (data: T) => void,
  initial?: Record<string, unknown>
) {
  let ready = $state(!enabled);
  let cleared = false;
  const storageKey = draftKey('kontraktsbord', key);
  onMount(() => {
    if (initial) {
      restore(initial as T);
      ready = true;
      return;
    }
    if (enabled) {
      const saved = loadDraft<T>(storageKey);
      if (saved) restore(saved);
      ready = true;
    }
  });
  $effect(() => {
    if (enabled && ready && !cleared) saveDraft(storageKey, read());
  });
  return {
    get ready() {
      return ready;
    },
    snapshot() {
      return JSON.parse(JSON.stringify(read())) as Record<string, unknown>;
    },
    clear() {
      cleared = true;
      if (enabled) clearDraft(storageKey);
    },
  };
}
