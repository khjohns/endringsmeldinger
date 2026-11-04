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
 * appen og ikke blir et eget dokument i Catenda (LV-U11).
 *
 * Hvert brev med tekst fra løsningen merkes med kontraktsforkortelsen, sakens kode og
 * brevets nummer i saken, `K201-KOE-005-03` (LV-U44, LV-U48). Merkingen er Vår ref. i
 * hodet (LV-U27) og navnet på dokumentet, og fryses i oppdraget. Uten
 * kontraktsforkortelsen lages ingen merking, og sendingen avvises
 * (`KontraktsforkortelseMangler`, arbeidsvalget S2 A i #1497).
 *
 * Vedleggene brevet binder, står bare i brevet, i `dokumentasjon` med ID-en, filnavnet
 * og summen (LV-U14), og leveringen leser dem der (#827 punkt 6). Et oppdrag med
 * vedlegg får leveringsjobben også uten dokument (LV-U11, triggeren
 * `koe.leveringsoppdrag_levering`).
 */

import { createHash } from 'node:crypto';
import type { Brevdokument } from './catenda.ts';
import { gjengi, gjengirTro, norskDato } from '../kjerne/frosset/brevtekst.ts';
import { brevtekstI } from '../kjerne/format/leser.ts';
import { lesBrevPdf, skrivBrevPdf, TegnUtenforSkriften } from './brevpdf.ts';
import { sjekksum } from './sjekksum.ts';
import type { Avsnitt, Journalrad, Sakskode } from '../kjerne/typer.ts';
import type { Kjerne } from '../kjerne/versjon.ts';
import type { Visning } from '../kjerne/utledning/visning.ts';
import type { Leveringsmaal, Oppdragsrad } from './lager.ts';

/** Formen på `leveringsoppdrag.innhold`. Økes når formen endres. */
export const OPPDRAGSFORMAT = 8;

/** Det merkingen settes sammen av, utenom brevnummeret, lest i skrivetransaksjonen. */
export interface Merkingsgrunnlag {
  /** Fra prosjektinnstillingene (`koe.kontraktsparter`), `null` når prosjektet ikke har den. */
  kontraktsforkortelse: string | null;
  sakskode: Sakskode;
}

/** Prosjektet har ingen kontraktsforkortelse, så brevet kan ikke merkes (S2 A i #1497). */
export class KontraktsforkortelseMangler extends Error {}

const utfylt = (tall: number, sifre: number) => String(tall).padStart(sifre, '0');

/**
 * Merkingen `K201-KOE-005-03`: minst tre sifre i løpenummeret og minst to i
 * brevnummeret (LV-U48), og tilsvarende `K201-EO-005-03` (LV-U44).
 *
 * @throws KontraktsforkortelseMangler
 */
export function merking(grunnlag: Merkingsgrunnlag, brevnummer: number): string {
  const { kontraktsforkortelse, sakskode } = grunnlag;
  if (!kontraktsforkortelse)
    throw new KontraktsforkortelseMangler(
      'Prosjektet har ingen kontraktsforkortelse, så brevet kan ikke merkes.'
    );
  return [
    kontraktsforkortelse,
    sakskode.kode.toUpperCase(),
    utfylt(sakskode.loepenummer, 3),
    utfylt(brevnummer, 2),
  ].join('-');
}

/** Filnavnet dokumentet får i Catenda, fra innholdet i et lagret oppdrag. */
export const filnavn = (innhold: Record<string, unknown>): string | null =>
  (innhold.dokument as { filnavn?: string } | undefined)?.filnavn ?? null;

export function lagOppdrag(
  rad: Journalrad,
  maal: Leveringsmaal,
  status: Visning['status'],
  kjerne: Kjerne,
  nyId: () => string,
  grunnlag: Merkingsgrunnlag
): Oppdragsrad {
  const brevtekst = brevtekstI(rad);
  const merket = brevtekst ? merking(grunnlag, brevnummerI(rad)) : null;
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
      merking: merket,
    },
    dokument: merket ? { noekkel: rad.event_id, filnavn: `${merket}.pdf` } : null,
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

/** Nummeret kjernen ga brevet i saken (LV-U44, LV-U45); et brev med tekst har det alltid. */
function brevnummerI(rad: Journalrad): number {
  const nummer = rad.data.brevnummer;
  if (typeof nummer !== 'number' || !Number.isInteger(nummer) || nummer < 1)
    throw new Error(`Brevet ${rad.event_id} har tekst, men ikke noe brevnummer.`);
  return nummer;
}

/**
 * Brevet i et lagret oppdrag som ren tekst, av oppdraget alene (LV-U1, B-17):
 * hodet og brevteksten slik den ble frosset. PDF-en gjengir den samme teksten.
 * `null` når brevet er registrert og ikke har tekst fra appen (MM-U17).
 */
export function gjengiOppdrag(innhold: Record<string, unknown>): string | null {
  const brev = innhold.brev as Oppdragsbrev;
  return brev.brevtekst ? gjengiBrev(brev, brev.brevtekst) : null;
}

/** Hodet etter LV-U27, uten Deres ref. (S4 i #1497) og Websak-nummeret (#1173). */
function gjengiBrev(brev: Oppdragsbrev, brevtekst: Avsnitt[]): string {
  const fra = brev.avsender.part === 'TE' ? 'Totalentreprenøren (TE)' : 'Byggherren (BH)';
  if (!brev.merking) throw new UgjengivbartBrev('Oppdraget har brevtekst, men ingen merking');
  return [
    `Vår ref.: ${brev.merking}`,
    `Fra: ${fra}`,
    `Dato: ${norskDato(brev.tidsstempel)}`,
    '',
    gjengi(brevtekst),
  ].join('\n');
}

interface Oppdragsbrev {
  tidsstempel: string;
  merking: string | null;
  avsender: { part: 'TE' | 'BH' };
  brevtekst: Avsnitt[] | null;
}

/** Oppdraget har et dokument, men brevteksten mangler, eller PDF-en gjengir den ikke tro. */
export class UgjengivbartBrev extends Error {}

/**
 * Navnet på PDF-en i Catenda, med dokumentnøkkelen, så et forsøk etter et tapt svar
 * finner den igjen (B-03).
 *
 * @throws UgjengivbartBrev når oppdraget ikke har noe dokument, som et registrert brev (LV-U11)
 */
export const dokumentnavn = (innhold: Record<string, unknown>, dokumentnoekkel: string): string =>
  `${grunnnavn(innhold)}-${dokumentnoekkel}.pdf`;

function grunnnavn(innhold: Record<string, unknown>): string {
  const navn = filnavn(innhold);
  if (navn === null)
    throw new UgjengivbartBrev('Oppdraget har ikke noe dokument med tekst fra appen');
  return navn.replace(/\.pdf$/, '');
}

/**
 * PDF-en av brevet (L-1c1, #371 del 2). PDF-en leses tilbake og kontrolleres mot den
 * frosne brevteksten før den gis fra seg (LV-U2, `gjengirTro`). Lesingen er
 * deterministisk for samme oppdrag, så en feil i den er en avvisning, som et tegn
 * skriften ikke har (#795 punkt 2 og 3).
 */
export async function brevdokument(
  innhold: Record<string, unknown>,
  dokumentnoekkel: string
): Promise<Brevdokument> {
  const navn = dokumentnavn(innhold, dokumentnoekkel);
  const brev = innhold.brev as Oppdragsbrev;
  if (!brev.brevtekst) throw new UgjengivbartBrev('Oppdraget har et dokument, men ingen brevtekst');
  const tittel = `${grunnnavn(innhold)}.pdf`;
  let pdf: Uint8Array;
  try {
    pdf = await skrivBrevPdf(gjengiBrev(brev, brev.brevtekst), tittel, new Date(brev.tidsstempel));
  } catch (feil) {
    if (feil instanceof TegnUtenforSkriften)
      throw new UgjengivbartBrev(feil.message, { cause: feil });
    throw feil;
  }
  let lest: string;
  try {
    lest = lesBrevPdf(pdf);
  } catch (feil) {
    throw new UgjengivbartBrev(`PDF-en kan ikke leses tilbake: ${(feil as Error).message}`, {
      cause: feil,
    });
  }
  if (!gjengirTro(lest, brev.brevtekst))
    throw new UgjengivbartBrev('PDF-en gjengir ikke brevteksten tro');
  return { navn, innhold: pdf };
}

/**
 * Navnet vedlegget får i Catenda: filnavnet med vedleggets ID foran endelsen, så et
 * forsøk etter et tapt svar finner det igjen, og to vedlegg med samme filnavn ikke
 * kolliderer i mappen.
 */
export function vedleggsnavn(filnavn: string, vedleggId: string): string {
  const punktum = filnavn.lastIndexOf('.');
  return punktum >= 0
    ? `${filnavn.slice(0, punktum)}-${vedleggId}${filnavn.slice(punktum)}`
    : `${filnavn}-${vedleggId}`;
}

/** SHA-256 av PDF-en, som basen kontrollerer mot det den lagrer. */
export const pdfsum = (pdf: Uint8Array): string => createHash('sha256').update(pdf).digest('hex');
