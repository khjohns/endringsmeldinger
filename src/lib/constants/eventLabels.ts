import type { EventType } from '$lib/types/timeline';

export const EVENT_TYPE_LABELS: Record<string, string> = {
	sak_opprettet: 'opprettet',
	grunnlag_opprettet: 'varslet',
	grunnlag_oppdatert: 'oppdatert',
	grunnlag_trukket: 'trukket',
	vederlag_krav_sendt: 'sendte krav',
	vederlag_krav_oppdatert: 'oppdaterte krav',
	vederlag_krav_trukket: 'trukket',
	frist_krav_sendt: 'sendte krav',
	frist_krav_oppdatert: 'oppdaterte krav',
	frist_krav_spesifisert: 'fremsatte krav',
	frist_krav_trukket: 'trukket',
	respons_grunnlag: 'responderte',
	respons_grunnlag_oppdatert: 'oppdaterte svar',
	respons_vederlag: 'responderte',
	respons_vederlag_oppdatert: 'oppdaterte svar',
	respons_frist: 'responderte',
	respons_frist_oppdatert: 'oppdaterte svar',
	forsering_varsel: 'varslet forsering',
	forsering_stoppet: 'stoppet forsering',
	forsering_respons: 'responderte forsering',
	te_aksepterer_respons: 'aksepterte',
};

export function getEventTypeLabel(eventType: EventType | null): string {
	if (!eventType) return 'hendelse';
	return EVENT_TYPE_LABELS[eventType] ?? 'hendelse';
}
