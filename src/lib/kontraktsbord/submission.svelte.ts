import { orderTimeline } from '$lib/utils/timelineOrder';
import { LetterCancelled } from '$lib/approval/claimReview.svelte';
import { Feltavvisning } from '$lib/kjernesak/kontekst.svelte';
import type { TimelineEvent, SporType } from '$lib/types/timeline';
import { onMount } from 'svelte';

/** Resolve claims explicitly: a track's siste_event_id may point to a BH response. */
export function submissionRefs(timeline: TimelineEvent[], spor: SporType) {
  timeline = orderTimeline(timeline);
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
  let feltet = $state(false);
  return {
    get pending() {
      return pending;
    },
    get error() {
      return error;
    },
    /**
     * Feilen øverst i skjemaet. Gjelder den utdypningen, står den ved feltet, og øverst
     * står det at brevet ikke kan sendes ennå (MM-U32, #1264).
     */
    get oeverst() {
      return feltet ? 'Brevet kan ikke sendes ennå. Se meldingen ved begrunnelsen.' : error;
    },
    /** Feilen ved utdypningsfeltet, eller `null`. */
    get vedFeltet() {
      return feltet ? error : null;
    },
    /** Feltet er endret, så meldingen ved det er borte (docs/design/system.md). */
    feltetEndret() {
      if (feltet) error = null;
      feltet = false;
    },
    async run(action: () => void | Promise<void>, complete: () => void = () => {}) {
      if (pending) return;
      pending = true;
      error = null;
      feltet = false;
      try {
        await action();
        onSuccess?.();
        complete();
      } catch (cause) {
        if (cause instanceof LetterCancelled) return;
        error = cause instanceof Error ? cause.message : 'Kunne ikke sende. Prøv igjen.';
        feltet = cause instanceof Feltavvisning;
      } finally {
        pending = false;
      }
    },
  };
}

/** JSON-feltrekkefølge kan endres i transporten uten at teksten er endret. */
function innholdJson(data: unknown): string {
  return JSON.stringify(data, (_key, value: unknown) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return value;
    const objekt = value as Record<string, unknown>;
    return Object.fromEntries(
      Object.keys(objekt)
        .sort()
        .map((key) => [key, objekt[key]])
    );
  });
}

/**
 * Skjemaets innhold for godkjenningskladden: `initial` gjenoppretter en
 * kladd ved mount, og `snapshot()` gir innholdet med sorterte nøkler.
 */
export function createFormDraft<T extends Record<string, unknown>>(
  read: () => T,
  restore: (data: T) => void,
  initial?: Record<string, unknown>
) {
  onMount(() => {
    if (initial) restore(initial as T);
  });

  return {
    snapshot() {
      return JSON.parse(innholdJson(read())) as Record<string, unknown>;
    },
  };
}
