import type { Brevref } from '../lesing';
import { brevref, brevrefStor } from './felles';
import { dato, haerdet } from './format';

/** Skjemaet for korrigeringen av datoen (BF-02A, skissen `korrigering-av-datoen.html`). */
const DATOEN: Record<'paalegg_mottatt' | 'klar_over_forholdet', string> = {
  paalegg_mottatt: 'pålegget ble mottatt',
  klar_over_forholdet: 'du ble klar over forholdet',
};

export const KORRIGERING = haerdet({
  tittel: (hva: keyof typeof DATOEN) => `Korriger datoen ${DATOEN[hva]}`,
  duKorrigerer: 'Du korrigerer',
  opplysningen: (o: { hva: keyof typeof DATOEN; dato: string }) =>
    `${dato(o.dato)}, datoen du oppga for når ${DATOEN[o.hva]}`,
  oppgittI: 'Oppgitt i',
  brevet: (b: Brevref) => `${brevrefStor(b)} av ${dato(b.registrert)}`,
  /** U-2: et eget brev, og påberopelsen og svaret står som de ble sendt (MM-U55 punkt 10–11). */
  egetBrev: (paaberopelse: Brevref, svar: Brevref | null) =>
    `Korrigeringen sendes som et eget brev til byggherren. ${
      svar
        ? `Påberopelsen i ${brevref(paaberopelse)} og svaret i ${brevref(svar)} står som de ble sendt.`
        : `Påberopelsen i ${brevref(paaberopelse)} står som den ble sendt.`
    } Den nye datoen gjelder straks som din siste opplysning.`,
  lukket: 'Saken står lukket. Korrigeringen endrer ikke utfallet.',
  nyDato: (hva: keyof typeof DATOEN) => `Ny dato for når ${DATOEN[hva]}`,
  datoHjelp: 'Datoen kan ikke være etter dagens dato.',
  forklaring: 'Forklaring',
  forklaringHjelp: 'Forklaringen står i brevet under den nye datoen.',
  skrivDatoen: (hva: keyof typeof DATOEN) => `Skriv datoen ${DATOEN[hva]}.`,
  uendret: (o: { hva: keyof typeof DATOEN; dato: string; brev: Brevref }) =>
    `Datoen er den samme som i ${brevref(o.brev)}, ${dato(o.dato)}. Skriv datoen ${DATOEN[o.hva]}.`,
  etterIdag: 'Datoen er etter dagens dato. Skriv en dato fram til i dag.',
  kanIkkeLages: 'Brevet kan ikke lages ennå.',
  forkastTekst:
    'Datoen og forklaringen du har skrevet i utkastet, slettes. Det kan ikke gjøres om.',
  panel: 'Hovedlinjene i korrigeringen',
  panelTom: 'Skriv den nye datoen, så står korrigeringen her.',
  linjeNy: (hva: keyof typeof DATOEN, d: string) => `Ny dato for når ${DATOEN[hva]}: ${dato(d)}`,
  linjeTidligere: (o: { dato: string; brev: Brevref }) =>
    `Tidligere oppgitt ${dato(o.dato)} i ${brevref(o.brev)}`,
  linjeForklaring: 'Forklaringen din står under den nye datoen',
  seBrevet: 'Se brevet før sending',
  sendTekst: 'Send korrigeringen til byggherren',
  tilbakeTil: 'utkastet',
  /** U-4: datoen er TEs siste opplysning, og påberopelsen og svaret står som de ble sendt. */
  kvittering: (d: string, hva: keyof typeof DATOEN, lukket: boolean, harSvar: boolean) =>
    `Korrigeringen er sendt til byggherren. ${dato(d)} er nå din siste opplysning om når ${DATOEN[hva]}. ${lukket ? 'Saken står lukket, og utfallet er det samme.' : harSvar ? 'Påberopelsen og svaret står som de ble sendt.' : 'Påberopelsen står som den ble sendt.'}`,
});
