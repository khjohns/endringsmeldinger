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
 * serveren avviser en annen (LV-U2). Med `sendes` vurderes kommandoen med teksten slik
 * serveren vurderer den, med kravet til begrunnelse og beskrivelse, så et brev serveren
 * vil avvise, ikke vises til kontroll (#1254). Uten den kan teksten vises før
 * begrunnelsen er skrevet (A1). En programfeil i kjernen kastes videre (#695).
 */
export type Brev = { tekst: string[] | null } | { avvisning: Avvisning };

const stemplet = (sakId: string, part: Part): Kontekst => ({
  // Aktøren, tidspunktet og ID-ene settes av serveren og endrer ikke den låste teksten.
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
  journal: Journalrad[],
  kjerne: Kjerne,
  vedlegg?: Vedleggsoppslag,
  sendes = false
): Brev {
  const kontekst = stemplet(sakId, part);
  const vist = forhaandsvis(kommando, kontekst, journal, kjerne, vedlegg);
  if (!vist.godtatt) return { avvisning: vist.avvisning };
  const tekst = laastTekst(vist.hendelser[0]);
  if (!sendes) return { tekst };
  const medTekst = tekst ? { ...kommando, brevtekst: tekst } : kommando;
  const vurdert = vurder(medTekst, kontekst, journal, kjerne, vedlegg ?? new Map());
  return vurdert.godtatt ? { tekst } : { avvisning: vurdert.avvisning };
}

/**
 * Saken utledet med raden kommandoen ville gitt, uten å lagre den, eller `null` når kjernen
 * avviser kommandoen. Skjemaet leser lagene i svaret herfra, som brevet gjør (#1261).
 */
export function utledetMed(
  kommando: Record<string, unknown>,
  sakId: string,
  part: Part,
  journal: Journalrad[],
  kjerne: Kjerne
): Utledning | null {
  const vist = forhaandsvis(kommando, stemplet(sakId, part), journal, kjerne);
  return vist.godtatt ? utledJournal([...journal, ...vist.hendelser], kjerne) : null;
}

/**
 * Avvisningen kjernen gir kravet mot en ny sak med bare opprettelsen, eller `null`.
 * Reglene for kravet, som datoen etter brevet (VS-U26), prøves da før saken
 * opprettes, så en avvisning etterlater ingen sak uten krav (#711).
 */
export function kravMotNySak(
  opprettelse: Record<string, unknown>,
  krav: Record<string, unknown>,
  part: Part,
  kjerne: Kjerne
): Avvisning | null {
  const opprettet = opprett(opprettelse, part);
  if (!opprettet.godtatt) return opprettet.avvisning;
  const sakId = crypto.randomUUID();
  // Raden serveren skriver for opprettelsen, i versjon 1.
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
  const brev = brevFor(krav, sakId, part, [rad], kjerne);
  return 'avvisning' in brev ? brev.avvisning : null;
}
