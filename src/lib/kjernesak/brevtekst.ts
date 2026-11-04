import {
  forhaandsvis,
  laastTekst,
  utledJournal,
  vurder,
  type Kontekst,
  type Vedleggsoppslag,
} from '$kjerne/kommandoer/skriving';
import { opprettelse as opprett } from '$kjerne/kommandoer/opprettelse';
import type { Utledning } from '$kjerne/utledning/utled';
import type { Kjerne } from '$kjerne/versjon';
import type { Avvisning, Journalrad, Part } from '$kjerne/typer';

/**
 * Brevet kjernen lager for kommandoen mot journalen slik den er lastet (B-15):
 * den låste teksten, eller avvisningen. `tekst` er `null` når kommandoen ikke lager
 * en tekst, som et registrert brev; da trenger kjernen vedleggene kommandoen viser
 * til (`vedlegg`). Avsenderen ser teksten, og kommandoen bærer den;
 * serveren avviser en annen (LV-U2). `brevnummer` og `brevtittel` er det kjernen fryser i
 * raden (LV-U44, LV-U27), så nettleseren ikke regner dem ut selv. Med `sendes` vurderes kommandoen med teksten slik
 * serveren vurderer den, med kravet til begrunnelse og beskrivelse, så et brev serveren
 * vil avvise, ikke vises til kontroll (#1254). Uten den kan teksten vises før
 * begrunnelsen er skrevet (A1). En programfeil i kjernen kastes videre (#695).
 */
export type Brev =
  | { tekst: string[] | null; brevnummer: number | null; brevtittel: string | null }
  | { avvisning: Avvisning };

/**
 * Sakens kode og kontraktsforkortelsen, lest fra serveren før forhåndsvisningen. Teksten
 * omtaler saken med koden og et tidligere brev med merkingen (S3 i #1497, LV-U53).
 */
export type Saksmerking = Pick<Kontekst, 'sakskode' | 'kontraktsforkortelse'>;

const stemplet = (sakId: string, part: Part, merking: Saksmerking): Kontekst => ({
  // Aktøren, tidspunktet og ID-ene settes av serveren og endrer ikke den låste teksten.
  ...merking,
  sakId,
  aktoerId: '',
  part,
  teamId: null,
  tidspunkt: () => new Date(),
  nyId: () => crypto.randomUUID(),
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
  const rad = vist.hendelser[0];
  const tekst = laastTekst(rad);
  const brev = {
    tekst,
    brevnummer: typeof rad.data.brevnummer === 'number' ? rad.data.brevnummer : null,
    brevtittel: typeof rad.data.brevtittel === 'string' ? rad.data.brevtittel : null,
  };
  if (!sendes) return brev;
  const medTekst = tekst ? { ...kommando, brevtekst: tekst } : kommando;
  const vurdert = vurder(medTekst, kontekst, journal, kjerne, vedlegg ?? new Map());
  return vurdert.godtatt ? brev : { avvisning: vurdert.avvisning };
}

/**
 * Saken utledet med raden kommandoen ville gitt, uten å lagre den, eller `null` når kjernen
 * avviser kommandoen. Skjemaet leser lagene i svaret herfra, som brevet gjør (#1261).
 */
export function utledetMed(
  kommando: Record<string, unknown>,
  sakId: string,
  part: Part,
  merking: Saksmerking,
  journal: Journalrad[],
  kjerne: Kjerne
): Utledning | null {
  const vist = forhaandsvis(kommando, stemplet(sakId, part, merking), journal, kjerne);
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
