/**
 * Lagene i svarutkastet gir forutsetningene for spørsmålene i skjemaet (#1400, #1778).
 * For forholdet står bestillingen i M-2 i BF-08, og for fristen i M-8 i BF-20.
 */

import { iSporet } from '../frosset/byggeklosser.ts';
import type { Regelsett } from '../regler/regelsett.ts';
import { lagIForholdet, type LagIForholdet } from '../spor/forhold/kommando.ts';
import { lagIFristen, type LagIFristen } from '../spor/frist/kommando.ts';
import { lagIVederlaget, type LagIVederlaget } from '../spor/vederlag/kommando.ts';
import type { Spor } from '../typer.ts';
import type { Utledning } from '../utledning/utled.ts';
import type { Svarutkast } from './kommando.ts';

/**
 * Lagene i et svarutkast i ett spor, med sporets egen type for lagene (`Utkastlag`). `sendt` er
 * dagen et svar lagt til ble sendt, og `null` for et svar fra løsningen. Bare lagene fra forholdet
 * leses på dagen (`lageneIUtkastet`); utkastet gjelder den gjeldende kravversjonen i sporet. Et
 * svar lagt til på en eldre kravversjon har ingen forhåndsvisning ennå (#807).
 */
export type Sporslag<L> = (
  utkast: Svarutkast,
  u: Utledning,
  regler: Regelsett,
  sendt: string | null
) => L;

const LAG: Record<Spor, Sporslag<LagIForholdet | LagIVederlaget | LagIFristen>> = {
  forhold: lagIForholdet,
  vederlag: lagIVederlaget,
  frist: lagIFristen,
};

/** Lagene i svarutkastet, med sporets type. */
export function lagForUtkastet(
  utkast: Svarutkast & { spor: 'vederlag' },
  u: Utledning,
  regler: Regelsett,
  sendt?: string | null
): LagIVederlaget;
export function lagForUtkastet(
  utkast: Svarutkast & { spor: 'frist' },
  u: Utledning,
  regler: Regelsett,
  sendt?: string | null
): LagIFristen;
export function lagForUtkastet(
  utkast: Svarutkast & { spor: 'forhold' },
  u: Utledning,
  regler: Regelsett,
  sendt?: string | null
): LagIForholdet;
export function lagForUtkastet(
  utkast: Svarutkast,
  u: Utledning,
  regler: Regelsett,
  sendt?: string | null
): LagIForholdet | LagIVederlaget | LagIFristen;
export function lagForUtkastet(
  utkast: Svarutkast,
  u: Utledning,
  regler: Regelsett,
  sendt: string | null = null
): LagIForholdet | LagIVederlaget | LagIFristen {
  const lag = iSporet(LAG, utkast.spor);
  return lag(utkast, u, regler, sendt);
}
