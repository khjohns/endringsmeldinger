import {
  forhaandsvis,
  vurder,
  utledJournal,
  type Kontekst,
  type Vedleggsoppslag,
} from '#kjerne/kommandoer/skriving.ts';
import { opprettelse as opprett } from '#kjerne/kommandoer/opprettelse.ts';
import type { Utledning } from '#kjerne/utledning/utled.ts';
import type { Kjerne } from '#kjerne/versjon.ts';
import { brevtekstI } from '#kjerne/format/leser.ts';
import type { Avsnitt, Avvisning, Journalrad, Part, Sakskode } from '#kjerne/typer.ts';

/**
 * Brevet kjernen lager for kommandoen mot journalen slik den er lastet (B-15):
 * avsnittene, eller avvisningen. `avsnitt` er `null` når kommandoen ikke lager
 * en tekst, som et registrert brev; da trenger kjernen vedleggene kommandoen viser
 * til (`vedlegg`). Avsenderen ser teksten, og kommandoen bærer den;
 * serveren avviser en annen (LV-U2). `brevnummer` og `brevtittel` er det kjernen fryser i
 * raden (LV-U44, LV-U27), så nettleseren ikke regner dem ut selv. Med `sendes` vurderes kommandoen med teksten slik
 * serveren vurderer den, med kravet til begrunnelse og beskrivelse, så et brev serveren
 * vil avvise, ikke vises til kontroll (#1254). Uten den kan teksten vises før
 * begrunnelsen er skrevet (A1). En programfeil i kjernen kastes videre (#695).
 */
export type Brev =
  | {
      /** Avsnittene slik kjernen fryser dem, med punktene og utdypningene (#1824). */
      avsnitt: Avsnitt[] | null;
      brevnummer: number | null;
      brevtittel: string | null;
      /** Vår ref. og Deres ref. slik kjernen fryser dem i hodet (LV-U27, LV-U49, U-4 i BF-07). */
      merking: string | null;
      deresRef: string[];
    }
  | { avvisning: Avvisning };

/** Brevet med avsnittene kjernen lager, ikke en avvisning eller et brev uten tekst. */
export type BrevMedTekst = Extract<Brev, { avsnitt: unknown }> & { avsnitt: Avsnitt[] };

/** Om kjernen ga brevet en tekst: ikke en avvisning, en programfeil eller et registrert brev. */
export const harTekst = (b: Brev | { programfeil: string } | null | undefined): b is BrevMedTekst =>
  !!b && 'avsnitt' in b && b.avsnitt !== null;

/** Den låste teksten kommandoen bærer, og som serveren sammenligner med sin egen (LV-U2). */
export const laastTekstI = (brev: { avsnitt: Avsnitt[] | null }): string[] | null =>
  brev.avsnitt?.map((a) => a.laast) ?? null;

/**
 * Sakens kode og kontraktsforkortelsen, lest fra serveren før forhåndsvisningen. Teksten
 * omtaler saken med koden og et tidligere brev med merkingen (S3 i #1497, LV-U53). Med fristtabellen for prosjektet (KA-U79, `KONTRAKTSFRISTRUTER` i `server/kontraktsfrister.ts`),
 * som serveren lager teksten med. Uten den avviser forhåndsvisningen et krav om en registrert
 * frist, som for en ny sak.
 */
export type Saksmerking = Pick<Kontekst, 'sakskode' | 'kontraktsforkortelse'> &
  Partial<Pick<Kontekst, 'kontraktsfrister'>> & {
    fristdatoer?: readonly Fristdato[];
    /** Sakene i prosjektet kjernen ikke forstår, som kan ha forlenget en frist (MM-U2, KA-U77). */
    sakerIkkeForstaatt?: readonly string[];
  };

/**
 * Datoen og dagmulkten for en frist i fristtabellen, som skjemaet viser ved fristen (BF-20 U-4 og
 * U-5). Kjernen lager ikke teksten med dem.
 */
export type Fristdato = {
  fristId: number;
  dato: string;
  dagmulktbelagt: boolean;
  /** Dagene partene er enige om i sakene i prosjektet, også denne saken (KA-U77). */
  forlengelser?: readonly { sakId: string; sakskode: Sakskode | null; dager: number }[];
};

const stemplet = (sakId: string, part: Part, merking: Saksmerking): Kontekst => ({
  // Aktøren, tidspunktet og ID-ene settes av serveren og endrer ikke den låste teksten.
  sakskode: merking.sakskode,
  kontraktsforkortelse: merking.kontraktsforkortelse,
  sakId,
  aktoerId: '',
  part,
  teamId: null,
  tidspunkt: () => new Date(),
  nyId: () => crypto.randomUUID(),
  kontraktsfrister: merking.kontraktsfrister ?? [],
});

export function brevFor(
  kommando: Record<string, unknown>,
  sakId: string,
  part: Part,
  merking: Saksmerking,
  journal: Journalrad[],
  kjerne: Kjerne,
  vedlegg?: Vedleggsoppslag,
  sendes = false
): Brev {
  const kontekst = stemplet(sakId, part, merking);
  const vist = forhaandsvis(kommando, kontekst, journal, kjerne, vedlegg);
  if (!vist.godtatt) return { avvisning: vist.avvisning };
  // Brevet er den siste raden; et dokument fra kravskjemaet står som varsel foran (VS-U53).
  const rad = vist.hendelser.at(-1)!;
  const brev = {
    avsnitt: brevtekstI(rad),
    brevnummer: typeof rad.data.brevnummer === 'number' ? rad.data.brevnummer : null,
    brevtittel: typeof rad.data.brevtittel === 'string' ? rad.data.brevtittel : null,
    merking: typeof rad.data.merking === 'string' ? rad.data.merking : null,
    deresRef: Array.isArray(rad.data.deres_ref) ? (rad.data.deres_ref as string[]) : [],
  };
  if (!sendes) return brev;
  const tekst = laastTekstI(brev);
  const medTekst = tekst ? { ...kommando, brevtekst: tekst } : kommando;
  const vurdert = vurder(medTekst, kontekst, journal, kjerne, vedlegg ?? new Map());
  return vurdert.godtatt ? brev : { avvisning: vurdert.avvisning };
}

/**
 * Saken utledet med raden kommandoen ville gitt, uten å lagre den, eller `null` når kjernen
 * avviser kommandoen. Skjemaet leser lagene i svaret herfra, som brevet gjør (#1261).
 * `vedlegg` er vedleggene kommandoen viser til, som i `brevFor`.
 */
export function utledetMed(
  kommando: Record<string, unknown>,
  sakId: string,
  part: Part,
  merking: Saksmerking,
  journal: Journalrad[],
  kjerne: Kjerne,
  vedlegg?: Vedleggsoppslag
): Utledning | null {
  const vist = forhaandsvis(kommando, stemplet(sakId, part, merking), journal, kjerne, vedlegg);
  return vist.godtatt ? utledJournal([...journal, ...vist.hendelser], kjerne) : null;
}

/**
 * Brevet kjernen lager for kravet mot en ny sak med bare opprettelsen: teksten, eller
 * avvisningen. Kravet vurderes med `sendes` slik serveren vurderer det, med kravet til
 * beskrivelsen (GR-U15) og vedleggene kommandoen viser til, så en avvisning står ved
 * feltet før brevkontrollen og etterlater ingen sak uten krav (#711, #1271, KT-U11).
 * Teksten har sakens kode, så den gjelder bare for koden saken faktisk får (LV-U46).
 */
export function kravMotNySak(
  opprettelse: Record<string, unknown>,
  krav: Record<string, unknown>,
  part: Part,
  merking: Saksmerking,
  kjerne: Kjerne,
  vedlegg?: Vedleggsoppslag,
  sakId: string = crypto.randomUUID()
): Brev {
  const opprettet = opprett(opprettelse, part);
  if (!opprettet.godtatt) return { avvisning: opprettet.avvisning };
  const rad: Journalrad = {
    event_id: crypto.randomUUID(),
    sak_id: sakId,
    event_type: 'sak_opprettet',
    versjon: 1,
    tidsstempel: new Date().toISOString(),
    aktor_id: '',
    aktor_rolle: part,
    aktor_team_id: null,
    refererer_til_event_id: null,
    format: opprettet.format,
    data: opprettet.data,
  };
  return brevFor(krav, sakId, part, merking, [rad], kjerne, vedlegg ?? new Map(), true);
}
