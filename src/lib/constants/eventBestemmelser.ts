import type { EventType } from '$lib/types/timeline';

export interface Bestemmelse {
	paragraf: string;
	tekst: string;
}

/**
 * Mapping from EventType to relevant NS 8407 paragraph + short description.
 * Used by the Forhåndsvisningspanel to show legal context for each event.
 */
export const EVENT_BESTEMMELSER: Partial<Record<EventType, Bestemmelse>> = {
	grunnlag_opprettet: {
		paragraf: 'NS 8407 §32.2',
		tekst: 'Varsling: Totalentreprenøren skal uten ugrunnet opphold varsle om krav som følge av byggherrens forhold.',
	},
	grunnlag_oppdatert: {
		paragraf: 'NS 8407 §32.2',
		tekst: 'Varsling: Totalentreprenøren skal uten ugrunnet opphold varsle om krav som følge av byggherrens forhold.',
	},
	vederlag_krav_sendt: {
		paragraf: 'NS 8407 §34.1',
		tekst: 'Krav om vederlagsjustering: Totalentreprenøren skal spesifisere kravet innen rimelig tid etter varsling.',
	},
	vederlag_krav_oppdatert: {
		paragraf: 'NS 8407 §34.1',
		tekst: 'Krav om vederlagsjustering: Totalentreprenøren skal spesifisere kravet innen rimelig tid etter varsling.',
	},
	frist_krav_sendt: {
		paragraf: 'NS 8407 §33.4',
		tekst: 'Varsling av fristkrav: Totalentreprenøren skal varsle uten ugrunnet opphold dersom det oppstår forhold som kan gi grunnlag for fristforlengelse.',
	},
	frist_krav_oppdatert: {
		paragraf: 'NS 8407 §33.6',
		tekst: 'Spesifisering av fristkrav: Krav skal spesifiseres innen rimelig tid etter varsling, med dokumentasjon for kravets omfang.',
	},
	frist_krav_spesifisert: {
		paragraf: 'NS 8407 §33.6',
		tekst: 'Spesifisering av fristkrav: Totalentreprenøren skal spesifisere sitt krav innen rimelig tid etter varsling.',
	},
	respons_grunnlag: {
		paragraf: 'NS 8407 §32.3',
		tekst: 'Byggherrens svarplikt: Byggherren skal svare uten ugrunnet opphold på totalentreprenørens varsel.',
	},
	respons_vederlag: {
		paragraf: 'NS 8407 §34.2',
		tekst: 'Byggherrens standpunkt: Byggherren skal ta stilling til kravet innen rimelig tid.',
	},
	respons_frist: {
		paragraf: 'NS 8407 §33.7',
		tekst: 'Byggherrens standpunkt: Byggherren skal ta stilling til kravet om fristforlengelse innen rimelig tid.',
	},
};

export function getEventBestemmelse(eventType: EventType | null): Bestemmelse | null {
	if (!eventType) return null;
	return EVENT_BESTEMMELSER[eventType] ?? null;
}
