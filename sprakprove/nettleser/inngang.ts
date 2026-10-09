/**
 * Bevis-sakene i flyten kjørt med TS-kjernen i nettleseren (#274, P2-1). Samme
 * kjører og samme kjerne som serveren bruker, bygget med Vite. Tilstanden etter
 * hvert steg, uten kjøringens egne ID-er, legges i `window.resultat`;
 * `sammenlikn.ts` holder den mot Node-serveren.
 */

import { FLYTEN, kjor, minnebane, normalisert } from '../tester/korpus.ts';

export interface Steg {
  steg: number;
  godtatt: boolean | null;
  tilstand: unknown;
}

export interface Resultat {
  forlop: Record<string, Steg[]>;
  feil: Record<string, string>;
  nettleser: string;
}

const resultat: Resultat = { forlop: {}, feil: {}, nettleser: navigator.userAgent };
for (const forlop of FLYTEN) {
  const bane = minnebane();
  const opptak: Steg[] = [];
  try {
    await kjor(forlop, bane, {
      etterSteg: (steg, utfall) =>
        opptak.push({ steg, godtatt: utfall?.godtatt ?? null, tilstand: normalisert(bane) }),
    });
  } catch (feil) {
    resultat.feil[forlop.id] = String(feil);
  }
  resultat.forlop[forlop.id] = opptak;
}
(window as unknown as { resultat: Resultat }).resultat = resultat;
document.getElementById('status')!.textContent =
  `${Object.keys(resultat.forlop).length} forløp, ${Object.keys(resultat.feil).length} feil`;
