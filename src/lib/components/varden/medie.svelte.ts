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
