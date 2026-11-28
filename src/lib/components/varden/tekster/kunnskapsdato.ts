import type { Brevref } from '../lesing';
import { brevref } from './felles';
import { dato, haerdet } from './format';

/**
 * Datoen TE ble klar over at utgiftene etter punkt 34.1.3 annet ledd ville påløpe, i tråden, i
 * skjemaene og i svarskjemaet (BF-48). Ordlyden avgjøres i byggingen (U-1 og U-5).
 */
type Opplysningen = { dato: string; brev: Brevref };

const LUKKET =
  'Saken står lukket. Brevet endrer ikke utfallet. Byggherren kan ta stilling til datoen i et innlegg.';

const KUNNSKAPSDATO_IKKE_OPPGITT = 'Totalentreprenøren har ikke oppgitt når utgiftene ble kjent.';

export const KUNNSKAPSDATO = haerdet({
  // Tråden (U-7, U-8).
  oppgitt: (d: string) =>
    `Klar over at utgiftene ville påløpe ${dato(d)}, ifølge totalentreprenøren.`,
  ikkeOppgitt: KUNNSKAPSDATO_IKKE_OPPGITT,
  endrer: (forrige: Opplysningen | null) =>
    forrige
      ? `Endrer ${dato(forrige.dato)}, oppgitt i ${brevref(forrige.brev)}.`
      : 'Datoen var ikke oppgitt før.',
  endretI: (b: Brevref) => `Endret i ${brevref(b)}.`,
  /** Ved varselet uten datoen, når TE har oppgitt den i et eget brev senere (U-7). */
  oppgittSenere: (o: Opplysningen) =>
    `Brevet oppgir ikke når utgiftene ble kjent. Totalentreprenørens siste opplysning er ${dato(o.dato)}, i ${brevref(o.brev)}.`,
  oppgi: 'Oppgi datoen',
  endre: 'Endre datoen',
  handlingNavn: (oppgitt: boolean) =>
    `${oppgitt ? 'Endre' : 'Oppgi'} datoen du ble klar over at utgiftene ville påløpe`,
  /** Hva brevet gjør med saken (D-4 og D-6 i BF-48), og `null` når byggherren ikke har svart. */
  staar: (lukket: boolean, svar: Brevref | null): string | null =>
    lukket
      ? LUKKET
      : svar
        ? `Svaret i ${brevref(svar)} endres ikke. Byggherren kan ta stilling til datoen i et senere svar.`
        : null,
  /** U-8: TEs siste opplysning da svaret ble sendt, når TE har oppgitt en ny dato etter det. */
  vedSvaret: (o: Opplysningen | null) =>
    o
      ? `Da svaret ble sendt, var totalentreprenørens siste opplysning at utgiftene ble kjent ${dato(o.dato)}, oppgitt i ${brevref(o.brev)}.`
      : 'Da svaret ble sendt, hadde totalentreprenøren ikke oppgitt når utgiftene ble kjent.',

  // Svarskjemaet (U-9).
  stoettetittel: 'Varselet etter punkt 34.1.3',
  iSvaret: (o: Opplysningen | null) =>
    o
      ? `Totalentreprenøren oppgir å ha blitt klar over at utgiftene ville påløpe ${dato(o.dato)}, i ${brevref(o.brev)}.`
      : KUNNSKAPSDATO_IKKE_OPPGITT,

  // Kravskjemaet (U-1, U-10).
  etikett: 'Når ble du klar over at utgiftene ville påløpe?',
  hjelp: 'Datoen står i brevet etter varselet.',
  /** U-6: datoen i korrespondanse som alt er sendt, sammenlignet med datoen den ble sendt (VS-U83). */
  etterSendt: (valgt: string, sendt: string) =>
    `Datoen ${dato(valgt)} er etter datoen korrespondansen ble sendt, ${dato(sendt)}. Skriv en dato fram til den.`,
  etterBrevet: (valgt: string, sendes: string) =>
    `Datoen ${dato(valgt)} er etter datoen brevet sendes, ${dato(sendes)}. Skriv en dato fram til den.`,
  fast: (o: Opplysningen | null) =>
    o
      ? `Klar over at utgiftene ville påløpe ${dato(o.dato)}, oppgitt i ${brevref(o.brev)}.`
      : 'Du har ikke oppgitt når du ble klar over at utgiftene ville påløpe.',
  egetBrevLenke: (oppgitt: boolean) => `${oppgitt ? 'Endre' : 'Oppgi'} datoen i et eget brev`,

  // Skjemaet for det egne brevet (U-5, U-6).
  gjelder: 'Gjelder',
  varselet: (b: Brevref) => `Varselet etter punkt 34.1.3 i ${brevref(b)} av ${dato(b.registrert)}`,
  sisteOpplysning: 'Sist oppgitt',
  opplysningen: (o: Opplysningen | null) =>
    o ? `${dato(o.dato)}, i ${brevref(o.brev)}` : 'Ikke oppgitt',
  egetBrev: (svar: Brevref | null) =>
    `Datoen sendes i et eget brev til byggherren. ${
      svar
        ? `Varselet og svaret i ${brevref(svar)} står som de ble sendt.`
        : 'Varselet står som det ble sendt.'
    } Den nye datoen gjelder straks som din siste opplysning.`,
  lukket: 'Saken står lukket. Brevet endrer ikke utfallet.',
  datoHjelp: 'Datoen kan ikke være etter dagens dato.',
  forklaring: 'Forklaring',
  forklaringHjelp: 'Forklaringen står i brevet under datoen.',
  skrivDatoen: 'Skriv datoen du ble klar over at utgiftene ville påløpe.',
  uendret: (o: Opplysningen) =>
    `Datoen er den samme som i ${brevref(o.brev)}, ${dato(o.dato)}. Skriv en annen dato.`,
  etterIdag: (valgt: string, idag: string) =>
    `Datoen ${dato(valgt)} er etter dagens dato, ${dato(idag)}. Skriv en dato fram til i dag.`,
  kanIkkeLages: 'Brevet kan ikke lages ennå.',
  forkastTekst:
    'Datoen og forklaringen du har skrevet i utkastet, slettes. Det kan ikke gjøres om.',
  panel: 'Hovedlinjene i brevet',
  panelTom: 'Skriv datoen, så står brevet her.',
  linjeNy: (d: string) => `Klar over at utgiftene ville påløpe: ${dato(d)}`,
  linjeTidligere: (o: Opplysningen | null) =>
    o ? `Tidligere oppgitt ${dato(o.dato)} i ${brevref(o.brev)}` : 'Ikke oppgitt før',
  linjeForklaring: 'Forklaringen din står under datoen',
  seBrevet: 'Se brevet før sending',
  sendTekst: 'Send brevet til byggherren',
  tilbakeTil: 'utkastet',
  /** U-7: datoen er TEs siste opplysning, og svaret byggherren alt har gitt, står. */
  kvittering: (d: string, lukket: boolean, harSvar: boolean) =>
    [
      `Brevet er sendt til byggherren. ${dato(d)} er nå din siste opplysning om når du ble klar over at utgiftene ville påløpe.`,
      ...(lukket
        ? ['Saken står lukket, og utfallet er det samme.']
        : harSvar
          ? ['Svaret byggherren har gitt, står som det ble sendt.']
          : []),
    ].join(' '),
});
