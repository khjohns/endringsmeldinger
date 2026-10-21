import type { ApprovalUser } from '$lib/approval/types';
import type { EOKonsekvenser, VederlagsMetode } from '$lib/types/timeline';

export interface EOCandidate {
  sak_id: string;
  tittel: string;
  overordnet_status: string;
  sum_godkjent: number;
  godkjent_dager: number | null;
  har_vederlagskrav?: boolean;
  har_fristkrav?: boolean;
}

export interface CreateEORequest {
  eo_nummer: string;
  beskrivelse: string;
  koe_sak_ids: string[];
  konsekvenser: EOKonsekvenser;
  konsekvens_beskrivelse?: string;
  oppgjorsform?: VederlagsMetode;
  kompensasjon_belop?: number;
  fradrag_belop?: number;
  er_estimat: boolean;
  frist_dager?: number;
  ny_sluttdato?: string;
}

export type EOApprovalStatus =
  | 'til_godkjenning'
  | 'returnert'
  | 'trukket'
  | 'godkjent'
  | 'utstedelse_feilet'
  | 'utstedt';

export interface EOApprovalPackage {
  id: string;
  status: EOApprovalStatus;
  owner: string;
  ownerName?: string;
  createdAt: string;
  previousId?: string | null;
  request: CreateEORequest;
  steps: (ApprovalUser & { status: 'venter' | 'aktiv' | 'godkjent'; decidedAt?: string })[];
  comment?: string;
  returnedBy?: string;
  sakId?: string;
  issuedAt?: string;
  error?: string | null;
}

export interface EOApprovalResponse {
  state: { version: number; packages: EOApprovalPackage[] };
  actor: string;
  sender: ApprovalUser | null;
  chain: ApprovalUser[];
  canPrepare: boolean;
  dailyRate: number | null;
}

export type EOApprovalCommand =
  | { action: 'submit'; request: CreateEORequest; previousId?: string }
  | { action: 'approve' | 'withdraw' | 'retry'; packageId: string }
  | { action: 'return'; packageId: string; comment: string };
