import type { Journallinje } from '$lib/api/kjerne';
import type { Journalrad } from '$kjerne/typer';

/** En rad i journalen med navnet på aktøren, som bare visningen leser. */
export type Visningsrad = Journalrad & { aktor_navn?: string };

/**
 * Radene slik kjernen leser dem, med navnet på aktøren for visningen. Serveren
 * sender navnet, eller `aktor_id` når navnet ikke finnes (#820), men ikke teamet
 * eller referansen. `aktor_id` i raden er tom; kjernen skriver ingen rad med
 * referanse, og utledningen leser ikke aktøren eller teamet.
 */
export const somJournal = (sakId: string, linjer: Journallinje[]): Visningsrad[] =>
  linjer.map((l) => ({
    ...l,
    sak_id: sakId,
    aktor_id: '',
    aktor_team_id: null,
    refererer_til_event_id: null,
  }));
