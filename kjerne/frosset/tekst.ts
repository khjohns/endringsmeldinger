/**
 * Ordene brevteksten deler med linjen for byggherrens standpunkt og visningen: beløp og dager
 * med ordene i brevet, og ordningen av leddene etter laget. Linjen står i `frosset/linje.ts`.
 */

import { beloep } from '../regler/beloep.ts';
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

/** Det byggherren gjør gjeldende kom for sent, i kortform av `VARSELET` i brevteksten (LV-U4 punkt 5). */
export const SENT_I_LINJEN: Record<Hjemmel, string> = {
  '32.2': 'varselet etter punkt 32.2',
  '33.4': 'varselet etter punkt 33.4',
  '33.6.2': 'svaret på forespørselen etter punkt 33.6.2',
  '34.1.2': 'varselet etter punkt 34.1.2',
  '34.1.3': 'varselet etter punkt 34.1.3',
  '34.3.3': 'varselet etter punkt 34.3.3',
  '34.4': 'varselet etter punkt 34.4',
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

/**
 * Lagslinjen i byggherrens svar (LV-U34, LV-U40): etiketten, eventuelt med innsigelsene laget
 * bygger på. Visningen og PDF-en viser den for seg.
 */
export const erLagslinje = (avsnitt: string): boolean =>
  /^(Prinsipalt|Subsidiært|Videre subsidiært)(, hvis .+ fører frem)?$/.test(avsnitt);

/** Punktet med oversiktstabellen i svaret (OV-U73). Cellene står adskilt med tabulator. */
export const OVERSIKTEN = 'oversikt';

/** Radene og cellene i oversiktstabellen; den første raden er kolonnene, den siste summen. */
export const cellene = (tabell: string): string[][] =>
  tabell.split('\n').map((rad) => rad.split('\t'));

/** Et punkt for en kravpost har kravpostens faste betegnelse som navn (KA-U53). */
export const erKravpostpunkt = (punkt: string | undefined): boolean =>
  punkt !== undefined && /^P[1-9]\d*$/.test(punkt);
