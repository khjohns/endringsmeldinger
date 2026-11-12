/**
 * Saksbildet for en TS-sak (#313, #665): tittelen fra opprettelsen og betegnelsen per spor fra
 * `visning`, det Varden leser. Teksten til betegnelsen står i Varden (MM-U30). Her står ingen
 * regel, bare oppslag.
 */

import type { Betegnelse, Visning } from '$kjerne/utledning/visning';
import { SPOR, type Journalrad, type Spor } from '$kjerne/typer';

export interface Sporbilde {
  spor: Spor;
  /** Betegnelsen fra den faste lista (MM-U30). */
  betegnelse: { kode: Betegnelse } | null;
}

export interface Saksbilde {
  tittel: string | null;
  spor: Sporbilde[];
}

export function lagSaksbilde(journal: Journalrad[], vist: Visning): Saksbilde {
  const opprettet = journal.find((r) => r.event_type === 'sak_opprettet');
  return {
    tittel: typeof opprettet?.data.sakstittel === 'string' ? opprettet.data.sakstittel : null,
    spor: SPOR.map((spor) => {
      const kode = vist.spor[spor].betegnelse;
      return { spor, betegnelse: kode && { kode } };
    }),
  };
}
