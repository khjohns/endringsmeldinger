import { GRENSEN_FOR_VEDLEGG } from './felles';
import { haerdet } from './format';

/** Skjemaet for ny sak (BF-05, skissen versjon 3 med funnene F-1–F-8). */
export const NYSAK = haerdet({
  over: 'Ny sak',
  tittel: 'Nytt krav om endringsordre',
  forholdet: 'Forholdet du påberoper',
  forholdetHjelp: 'Velg bestemmelsen i kontrakten pålegget eller forholdet faller inn under.',
  sok: 'Søk etter forhold eller punkt',
  ingenTreff: 'Ingen forhold passer med søket.',
  antallTreff: (n: number) =>
    n === 0
      ? NYSAK.ingenTreff
      : n === 1
        ? 'Ett forhold passer med søket.'
        : `${n} forhold passer med søket.`,
  endre: 'Endre',
  staarFastInnledning: 'Forholdet står fast når brevet er sendt.',
  staarFast: 'Vil du påberope et annet forhold senere, oppretter du en ny sak.',
  sakstittel: 'Tittel på saken',
  sakstittelHjelp: 'Står i sakslisten og i brevet.',
  beskrivelseHjelp: 'Hva som skjedde, når og hvordan, og hvorfor du mener det er en endring.',
  endringsordre: 'Endringsordrens nummer eller dato',
  /** GR-U40 punkt 7: endringsordren står fast, som forholdet. */
  endringsordreHjelp: 'Står fast når brevet er sendt.',
  vedlegg: 'Vedlegg',
  vedleggHjelp: `For eksempel pålegget selv, en tegning eller et referat. Hver fil kan være opptil ${GRENSEN_FOR_VEDLEGG}.`,
  velgFiler: 'Velg filer',
  lasterOpp: (filnavn: string) => `Laster opp ${filnavn} …`,
  fjernVedlegg: 'Fjern',
  fjernVedleggNavn: (filnavn: string) => `Fjern ${filnavn}`,
  forStorFil: (filnavn: string) =>
    `${filnavn} er større enn ${GRENSEN_FOR_VEDLEGG}. Velg en mindre fil.`,
  vedleggFeilet: (filnavn: string, melding: string) => `${filnavn} ble ikke lastet opp. ${melding}`,
  ventPaaOpplastingen: 'Vent til vedleggene er lastet opp.',
  /** LV-U46: en annen sak fikk nummeret før brevet ble sendt. */
  ingenMerking: 'Sakens nummer kunne ikke hentes, så brevet kan ikke vises.',
  // Panelet til høyre, som i de andre skjemaene i Varden (F-1).
  panel: 'Hovedlinjene i påberopelsen',
  panelTom: 'Velg forholdet, så står påberopelsen her.',
  // Tidslinja under panelet, med datoene TE fyller ut (oppdragsgiver 02.11, #1492).
  tidslinjeDato: (paalegg: boolean) => (paalegg ? 'Mottok pålegget' : 'Klar over forholdet'),
  oppgisIBrevet: 'Oppgis i påberopelsen',
  tidslinjeSendes: 'Påberopelsen sendes',
  naarDuSender: 'I dag, når du sender',
  linjeForholdet: 'Forholdet',
  linjeTittel: 'Tittel på saken',
  // Der punkt 32.2 gjelder, sier brevet at TE varsler etter bestemmelsen (GR-U31, D-6).
  linjeVarsel: 'Varsel',
  varslerEtter322: 'Brevet varsler etter punkt 32.2',
  linjeVedlegg: 'Vedlegg',
  ingenVedlegg: 'Ingen vedlegg',
  sendesTil: 'Saken opprettes og brevet sendes til byggherren når du sender.',
  seBrevet: 'Se brevet før sending',
  avbryt: 'Avbryt',
  forkastTittel: 'Forkaste den nye saken?',
  forkastTekst:
    'Saken opprettes ikke, og brevet sendes ikke. Det du har skrevet, slettes. Det kan ikke gjøres om.',
  mangler: 'Dette mangler før brevet kan lages:',
  velgForholdet: 'Velg forholdet.',
  skrivTittelen: 'Skriv tittelen.',
  beskriv: (paalegg: boolean) => (paalegg ? 'Beskriv pålegget.' : 'Beskriv forholdet.'),
  oppgiDatoen: 'Oppgi datoen.',
  oppgiEndringsordren: 'Oppgi endringsordren.',
  virkning: 'Saken opprettes når brevet sendes, og forholdet står fast etter sendingen.',
  sendTekst: 'Send til byggherren',
  tilbakeTil: 'skjemaet',
  kvittering: 'Påberopelsen er sendt. Brevet sendes til Catenda.',
  avbrutt: 'Brevet er ikke sendt, og ingen sak er opprettet.',
});
