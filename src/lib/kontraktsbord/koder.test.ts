/**
 * Katalogen i frontenden beholder de gamle kodene, og kjernen oversetter dem på
 * grensen (#335). Testen blir rød når katalogen får en kode oversettelsen ikke
 * kjenner, eller et par kjernens lukkede liste ikke har.
 */
import { describe, expect, it } from 'vitest';
import {
  HOVEDKATEGORI_FRA_KATALOGEN,
  KATEGORIER,
  METODE_FRA_KATALOGEN,
  UNDERKATEGORI_FRA_KATALOGEN,
} from '$kjerne/format/koder';
import { KRAV_STRUKTUR_NS8407 } from '$lib/constants/categories';
import { VEDERLAGSMETODER_OPTIONS } from '$lib/constants/paymentMethods';

describe('oversettelsen fra katalogen til kjernens koder (#335)', () => {
  it.each(KRAV_STRUKTUR_NS8407.map((h) => [h.kode, h] as const))(
    'hovedkategorien %s og underkategoriene er et par i kjernen',
    (_kode, h) => {
      const hoved = HOVEDKATEGORI_FRA_KATALOGEN[h.kode];
      expect(hoved).toBeDefined();
      const kjernens: readonly string[] = KATEGORIER[hoved];
      expect(h.hjemler.map((u) => UNDERKATEGORI_FRA_KATALOGEN[u.kode])).toEqual([...kjernens]);
    }
  );

  it('kjenner hver vederlagsmetode i katalogen', () => {
    const metoder = VEDERLAGSMETODER_OPTIONS.map((o) => o.value).filter(Boolean);
    expect(metoder.map((m) => METODE_FRA_KATALOGEN[m])).toEqual([
      'enhetspriser',
      'regningsarbeid',
      'tilbud',
    ]);
  });
});
