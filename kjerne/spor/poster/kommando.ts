/**
 * Lagene i et svarutkast byggherren ennå fyller ut (#1400, #1778): laget hvert standpunkt står
 * i, og det i et foregående lag som rammer det, så skjemaet kan vise dem før sending (OV-U32,
 * OV-U33). Hva som kan ramme et standpunkt (`F`), er sporets eget.
 */

import type { Hjemmel, Standpunktsart, Virkning } from '../../typer.ts';

/** Et spørsmål i utkastet: feltet i vurderingene, og posten eller fristen det gjelder. */
export type SpoersmaalIUtkastet<S extends string> = { spoersmaal: S; gjelder?: string };

/**
 * Lagene i utkastet. `F` er det som kan ramme et standpunkt i sporet, `S` spørsmålene i sporet
 * regelen krever svar på, og `P` feltene sporet selv har i standpunktet, som en særskilt post i
 * vederlaget.
 */
export interface Utkastlag<F, S extends string, P extends object = object> {
  /**
   * Spørsmålene regelen stiller i utkastet, besvart eller ikke, i rekkefølgen den stiller dem
   * (#2156, #2279). `ubesvart` er de av dem som er ubesvart og påkrevd. Et spørsmål som ikke
   * står her, stilles ikke for kravet, og skjemaet viser det ikke.
   */
  stilt: SpoersmaalIUtkastet<S>[];
  /**
   * Spørsmålene regelen krever svar på før svaret kan sendes, og som er ubesvart i utkastet, i
   * rekkefølgen regelen stiller dem (#2025). Et spørsmål er feltet i vurderingene, også en verdi
   * som kreves av et annet svar, som dagene eller beløpet ved en delvis godkjenning. Er lista
   * tom, avviser kjernen ikke svaret i sporet for et manglende svar; et svar på forholdet i samme
   * brev kontrolleres for seg. En verdi som er gitt, men ikke kan
   * godtas, står ikke her. `gjelder` er posten eller fristen spørsmålet gjelder, og mangler for
   * et spørsmål om hele kravet. Et spørsmål som ikke er påkrevd, som varselet etter § 34.3.3,
   * står ikke her (VS-U57).
   */
  ubesvart: SpoersmaalIUtkastet<S>[];
  /**
   * Svarene i utkastet kontrollen kjernen gjør når svaret sendes, ikke godtar, i rekkefølgen
   * kontrollen fører dem (#2156): en verdi som er gitt, men som kjernen avviser, som flere dager
   * enn de krevde. Et ubesvart spørsmål står i `ubesvart`, ikke her. Kjernen avviser også andre
   * feil enn dem som står her, og et svar på forholdet i samme brev kontrolleres for seg.
   */
  ugyldig: SpoersmaalIUtkastet<S>[];
  standpunkter: (P & {
    art: Standpunktsart;
    hjemmel?: Hjemmel;
    /** Posten standpunktet gjelder (KA-U57 (c) og (d)). */
    gjelder?: string;
    /**
     * Spørsmålet standpunktet svarer på, er besvart. Er det `false`, står standpunktet i laget en
     * utfylling av spørsmålet gir, og laget kan endre seg når det besvares. Om svaret er påkrevd,
     * står i `ubesvart`.
     */
    besvart: boolean;
    /** Laget etter lagene fra forholdet, `upaavirket` eller `uten_virkning`. */
    virkning: Virkning;
    /** `null` når standpunktet ikke står i et lag, eller hele svaret har ett lag (OV-U33). */
    etikett: string | null;
    /** Grunnene fra forholdet i brevets rekkefølge, så innsigelsene i sporet (S2-A i #1400). */
    forutsetninger: F[];
  })[];
}
