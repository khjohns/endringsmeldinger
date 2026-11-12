/**
 * Lagene i et svarutkast i hvert spor (`Utkastlag`, #1400, #1778). Vederlaget har dem. Fristen
 * får dem med #1745 (M-8 i BF-20), og forholdet har ingen lag i utkastet.
 */

import { iSporet } from '../frosset/byggeklosser.ts';
import type { Regelsett } from '../regler/regelsett.ts';
import type { Utkastlag } from '../spor/poster/kommando.ts';
import { lagIVederlaget, type Forutsetning } from '../spor/vederlag/kommando.ts';
import type { Spor } from '../typer.ts';
import type { Utledning } from '../utledning/utled.ts';
import type { Svarutkast } from './kommando.ts';

/** Lagene i et svarutkast i ett spor. */
export type Sporslag = (
  utkast: Svarutkast,
  u: Utledning,
  regler: Regelsett
) => Utkastlag<Forutsetning>;

const LAG: Record<Spor, Sporslag | null> = {
  forhold: null,
  vederlag: lagIVederlaget,
  frist: null,
};

/** Lagene i svarutkastet. Kaster for et spor som ikke har lag i utkastet ennå. */
export function lagForUtkastet(
  utkast: Svarutkast,
  u: Utledning,
  regler: Regelsett
): Utkastlag<Forutsetning> {
  const lag = iSporet(LAG, utkast.spor);
  if (!lag) throw new Error(`lagForUtkastet gjelder vederlag, ikke ${utkast.spor}`);
  return lag(utkast, u, regler);
}
