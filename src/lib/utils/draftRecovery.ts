/** Gjenoppretting i samme fane. Serveren er fortsatt teamets felles lager. */
import { browser } from '$app/environment';
import { draftOwner } from './draftOwner';

export interface RecoverySnapshot<T> {
  innhold: T;
  forventetVersjon: number | null;
  grunnlagJson: string | null;
}

/** Opprettes bare etter at serveren har bekreftet tilgang til et entydig team. */
export function createDraftRecovery<T extends Record<string, unknown>>(
  eier: string | null,
  scope: readonly (string | number)[]
) {
  const key = `koe-recovery-v1:${JSON.stringify([eier, ...scope])}`;
  const tillatt = () => browser && !!eier && draftOwner() === eier;
  return {
    load(): RecoverySnapshot<T> | null {
      if (!tillatt()) return null;
      try {
        const raw = sessionStorage.getItem(key);
        if (!raw) return null;
        const data = JSON.parse(raw);
        if (
          !data ||
          !data.innhold ||
          typeof data.innhold !== 'object' ||
          Array.isArray(data.innhold) ||
          !(
            data.forventetVersjon === null ||
            (Number.isSafeInteger(data.forventetVersjon) && data.forventetVersjon > 0)
          ) ||
          !(data.grunnlagJson === null || typeof data.grunnlagJson === 'string')
        )
          return null;
        return data;
      } catch {
        return null;
      }
    },
    save(data: RecoverySnapshot<T>) {
      if (!tillatt()) return;
      try {
        sessionStorage.setItem(key, JSON.stringify(data));
      } catch {
        // Nettleseren kan ha sperret lagring. Serverlagringen fortsetter.
      }
    },
    clear() {
      if (!tillatt()) return;
      try {
        sessionStorage.removeItem(key);
      } catch {
        // En lokal lagringsfeil skal ikke gjøre en sendt hendelse usendt.
      }
    },
  };
}
