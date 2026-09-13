import type { CreateEORequest, EOCandidate } from '$lib/api/endringsordre';
import { eoAmount, newEODraft, validateEODraft } from '$lib/domain/endringsordre';
import { SCENARIOS } from '$lib/mockup/scenarios';
import type { CaseListItem } from '$lib/types/api';
import type { EndringsordreData } from '$lib/types/timeline';

export interface DemoOrder {
  sakId: string;
  data: EndringsordreData;
}

const STORAGE_KEY = 'endringsmeldinger.demo.endringsordre.v1';

export const demoEOCandidates: EOCandidate[] = SCENARIOS.filter(
  ({ sak }) => sak.kan_utstede_eo && sak.overordnet_status === 'OMFORENT'
).map(({ sak }) => ({
  sak_id: sak.sak_id,
  tittel: sak.sakstittel,
  overordnet_status: sak.overordnet_status,
  sum_godkjent: sak.sum_godkjent,
  godkjent_dager: sak.frist.godkjent_dager ?? null,
  har_vederlagskrav: sak.vederlag.krevd_belop != null,
  har_fristkrav: sak.frist.krevd_dager != null,
}));

function isDemoOrder(value: unknown): value is DemoOrder {
  if (!value || typeof value !== 'object') return false;
  const { sakId, data } = value as Partial<DemoOrder>;
  return (
    typeof sakId === 'string' &&
    !!data &&
    typeof data.eo_nummer === 'string' &&
    typeof data.beskrivelse === 'string' &&
    data.status === 'utstedt' &&
    Array.isArray(data.relaterte_koe_saker) &&
    data.relaterte_koe_saker.every((id) => typeof id === 'string') &&
    !!data.konsekvenser &&
    ['pris', 'fremdrift', 'sha', 'kvalitet', 'annet'].every(
      (key) => typeof data.konsekvenser[key as keyof typeof data.konsekvenser] === 'boolean'
    )
  );
}

/** Demo orders belong to this browser and never use the project's API. */
export function loadDemoOrders(): DemoOrder[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored: unknown = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '[]');
    return Array.isArray(stored) ? stored.filter(isDemoOrder) : [];
  } catch {
    return [];
  }
}

function availableCandidates(orders: DemoOrder[]): EOCandidate[] {
  const linkedIds = new Set(orders.flatMap(({ data }) => data.relaterte_koe_saker));
  return demoEOCandidates.filter((candidate) => !linkedIds.has(candidate.sak_id));
}

export function availableDemoEOCandidates(): EOCandidate[] {
  return availableCandidates(loadDemoOrders());
}

export function nextDemoEONumber(): string {
  const usedNumbers = new Set(
    loadDemoOrders().map(({ data }) => data.eo_nummer.toLocaleUpperCase('nb-NO'))
  );
  let number = 1;
  while (usedNumbers.has(`EO-${String(number).padStart(3, '0')}`)) number += 1;
  return `EO-${String(number).padStart(3, '0')}`;
}

export function issueDemoOrder(payload: CreateEORequest): {
  success: true;
  sak_id: string;
  catenda_synced: false;
} {
  if (typeof window === 'undefined') throw new Error('Åpne demoen i nettleseren for å utstede.');
  // Read again when issuing: another form or tab may have used a number or KOE in the meantime.
  const orders = loadDemoOrders();
  const eoNumber = payload.eo_nummer.trim();
  if (
    orders.some(
      ({ data }) =>
        data.eo_nummer.toLocaleUpperCase('nb-NO') === eoNumber.toLocaleUpperCase('nb-NO')
    )
  ) {
    throw new Error('Endringsordrenummeret er allerede brukt. Velg et annet nummer.');
  }
  const errors = validateEODraft(
    {
      ...newEODraft(),
      mode: payload.koe_sak_ids.length ? 'avtale' : 'direkte',
      number: eoNumber,
      description: payload.beskrivelse,
      selectedIds: payload.koe_sak_ids,
      price: !payload.konsekvenser.pris
        ? 'ingen'
        : payload.kompensasjon_belop != null || payload.fradrag_belop != null
          ? 'avklart'
          : 'uavklart',
      time: !payload.konsekvenser.fremdrift
        ? 'ingen'
        : payload.frist_dager != null
          ? 'avklart'
          : 'uavklart',
      method: payload.oppgjorsform ?? '',
      addition: payload.kompensasjon_belop,
      deduction: payload.fradrag_belop,
      estimate: payload.er_estimat,
      days: payload.frist_dager,
      endDate: payload.ny_sluttdato ?? '',
    },
    availableCandidates(orders)
  );
  if (errors.length) throw new Error(errors.join(' '));

  const { koe_sak_ids, ...details } = payload;
  const order: DemoOrder = {
    sakId: `demo-eo-${crypto.randomUUID()}`,
    data: {
      ...details,
      eo_nummer: eoNumber,
      beskrivelse: payload.beskrivelse.trim(),
      relaterte_koe_saker: [...new Set(koe_sak_ids)],
      revisjon_nummer: 0,
      status: 'utstedt',
      dato_utstedt: new Date().toISOString(),
      utstedt_av: 'Byggherren',
    },
  };
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...orders, order]));
  } catch {
    throw new Error(
      'Demoordren kunne ikke lagres. Tillat lokal lagring i nettleseren og prøv igjen.'
    );
  }
  return { success: true, sak_id: order.sakId, catenda_synced: false };
}

export function demoOrderToCaseList({ sakId, data }: DemoOrder): CaseListItem {
  const amount = eoAmount(data);
  const days = data.frist_dager ?? (data.konsekvenser.fremdrift ? null : 0);
  return {
    sak_id: sakId,
    sakstype: 'endringsordre',
    cached_title: data.beskrivelse,
    cached_status: data.status,
    created_at: data.dato_utstedt ?? null,
    created_by: data.utstedt_av ?? 'BH',
    last_event_at: data.dato_utstedt ?? null,
    cached_sum_krevd: amount,
    cached_sum_godkjent: amount,
    cached_dager_krevd: days,
    cached_dager_godkjent: days,
    cached_hovedkategori: 'ENDRING',
    cached_underkategori: null,
    cached_forsering_paalopt: null,
    cached_forsering_maks: null,
    endringsordre_data: {
      status: data.status,
      eo_nummer: data.eo_nummer,
      relaterte_koe_saker: data.relaterte_koe_saker,
      netto_belop: amount,
      frist_dager: days,
      er_estimat: data.er_estimat,
    },
  };
}
