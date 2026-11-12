/**
 * Radene per post i utregningen i svaret (#1778): én rad per post i standpunktene, og lagene i
 * hver rad. Innholdet i laget er sporets eget, og sporet kontrollerer det med `raden`.
 * Kontrollen er utledet av vederlaget (OV-U31, KA-U57 (e), OV-U32, #1774).
 */

import type { Standpunktsvirkning } from '../../typer.ts';

/** Posten et standpunkt eller en rad gjelder: posten `gjelder` i kravet, eller en særskilt post. */
export interface Postnoekkel {
  gjelder?: string;
  saerskilt?: string;
}

/** Raden for én post i utregningen, med ett element per lag. */
export interface Postrad extends Postnoekkel {
  lag: readonly { lag: number }[];
}

/**
 * Kontrollerer at utregningen har én rad per post i `poster`, i samme rekkefølge og med samme
 * post, og like mange lag i hver rad, nummerert fra 1. Antallet lag er det høyeste laget i
 * beslutningsgrunnlaget (OV-U32, #1774). `raden` kontrollerer innholdet i hver rad etter at
 * posten og lagene er kontrollert. `verdien` er ordet for standpunktet til posten, som
 * «beløpet», og `feil` lager feilen. Gir antallet lag.
 */
export function kontrollerRadene<R extends Postrad, P extends Postnoekkel>(
  rader: readonly R[],
  poster: readonly P[],
  virkninger: readonly Standpunktsvirkning[],
  verdien: string,
  feil: (hva: string) => Error,
  raden: (r: R, post: P, i: number) => void
): number {
  const antall = rader[0]?.lag.length ?? 0;
  if (rader.length !== poster.length) throw feil('radene er ikke én per post i standpunktene');
  rader.forEach((r, i) => {
    const post = poster[i]!;
    if (
      'gjelder' in r === 'saerskilt' in r ||
      r.gjelder !== post.gjelder ||
      r.saerskilt !== post.saerskilt
    )
      throw feil(`rad ${i + 1} gjelder ikke samme post som ${verdien} i standpunktene`);
    if (r.lag.length !== antall || r.lag.some((l, n) => l.lag !== n + 1))
      throw feil(`rad ${i + 1} har ikke lagene 1 til ${antall}`);
    raden(r, post, i);
  });
  // OV-U32, #1774: lagene i utregningen er lagene i beslutningsgrunnlaget.
  const lagIGrunnlaget = Math.max(
    1,
    ...virkninger.flatMap((v) => (typeof v.virkning === 'number' ? [v.virkning] : []))
  );
  if (rader.length > 0 && antall !== lagIGrunnlaget)
    throw feil(`radene har ${antall} lag, men beslutningsgrunnlaget har ${lagIGrunnlaget}`);
  return antall;
}
