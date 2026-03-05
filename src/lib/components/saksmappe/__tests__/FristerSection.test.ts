import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import FristerSectionTest from './FristerSectionTest.svelte';
import type { SakState } from '$lib/types/timeline';

function makeBaseState(overrides: Partial<SakState> = {}): SakState {
	return {
		sak_id: 'SAK-001',
		sakstittel: 'Testsak',
		grunnlag: {
			status: 'utkast',
			laast: false,
			antall_versjoner: 1,
		},
		vederlag: {
			status: 'utkast',
			antall_versjoner: 1,
		},
		frist: {
			status: 'utkast',
			antall_versjoner: 1,
		},
		er_subsidiaert_vederlag: false,
		er_subsidiaert_frist: false,
		visningsstatus_vederlag: '',
		visningsstatus_frist: '',
		overordnet_status: 'UTKAST',
		kan_utstede_eo: false,
		neste_handling: { rolle: null, handling: '', spor: null },
		sum_krevd: 0,
		sum_godkjent: 0,
		antall_events: 0,
		...overrides,
	};
}

describe('FristerSection', () => {
	it('renders section heading', () => {
		const now = new Date('2025-01-15T12:00:00Z');
		const state = makeBaseState({
			grunnlag: {
				status: 'sendt',
				siste_oppdatert: '2025-01-10T12:00:00Z',
				laast: false,
				antall_versjoner: 1,
			},
		});

		render(FristerSectionTest, { props: { state, now } });
		expect(screen.getByText('Frister')).toBeInTheDocument();
	});

	it('renders track labels for active tracks', () => {
		const now = new Date('2025-01-15T12:00:00Z');
		const state = makeBaseState({
			grunnlag: {
				status: 'sendt',
				siste_oppdatert: '2025-01-10T12:00:00Z',
				laast: false,
				antall_versjoner: 1,
			},
			frist: {
				status: 'sendt',
				siste_oppdatert: '2025-01-12T12:00:00Z',
				antall_versjoner: 1,
			},
			vederlag: {
				status: 'sendt',
				siste_oppdatert: '2025-01-13T12:00:00Z',
				antall_versjoner: 1,
			},
		});

		render(FristerSectionTest, { props: { state, now } });
		expect(screen.getByText('Grunnlag')).toBeInTheDocument();
		expect(screen.getByText('Frist')).toBeInTheDocument();
		expect(screen.getByText('Vederlag')).toBeInTheDocument();
	});

	it('shows days since last update', () => {
		const now = new Date('2025-01-20T12:00:00Z');
		const state = makeBaseState({
			frist: {
				status: 'sendt',
				siste_oppdatert: '2025-01-10T12:00:00Z',
				antall_versjoner: 1,
			},
		});

		render(FristerSectionTest, { props: { state, now } });
		expect(screen.getByText('10d siden')).toBeInTheDocument();
	});

	it('shows passivitet for grunnlag sent > 14 days', () => {
		const now = new Date('2025-02-01T12:00:00Z');
		const state = makeBaseState({
			grunnlag: {
				status: 'sendt',
				siste_oppdatert: '2025-01-10T12:00:00Z',
				laast: false,
				antall_versjoner: 1,
			},
		});

		render(FristerSectionTest, { props: { state, now } });
		expect(screen.getByText('passivitet!')).toBeInTheDocument();
	});

	it('does not show passivitet when grunnlag is not sendt', () => {
		const now = new Date('2025-02-01T12:00:00Z');
		const state = makeBaseState({
			grunnlag: {
				status: 'under_behandling',
				siste_oppdatert: '2025-01-10T12:00:00Z',
				laast: false,
				antall_versjoner: 1,
			},
		});

		render(FristerSectionTest, { props: { state, now } });
		expect(screen.queryByText('passivitet!')).not.toBeInTheDocument();
	});

	it('sorts critical items first', () => {
		const now = new Date('2025-02-01T12:00:00Z');
		const state = makeBaseState({
			grunnlag: {
				status: 'sendt',
				siste_oppdatert: '2025-01-10T12:00:00Z', // 22 days, status=sendt → passivitet → critical
				laast: false,
				antall_versjoner: 1,
			},
			frist: {
				status: 'sendt',
				siste_oppdatert: '2025-01-30T12:00:00Z', // 2 days → normal
				antall_versjoner: 1,
			},
			vederlag: {
				status: 'ikke_relevant',
				antall_versjoner: 0,
			},
		});

		render(FristerSectionTest, { props: { state, now } });

		const items = screen.getAllByRole('listitem');
		expect(items).toHaveLength(2);
		// Critical (Grunnlag with passivitet) should be first
		expect(items[0]).toHaveTextContent('Grunnlag');
		expect(items[0]).toHaveTextContent('passivitet!');
		// Normal (Frist) should be second
		expect(items[1]).toHaveTextContent('Frist');
	});

	it('does not render when all tracks are ikke_relevant', () => {
		const now = new Date('2025-01-15T12:00:00Z');
		const state = makeBaseState({
			grunnlag: { status: 'ikke_relevant', laast: false, antall_versjoner: 0 },
			vederlag: { status: 'ikke_relevant', antall_versjoner: 0 },
			frist: { status: 'ikke_relevant', antall_versjoner: 0 },
		});

		render(FristerSectionTest, { props: { state, now } });
		expect(screen.queryByText('Frister')).not.toBeInTheDocument();
	});
});
