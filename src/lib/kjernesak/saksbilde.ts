/**
 * Saksbildet for en TS-sak (#313, #665), slimmet til det Varden leser (#1701): tittelen og
 * betegnelsen per spor. Her står ingen regel, bare oppslag og tekst.
 */

import type { Betegnelse, Visning } from '$kjerne/utledning/visning';
import { SPOR, type Journalrad, type Spor } from '$kjerne/typer';

export interface Etikett {
  kode: string;
  tekst: string;
}

export interface Sporbilde {
  spor: Spor;
  /** Betegnelsen fra den faste lista (MM-U30), med teksten. */
  betegnelse: Etikett | null;
}

export interface Saksbilde {
  tittel: string | null;
  spor: Sporbilde[];
}

/** Tekstene til betegnelsene i MM-U30, slik lista står i vedtaket. */
const BETEGNELSESTEKST: Record<Betegnelse, string> = {
  trukket: 'Trukket',
  spesifisert_krav_etterspurt: 'Byggherren har bedt om spesifisert krav (§ 33.6.2)',
  venter_paa_svar: 'Kravet venter på byggherrens svar',
  paalegg_frafalt: 'Byggherren har frafalt pålegget',
  enige: 'Enige',
  svar_ikke_godtatt: 'Svaret er ikke godtatt',
  krav_sendt: 'Krav sendt',
  ingen_krav: 'Ingen krav',
  varslet: 'Varslet',
};

export function lagSaksbilde(journal: Journalrad[], vist: Visning): Saksbilde {
  const opprettet = journal.find((r) => r.event_type === 'sak_opprettet');
  return {
    tittel: typeof opprettet?.data.sakstittel === 'string' ? opprettet.data.sakstittel : null,
    spor: SPOR.map((spor) => {
      const b = vist.spor[spor].betegnelse;
      return { spor, betegnelse: b && { kode: b, tekst: BETEGNELSESTEKST[b] } };
    }),
  };
}
