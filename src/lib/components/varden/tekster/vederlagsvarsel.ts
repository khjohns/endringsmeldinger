import type { Brevref } from '../lesing';
import { brevref } from './felles';
import { haerdet } from './format';
import { KRAVSKJEMA } from './kravskjema';

/**
 * «Bare varsle» i kravskjemaet for vederlaget (BF-37, prototypen `varsler-i-ett-brev.html`). Navnene
 * på varslene er `varselnavn` i kravskjemaet, og oppsummeringen viser ikke punktnummeret (U-9).
 */
export const VEDERLAGSVARSEL = haerdet({
  // U-1: valget øverst i kravskjemaet.
  hvaSender: 'Hva sender du?',
  hva: {
    krav: 'Send kravet',
    varsel: 'Bare varsle, uten krav',
  },
  tittel: 'Varsel',
  tittelRegistrert: 'Registrer et varsel sendt utenfor løsningen',
  // U-2, U-3: varslene i brevet.
  varslene: 'Varslene i brevet',
  radhjelp: 'Ett varsel per rad. Hvert varsel står som et eget avsnitt i brevet.',
  radhjelpRegistrert: 'Ett varsel per rad, slik dokumentet varslet dem.',
  hvaVarsler: 'Hva varsler du?',
  arbeid: 'Arbeidet varselet gjelder',
  arbeidHjelp:
    'Står i brevet. Velg ett varsel per arbeid, så du senere kan si hvilket varsel en kravpost gjelder.',
  arbeidHjelpRegistrert:
    'Velg ett varsel per arbeid, så du senere kan si hvilket varsel en kravpost gjelder.',
  leggTil: 'Legg til et varsel',
  endre: 'Endre',
  ferdig: 'Ferdig',
  fjern: 'Fjern',
  endreRaden: (navn: string) => `Endre ${navn.charAt(0).toLowerCase()}${navn.slice(1)}`,
  fjernRaden: (navn: string) => `Fjern ${navn.charAt(0).toLowerCase()}${navn.slice(1)}`,
  /** U-9: det som står under navnet, i raden og i oppsummeringen. */
  manglerArbeid: 'Mangler arbeidet varselet gjelder',
  arbeidIkkeOppgitt: 'Arbeidet er ikke oppgitt',
  gjelderHele: KRAVSKJEMA.gjelderHele,
  gjelderSaerskilt: 'Gjelder den særskilte vederlagsjusteringen',
  /** Et varsel som alt er gitt i saken (U-3, D-2). */
  gitt: (navn: string, b: Brevref | null, arbeid: string | undefined) =>
    `${navn} er gitt${b ? ` i ${brevref(b)}` : ''}${arbeid ? `: ${arbeid}` : ''}.`,
  ingenFlere: 'Saken kan ikke ha flere varsler etter bestemmelsene her nå.',
  // U-5: hvordan varselet gis.
  hvordan: 'Hvordan varsler du?',
  velgEn: 'Velg én',
  maate: {
    send: 'Send brevet fra løsningen nå',
    registrer: 'Registrer et varsel sendt utenfor løsningen',
  },
  ingenBrevtekst:
    'Løsningen lager ingen brevtekst for et registrert dokument. Dokumentet er det du meddelte.',
  avsnittPerVarsel: 'Hvert varsel står som et eget avsnitt i brevet, med arbeidet det gjelder.',
  // Panelet (U-9).
  panel: 'Varslene',
  antall: (n: number, registrert: boolean) =>
    `${n === 1 ? 'Ett varsel' : `${n} varsler`} i ${registrert ? 'det registrerte dokumentet' : 'brevet'}.`,
  tomt: 'Ingen varsler ennå.',
  ingenVarsler: 'Legg til minst ett varsel.',
  registrer: 'Registrer varslene',
  registrert: 'Varslene er registrert.',
  forkastTekst: 'Forkast utkastet til varselet',
  virkning: 'Hvert varsel står som et eget avsnitt i brevet. Kravet sender du senere.',
  // Tidslinja.
  sendes: 'Varslene sendes',
  oppgisIVarselet: 'Oppgis i varselet',
});
