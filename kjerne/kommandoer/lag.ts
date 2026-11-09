/**
 * Lagene i et vederlagssvar byggherren ennå fyller ut (#1400), så skjemaet kan vise hvilke
 * innsigelser et subsidiært spørsmål bygger på, uten å avgjøre det selv. Lagene regnes som
 * brevet ville regnet dem med standpunktene som er besvart (OV-U32, OV-U33, arbeidsvalget
 * S1-A og S2-A i #1400, 30.10).
 */

import { etikett, grunnerFraForholdet, laget, virkninger } from '../frosset/standpunkt.ts';
import { kravpostvurderinger, type Svarvurdering } from '../frosset/utregning.ts';
import type { Subsidiaergrunn } from '../regler/forhold.ts';
import type { Regelsett } from '../regler/regelsett.ts';
import { standpunkterISvaret } from '../format/leser.ts';
import type { Hjemmel, Standpunktsart, Virkning } from '../typer.ts';
import { paaberopelseFor, type Utledning } from '../utledning/utled.ts';
import type { Svarutkast } from './kommando.ts';
import { standpunkter } from './standpunkter.ts';

/** En innsigelse i et foregående lag som rammer standpunktet (OV-U32). */
export type Forutsetning = { grunn: Subsidiaergrunn } | { innsigelse: '34.1.2' | '34.1.3' };

export interface Utkastlag {
  standpunkter: {
    art: Standpunktsart;
    hjemmel?: Hjemmel;
    saerskilt?: 'produktivitet';
    /** Kravposten beløpet eller oppgjørsformen gjelder (KA-U57 (c) og (d)). */
    gjelder?: string;
    /** Beløpsspørsmålet for posten er besvart. Andre standpunkter finnes bare når de er besvart (KA-U4). */
    besvart: boolean;
    /** Laget etter lagene fra forholdet, `upaavirket` eller `uten_virkning`. */
    virkning: Virkning;
    /** `null` når standpunktet ikke står i et lag, eller hele svaret har ett lag (OV-U33). */
    etikett: string | null;
    /** Grunnene fra forholdet i brevets rekkefølge, så innsigelsene i sporet (S2-A). */
    forutsetninger: Forutsetning[];
  }[];
}

/**
 * Lagene i et svarutkast på vederlag, også før alle spørsmålene er besvart. Et ubesvart
 * varslingsspørsmål regnes som at innsigelsen ikke er gjort gjeldende, så laget kan endre
 * seg når det besvares (S1-A). Lagene fra forholdet leses av gjeldende svar på forholdet,
 * som frysingen gjør når brevet ikke selv har et svar på forholdet. Beløpene påvirker ikke
 * lagene og tas ut før standpunktene bygges. Kaster `UgyldigVurdering` for svar på
 * kravpostene som `kravpostvurderinger` avviser, og for en kravpost etter en beregningsregel.
 */
export function lagForUtkastet(utkast: Svarutkast, u: Utledning, regler: Regelsett): Utkastlag {
  if (utkast.spor !== 'vederlag')
    throw new Error(`lagForUtkastet gjelder vederlag, ikke ${utkast.spor}`);
  const v = utkast.vurderinger;
  const utenBeloep: Svarvurdering = {
    ...v,
    kravposter: kravpostvurderinger(v, u.spor.vederlag.gjeldendeKrav!).map(({ post, svar }) => ({
      gjelder: post.id,
      aksepterer: svar.aksepterer,
      oensket_oppgjoersform: svar.oensket_oppgjoersform,
    })),
    produktivitet_vurdering: undefined,
    produktivitet_godkjent_beloep: undefined,
    produktivitet_begrenset_beloep: v.produktivitet_varslet_i_tide === false ? 0 : undefined,
  };
  let n = 0;
  const lagret = standpunkter(
    { ...utkast, vurderinger: utenBeloep },
    u.spor.vederlag.gjeldendeKrav!,
    u,
    () => `utkast-${n++}`
  );
  const svar = {
    spor: 'vederlag' as const,
    standpunkter: standpunkterISvaret('vederlag', {
      standpunkter: lagret,
      utregning: { godkjent_beloep: 0 },
    }),
    utregning: {},
  };
  const g = u.spor.forhold.gjeldendeSvar;
  const grunner = g ? grunnerFraForholdet(g, g.beslutningsgrunnlag.virkninger) : [];
  const virket = virkninger(svar, paaberopelseFor(utkast, u), regler, grunner.length);
  const forskjoevet = (vi: Virkning): Virkning =>
    typeof vi === 'number' ? vi + grunner.length : vi;
  const lag = virket.map((vi) => laget(forskjoevet(vi.virkning)));
  const flereLag = lag.some((l) => l !== null && l > 1);
  // Innsigelsene i sporet som er gjort gjeldende og har virkning (OV-U27, OV-U22).
  const paaberopt = (h: Hjemmel) =>
    svar.standpunkter.some(
      (s, i) => s.art === 'rettidighet' && s.hjemmel === h && laget(virket[i].virkning) !== null
    );
  return {
    standpunkter: svar.standpunkter.map((s, i) => {
      const l = lag[i];
      const rammer: Forutsetning[] = [];
      if (l !== null) {
        rammer.push(...grunner.map((grunn) => ({ grunn })));
        const egen = s.art === 'rettidighet' ? s.hjemmel : null;
        // § 34.1.2 rammer hele kravet; § 34.1.3 bare posten etter annet ledd (OV-U22, VS-U5).
        if (egen !== '34.1.2' && paaberopt('34.1.2')) rammer.push({ innsigelse: '34.1.2' });
        if (s.art === 'beloep' && s.saerskilt && paaberopt('34.1.3'))
          rammer.push({ innsigelse: '34.1.3' });
      }
      return {
        art: s.art,
        ...(s.art === 'rettidighet' ? { hjemmel: s.hjemmel } : {}),
        ...(s.art === 'beloep' && s.saerskilt ? { saerskilt: s.saerskilt } : {}),
        ...((s.art === 'beloep' || s.art === 'oppgjoersform') && s.gjelder !== undefined
          ? { gjelder: s.gjelder }
          : {}),
        besvart: s.art !== 'beloep' || besvart(v, u, s),
        virkning: forskjoevet(virket[i].virkning),
        etikett: l !== null && flereLag ? etikett(l) : null,
        forutsetninger: rammer,
      };
    }),
  };
}

const besvart = (
  v: Svarvurdering,
  u: Utledning,
  s: { saerskilt?: 'produktivitet' | 'rigg_og_drift'; gjelder?: string }
) =>
  typeof (s.saerskilt
    ? v.produktivitet_vurdering
    : kravpostvurderinger(v, u.spor.vederlag.gjeldendeKrav!).find(
        ({ post }) => post.id === s.gjelder
      )?.svar.vurdering) === 'string';
