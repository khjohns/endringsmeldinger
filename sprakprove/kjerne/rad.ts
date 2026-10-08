/**
 * Hendelsen som rad i `hendelse` (`rad` i kontrakten) og tilbake. Kolonnene og
 * CloudEvents-feltene er de `repositories/postgres/hendelse.py` skriver, så
 * Python og TS kan lese hverandres rader.
 */

import type { Hendelse, Hendelsestype, Rolle } from './typer.ts';

export interface Rad {
  specversion: '1.0';
  event_id: string;
  source: string;
  type: string;
  time: string;
  subject: string;
  datacontenttype: 'application/json';
  actorid: string;
  actorrole: Rolle;
  actorteam: string | null;
  referstoid: string | null;
  data: Record<string, unknown>;
  prosjekt_id: string;
  sak_id: string;
  event_type: string;
  versjon: number;
}

export function tilRad(h: Hendelse, prosjektId: string): Rad {
  return {
    specversion: '1.0',
    event_id: h.event_id,
    source: `/projects/${prosjektId}/cases/${h.sak_id}`,
    type: `no.oslo.koe.${h.event_type}`,
    time: h.tidsstempel,
    subject: h.sak_id,
    datacontenttype: 'application/json',
    actorid: h.aktor_id,
    actorrole: h.aktor_rolle,
    actorteam: h.aktor_team_id,
    referstoid: h.refererer_til_event_id,
    data: structuredClone(h.data),
    prosjekt_id: prosjektId,
    sak_id: h.sak_id,
    event_type: h.event_type,
    versjon: h.versjon,
  };
}

/** En lagret rad leses tolerant: historikken kan ha felt kontrakten ikke kjenner. */
export function fraRad(
  rad: Pick<
    Rad,
    | 'event_id'
    | 'time'
    | 'actorid'
    | 'actorrole'
    | 'actorteam'
    | 'referstoid'
    | 'data'
    | 'sak_id'
    | 'event_type'
    | 'versjon'
  >
): Hendelse {
  return {
    event_id: rad.event_id,
    sak_id: rad.sak_id,
    event_type: rad.event_type as Hendelsestype,
    versjon: rad.versjon,
    tidsstempel: rad.time,
    aktor_id: rad.actorid,
    aktor_rolle: rad.actorrole,
    aktor_team_id: rad.actorteam,
    refererer_til_event_id: rad.referstoid,
    data: structuredClone(rad.data),
  };
}
