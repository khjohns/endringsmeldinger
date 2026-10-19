import { erUsikkertUtfall } from '$lib/api/kjerne';

/** Meldingen etter et usikkert utfall, med hva som kan være lagret og hvorfor et nytt forsøk er trygt. */
export const usikkertUtfall = (hva: string, trygt: string) =>
  `Det er usikkert om ${hva}. Prøv igjen: ${trygt}.`;

export type Forsoeksutfall<F, T> =
  | { lagret: true; svar: T }
  | { lagret: false; feil: unknown; ventende: F | null };

/**
 * Sender forsøket. Ved et usikkert utfall er forsøket ventende, og et nytt forsøk sender
 * det uendret, med samme kommando-ID (#418). Ved en annen feil er ingenting ventende.
 */
export async function sendForsoek<F, T>(
  forsoek: F,
  send: (forsoek: F) => Promise<T>
): Promise<Forsoeksutfall<F, T>> {
  try {
    return { lagret: true, svar: await send(forsoek) };
  } catch (feil) {
    return { lagret: false, feil, ventende: erUsikkertUtfall(feil) ? forsoek : null };
  }
}
