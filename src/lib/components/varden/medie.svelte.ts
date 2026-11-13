/**
 * Om vinduet treffer medieuttrykket, og oppdatert når det endres. Kalles mens komponenten
 * initialiseres. Uten `matchMedia`, som i testene, er `treff` usann.
 */
export function medietreff(uttrykk: string, aktiv: () => boolean = () => true): { treff: boolean } {
  const tilstand = $state({ treff: false });
  $effect(() => {
    if (!aktiv() || typeof matchMedia !== 'function') return;
    const mq = matchMedia(uttrykk);
    tilstand.treff = mq.matches;
    const endret = () => (tilstand.treff = mq.matches);
    mq.addEventListener('change', endret);
    return () => mq.removeEventListener('change', endret);
  });
  return tilstand;
}
