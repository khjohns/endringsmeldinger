/**
 * Serverens utregning av svaret og kontrollen av byggherrens vurderinger (B-13). Klienten
 * regner med de samme funksjonene, og serveren sammenlikner feltene i `SAMMENLIKNES`.
 */

import { beloep } from '../regler/beloep.ts';
import type { Regelsett } from '../regler/regelsett.ts';
import type { Foresporselsrelasjon } from './standpunkt.ts';
import { iSporet, type Svarsutregning, type Svarvurdering } from './byggeklosser.ts';
import { UTREGNING_I_FORHOLDET } from '../spor/forhold/frysing.ts';
import { SAMMENLIKNES_I_VEDERLAGET, UTREGNING_I_VEDERLAGET } from '../spor/vederlag/frysing.ts';
import { SAMMENLIKNES_I_FRISTEN, UTREGNING_I_FRISTEN } from '../spor/frist/frysing.ts';
import type { Krav, Spor } from '../typer.ts';

/**
 * En vurdering i svaret som kjernen ennå ikke har et standpunkt for. Den kan ikke
 * godtas og forenkles til et annet standpunkt, så kommandoen avvises. Formatet har
 * ingen art for den, så en lagret rad med den er ikke forstått (#304, review av
 * PR #306).
 */
export function utenforOmfanget(spor: Spor, v: Record<string, unknown>): string | null {
  return utregningI(spor).utenforOmfanget(v);
}

// ---------- Utregningen av svaret (B-13) ----------

/**
 * Serverens utregning av svaret, med navnene i formatet (`UTREGNING` i
 * `format.ts`). Forholdet har ingen utregning, bare kontrollen av
 * vurderingene. Kaster `UgyldigVurdering`, og `UgyldigBeloep` for et beløp i
 * vurderingene som ikke er et tall. Et krevd beløp som ikke kan leses, kaster `Error`.
 */
export function regnUtSvar(
  spor: Spor,
  v: Svarvurdering,
  {
    krav,
    paaberopelse,
    foresporsel = null,
  }: { krav: Krav; paaberopelse: Krav | null; foresporsel?: Foresporselsrelasjon | null },
  regler: Regelsett
): Record<string, unknown> {
  return utregningI(spor).regnUt(v, { krav, paaberopelse, foresporsel }, regler);
}

/** Utregningen i sporet (`iSporet`). */
const utregningI = (spor: Spor): Svarsutregning => iSporet(UTREGNING, spor);

/** Utregningen i hvert spor. */
const UTREGNING: Record<Spor, Svarsutregning> = {
  forhold: UTREGNING_I_FORHOLDET,
  vederlag: UTREGNING_I_VEDERLAGET,
  frist: UTREGNING_I_FRISTEN,
};

/** Feltene klienten skal ha regnet likt med serveren. Beløp sammenliknes til hele øre. */
export const SAMMENLIKNES: Record<Spor, string[]> = {
  forhold: [],
  vederlag: SAMMENLIKNES_I_VEDERLAGET,
  frist: SAMMENLIKNES_I_FRISTEN,
};

export function likeResultatfelt(felt: string, klient: unknown, server: unknown): boolean {
  if (felt.endsWith('_beloep') && typeof klient === 'number' && typeof server === 'number')
    return beloep(klient) === beloep(server);
  return klient === server;
}
