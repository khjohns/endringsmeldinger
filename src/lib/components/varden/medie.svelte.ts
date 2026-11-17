/**
 * Om vinduet treffer medieuttrykket, og oppdatert når det endres. Kalles mens komponenten
 * initialiseres. Uten `matchMedia`, som i testene, og når `aktiv` er usann, er `treff` usann.
 */
export function medietreff(uttrykk: string, aktiv: () => boolean = () => true): { treff: boolean } {
  const kan = typeof matchMedia === 'function';
  // Første tegning bruker vinduet slik det er, så oppsettet ikke skifter etter monteringen.
  const tilstand = $state({ treff: kan && aktiv() && matchMedia(uttrykk).matches });
  $effect(() => {
    if (!kan || !aktiv()) {
      tilstand.treff = false;
      return;
    }
    const mq = matchMedia(uttrykk);
    tilstand.treff = mq.matches;
    const endret = () => (tilstand.treff = mq.matches);
    mq.addEventListener('change', endret);
    return () => mq.removeEventListener('change', endret);
  });
  return tilstand;
}

/** Under denne bredden står høyre kolonne under arbeidet, og brevet leses i skjemaet (#1391). */
export const SMAL = '(max-width: 1180px)';

/**
 * Brevet leses ved siden av skjemaet når parten `leser` og vinduet er bredere enn `SMAL`, og i
 * skjemaet ellers (oppdragsgiver 29.10, #1391). `onvedsiden` får beskjed, så kalleren kan felle
 * inn panelet. Kalles mens komponenten initialiseres.
 */
export function brevetVedSiden(
  onvedsiden: () => ((vedSiden: boolean) => void) | undefined,
  leser: () => boolean
): { readonly smal: boolean; readonly vedSiden: boolean } {
  const vindu = medietreff(SMAL);
  const vedSiden = $derived(leser() && !vindu.treff);
  $effect(() => {
    onvedsiden()?.(vedSiden);
    return () => onvedsiden()?.(false);
  });
  return {
    get smal() {
      return vindu.treff;
    },
    get vedSiden() {
      return vedSiden;
    },
  };
}
