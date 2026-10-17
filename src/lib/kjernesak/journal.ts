import type { Journallinje } from '$lib/api/kjerne';
import type { Journalrad } from '$kjerne/typer';

/**
 * Radene slik kjernen leser dem. Serveren sender ikke aktøren, teamet eller
 * referansen; kjernen skriver ingen rad med referanse, og utledningen leser ikke
 * aktøren eller teamet.
 */
export const somJournal = (sakId: string, linjer: Journallinje[]): Journalrad[] =>
  linjer.map((l) => ({
    ...l,
    sak_id: sakId,
    aktor_id: '',
    aktor_team_id: null,
    refererer_til_event_id: null,
  }));
