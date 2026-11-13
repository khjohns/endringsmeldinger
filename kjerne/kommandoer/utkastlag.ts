/**
 * Lagene i svarutkastet slik brevet regner dem, felles for sporene med lag i utkastet (#1400,
 * #1778, M-8 i BF-20). Står for seg selv så `kommandoer/lag.ts` kan slå opp i sporene uten at
 * sporene importerer den tilbake.
 */

import { etikett, laget, type Svarinnhold } from '../frosset/byggeklosser.ts';
import { virkninger } from '../frosset/standpunkt.ts';
import type { Regelsett } from '../regler/regelsett.ts';
import { grunnerFraForholdet } from '../spor/forhold/frysing.ts';
import type { Standpunktsvirkning, Virkning } from '../typer.ts';
import { paaberopelseFor, type Utledning } from '../utledning/utled.ts';
import type { Svarutkast } from './kommando.ts';

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
