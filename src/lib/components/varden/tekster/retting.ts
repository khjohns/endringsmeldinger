import { liste, stor } from '#kjerne/frosset/brevdeler.ts';
import type { Varselhjemmel } from '#kjerne/typer.ts';
import type { Brevref } from '../lesing';
import { brevref } from './felles';
import { dato, haerdet } from './format';

/**
 * TEs retting av datoen for et varsel eller et krav lagt til som korrespondanse, i tråden, i
 * skjemaet og i svarskjemaet (BF-50). Ordlyden avgjøres i byggingen (U-1–U-6, U-10).
 */
type Det = { art: 'varsel'; hjemmel: Varselhjemmel } | { art: 'krav' };
type Datoen = { dato: string; brev: Brevref; retting: boolean };

const hva = (d: Det) => (d.art === 'varsel' ? `varselet etter punkt ${d.hjemmel}` : 'kravet');
const iBrevet = (d: Datoen) =>
  d.retting ? `rettet i ${brevref(d.brev)}` : 'oppgitt da brevet ble lagt til';

export const RETTING = haerdet({
  // Tråden (U-1, U-5).
  rett: 'Rett datoen',
  rettNavn: (d: Det) => `Rett datoen for ${hva(d)}`,
  /** Foran linjene når brevet har mer enn ett varsel eller krav med rettet dato. */
  gjelderDet: (d: Det) => `${stor(hva(d))}:`,
  /** Foran datoen som gjelder, som står uthevet etter teksten. */
  gjelder: 'Datoen som gjelder, er',
  /** Hver dato i rekkefølge, den opprinnelige først, med brevet den sto i (U-5). */
  historikken: (datoene: readonly Datoen[]) => {
    const [oppgitt, ...rettinger] = datoene;
    return `Oppgitt ${dato(oppgitt!.dato)}. Rettet ${liste(
      rettinger.map((d) => `til ${dato(d.dato)} i ${brevref(d.brev)}`)
    )}.`;
  },
  retter: (d: Det, brev: Brevref, fra: string, til: string) =>
    `Retter datoen for ${hva(d)} i ${brevref(brev)} fra ${dato(fra)} til ${dato(til)}.`,
  rettetIgjen: (b: Brevref) => `Rettet på nytt i ${brevref(b)}.`,

  vedSvaret: (d: Det, dag: string, b: Brevref) =>
    `Da svaret ble sendt, var datoen for ${hva(d)} ${dato(dag)}. Datoen sto i ${brevref(b)}.`,

  // Svarskjemaet (U-6).
  iSvaret: (d: Datoen, hva: 'varselet' | 'kravet' | 'påberopelsen') =>
    `Datoen som gjelder for ${hva}, er ${dato(d.dato)}. Den er rettet i ${brevref(d.brev)}.`,

  // Kravskjemaet (U-10).
  fast: (d: Datoen, etter: number | null) =>
    `Varselet ble sendt ${dato(d.dato)}. Datoen er rettet i ${brevref(d.brev)}.${etter === null ? '' : ` Det var ${etter} kalenderdager etter at du ble klar over forholdet.`}`,
  egetBrevLenke: 'Rett datoen i et eget brev',

  // Skjemaet (U-2, U-4, U-9).
  gjelderRad: 'Gjelder',
  detSomRettes: (d: Det, b: Brevref) => `${stor(hva(d))} i ${brevref(b)}`,
  datoenRad: 'Datoen som gjelder',
  datoenVerdi: (d: Datoen) => `${dato(d.dato)}, ${iBrevet(d)}`,
  egetBrev: (b: Brevref) =>
    `Rettingen sendes i et eget brev til byggherren. ${stor(brevref(b))} står som det ble lagt til.`,
  straks: 'Den nye datoen gjelder straks som din siste opplysning, også når den er tidligere.',
  lukket: 'Saken står lukket. Brevet endrer ikke utfallet.',
  endringsordre: (kode: string) =>
    `Saken inngår i endringsordre ${kode}. Brevet endrer ikke utfallet.`,
  etikett: 'Ny dato',
  datoHjelp: 'Datoen kan ikke være etter dagens dato.',
  forklaring: 'Forklaring',
  forklaringHjelp: 'Forklaringen står i brevet under den nye datoen.',
  skrivDatoen: 'Skriv den nye datoen.',
  uendret: (d: Datoen) =>
    `Datoen er den samme som datoen som gjelder, ${dato(d.dato)}. Skriv en annen dato.`,
  etterIdag: (valgt: string, idag: string) =>
    `Datoen ${dato(valgt)} er etter dagens dato, ${dato(idag)}. Skriv en dato fram til i dag.`,
  kanIkkeLages: 'Brevet kan ikke lages ennå.',
  forkastTekst:
    'Datoen og forklaringen du har skrevet i utkastet, slettes. Det kan ikke gjøres om.',
  panel: 'Hovedlinjene i brevet',
  panelTom: 'Skriv den nye datoen, så står brevet her.',
  linjeNy: (d: string) => `Ny dato: ${dato(d)}`,
  linjeGjelder: (d: Datoen) => `Datoen som gjelder nå: ${dato(d.dato)}`,
  linjeForklaring: 'Forklaringen din står under datoen',
  tidslinje: (d: Det) => (d.art === 'varsel' ? 'Varselet sendt' : 'Kravet sendt'),
  tidslinjeKilde: 'Den nye datoen i rettingen',
  seBrevet: 'Se brevet før sending',
  sendTekst: 'Send brevet til byggherren',
  tilbakeTil: 'utkastet',
  /** U-4: datoen gjelder straks, og i en lukket sak endres ikke utfallet. */
  kvittering: (d: string, lukket: boolean, endringsordre?: string) =>
    [
      `Brevet er sendt til byggherren. ${dato(d)} er nå datoen som gjelder.`,
      ...(lukket ? ['Saken står lukket, og utfallet er det samme.'] : []),
      ...(endringsordre
        ? [`Saken inngår i endringsordre ${endringsordre}. Utfallet er det samme.`]
        : []),
    ].join(' '),
});
