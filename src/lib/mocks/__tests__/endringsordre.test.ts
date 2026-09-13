// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CreateEORequest } from '$lib/api/endringsordre';
import {
  availableDemoEOCandidates,
  demoEOCandidates,
  demoOrderToCaseList,
  issueDemoOrder,
  loadDemoOrders,
  nextDemoEONumber,
} from '../endringsordre';

const directOrder = (): CreateEORequest => ({
  eo_nummer: nextDemoEONumber(),
  beskrivelse: 'Byggherren pålegger endret fundamentering.',
  koe_sak_ids: [],
  konsekvenser: { pris: true, fremdrift: true, sha: false, kvalitet: false, annet: false },
  er_estimat: false,
});

beforeEach(() => {
  window.localStorage.clear();
  vi.restoreAllMocks();
});

describe('demo endringsordre', () => {
  it('persists an issued direct order with unresolved consequences and advances its number', () => {
    const result = issueDemoOrder(directOrder());
    expect(result).toMatchObject({ success: true, catenda_synced: false });
    expect(loadDemoOrders()).toHaveLength(1);
    const [saved] = loadDemoOrders();
    expect(saved).toMatchObject({
      sakId: result.sak_id,
      data: { status: 'utstedt', eo_nummer: 'EO-001', relaterte_koe_saker: [] },
    });
    expect(demoOrderToCaseList(saved)).toMatchObject({
      sak_id: result.sak_id,
      cached_sum_godkjent: null,
      cached_dager_godkjent: null,
      endringsordre_data: { netto_belop: null, frist_dager: null },
    });
    expect(nextDemoEONumber()).toBe('EO-002');
  });

  it('keeps explicit absence of consequences at zero in the register', () => {
    const payload = directOrder();
    payload.konsekvenser.pris = false;
    payload.konsekvenser.fremdrift = false;
    issueDemoOrder(payload);
    expect(demoOrderToCaseList(loadDemoOrders()[0])).toMatchObject({
      cached_sum_godkjent: 0,
      cached_dager_godkjent: 0,
    });
  });

  it('prevents duplicate numbers and reuse of KOE agreements from another open form', () => {
    const candidate = demoEOCandidates[0];
    expect(candidate).toBeDefined();
    const payload: CreateEORequest = {
      ...directOrder(),
      koe_sak_ids: [candidate.sak_id],
      kompensasjon_belop: candidate.sum_godkjent,
      fradrag_belop: 0,
      oppgjorsform: 'FASTPRIS_TILBUD',
      frist_dager: candidate.godkjent_dager ?? 0,
    };
    issueDemoOrder(payload);
    expect(availableDemoEOCandidates().map((item) => item.sak_id)).not.toContain(candidate.sak_id);
    expect(() => issueDemoOrder({ ...directOrder(), eo_nummer: ' eo-001 ' })).toThrow(
      /allerede brukt/
    );
    expect(() => issueDemoOrder({ ...payload, eo_nummer: nextDemoEONumber() })).toThrow(
      /ikke lenger tilgjengelig/
    );
    expect(loadDemoOrders()).toHaveLength(1);
  });

  it('recovers from malformed local data and reports storage failures without success', () => {
    issueDemoOrder(directOrder());
    const key = window.localStorage.key(0)!;
    window.localStorage.setItem(key, '{invalid');
    expect(loadDemoOrders()).toEqual([]);
    window.localStorage.setItem(key, JSON.stringify([null, { sakId: 'invalid', data: {} }]));
    expect(loadDemoOrders()).toEqual([]);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Quota exceeded', 'QuotaExceededError');
    });
    expect(() => issueDemoOrder(directOrder())).toThrow(/kunne ikke lagres/);
    expect(loadDemoOrders()).toEqual([]);
  });
});
