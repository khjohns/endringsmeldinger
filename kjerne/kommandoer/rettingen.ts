/**
 * Forutsetningen for TEs retting av datoen for et varsel eller et krav lagt til som
 * korrespondanse (punkt 8, 18 og 24 i samlevedtaket for retting av sendt brev, MM-U59, og D-1, D-2
 * og D-8 i BF-50). Kontrollen av datoen står i `nyttelast.ts`.
 */

import { dokumenterI, erRegistrert } from '../format/leser.ts';
import { avvis, SPOR, type Avvisning, type Krav, type Varselhjemmel } from '../typer.ts';
import type { Utledning } from '../utledning/utled.ts';

/** Varselet eller kravet en retting gjelder, med hjemmelen for et varsel. */
export type DetSomRettes =
  | { art: 'varsel'; hjemmel: Varselhjemmel; element: Pick<Krav, 'id' | 'dokument'> }
  | { art: 'krav'; element: Krav };

/**
 * D-1 og D-2 i BF-50: varselet eller kravet `id` TE har sendt utenfor løsningen og lagt til som
 * korrespondanse, med virkning i saken, eller `undefined`. Et varsel sendt fra løsningen og
 * datoen i et krav sendt fra løsningen rettes ikke (punkt 15 og 18).
 */
export function detSomRettes(u: Utledning, id: string): DetSomRettes | undefined {
  const lagtTil = new Set(
    [...dokumenterI(u.journal)].filter((d) => erRegistrert(d.opplysninger)).map((d) => d.id)
  );
  for (const spor of SPOR) {
    const s = u.spor[spor];
    const krav = [...s.krav, ...s.kravUtenforRekken].find((k) => k.id === id);
    if (krav) return lagtTil.has(krav.dokument) ? { art: 'krav', element: krav } : undefined;
    const varsel = [...Object.values(s.varsler), ...s.kravpostvarsler].find((v) => v?.id === id);
    if (varsel)
      return lagtTil.has(varsel.dokument)
        ? { art: 'varsel', hjemmel: varsel.hjemmel, element: varsel }
        : undefined;
  }
  return undefined;
}

/**
 * Punkt 8 og 18 i samlevedtaket for retting av sendt brev (MM-U59): rettingen viser til et varsel
 * eller et krav TE har lagt til. Den godtas også i en sak lukket etter GR-U27 og i en KOE-sak en
 * endringsordre omfatter (punkt 24, EO-U39 punkt 68, D-8 i BF-50), så ingen av dem sperrer.
 */
export function rettingen(gjelder: string, u: Utledning): Avvisning | null {
  return detSomRettes(u, gjelder)
    ? null
    : avvis(
        'UGYLDIG_HENVISNING',
        'Datoen kan bare rettes for et varsel eller et krav totalentreprenøren har sendt utenfor løsningen og lagt til.'
      );
}
