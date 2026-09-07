import type { SporType } from '$lib/types/timeline';

export interface BrevSeksjon {
  tittel: string;
  originalTekst: string;
  redigertTekst: string;
}

export interface BrevSeksjoner {
  innledning: BrevSeksjon;
  begrunnelse: BrevSeksjon;
  avslutning: BrevSeksjon;
}

export interface BrevPart {
  navn: string;
  rolle: 'TE' | 'BH';
  adresse?: string;
  orgnr?: string;
}

export interface BrevReferanser {
  sakId: string;
  sakstittel: string;
  eventId: string;
  sporType: SporType;
  dato: string;
  kravDato?: string;
}

export interface BrevInnhold {
  tittel: string;
  mottaker: BrevPart;
  avsender: BrevPart;
  referanser: BrevReferanser;
  seksjoner: BrevSeksjoner;
}

export function isSeksjonEdited(seksjon: BrevSeksjon): boolean {
  return seksjon.redigertTekst !== seksjon.originalTekst;
}

export function resetSeksjon(seksjon: BrevSeksjon): BrevSeksjon {
  return { ...seksjon, redigertTekst: seksjon.originalTekst };
}

export function hasEdits(seksjoner: BrevSeksjoner): boolean {
  return (
    isSeksjonEdited(seksjoner.innledning) ||
    isSeksjonEdited(seksjoner.begrunnelse) ||
    isSeksjonEdited(seksjoner.avslutning)
  );
}
