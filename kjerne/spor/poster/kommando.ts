/**
 * Lagene i et svarutkast byggherren ennå fyller ut (#1400, #1778): laget hvert standpunkt står
 * i, og det i et foregående lag som rammer det, så skjemaet kan vise dem før sending (OV-U32,
 * OV-U33). Hva som kan ramme et standpunkt (`F`), er sporets eget.
 */

import type { Hjemmel, Standpunktsart, Virkning } from '../../typer.ts';

export interface Utkastlag<F> {
  standpunkter: {
    art: Standpunktsart;
    hjemmel?: Hjemmel;
    saerskilt?: 'produktivitet';
    /** Posten standpunktet gjelder (KA-U57 (c) og (d)). */
    gjelder?: string;
    /** Spørsmålet om posten er besvart. Andre standpunkter finnes bare når de er besvart (KA-U4). */
    besvart: boolean;
    /** Laget etter lagene fra forholdet, `upaavirket` eller `uten_virkning`. */
    virkning: Virkning;
    /** `null` når standpunktet ikke står i et lag, eller hele svaret har ett lag (OV-U33). */
    etikett: string | null;
    /** Grunnene fra forholdet i brevets rekkefølge, så innsigelsene i sporet (S2-A i #1400). */
    forutsetninger: F[];
  }[];
}
