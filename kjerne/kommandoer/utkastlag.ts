/**
 * Lagene i svarutkastet slik brevet regner dem, felles for sporene med lag i utkastet (#1400,
 * #1778, M-8 i BF-20). Står for seg selv så `kommandoer/lag.ts` kan slå opp i sporene uten at
 * sporene importerer den tilbake.
 */

import { etikett, laget, type Svarinnhold } from '../frosset/byggeklosser.ts';
import { innsigelserSvaretLesesMed, virkninger } from '../frosset/standpunkt.ts';
import { UgyldigVurdering } from '../regler/feil.ts';
import type { Regelsett } from '../regler/regelsett.ts';
import { grunnerFraForholdet } from '../spor/forhold/frysing.ts';
import { standpunkteneTilVarslene } from '../spor/vederlag/utledning.ts';
import type { SpoersmaalIUtkastet } from '../spor/poster/kommando.ts';
import {
  avvis,
  type Avvisning,
  type Standpunkt,
  type Standpunktsvirkning,
  type Virkning,
} from '../typer.ts';
import {
  kravversjonenPaaDagen,
  svaretPaaForholdetPaaDagen,
  type Utledning,
} from '../utledning/utled.ts';

/**
 * Lagene i svarutkastet i et spor, regnet som brevet regner dem (OV-U32, OV-U33, S1-A i #1400).
 * Grunnene fra svaret på forholdet står foran sporet, og `virkning`, `lag` og `etikett` for hvert
 * standpunkt er flyttet ned med dem. `sendt` er dagen et svar lagt til ble sendt, og `null` for et
 * svar fra løsningen. Svaret på forholdet og påberopelsen er de som gjaldt den dagen, som når svaret
 * fryses og kontrolleres (#2057, #2011). Svaret leses med innsigelsene fra svarene før som det
 * ikke sier noe om, som når det fryses (VS-U81), mot det gjeldende kravet i sporet.
 */
export function lageneIUtkastet(
  svar: Svarinnhold,
  u: Utledning,
  regler: Regelsett,
  sendt: string | null
) {
  const g = svaretPaaForholdetPaaDagen(u, sendt);
  const grunner = g ? grunnerFraForholdet(g, g.beslutningsgrunnlag.virkninger) : [];
  const staar = innsigelserSvaretLesesMed(
    svar,
    u.spor[svar.spor].gjeldendeKrav,
    svar.spor === 'vederlag' ? standpunkteneTilVarslene(u, sendt, true) : []
  );
  const virket: Standpunktsvirkning[] = virkninger(
    svar,
    kravversjonenPaaDagen(u, 'forhold', sendt),
    regler,
    grunner.length,
    staar
  );
  const virkning = virket.map(
    ({ virkning: vi }): Virkning => (typeof vi === 'number' ? vi + grunner.length : vi)
  );
  const lag = virkning.map((vi) => laget(vi));
  const flereLag = lag.some((l) => l !== null && l > 1);
  return {
    grunner,
    virkning,
    lag,
    etikett: lag.map((l) => (l !== null && flereLag ? etikett(l) : null)),
  };
}

/**
 * Forutsetningene for hvert standpunkt i skjemaets form (OV-U32): grunnene fra forholdet, og det
 * hvert standpunkt i et tidligere lag rammer standpunktet med, etter sporets `rammer`. Brevet har
 * bare laget rett foran (`svarlagene.ts` i visningen). Et standpunkt uten lag har ingen.
 */
export function forutsetningene<F>(
  standpunkter: readonly Standpunkt[],
  lag: readonly (number | null)[],
  grunner: readonly F[],
  rammer: (s: Standpunkt, t: Standpunkt) => F | null
): F[][] {
  return standpunkter.map((t, i) => {
    const l = lag[i]!;
    if (l === null) return [];
    return [
      ...grunner,
      ...standpunkter.flatMap((s, j) => {
        const lj = lag[j]!;
        const f = lj !== null && lj < l ? rammer(s, t) : null;
        return f === null ? [] : [f];
      }),
    ];
  });
}

/**
 * Feltene kontrollen `kontroller` avviser med `UgyldigVurdering`, med grunnen, eller ingen når
 * den godtar svaret. Lagene i et svarutkast leser `ugyldig` av de samme kontrollene som svaret
 * når det sendes (#2156).
 */
export function avvisteFelt(kontroller: () => unknown): Record<string, string> {
  try {
    kontroller();
    return {};
  } catch (e) {
    if (!(e instanceof UgyldigVurdering)) throw e;
    return e.feil;
  }
}

/** Avvisningen av vurderingene med feltene `feil` (`avvisteFelt`), eller `null` uten feil. */
export function avvisteVurderinger(feil: Record<string, string>): Avvisning | null {
  const grunner = Object.entries(feil).map(([felt, grunn]) => `${felt}: ${grunn}`);
  return grunner.length
    ? avvis('UGYLDIG_VURDERING', `Vurderingene kan ikke godtas: ${grunner.join('; ')}.`)
    : null;
}

/**
 * Spørsmålene i `liste` som ikke står i `unntatt` med samme felt og post eller frist, hvert én
 * gang.
 */
export const utenom = <S extends string>(
  liste: SpoersmaalIUtkastet<S>[],
  unntatt: SpoersmaalIUtkastet<S>[]
): SpoersmaalIUtkastet<S>[] =>
  liste.filter((x, i) => {
    const samme = (y: SpoersmaalIUtkastet<S>) =>
      y.spoersmaal === x.spoersmaal && y.gjelder === x.gjelder;
    return !unntatt.some(samme) && liste.findIndex(samme) === i;
  });
