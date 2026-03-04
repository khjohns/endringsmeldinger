/**
 * Varslingsstatus — beregner compliance-status for varsling per spor.
 *
 * Basert på NS 8407 krav til varsling og spesifisering.
 */

import type { SakState, SporType } from '$lib/types/timeline';

export type VarslingStatusType = 'ok' | 'warning' | 'breach' | 'na';

export interface VarslingItem {
	label: string;
	paragrafRef: string;
	status: VarslingStatusType;
	spor: SporType;
}

/**
 * Beregner varslingsstatus fra SakState.
 *
 * Returnerer en liste med VarslingItem for:
 * 1. Grunnlag: Endring varslet (§32.2)
 * 2. Frist: varslet (§33.4)
 * 3. Frist: spesifisert (§33.6)
 * 4. Vederlag: varslet (§34.1)
 */
export function beregnVarslingStatus(state: SakState): VarslingItem[] {
	const items: VarslingItem[] = [];

	// 1. Grunnlag varslet (§32.2)
	if (state.grunnlag.status !== 'ikke_relevant') {
		const harVarsel = !!state.grunnlag.grunnlag_varsel?.dato_sendt;

		if (harVarsel) {
			items.push({
				label:
					state.grunnlag.grunnlag_varslet_i_tide === false
						? 'Endring varslet sent'
						: 'Endring varslet',
				paragrafRef: '§32.2',
				status: state.grunnlag.grunnlag_varslet_i_tide === false ? 'warning' : 'ok',
				spor: 'grunnlag',
			});
		} else {
			items.push({
				label: 'Endring ikke varslet',
				paragrafRef: '§32.2',
				status: 'na',
				spor: 'grunnlag',
			});
		}
	}

	// 2. Frist varslet (§33.4)
	if (state.frist.status !== 'ikke_relevant') {
		const harFristVarsel = !!state.frist.frist_varsel?.dato_sendt;

		if (harFristVarsel) {
			items.push({
				label: state.frist.frist_varsel_ok === false ? 'Frist: varslet sent' : 'Frist: varslet',
				paragrafRef: '§33.4',
				status: state.frist.frist_varsel_ok === false ? 'warning' : 'ok',
				spor: 'frist',
			});
		} else {
			items.push({
				label: 'Frist: ikke varslet',
				paragrafRef: '§33.4',
				status: 'na',
				spor: 'frist',
			});
		}
	}

	// 3. Frist spesifisert (§33.6)
	if (state.frist.status !== 'ikke_relevant') {
		const harSpesifisertVarsel = !!state.frist.spesifisert_varsel?.dato_sendt;

		if (harSpesifisertVarsel) {
			items.push({
				label:
					state.frist.spesifisert_krav_ok === false
						? 'Frist: ikke spesifisert'
						: 'Frist: spesifisert',
				paragrafRef: '§33.6',
				status: state.frist.spesifisert_krav_ok === false ? 'warning' : 'ok',
				spor: 'frist',
			});
		} else {
			items.push({
				label: 'Frist: ikke spesifisert',
				paragrafRef: '§33.6',
				status: 'na',
				spor: 'frist',
			});
		}
	}

	// 4. Vederlag varslet (§34.1)
	if (state.vederlag.status !== 'ikke_relevant') {
		const harVederlagVarsel =
			state.vederlag.status === 'sendt' ||
			state.vederlag.status === 'under_behandling' ||
			state.vederlag.status === 'godkjent' ||
			state.vederlag.status === 'delvis_godkjent' ||
			state.vederlag.status === 'avslatt' ||
			state.vederlag.status === 'under_forhandling' ||
			state.vederlag.status === 'laast';

		if (harVederlagVarsel) {
			items.push({
				label: 'Vederlag: varslet',
				paragrafRef: '§34.1',
				status: 'ok',
				spor: 'vederlag',
			});
		} else {
			items.push({
				label: 'Vederlag: ikke varslet',
				paragrafRef: '§34.1',
				status: 'na',
				spor: 'vederlag',
			});
		}
	}

	return items;
}

/** Symbol for display */
export function varslingSymbol(status: VarslingStatusType): string {
	switch (status) {
		case 'ok':
			return '✓';
		case 'warning':
			return '⚠';
		case 'breach':
			return '✕';
		case 'na':
			return '–';
	}
}
