import { SvelteDate } from 'svelte/reactivity';
import { getContext, setContext } from 'svelte';
import type { BrevInnhold } from '$lib/components/kontraktsbord/letterTypes';
import { buildLetterContent } from '$lib/components/kontraktsbord/letterContentBuilder';
import type { CaseWorkspace } from '$lib/kontraktsbord/context.svelte';
import type { EventType, SporType, TimelineEvent } from '$lib/types/timeline';
import { hentVedlegg } from '$lib/api/vedlegg';
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
export function createClaimReview(store: CaseWorkspace) {
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
      demoSend: () => void,
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
        } as TimelineEvent,
        store.sak
      );
      if (!store.isDemo && snapshot.vedlegg_ids?.length) {
        const { vedlegg } = await hentVedlegg(store.sak.sak_id);
        const names = snapshot.vedlegg_ids.map((id: string) => {
          const entry = vedlegg.find((v) => v.id === id);
          if (!entry)
            throw new Error('Et valgt vedlegg er ikke tilgjengelig. Kontroller vedleggsvalget.');
          return entry.navn;
        });
        const text = `\n\nVedlegg\n${names.join('\n')}`;
        letter.seksjoner.begrunnelse.originalTekst += text;
        letter.seksjoner.begrunnelse.redigertTekst += text;
      }
      const approved = await confirmation.show(letter);
      if (store.isDemo) {
        const previousCount = store.timeline.length;
        demoSend();
        store.recordClaimLetter(track, type, snapshot, approved, previousCount, actorrole);
      } else await store.submit(type, { ...snapshot, brev: approved });
    },
  };
}
export type ClaimReview = ReturnType<typeof createClaimReview>;
/** Skjemaene kaller bare `submit`. En TS-sak har sin egen kontroll (#718). */
type Skjemakontroll = Pick<ClaimReview, 'submit'>;
export const setClaimReview = <T extends Skjemakontroll>(review: T) => setContext(KEY, review);
export const getClaimReview = () => getContext<Skjemakontroll | undefined>(KEY);
