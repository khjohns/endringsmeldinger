import type { CreateEORequest, EOCandidate } from '$lib/api/endringsordre';
import type { EndringsordreData, VederlagsMetode } from '$lib/types/timeline';

export type ConsequenceChoice = 'ingen' | 'uavklart' | 'avklart';
export interface EODraft {
  mode: 'direkte' | 'avtale';
  number: string;
  description: string;
  selectedIds: string[];
  price: ConsequenceChoice;
  time: ConsequenceChoice;
  method: VederlagsMetode | '';
  addition: number | undefined;
  deduction: number | undefined;
  estimate: boolean;
  days: number | undefined;
  endDate: string;
  sha: boolean;
  quality: boolean;
  other: boolean;
  consequences: string;
  directEffects?: EOEffects;
  agreementEffects?: EOEffects;
}

export type EOEffects = Pick<
  EODraft,
  'price' | 'time' | 'method' | 'addition' | 'deduction' | 'estimate' | 'days' | 'endDate'
>;

export function snapshotEOEffects(draft: EODraft): EOEffects {
  const { price, time, method, addition, deduction, estimate, days, endDate } = draft;
  return { price, time, method, addition, deduction, estimate, days, endDate };
}

export const newEODraft = (): EODraft => ({
  mode: 'direkte',
  number: '',
  description: '',
  selectedIds: [],
  price: 'uavklart',
  time: 'uavklart',
  method: '',
  addition: undefined,
  deduction: undefined,
  estimate: false,
  days: undefined,
  endDate: '',
  sha: false,
  quality: false,
  other: false,
  consequences: '',
});

export const settlementLabels: Record<VederlagsMetode, string> = {
  ENHETSPRISER: 'Enhetspriser',
  REGNINGSARBEID: 'Regningsarbeid',
  FASTPRIS_TILBUD: 'Fastpris / avtalt beløp',
};

export function selectedEOCandidates(draft: EODraft, candidates: EOCandidate[]) {
  return candidates.filter((c) => draft.selectedIds.includes(c.sak_id));
}

export function validateEODraft(draft: EODraft, candidates: EOCandidate[]): string[] {
  const errors: string[] = [];
  if (!draft.number.trim()) errors.push('Fyll inn endringsordrenummer.');
  if (!draft.description.trim())
    errors.push('Beskriv endringen som pålegges eller avtalen som formaliseres.');
  if (draft.mode === 'avtale') {
    if (!draft.selectedIds.length) errors.push('Velg minst ett avtalt KOE-krav.');
    if (draft.selectedIds.some((id) => !candidates.some((c) => c.sak_id === id)))
      errors.push('Et valgt KOE-krav er ikke lenger tilgjengelig. Fjern det fra utvalget.');
    if (draft.price === 'uavklart' || draft.time === 'uavklart' || draft.estimate)
      errors.push('Avklar pris og frist før KOE-enigheten formaliseres.');
    const selected = selectedEOCandidates(draft, candidates);
    if (
      selected.some((c) => c.har_vederlagskrav || c.sum_godkjent !== 0) &&
      draft.price !== 'avklart'
    )
      errors.push('Registrer avtalt vederlag for de valgte KOE-kravene.');
    if (
      selected.some((c) => c.har_fristkrav || (c.godkjent_dager ?? 0) > 0) &&
      draft.time !== 'avklart'
    )
      errors.push('Registrer samlet fristforlengelse for de valgte KOE-kravene.');
    const agreed = selected.reduce((sum, c) => sum + Math.round(c.sum_godkjent * 100), 0);
    if (
      draft.price === 'avklart' &&
      Math.round(((draft.addition ?? 0) - (draft.deduction ?? 0)) * 100) !== agreed
    )
      errors.push(
        'Beløpet må samsvare med KOE-enigheten. Oppdater KOE-utvalget for å hente avtalte beløp.'
      );
  }
  const validAmount = (v: number | undefined) => v == null || (Number.isFinite(v) && v >= 0);
  if (draft.price === 'avklart') {
    if (!draft.method) errors.push('Velg oppgjørsform.');
    if (draft.addition == null && draft.deduction == null)
      errors.push('Fyll inn tillegg eller fradrag, også dersom beløpet er 0.');
    if (!validAmount(draft.addition) || !validAmount(draft.deduction))
      errors.push('Beløp må være gyldige, ikke-negative tall.');
  }
  if (draft.time === 'avklart') {
    if (draft.days == null || !Number.isSafeInteger(draft.days) || draft.days < 0)
      errors.push('Fyll inn samlet fristforlengelse i hele dager, også dersom den er 0.');
    if (
      draft.endDate &&
      (!/^\d{4}-\d{2}-\d{2}$/.test(draft.endDate) ||
        Number.isNaN(Date.parse(draft.endDate)) ||
        new Date(draft.endDate).toISOString().slice(0, 10) !== draft.endDate)
    )
      errors.push('Ny sluttdato må være en gyldig dato.');
  }
  return errors;
}

export function buildEORequest(draft: EODraft): CreateEORequest {
  return {
    eo_nummer: draft.number.trim(),
    beskrivelse: draft.description.trim(),
    koe_sak_ids: draft.mode === 'avtale' ? [...new Set(draft.selectedIds)] : [],
    konsekvenser: {
      pris: draft.price !== 'ingen',
      fremdrift: draft.time !== 'ingen',
      sha: draft.sha,
      kvalitet: draft.quality,
      annet: draft.other,
    },
    konsekvens_beskrivelse: draft.consequences.trim() || undefined,
    oppgjorsform: draft.price === 'avklart' ? draft.method || undefined : undefined,
    kompensasjon_belop: draft.price === 'avklart' ? (draft.addition ?? 0) : undefined,
    fradrag_belop: draft.price === 'avklart' ? (draft.deduction ?? 0) : undefined,
    er_estimat: draft.price === 'avklart' && draft.estimate,
    frist_dager: draft.time === 'avklart' ? draft.days : undefined,
    ny_sluttdato: draft.time === 'avklart' ? draft.endDate || undefined : undefined,
  };
}

/** Null is unknown; zero is a real, agreed amount. Ignore the backend's computed zero for nulls. */
export function eoAmount(data: EndringsordreData): number | null {
  if (data.kompensasjon_belop != null || data.fradrag_belop != null)
    return (data.kompensasjon_belop ?? 0) - (data.fradrag_belop ?? 0);
  return data.konsekvenser.pris ? null : 0;
}
