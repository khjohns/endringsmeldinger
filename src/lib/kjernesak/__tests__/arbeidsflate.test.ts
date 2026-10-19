/**
 * Kontrollrommets sakskontekst for en TS-sak (FK-8b, #718). Etter en ny lasting
 * som feiler, viser hele Kontrollrommet saken slik den sist ble lest.
 */

import { describe, expect, it } from 'vitest';
import { ApiError } from '$lib/api/client';
import type { Journallinje, Kjernesak } from '$lib/api/kjerne';
import type { Journalrad, Part } from '$kjerne/typer';
import { lagKjernesakflate } from '$lib/kjernesak/arbeidsflate.svelte';
import { lagKjernesak } from '$lib/kjernesak/kontekst.svelte';
import { SAK, medVederlag } from './provejournal';

const svar = (journal: Journalrad[], part: Part | null): Kjernesak => ({
  versjon: journal.length,
  part,
  visning: {} as Kjernesak['visning'],
  journal: journal.map(
    ({ event_id, versjon, event_type, tidsstempel, aktor_rolle, format, data }): Journallinje => ({
      event_id,
      versjon,
      event_type,
      tidsstempel,
      aktor_rolle,
      format,
      data,
    })
  ),
  leveringsoppdrag: [],
});

describe('TS-saken i Kontrollrommet etter en ny lasting', () => {
  it('når saken ikke finnes ved en ny lasting, står statusteksten og kravversjonen fra forrige lesing (#732 p10)', async () => {
    let finnes = true;
    const kjernesak = lagKjernesak({
      sakId: SAK,
      prosjektId: 'p-1',
      hent: async () => {
        if (!finnes) throw new ApiError(404, 'Saken finnes ikke.');
        return svar(medVederlag, 'TE');
      },
    });
    await kjernesak.last();
    const flate = lagKjernesakflate(kjernesak, 'p-1');
    const foer = flate.statustekst('vederlag');
    expect(foer).not.toBe('');
    expect(flate.kravversjon('vederlag')).toBe(1);

    finnes = false;
    await kjernesak.last();
    // En sak som alt er lastet, beholdes ved en 404 (#719).
    expect(kjernesak.finnes).toBe(true);
    expect(flate.statustekst('vederlag')).toBe(foer);
    expect(flate.kravversjon('vederlag')).toBe(1);
  });

  it('bare TE får tilbud om TE-handlingene, uansett hva kjernen tilbyr (#737 p3)', async () => {
    for (const [part, tilbys] of [
      ['TE', true],
      ['BH', false],
      [null, false],
    ] as const) {
      const kjernesak = lagKjernesak({
        sakId: SAK,
        prosjektId: 'p-1',
        hent: async () => svar(medVederlag.slice(0, 2), part),
      });
      await kjernesak.last();
      expect(lagKjernesakflate(kjernesak, 'p-1').tilbyrTe('krav:vederlag')).toBe(tilbys);
    }
  });
});
