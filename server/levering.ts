/**
 * Leveringsoppdraget for et brev (LV-U1, B-03, dokumentet): det som skal
 * leveres til Catenda, frosset i samme transaksjon som hendelsen. Python
 * leverer oppdraget uten å lese journalen (B-17); det som trengs, står her.
 *
 * Ett brev er ett dokument i Catenda. Dokumentnøkkelen er hendelsens
 * `event_id` foreløpig: B-03 lar #310 velge den, og den kan endres med en
 * migrasjon før den første reelle hendelsen. Et nytt leveringsforsøk sender
 * samme oppdrag. Oppdraget beviser ikke at brevet er sendt eller mottatt.
 *
 * Kjernen har ingen brevtekst ennå (#309, `frosset/`). `brevtekst` er `null`
 * til den finnes. Uten den er oppdraget ikke fullstendig etter LV-U1, og ingen
 * worker plukker det før da (#369).
 */

import type { Journalrad } from '../kjerne/typer.ts';
import type { Kjerne } from '../kjerne/versjon.ts';
import type { Visning } from '../kjerne/visning.ts';
import { sha256 } from './autorisasjon.ts';
import type { Leveringsmaal, Oppdragsrad } from './lager.ts';

/** Formen på `leveringsoppdrag.innhold`. Økes når formen endres. */
export const OPPDRAGSFORMAT = 1;

/** JSON med nøklene sortert, så summen kan regnes på nytt av det basen gir tilbake. */
export function kanonisk(verdi: unknown): string {
  if (Array.isArray(verdi)) return `[${verdi.map(kanonisk).join(',')}]`;
  if (verdi !== null && typeof verdi === 'object')
    return `{${Object.keys(verdi)
      .sort()
      .filter((k) => (verdi as Record<string, unknown>)[k] !== undefined)
      .map((k) => `${JSON.stringify(k)}:${kanonisk((verdi as Record<string, unknown>)[k])}`)
      .join(',')}}`;
  return JSON.stringify(verdi);
}

export const sjekksum = (innhold: unknown): string => sha256(kanonisk(innhold));

/** Filnavnet dokumentet får i Catenda, fra innholdet i et lagret oppdrag. */
export const filnavn = (innhold: Record<string, unknown>): string =>
  (innhold.dokument as { filnavn: string }).filnavn;

export function lagOppdrag(
  rad: Journalrad,
  maal: Leveringsmaal,
  status: Visning['status'],
  kjerne: Kjerne,
  nyId: () => string
): Oppdragsrad {
  const innhold = {
    oppdragsformat: OPPDRAGSFORMAT,
    brev: {
      event_id: rad.event_id,
      sak_id: rad.sak_id,
      saksversjon: rad.versjon,
      tidsstempel: rad.tidsstempel,
      avsender: { part: rad.aktor_rolle, aktor_id: rad.aktor_id, team_id: rad.aktor_team_id },
      hendelsesformat: rad.format,
      dokument: rad.data,
      brevtekst: null,
    },
    dokument: {
      noekkel: rad.event_id,
      filnavn: `brev-${rad.sak_id}-${rad.versjon}.pdf`,
    },
    maal,
    status,
    kjerne: {
      projeksjonsversjon: kjerne.projeksjonsversjon,
      regelversjon: kjerne.regler.versjon,
      format: kjerne.format,
    },
  };
  return {
    id: nyId(),
    event_id: rad.event_id,
    dokumentnoekkel: rad.event_id,
    innhold,
    innhold_sha256: sjekksum(innhold),
  };
}
