/**
 * Lagene i et svarutkast i hvert spor (`Utkastlag`, #1400, #1778). Vederlaget og fristen (M-8 i
 * BF-20) har dem, og forholdet har ingen lag i utkastet.
 */

import { etikett, iSporet, laget, type Svarinnhold } from '../frosset/byggeklosser.ts';
import { virkninger } from '../frosset/standpunkt.ts';
import { grunnerFraForholdet } from '../spor/forhold/frysing.ts';
import type { Regelsett } from '../regler/regelsett.ts';
import { lagIFristen, type LagIFristen } from '../spor/frist/kommando.ts';
import { lagIVederlaget, type LagIVederlaget } from '../spor/vederlag/kommando.ts';
import type { Spor, Standpunktsvirkning, Virkning } from '../typer.ts';
import { paaberopelseFor, type Utledning } from '../utledning/utled.ts';
import type { Svarutkast } from './kommando.ts';

/** Lagene i et svarutkast i ett spor, med sporets egen type for lagene (`Utkastlag`). */
export type Sporslag<L> = (utkast: Svarutkast, u: Utledning, regler: Regelsett) => L;

const LAG: Record<Spor, Sporslag<LagIVederlaget | LagIFristen> | null> = {
  forhold: null,
  vederlag: lagIVederlaget,
  frist: lagIFristen,
};

/** Lagene i svarutkastet, med sporets type. Kaster for forholdet, som ikke har lag i utkastet. */
export function lagForUtkastet(
  utkast: Svarutkast & { spor: 'vederlag' },
  u: Utledning,
  regler: Regelsett
): LagIVederlaget;
export function lagForUtkastet(
  utkast: Svarutkast & { spor: 'frist' },
  u: Utledning,
  regler: Regelsett
): LagIFristen;
export function lagForUtkastet(
  utkast: Svarutkast,
  u: Utledning,
  regler: Regelsett
): LagIVederlaget | LagIFristen;
export function lagForUtkastet(
  utkast: Svarutkast,
  u: Utledning,
  regler: Regelsett
): LagIVederlaget | LagIFristen {
  const lag = iSporet(LAG, utkast.spor);
  if (!lag) throw new Error(`Forholdet har ingen lag i svarutkastet (${utkast.spor})`);
  return lag(utkast, u, regler);
}

/**
 * Lagene i svarutkastet i et spor, regnet som brevet regner dem (OV-U32, OV-U33, S1-A i #1400).
 * Grunnene fra gjeldende svar på forholdet står foran sporet, og `virkning`, `lag` og `etikett`
 * for hvert standpunkt er flyttet ned med dem. `virket` er virkningene i sporet uten forskyvning.
 */
export function lageneIUtkastet(
  svar: Svarinnhold,
  utkast: Svarutkast,
  u: Utledning,
  regler: Regelsett
) {
  const g = u.spor.forhold.gjeldendeSvar;
  const grunner = g ? grunnerFraForholdet(g, g.beslutningsgrunnlag.virkninger) : [];
  const virket: Standpunktsvirkning[] = virkninger(
    svar,
    paaberopelseFor(utkast, u),
    regler,
    grunner.length
  );
  const virkning = virket.map(
    ({ virkning: vi }): Virkning => (typeof vi === 'number' ? vi + grunner.length : vi)
  );
  const lag = virkning.map((vi) => laget(vi));
  const flereLag = lag.some((l) => l !== null && l > 1);
  return {
    grunner,
    virket,
    virkning,
    lag,
    etikett: lag.map((l) => (l !== null && flereLag ? etikett(l) : null)),
  };
}
