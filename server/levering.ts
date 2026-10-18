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
 * alene, uten journalen. Et registrert brev har ingen tekst fra appen (MM-U17):
 * `brevtekst` er `null`, og `dokument` er `null`, fordi brevet alt er sendt utenfor
 * appen og ikke blir et eget dokument i Catenda (LV-U11). Bare `dokument` avgjør om
 * oppdraget får en leveringsjobb (triggeren `koe.leveringsoppdrag_levering`).
 */

import { createHash } from 'node:crypto';
import type { Brevdokument } from './catenda.ts';
import { gjengi, gjengirTro, norskDato } from '../kjerne/frosset/brevtekst.ts';
import { lesBrevPdf, skrivBrevPdf } from './brevpdf.ts';
import type { Avsnitt, Journalrad } from '../kjerne/typer.ts';
import type { Kjerne } from '../kjerne/versjon.ts';
import type { Visning } from '../kjerne/utledning/visning.ts';
import type { Leveringsmaal, Oppdragsrad } from './lager.ts';

/** Formen på `leveringsoppdrag.innhold`. Økes når formen endres. */
export const OPPDRAGSFORMAT = 4;

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
  const brevtekst = rad.data.brevtekst ?? null;
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
      brevtekst,
    },
    dokument: brevtekst
      ? { noekkel: rad.event_id, filnavn: `brev-${rad.sak_id}-${rad.versjon}.pdf` }
      : null,
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
 * hodet og brevteksten slik den ble frosset. PDF-en gjengir den samme teksten.
 * `null` når brevet er registrert og ikke har tekst fra appen (MM-U17).
 */
export function gjengiOppdrag(innhold: Record<string, unknown>): string | null {
  const brev = innhold.brev as Oppdragsbrev;
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

interface Oppdragsbrev {
  sak_id: string;
  saksversjon: number;
  tidsstempel: string;
  avsender: { part: 'TE' | 'BH' };
  brevtekst: Avsnitt[] | null;
}

/** Oppdraget har et dokument, men brevteksten mangler, eller PDF-en gjengir den ikke tro. */
export class UgjengivbartBrev extends Error {}

/**
 * PDF-en av brevet (L-1c1, #371 del 2), med dokumentnøkkelen i navnet, så et forsøk
 * etter et tapt svar finner det igjen (B-03). PDF-en leses tilbake og kontrolleres mot
 * den frosne brevteksten før den gis fra seg (LV-U2, `gjengirTro`).
 */
export async function brevdokument(
  innhold: Record<string, unknown>,
  dokumentnoekkel: string
): Promise<Brevdokument> {
  const dokument = innhold.dokument as { filnavn: string } | null;
  const brev = innhold.brev as Oppdragsbrev;
  const tekst = gjengiOppdrag(innhold);
  if (!dokument || !brev.brevtekst || tekst === null)
    throw new UgjengivbartBrev('Oppdraget har ikke noe dokument med tekst fra appen');
  const grunnnavn = dokument.filnavn.replace(/\.pdf$/, '');
  const pdf = await skrivBrevPdf(tekst, `${grunnnavn}.pdf`, new Date(brev.tidsstempel)).catch(
    (feil: unknown) => {
      throw new UgjengivbartBrev('Brevteksten kan ikke settes med skriften i PDF-en', {
        cause: feil,
      });
    }
  );
  if (!gjengirTro(lesBrevPdf(pdf), brev.brevtekst))
    throw new UgjengivbartBrev('PDF-en gjengir ikke brevteksten tro');
  return { navn: `${grunnnavn}-${dokumentnoekkel}.pdf`, innhold: pdf };
}

/** SHA-256 av PDF-en, som basen kontrollerer mot det den lagrer. */
export const pdfsum = (pdf: Uint8Array): string => createHash('sha256').update(pdf).digest('hex');
