import { PARTEN } from '#kjerne/frosset/brevdeler.ts';
import type { Part } from '#kjerne/typer.ts';
import type { Brevref } from '../lesing';
import { brevref } from './felles';
import { LEGG_TIL } from './korrespondansen';
import { dato, kl, haerdet } from './format';

/** Bekreftelsen ved forkasting av et utkast. */
export const BREVUTKAST = haerdet({
  forkastSpoersmaal: 'Forkaste utkastet?',
});

export const SAKEN = haerdet({
  nav: 'Saken',
  kontraktsforhold: 'Kontraktsforhold',
  krav: 'Krav',
  utkast: 'Utkast',
  fortsettUtkastet: 'Fortsett utkastet',
  prototype: 'Varden · eksperimentell visning',
  kommune: 'Oslo kommune',
  foretak: 'Oslobygg KF',
  kontrakten: 'Kontrakten',
  prosjekt: 'Prosjekt',
  kontraktsform: 'Kontraktsform',
  byggherre: 'Byggherre',
  entreprenoer: 'Totalentreprenør',
  opprettet: 'Opprettet',
  merkenavn: 'Varden',
  stien: 'Du er her',
  laster: 'Laster saken …',
  lastefeil: 'Saken kunne ikke hentes',
  lastefeilUgyldig: (medSakslisten: boolean) =>
    medSakslisten ? 'Kontroller lenken, eller åpne saken fra sakslisten.' : 'Kontroller lenken.',
  lastefeilBeklager: 'Beklager, serveren svarte med en feil. Prøv igjen om litt.',
  lastefeilNett:
    'Beklager, vi fikk ikke svar fra serveren. Kontroller nettforbindelsen, og prøv igjen.',
  lastefeilDetaljer: (aarsak: string) => `Teknisk melding: ${aarsak}`,
  sistForsoekt: (d: string) => `Sist forsøkt ${kl(d)}.`,
  proevIgjen: 'Prøv igjen',
  proever: 'Prøver igjen …',
  finnesIkke: 'Saken finnes ikke, eller du har ikke tilgang til den',
  finnesIkkeForklaring: 'Kontroller lenken. Er du med i prosjektet, finner du saken i sakslisten.',
  tilSakslisten: 'Til sakslisten',
  /** Panelet til venstre som saksomslaget (panel B i `vederlagsoversikt.html`, #1899). */
  sporene: 'Forholdet og kravene i saken',
  siste: (b: Brevref, part: Part) =>
    b.nummer === null && b.omtale
      ? `Siste: ${b.omtale}`
      : `Siste: ${brevref(b)} fra ${PARTEN[part]}`,
  /** OV-U86. */
  dokumentasjonIkkeSendt: 'Saken har dokumentasjon som er registrert, men ikke sendt herfra.',
  /** MM-U44, OV-U4. */
  ikkeForstaatt: `Saken har en hendelse som ikke kan leses her. Kravene, svarene og fristene i saken vises derfor ikke. Brev kan ikke sendes herfra. Et varsel med frist sender du på annen måte, og legger til i saken etterpå med «${LEGG_TIL.tittel}».`,
  /** Lenkene som gjelder hele prosjektet, i topplinja (oppdragsgiver 13.11, #1899). */
  nyttKrav: 'Nytt krav om endringsordre',
  iCatenda: 'Åpne saken i Catenda',
  akseptfrist: (frist: string) => `Akseptfrist ${dato(frist)}`,
  ikkeTilgjengelig: 'Dette er ikke bygget i denne prøven av Varden ennå.',
});
