/**
 * Ordene brevteksten deler med linjen for byggherrens standpunkt og visningen: beløp og dager
 * med ordene i brevet, og ordningen av leddene etter laget. Linjen står i `frosset/linje.ts`.
 */

import { beloep } from '../regler/beloep.ts';
import type { Forholdsresultat } from '../regler/typer.ts';
import type { Hjemmel, Sakskode } from '../typer.ts';

/** Kroner med mellomrom mellom tusener og øre bare når de finnes: «150 000 kr». */
export function kroner(n: number): string {
  // Avrundet til hele øre som reglene runder (`beloep`), ikke som flyttallet.
  const i = beloep(n)!;
  const abs = i < 0n ? -i : i;
  const gruppert = String(abs / 100n).replace(/\B(?=(\d{3})+(?!\d))/g, '\u00a0');
  const oere = String(abs % 100n).padStart(2, '0');
  return `${i < 0n ? '−' : ''}${gruppert}${oere === '00' ? '' : `,${oere}`}\u00a0kr`;
}

/** «1 dag», «12 dager». Brevteksten og meldingen om en senket revisjon bruker samme ord (#628). */
export const dager = (n: number) => `${n} ${n === 1 ? 'dag' : 'dager'}`;

/** Svaret på forholdet med ordene i brevet (#628). */
export const SVARET_PAA_PAABEROPELSEN: Record<Forholdsresultat, string> = {
  godkjent: 'godkjent',
  avslaatt: 'avslått',
  paalegg_frafalt: 'pålegget frafalt (§ 32.3 c)',
};
/** Det byggherren gjør gjeldende kom for sent, i kortform av `VARSELET` i brevteksten (LV-U4 punkt 5). */
export const SENT_I_LINJEN: Record<Hjemmel, string> = {
  '32.2': 'varselet etter § 32.2',
  '33.4': 'varselet etter § 33.4',
  '33.6.2': 'svaret på forespørselen etter § 33.6.2',
  '34.1.2': 'varselet etter § 34.1.2',
  '34.1.3': 'varselet etter § 34.1.3',
  '34.3.3': 'varselet etter § 34.3.3',
  '34.4': 'varselet etter § 34.4',
};

/**
 * Leddene ordnet etter laget, så standpunktene i samme lag står under én etikett (OV-U32). Et
 * ledd uten lag står med sporets første lag, `foerste`, og aldri under en senere etikett
 * (OV-U33; spørsmål 8 i spørsmålsfila for #1663, 09.11). Ellers beholdes rekkefølgen.
 */
export function iLagene<T>(ledd: T[], plass: (l: T) => number | null, foerste: number): T[] {
  return ledd
    .map((l) => ({ l, k: plass(l) ?? foerste }))
    .sort((a, b) => a.k - b.k)
    .map(({ l }) => l);
}

/** Sakens kode slik brevene omtaler saken, uten utfylling: «KOE-17» (LV-U44, LV-U45). */
export const sakensKode = (s: Sakskode): string => `${s.kode.toUpperCase()}-${s.loepenummer}`;
