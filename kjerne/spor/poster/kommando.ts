/**
 * Lagene i et svarutkast byggherren ennå fyller ut (#1400, #1778): laget hvert standpunkt står
 * i, og det i et foregående lag som rammer det, så skjemaet kan vise dem før sending (OV-U32,
 * OV-U33). Hva som kan ramme et standpunkt (`F`), er sporets eget.
 */

import type { Hjemmel, Standpunktsart, Virkning } from '../../typer.ts';

/**
 * Lagene i utkastet. `F` er det som kan ramme et standpunkt i sporet, `S` spørsmålene i sporet
 * regelen krever svar på, og `P` feltene sporet selv har i standpunktet, som en særskilt post i
 * vederlaget.
 */
export interface Utkastlag<F, S extends string, P extends object = object> {
  /**
   * Spørsmålene regelen krever svar på før svaret kan sendes, og som er ubesvart i utkastet, i
   * rekkefølgen regelen stiller dem (#2025). Er lista tom, avviser kjernen ikke svaret for et manglende svar.
   * `gjelder` er posten spørsmålet gjelder, og mangler for et spørsmål om hele kravet. Et
   * spørsmål som ikke er påkrevd, som varselet etter § 34.3.3, står ikke her (VS-U57).
   */
  ubesvart: { spoersmaal: S; gjelder?: string }[];
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
