import { stor } from '#kjerne/frosset/brevdeler.ts';
import { dager } from '#kjerne/frosset/tekst.ts';
import type { Standpunkt } from '#kjerne/typer.ts';
import type { Brevref } from '../lesing';
import type { Innsigelsen } from '../svarlagene';
import { VEDERLAGET } from './vederlaget';
import { brevref } from './felles';
import { dato, hjemmelsmerke, haerdet } from './format';
import { liten } from './fristkrav';
import { standpunkttekst } from './standpunkt';

/** Datoen uten året når året er det samme som i `ved`: «16. august» ved siden av «26. august 2027». */
const datoUtenAar = (d: string, ved: string) =>
  d.slice(0, 4) === ved.slice(0, 4) ? dato(d).replace(/ \d{4}$/, '') : dato(d);

/** Siden for fristforlengelsen (BF-45, prototypen `fristoversikt.html` v2, oppsett B). */
export const FRISTEN = haerdet({
  tittel: 'Fristforlengelse',
  hjemmel: hjemmelsmerke('33'),
  kortet: 'Kravet og svaret',
  /** Kortet før kravet, når totalentreprenøren har varslet uten dager (U-9). */
  utenKrav: 'Kravet om fristforlengelse',
  ikkeAngitt: (varsel: Brevref) =>
    `Dagene er ikke angitt. Totalentreprenøren varslet i ${brevref(varsel)}.`,
  forAlle: 'For alle fristene',
  perFrist: 'Per frist',
  krevd: 'Krevd',
  /** Laget når svaret har ett (U-4). */
  godkjent: 'Byggherren godkjenner',
  ikkeSvart: 'Byggherren har ikke svart på dette kravet.',
  /** Fristen med nummeret i Del II punkt E.1, som overskrift for blokken (U-4). */
  frist: (nummer: string | null) => (nummer ? `Frist ${nummer}` : 'Frist'),
  /** Dagene og den nye fristen ved dagene (U-5): «20 dager · ny frist 15. september 2027». */
  nyFrist: (d: string) => `ny frist ${dato(d)}`,
  /** Dagene i kravet ved brevet i tråden, i rekkefølgen i brevet (U-12). */
  kravdagene: (frister: { nummer: string | null; navn: string; dager: number }[]) =>
    frister.map((f) => `${f.nummer ? `Frist ${f.nummer}` : f.navn}: ${dager(f.dager)}.`).join(' '),
  /** Varselet etter punkt 33.4 uten dager ved brevet i tråden (U-8). */
  varselUtenDager: 'Varsel etter punkt 33.4. Antall dager er ikke oppgitt.',
  kalenderdager: 'Dagene er kalenderdager. Ny frist er regnet fra gjeldende frist.',
  /** Gjeldende frist uten forlengelser i andre saker (U-5). */
  somIKontrakten: (d: string) => `Gjeldende frist er ${dato(d)}. Det er datoen i kontrakten.`,
  /** Gjeldende frist med forlengelsene i andre saker, før lenkene til sakene (U-5). */
  forlenget: (d: string, iKontrakten: string) =>
    `Gjeldende frist er ${dato(d)}. I kontrakten er fristen ${datoUtenAar(iKontrakten, d)}.`,
  forlengelsen: (n: number) => `forlenget fristen med ${dager(n)}.`,
  sak: 'Sak',
  ukjent: (iKontrakten: string) =>
    `Fristen er ${dato(iKontrakten)} i kontrakten. Gjeldende frist kan ikke regnes nå, fordi en annen sak i prosjektet ikke kan leses.`,
  ikkeRegistrert: 'Gjeldende frist er ikke kjent, fordi fristen ikke er registrert for prosjektet.',
  /**
   * Innsigelsen et senere lag gjelder hvis ikke fører frem, med ordene i prototypen: «innsigelsen
   * om varselet» (U-3, U-4).
   */
  innsigelsen: (i: Innsigelsen) =>
    i.art === 'varsel'
      ? `innsigelsen om ${i.hjemmel === '33.6.2' ? 'svaret på forespørselen' : 'varselet'}`
      : VEDERLAGET.innsigelsen(i),
  /** Vilkåret for et lag under «Per frist»: «hvis innsigelsen om varselet ikke fører frem» (U-4). */
  vilkaar: (innsigelser: Innsigelsen[], heller: boolean) =>
    liten(VEDERLAGET.vilkaar(innsigelser.map(FRISTEN.innsigelsen), heller)),
  /** Det laget bygger på, i brevets ord, og de dagene byggherren godkjenner i det siste laget. */
  grunnlaget: (standpunkter: Standpunkt[], sist: boolean) =>
    standpunkter.length
      ? `${standpunkter
          .map((s, i) =>
            s.art === 'spesifisering' && !s.iTide
              ? `${i ? 'byggherren' : 'Byggherren'} gjør gjeldende at kravet ble spesifisert for sent (punkt 33.6.1), og godkjenner dagene byggherren måtte forstå`
              : i
                ? liten(standpunkttekst(s, false))
                : standpunkttekst(s, false)
          )
          .join(', og ')}.`
      : sist
        ? 'dagene byggherren godkjenner.'
        : '',
  /** Et standpunkt uten eget lag, med vilkåret foran (U-3, OV-U42). */
  utenLag: (s: Standpunkt, vilkaar: Innsigelsen[]) =>
    vilkaar.length
      ? `${VEDERLAGET.vilkaar(vilkaar.map(FRISTEN.innsigelsen), false)}, ${standpunkttekst(s, false, undefined, undefined, true)}.`
      : `${standpunkttekst(s, false)}.`,
  /**
   * Avslaget av dagene for én frist, med laget først og begrunnelsen slik den står i brevet (U-13,
   * MM-U50).
   */
  avslag: (etikett: string | null, begrunnelse: string | null) =>
    `${etikett ? `${stor(etikett)} avslår byggherren` : 'Byggherren avslår'} dagene for fristen` +
    (begrunnelse ? `: ${begrunnelse}` : '.'),
  /** Linja under «Oppdater kravet» (U-6, svar 4 A). */
  endreEllerTaUt: 'I det nye kravet kan du endre dagene eller ta ut en frist.',
  /** Handlingen under forespørselen etter punkt 33.6.2 (U-6), og linja under den (BF-20). */
  svarPaaForesporsel: 'Svar på forespørselen',
  virkningForesporsel:
    'Nytt brev med dagene for hver frist og begrunnelsen. Kan du ikke beregne dagene ennå, begrunner du det (punkt 33.6.2 annet ledd).',
  /** Linja ved «Trekk kravet», før og etter byggherrens svar (U-6, prototypen). */
  trekk: 'Du gir avkall på kravet om fristforlengelse.',
  trekkEtterSvar:
    'Du gir avkall på hele kravet om fristforlengelse, også det byggherren har godkjent.',
  /** Linja under raden for forsering etter punkt 33.8 (U-6, svar 3 A, OV-U2). */
  forseringLinje: 'Forsering er ikke bygget i Varden og sendes som egen sak.',
  /** Veiledningen under forespørselen etter punkt 33.6.2 (U-9, V-1 A). */
  foresporsel: (d: string, dagerSiden: number) =>
    `Byggherren ba om dagene ${dato(d)}, ${dagerSiden <= 0 ? 'i dag' : `for ${dagerSiden} ${dagerSiden === 1 ? 'dag' : 'dager'} siden`}. Svarer totalentreprenøren ikke uten ugrunnet opphold, tapes kravet på fristforlengelse (punkt 33.6.2 tredje ledd).`,
});
