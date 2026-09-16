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
export function createLetterConfirmation() {
  let letter = $state<BrevInnhold | null>(null);
  let resolve: ((letter: BrevInnhold) => void) | undefined;
  let reject: ((error: Error) => void) | undefined;
  return {
    get letter() {
      return letter;
    },
    show(value: BrevInnhold) {
      letter = value;
      return new Promise<BrevInnhold>((ok, cancel) => {
        resolve = ok;
        reject = cancel;
      });
    },
    confirm() {
      if (letter) {
        const snapshot = $state.snapshot(letter);
        letter = null;
        resolve?.(snapshot);
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
export type LetterConfirmation = ReturnType<typeof createLetterConfirmation>;
export function createClaimReview(store: CaseWorkspace) {
  const confirmation = createLetterConfirmation();
  return {
    get letter() {
      return confirmation.letter;
    },
    confirm: confirmation.confirm,
    cancel: confirmation.cancel,
    async submit(track: SporType, type: EventType, data: object, demoSend: () => void) {
      const snapshot = JSON.parse(JSON.stringify(data));
      const letter = buildLetterContent(
        {
          specversion: '1.0',
          source: '/case',
          id: 'utkast',
          type,
          actorrole: 'TE',
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
        store.recordClaimLetter(track, type, snapshot, approved, previousCount);
      } else await store.submit(type, { ...snapshot, brev: approved });
    },
  };
}
export type ClaimReview = ReturnType<typeof createClaimReview>;
export const setClaimReview = (review: ClaimReview) => setContext(KEY, review);
export const getClaimReview = () => getContext<ClaimReview | undefined>(KEY);
