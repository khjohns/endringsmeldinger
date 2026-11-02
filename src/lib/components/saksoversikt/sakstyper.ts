/**
 * Sakstypene i panelet (KT-U9). Kjernen lagrer i dag bare `standard`, som er
 * KOE-saken (`kjerne/format/format.ts`). EO-saken og forseringen får sin lagrede
 * verdi når de bygges (#1423), og står til da med null saker.
 */
import type { Sakslinje } from '$lib/types/api';

export type Sakstype = 'koe' | 'eo' | 'forsering';

export const SAKSTYPER: { id: Sakstype; navn: string }[] = [
  { id: 'koe', navn: 'Krav om endringsordre' },
  { id: 'eo', navn: 'Endringsordrer' },
  { id: 'forsering', navn: 'Forsering' },
];

const LAGRET = new Map<string, Sakstype>([['standard', 'koe']]);

/** En lagret verdi panelet ikke kjenner, gir ingen type, og saken telles ikke i noen. */
export const sakstypeFor = (linje: Sakslinje): Sakstype | null =>
  LAGRET.get(linje.sakstype) ?? null;

export const sakerAvType = (saker: readonly Sakslinje[], type: Sakstype): Sakslinje[] =>
  saker.filter((linje) => sakstypeFor(linje) === type);

export const antallSakerTekst = (n: number) => `${n} ${n === 1 ? 'sak' : 'saker'}`;
