/**
 * Saksbildet for en TS-sak (#313, #665): tittelen fra opprettelsen slik kjernen har lest den, og
 * betegnelsen per spor fra `visning`, det Varden leser. Teksten til betegnelsen står i Varden
 * (MM-U30). Her står ingen regel, bare oppslag.
 */

import { sakstittelen } from '$kjerne/format/leser';
import type { Betegnelse, Visning } from '$kjerne/utledning/visning';
import { SPOR, type Domenehendelse, type Spor } from '$kjerne/typer';

export interface Sporbilde {
  spor: Spor;
  /** Betegnelsen fra den faste lista (MM-U30). */
  betegnelse: { kode: Betegnelse } | null;
}

export interface Saksbilde {
  tittel: string | null;
  spor: Sporbilde[];
}

/**
 * `lest` er journalen slik kjernen har lest den (`Utledning.journal`). `tittel` er `null` når
 * kjernen ikke forstår opprettelsen (MM-U2, #896).
 */
export function lagSaksbilde(lest: Domenehendelse[], vist: Visning): Saksbilde {
  return {
    tittel: sakstittelen(lest),
    spor: SPOR.map((spor) => {
      const kode = vist.spor[spor].betegnelse;
      return { spor, betegnelse: kode && { kode } };
    }),
  };
}
