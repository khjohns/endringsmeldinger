import { describe, it, expect } from 'vitest';
import {
  newEODraft,
  buildEORequest,
  validateEODraft,
  eoAmount,
  eoExposure,
} from '../endringsordre';
import type { EndringsordreData } from '$lib/types/timeline';

const draft = () => ({ ...newEODraft(), number: 'EO-001', description: 'Endret fundament' });
const candidates = [
  {
    sak_id: 'KOE-1',
    tittel: 'Fundament',
    overordnet_status: 'OMFORENT',
    sum_godkjent: 120000,
    godkjent_dager: 7,
  },
];

describe('endringsordre', () => {
  it.each([undefined, 0, 7])(
    'requires full approval for absolute dates even with %s days',
    (days) => {
      const request = buildEORequest({
        ...draft(),
        price: 'avklart',
        method: 'ENHETSPRISER',
        addition: 150000,
        time: 'ingen',
      });
      expect(
        eoExposure(
          {
            ...request,
            ny_sluttdato: '2035-01-01',
            frist_dager: days,
            konsekvenser: { ...request.konsekvenser, fremdrift: false },
          },
          10000
        )
      ).toBeNull();
    }
  );
  it('keeps unresolved effects distinct from zero and drops hidden, stale input', () => {
    const form = { ...draft(), addition: 9999, days: 12, selectedIds: ['KOE-1'] };
    expect(validateEODraft(form, [])).toEqual([]);
    const request = buildEORequest(form);
    expect(request.konsekvenser).toMatchObject({ pris: true, fremdrift: true });
    expect(request.koe_sak_ids).toEqual([]);
    expect(request.kompensasjon_belop).toBeUndefined();
    expect(request.frist_dager).toBeUndefined();
    expect(eoAmount({ ...request, netto_belop: 0 } as unknown as EndringsordreData)).toBeNull();
    expect(eoAmount({ ...request, kompensasjon_belop: 0 } as unknown as EndringsordreData)).toBe(0);
  });
  it('supports a deduction-only direct order and an explicit zero-day extension', () => {
    const form = {
      ...draft(),
      price: 'avklart' as const,
      time: 'avklart' as const,
      method: 'FASTPRIS_TILBUD' as const,
      deduction: 15000,
      days: 0,
    };
    expect(validateEODraft(form, [])).toEqual([]);
    expect(buildEORequest(form)).toMatchObject({
      kompensasjon_belop: 0,
      fradrag_belop: 15000,
      frist_dager: 0,
    });
  });
  it('requires selected agreed cases and explicit combined days', () => {
    const form = {
      ...draft(),
      mode: 'avtale' as const,
      selectedIds: ['KOE-1'],
      price: 'avklart' as const,
      addition: 120000,
      method: 'ENHETSPRISER' as const,
      time: 'avklart' as const,
    };
    expect(validateEODraft(form, candidates).join(' ')).toMatch(/hele dager/);
    expect(validateEODraft({ ...form, days: 5 }, candidates)).toEqual([]);
    expect(validateEODraft({ ...form, days: 5 }, []).join(' ')).toMatch(/ikke lenger tilgjengelig/);
    expect(validateEODraft({ ...form, days: 5, addition: 130000 }, candidates).join(' ')).toMatch(
      /samsvare/
    );
    expect(validateEODraft({ ...form, days: 5, estimate: true }, candidates).join(' ')).toMatch(
      /Avklar/
    );
  });
  it('preserves accepted zero-value claims as settled consequences', () => {
    const zero = [
      {
        ...candidates[0],
        sum_godkjent: 0,
        godkjent_dager: 0,
        har_vederlagskrav: true,
        har_fristkrav: true,
      },
    ];
    const form = {
      ...draft(),
      mode: 'avtale' as const,
      selectedIds: ['KOE-1'],
      price: 'ingen' as const,
      time: 'ingen' as const,
    };
    expect(validateEODraft(form, zero)).toHaveLength(2);
  });
  it('rejects non-finite amounts, fractional days and invalid calendar dates', () => {
    const form = {
      ...draft(),
      price: 'avklart' as const,
      time: 'avklart' as const,
      method: 'FASTPRIS_TILBUD' as const,
      addition: Infinity,
      days: 1.5,
      endDate: '2026-02-30',
    };
    expect(validateEODraft(form, [])).toHaveLength(3);
  });
});
