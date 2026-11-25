import { PARTEN, stor } from '#kjerne/frosset/brevdeler.ts';
import type { Part, Spor } from '#kjerne/typer.ts';
import type { Brevet, Brevref } from '../lesing';
import { FORHOLDET } from './forholdet';
import { KRAVET, brevref } from './felles';
import { SKJEMA } from './svaret';
import { TIDSLINJE } from './tidslinjen';
import { dato, kl, haerdet } from './format';

/**
 * Brevtråden, felles for sidene for forholdet, vederlaget og fristen (#1898, U-5, U-8 og U-16 i
 * BF-44, prototypen `vederlagsoversikt.html` i oppsett B).
 */
export const TRAADEN = haerdet({
  tittel: (spor: Spor) =>
    spor === 'forhold' ? 'Brevene i saken, nyeste først' : 'Brevene, nyeste først',
  /** Hva brevet er, kort: «Svar på krav om vederlagsjustering». Et registrert brev har partens beskrivelse. */
  hva: (b: Pick<Brevet, 'art' | 'spor' | 'avsender' | 'brevtittel' | 'beskrivelse'>) => {
    if (b.art === 'registrert') return b.beskrivelse || FORHOLDET.registrertTittel(b.avsender);
    const spor = (['forhold', 'vederlag', 'frist'] as const).filter((s) => b.spor.includes(s));
    if (b.brevtittel && spor.length <= 1) return b.brevtittel.replace(/ i sak \S+$/, '');
    const krav = spor.filter((s) => s !== 'forhold').map((s) => `krav om ${KRAVET[s]}`);
    if (b.art === 'krav' && spor.length)
      return spor.includes('forhold')
        ? ['Påberopelse av forholdet', ...krav].join(' og ')
        : stor(krav.join(' og '));
    if (b.art === 'svar' && spor.length)
      return `Svar på ${[...(spor.includes('forhold') ? ['påberopelsen'] : []), ...krav].join(' og ')}`;
    // Den frosne tittelen nevner saken, som tråden står i («Korrigering av datoen i sak KOE-17»).
    return TIDSLINJE.hva(b).replace(/ i sak \S+$/, '');
  },
  nummer: (n: number) => `brev ${n}`,
  siste: (b: Brevet) =>
    b.art === 'registrert'
      ? `${stor(PARTEN[b.lagtTilAv])} la til korrespondanse ${dato(b.registrert)}.`
      : `${stor(PARTEN[b.avsender])} sendte siste brev ${dato(b.registrert)}.`,
  /** Et eldre krav, oppdatert i et nytt brev med kravet (U-5 i BF-44). */
  fulgtOpp: (b: Brevref) => ` · oppdatert i ${brevref(b)}`,
  /** Avsenderen for skjermleseren, som ser ringen uten tekst (oppdragsgiver 13.11). */
  fra: (part: Part) => ` fra ${PARTEN[part]}`,
  // Samme tekst som ved brevet i skjemaene, med én kilde (#1909).
  les: SKJEMA.lesBrevetHer,
  lukk: SKJEMA.lukkBrevet,
  vises: 'Vises til høyre',
  /** Akseptfristen over handlingene ved byggherrens svar (U-11, U-16, HF-U23 punkt 4). */
  akseptfrist: 'Akseptfrist:',
  /**
   * Når brevet ble sendt og levert til Catenda, under hodet på brevet (G-5 og U-11 i BF-44,
   * HF-U23 punkt 4). Datoen står i raden, så linja har klokkeslettet, og datoen bare når
   * leveringen kom en annen dag.
   */
  levering: (sendt: string, levert: string | null) =>
    `Sendt ${kl(sendt)}. ` +
    (levert === null
      ? 'Ikke levert til Catenda ennå.'
      : `Levert til Catenda ${dato(levert) === dato(sendt) ? '' : `${dato(levert)} `}${kl(levert)}.`),
  /** Datoen TE oppgir, og avstanden til varselet, uten vurdering av fristen (U-8, MM-U50). */
  klarOver: (d: string, brev: Brevref, dager: number) =>
    `Totalentreprenøren ble klar over forholdet ${dato(d)}, ifølge ${brevref(brev)}.` +
    (dager < 0
      ? ''
      : dager === 0
        ? ' Varselet i dette brevet kom samme dag.'
        : ` Varselet i dette brevet kom ${dager} ${dager === 1 ? 'kalenderdag' : 'kalenderdager'} etter.`),
  knappenavn: (tekst: string, b: Pick<Brevet, 'nummer'>, hva: string) =>
    `${tekst}: ${b.nummer === null ? hva : `brev ${b.nummer}, ${hva}`}`,
  dokumentasjon: 'Dokumentasjon',
  registrert: (part: Part, sendt: string | null, lagtTil: string) =>
    sendt
      ? `Sendt ${dato(sendt)}, ifølge ${PARTEN[part]}. Lagt til ${dato(lagtTil)}.`
      : `Lagt til ${dato(lagtTil)}.`,
  vedlegg: (b: Pick<Brevet, 'nummer'>) =>
    b.nummer === null ? 'Vedlegg' : `Vedlegg til brev ${b.nummer}`,
  /** Brevet slik det ble sendt, i høyre kolonne og i raden under 1181 px (U-16). */
  brevet: 'Brevet',
  brevetSomSendt: (b: Pick<Brevet, 'nummer'>) =>
    b.nummer === null ? 'Brevet slik det ble sendt' : `Brev ${b.nummer} slik det ble sendt`,
});
