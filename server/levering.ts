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
 * `brevtekst` er teksten kjernen frøs i brevet (LV-U2, LV-U3, #369): avsnittene
 * med den låste delen og utdypningen hver for seg. Dokumentet som leveres, gjengir
 * den tro (`gjengirTro` i `kjerne/frosset/brevtekst.ts`), og lages av oppdraget
 * alene, uten journalen. Et registrert brev har ingen tekst fra appen (MM-U17), og
 * `brevtekst` er da `null`.
 */

import { createHash } from 'node:crypto';
import { gjengi, norskDato } from '../kjerne/frosset/brevtekst.ts';
import type { Avsnitt, Journalrad } from '../kjerne/typer.ts';
import type { Kjerne } from '../kjerne/versjon.ts';
import type { Visning } from '../kjerne/utledning/visning.ts';
import type { Leveringsmaal, Oppdragsrad } from './lager.ts';

/** Formen på `leveringsoppdrag.innhold`. Økes når formen endres. */
export const OPPDRAGSFORMAT = 3;

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

export const sjekksum = (innhold: unknown): string =>
  createHash('sha256').update(kanonisk(innhold)).digest('hex');

/** Filnavnet dokumentet får i Catenda, fra innholdet i et lagret oppdrag. */
export const filnavn = (innhold: Record<string, unknown>): string | null =>
  (innhold.dokument as { filnavn?: string } | undefined)?.filnavn ?? null;

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
      brevtekst: rad.data.brevtekst ?? null,
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

/**
 * Brevet i et lagret oppdrag som ren tekst, av oppdraget alene (LV-U1, B-17):
 * hodet og brevteksten slik den ble frosset. Dokumentet #371 lager, gjengir den
 * samme teksten. `null` når brevet er registrert og ikke har tekst fra appen (MM-U17).
 */
export function gjengiOppdrag(innhold: Record<string, unknown>): string | null {
  const brev = innhold.brev as {
    sak_id: string;
    saksversjon: number;
    tidsstempel: string;
    avsender: { part: 'TE' | 'BH' };
    brevtekst: Avsnitt[] | null;
  };
  if (!brev.brevtekst) return null;
  const fra = brev.avsender.part === 'TE' ? 'Totalentreprenøren (TE)' : 'Byggherren (BH)';
  return [
    `Sak ${brev.sak_id}, brev ${brev.saksversjon}`,
    `Fra: ${fra}`,
    `Dato: ${norskDato(brev.tidsstempel)}`,
    '',
    gjengi(brev.brevtekst),
  ].join('\n');
}

/**
 * Dokumentet som lastes opp for brevet, med dokumentnøkkelen i navnet, så et forsøk
 * etter et tapt svar finner det igjen (B-03). Til PDF-en finnes (L-1c, #371 del 2),
 * er det brevet som UTF-8-tekst fra `gjengiOppdrag`. `null` når brevet ikke har tekst
 * fra appen (MM-U17).
 */
export function brevdokument(
  innhold: Record<string, unknown>,
  dokumentnoekkel: string
): { navn: string; innhold: Uint8Array } | null {
  const tekst = gjengiOppdrag(innhold);
  if (tekst === null) return null;
  const grunnnavn = (filnavn(innhold) ?? 'brev').replace(/\.pdf$/, '');
  return {
    navn: `${grunnnavn}-${dokumentnoekkel}.txt`,
    innhold: new TextEncoder().encode(tekst),
  };
}
