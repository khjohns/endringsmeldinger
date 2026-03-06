import type { CaseListItem } from '$lib/types/api';

export type SporHendelseType = 'K' | 'V' | 'F';
export type SaksoversiktVisning = 'tidslinje' | 'tabell';

export interface SaksoversiktHendelse {
	type: SporHendelseType;
	dato: string;
	label: string;
	besvart?: boolean;
}

export interface SaksoversiktItem extends CaseListItem {
	hendelser: SaksoversiktHendelse[];
	cached_begrunnelse?: string | null;
}

const d = (year: number, month: number, day: number) =>
	new Date(year, month - 1, day).toISOString();

export const mockSaksoversikt: SaksoversiktItem[] = [
	{
		sak_id: 'KOE-2024-047',
		sakstype: 'standard',
		cached_title: 'Endrede grunnforhold ved akse C5–C8',
		cached_status: 'SENDT',
		cached_hovedkategori: 'SVIKT',
		cached_underkategori: 'GRUNNFORHOLD',
		cached_sum_krevd: 2400000,
		cached_sum_godkjent: null,
		cached_dager_krevd: 45,
		cached_dager_godkjent: null,
		cached_forsering_paalopt: null,
		cached_forsering_maks: null,
		cached_begrunnelse:
			'Ved boring for pelefundament akse C5–C8 ble det påtruffet uforutsette grunnforhold (leire med høyt vanninnhold) som avviker vesentlig fra geoteknisk rapport vedlagt kontrakten. Krevde endret fundamenteringsmetode og forsterket spuntvegg.',
		created_at: '2025-11-15T09:00:00Z',
		created_by: 'Knut Larsen',
		last_event_at: d(2026, 3, 4),
		hendelser: [
			{ type: 'K', dato: d(2025, 11, 15), label: 'Varslet endring', besvart: true },
			{ type: 'K', dato: d(2025, 12, 2), label: 'Dokumenterte grunnlag', besvart: true },
			{ type: 'F', dato: d(2025, 12, 10), label: 'Varslet fristforlengelse' },
			{ type: 'V', dato: d(2026, 1, 8), label: 'Sendte vederlagskrav' },
			{ type: 'F', dato: d(2026, 1, 20), label: 'Spesifiserte fristkrav' },
			{ type: 'V', dato: d(2026, 3, 4), label: 'Reviderte krav' },
		],
	},
	{
		sak_id: 'KOE-2024-031',
		sakstype: 'standard',
		cached_title: 'Tilleggskrav — forsinkede tegningsleveranser',
		cached_status: 'UNDER_BEHANDLING',
		cached_hovedkategori: 'ENDRING',
		cached_underkategori: 'PROSJEKTERING',
		cached_sum_krevd: 850000,
		cached_sum_godkjent: null,
		cached_dager_krevd: 30,
		cached_dager_godkjent: 20,
		cached_forsering_paalopt: null,
		cached_forsering_maks: null,
		cached_begrunnelse:
			'Byggherre leverte reviderte tegninger for etasje 3–5 henholdsvis 18 og 24 arbeidsdager etter avtalt frist. Forsinkelsen medførte venting, omplanlegging og økt riggkostnad for TE.',
		created_at: '2025-11-07T08:00:00Z',
		created_by: 'Maria Andersen',
		last_event_at: d(2026, 3, 1),
		hendelser: [
			{ type: 'K', dato: d(2025, 11, 7), label: 'Varslet endring', besvart: true },
			{ type: 'K', dato: d(2025, 11, 20), label: 'BH godkjente grunnlag', besvart: true },
			{ type: 'V', dato: d(2025, 12, 5), label: 'Sendte vederlagskrav', besvart: true },
			{ type: 'F', dato: d(2025, 12, 5), label: 'Varslet frist', besvart: true },
			{ type: 'V', dato: d(2026, 1, 15), label: 'BH delvis godkjente', besvart: true },
			{ type: 'F', dato: d(2026, 2, 1), label: 'BH godkjente frist', besvart: true },
			{ type: 'V', dato: d(2026, 3, 1), label: 'TE reviderte krav' },
		],
	},
	{
		sak_id: 'KOE-2024-019',
		sakstype: 'standard',
		cached_title: 'Tilleggsarbeider — omlegging av VA-ledninger',
		cached_status: 'OMFORENT',
		cached_hovedkategori: 'ENDRING',
		cached_underkategori: 'TILLEGG',
		cached_sum_krevd: 1250000,
		cached_sum_godkjent: 1100000,
		cached_dager_krevd: 15,
		cached_dager_godkjent: 15,
		cached_forsering_paalopt: null,
		cached_forsering_maks: null,
		cached_begrunnelse:
			'BH bestilte omlegging av eksisterende VA-ledninger i byggegruben som ikke var inkludert i opprinnelig kontrakt. Arbeidet var nødvendig for å gjennomføre planlagt fundamentering.',
		created_at: '2025-09-12T10:00:00Z',
		created_by: 'Knut Larsen',
		last_event_at: d(2026, 1, 20),
		hendelser: [
			{ type: 'K', dato: d(2025, 9, 12), label: 'Varslet endring', besvart: true },
			{ type: 'V', dato: d(2025, 10, 1), label: 'Sendte krav', besvart: true },
			{ type: 'F', dato: d(2025, 10, 1), label: 'Varslet frist', besvart: true },
			{ type: 'K', dato: d(2025, 11, 1), label: 'BH godkjente', besvart: true },
			{ type: 'V', dato: d(2025, 12, 15), label: 'BH godkjente vederlag', besvart: true },
			{ type: 'F', dato: d(2025, 12, 15), label: 'BH godkjente frist', besvart: true },
			{ type: 'V', dato: d(2026, 1, 20), label: 'Omforent', besvart: true },
		],
	},
	{
		sak_id: 'KOE-2024-023',
		sakstype: 'standard',
		cached_title: 'Krav om vederlag — avvik i kontraktsdokumenter',
		cached_status: 'VENTER_PAA_SVAR',
		cached_hovedkategori: 'SVIKT',
		cached_underkategori: 'DOKUMENTASJON',
		cached_sum_krevd: 560000,
		cached_sum_godkjent: null,
		cached_dager_krevd: null,
		cached_dager_godkjent: null,
		cached_forsering_paalopt: null,
		cached_forsering_maks: null,
		cached_begrunnelse:
			'Motstridende krav mellom arkitekttegninger (rev. C) og RIB-tegninger (rev. B) for bæresystem i akse D2–D4. TE måtte stanse arbeidet og avvente avklaring fra prosjekterende.',
		created_at: '2025-10-01T11:00:00Z',
		created_by: 'Maria Andersen',
		last_event_at: d(2026, 2, 16),
		hendelser: [
			{ type: 'K', dato: d(2025, 10, 1), label: 'Varslet avvik', besvart: true },
			{ type: 'K', dato: d(2025, 10, 15), label: 'Dokumenterte avvik', besvart: true },
			{ type: 'V', dato: d(2025, 11, 10), label: 'Sendte krav' },
			{ type: 'V', dato: d(2026, 2, 16), label: 'Purret motpart' },
		],
	},
	{
		sak_id: 'KOE-2024-038',
		sakstype: 'standard',
		cached_title: 'Forsering — avslått fristforlengelse',
		cached_status: 'SENDT',
		cached_hovedkategori: 'SVIKT',
		cached_underkategori: null,
		cached_sum_krevd: 320000,
		cached_sum_godkjent: null,
		cached_dager_krevd: null,
		cached_dager_godkjent: null,
		cached_forsering_paalopt: 145000,
		cached_forsering_maks: 420000,
		cached_begrunnelse:
			'BH avviste krav om fristforlengelse for betongarbeider i akse A1–A4. TE varslet forsering iht. NS 8407 pkt. 33.8 for å overholde kontraktsfrist.',
		created_at: '2025-12-10T13:00:00Z',
		created_by: 'Knut Larsen',
		last_event_at: d(2026, 2, 25),
		hendelser: [
			{ type: 'F', dato: d(2025, 12, 10), label: 'Varslet fristforlengelse', besvart: true },
			{ type: 'F', dato: d(2026, 1, 5), label: 'BH avviste frist', besvart: true },
			{ type: 'K', dato: d(2026, 1, 12), label: 'Krevde forsering' },
			{ type: 'V', dato: d(2026, 2, 25), label: 'Sendte forseringskrav' },
		],
	},
	{
		sak_id: 'KOE-2024-058',
		sakstype: 'standard',
		cached_title: 'Ny sak under opprettelse',
		cached_status: 'UTKAST',
		cached_hovedkategori: null,
		cached_underkategori: null,
		cached_sum_krevd: null,
		cached_sum_godkjent: null,
		cached_dager_krevd: null,
		cached_dager_godkjent: null,
		cached_forsering_paalopt: null,
		cached_forsering_maks: null,
		created_at: d(2026, 3, 6),
		created_by: 'Knut Larsen',
		last_event_at: d(2026, 3, 6),
		hendelser: [
			{ type: 'K', dato: d(2026, 3, 6), label: 'Opprettet' },
		],
	},
	{
		sak_id: 'KOE-2024-012',
		sakstype: 'standard',
		cached_title: 'Tilleggsarbeider — ekstra jernbindingsarbeider',
		cached_status: 'LUKKET',
		cached_hovedkategori: 'ENDRING',
		cached_underkategori: 'TILLEGG',
		cached_sum_krevd: 380000,
		cached_sum_godkjent: 380000,
		cached_dager_krevd: 0,
		cached_dager_godkjent: 0,
		cached_forsering_paalopt: null,
		cached_forsering_maks: null,
		cached_begrunnelse:
			'BH bestilte ekstra jernbindingsarbeider i dekke over P-kjeller utover kontraktens mengdebeskrivelse. Endringen ble godkjent som tilleggsarbeid.',
		created_at: '2025-08-01T09:00:00Z',
		created_by: 'Maria Andersen',
		last_event_at: d(2025, 12, 8),
		hendelser: [
			{ type: 'K', dato: d(2025, 8, 1), label: 'Varslet endring', besvart: true },
			{ type: 'K', dato: d(2025, 8, 20), label: 'BH godkjente', besvart: true },
			{ type: 'V', dato: d(2025, 9, 5), label: 'Sendte krav', besvart: true },
			{ type: 'V', dato: d(2025, 10, 10), label: 'BH godkjente', besvart: true },
			{ type: 'V', dato: d(2025, 12, 8), label: 'Lukket', besvart: true },
		],
	},
];
