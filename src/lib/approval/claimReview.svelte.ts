import { SvelteDate } from 'svelte/reactivity';
import { getContext, setContext } from 'svelte';
import type { BrevInnhold } from '$lib/components/kontraktsbord/letterTypes';
import { buildLetterContent } from '$lib/components/kontraktsbord/letterContentBuilder';
import type { DemoCaseWorkspace } from '$lib/mockup/store.svelte';
import type { EventType, SporType, TimelineEvent } from '$lib/types/timeline';
const KEY = Symbol('claim-letter');
export class LetterCancelled extends Error {
  constructor() {
    super('Brevkontroll avbrutt');
  }
}
export function createLetterConfirmation<T = BrevInnhold>() {
  let letter = $state<T | null>(null);
  let resolve: ((letter: T) => void) | undefined;
  let reject: ((error: Error) => void) | undefined;
  return {
    get letter() {
      return letter;
    },
    show(value: T) {
      letter = value;
      return new Promise<T>((ok, cancel) => {
        resolve = ok;
        reject = cancel;
      });
    },
    confirm() {
      if (letter) {
        const snapshot = $state.snapshot(letter);
        letter = null;
        resolve?.(snapshot as T);
        resolve = undefined;
        reject = undefined;
      }
    },
    cancel() {
      letter = null;
      reject?.(new LetterCancelled());
      resolve = undefined;
      reject = undefined;
    },
  };
}
export type LetterConfirmation<T = BrevInnhold> = ReturnType<typeof createLetterConfirmation<T>>;
export function createClaimReview(store: DemoCaseWorkspace) {
  const confirmation = createLetterConfirmation();
  return {
    get letter() {
      return confirmation.letter;
    },
    confirm: confirmation.confirm,
    cancel: confirmation.cancel,
    async submit(
      track: SporType,
      type: EventType,
      data: object,
      demoSend: (demo: DemoCaseWorkspace) => void,
      actorrole: 'TE' | 'BH' = 'TE'
    ) {
      const snapshot = JSON.parse(JSON.stringify(data));
      const letter = buildLetterContent(
        {
          specversion: '1.0',
          source: '/case',
          id: 'utkast',
          type,
          actorrole,
          time: new SvelteDate().toISOString(),
          spor: track,
          data: snapshot,
        } as TimelineEvent & { spor: SporType },
        store.sak
      );
      const approved = await confirmation.show(letter);
      const previousCount = store.timeline.length;
      demoSend(store);
      store.recordClaimLetter(track, type, snapshot, approved, previousCount, actorrole);
    },
  };
}
export type ClaimReview = ReturnType<typeof createClaimReview>;
/** Skjemaene kaller bare `submit`. En TS-sak har sin egen kontroll (#718). */
type Skjemakontroll = Pick<ClaimReview, 'submit'>;
export const setClaimReview = <T extends Skjemakontroll>(review: T) => setContext(KEY, review);
export const getClaimReview = () => getContext<Skjemakontroll | undefined>(KEY);
