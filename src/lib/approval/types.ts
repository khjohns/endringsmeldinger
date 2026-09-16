import type { EventType, SporType } from '$lib/types/timeline';

export interface ApprovalUser {
  id: string;
  name: string;
  role: string;
}
export interface ReviewItem {
  id: string;
  track: SporType;
  eventType: EventType;
  data: Record<string, unknown>;
  claimId: string;
  claimVersion: number;
  status: 'kladd' | 'ferdigstilt' | 'til_godkjenning' | 'erstattet' | 'sendt';
  createdAt: string;
  owner: string;
  previousId?: string;
  form?: Record<string, unknown>;
  attachments?: { id: string; navn: string }[];
  basis?: {
    claimId: string;
    resultat: string | null;
    varsletITide: boolean | null;
    hovedkategori: string | null;
  };
}
export interface LetterDocument {
  authorityContext?: {
    dailyRate: number | null;
    claimedMoney: number;
    claimedDays: number;
    matrixVersion: string;
  };
  title: string;
  caseId: string;
  caseTitle: string;
  sender: string;
  recipient: string;
  date: string;
  introduction: string;
  closing: string;
  items: ReviewItem[];
}
export interface ApprovalPackage {
  id: string;
  status: 'til_godkjenning' | 'returnert' | 'trukket' | 'godkjent' | 'publisering_feilet' | 'sendt';
  owner: string;
  createdAt: string;
  sentAt?: string;
  previousId?: string;
  letter: LetterDocument;
  steps: (ApprovalUser & { status: 'venter' | 'aktiv' | 'godkjent'; decidedAt?: string })[];
  comment?: string;
  returnedBy?: string;
  error?: string;
  eventIds?: string[];
  notificationStatus?: 'sending' | 'delivered' | 'not_configured' | 'failed';
}
export interface ApprovalState {
  version: number;
  drafts?: Record<string, { introduction: string; closing: string; included: string[] }>;
  items: ReviewItem[];
  packages: ApprovalPackage[];
}
export const emptyApprovalState = (): ApprovalState => ({ version: 0, items: [], packages: [] });
export const trackNames: Record<SporType, string> = {
  grunnlag: 'Ansvarsgrunnlag',
  vederlag: 'Økonomi',
  frist: 'Frist',
};
export const packageLabels: Record<ApprovalPackage['status'], string> = {
  til_godkjenning: 'Til godkjenning',
  returnert: 'Returnert',
  trukket: 'Trukket',
  godkjent: 'Godkjent – klargjøres for sending',
  publisering_feilet: 'Sending feilet',
  sendt: 'Sendt',
};
export const demoUsers: ApprovalUser[] = [
  { id: 'saksbehandler@example.test', name: 'Kari Hansen', role: 'Prosjektleder' },
  { id: 'prosjektleder@example.test', name: 'Ola Nilsen', role: 'Prosjektdirektør' },
  { id: 'prosjekteier@example.test', name: 'Anne Berg', role: 'Avdelingsleder' },
];
