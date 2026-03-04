import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import SporkortTest from './SporkortTest.svelte';
import type { SakState, SporType } from '$lib/types/timeline';

function makeBaseState(overrides: Partial<SakState> = {}): SakState {
	return {
		sak_id: 'SAK-001',
		sakstittel: 'Testsak',
		grunnlag: {
			status: 'sendt',
			laast: false,
			antall_versjoner: 1,
			siste_oppdatert: '2025-01-10T12:00:00Z',
		},
		vederlag: {
			status: 'sendt',
			antall_versjoner: 1,
			siste_oppdatert: '2025-01-10T12:00:00Z',
		},
		frist: {
			status: 'sendt',
			antall_versjoner: 1,
			siste_oppdatert: '2025-01-10T12:00:00Z',
		},
		er_subsidiaert_vederlag: false,
		er_subsidiaert_frist: false,
		visningsstatus_vederlag: '',
		visningsstatus_frist: '',
		overordnet_status: 'SENDT',
		kan_utstede_eo: false,
		neste_handling: { rolle: null, handling: '', spor: null },
		sum_krevd: 0,
		sum_godkjent: 0,
		antall_events: 0,
		...overrides,
	};
}

describe('Sporkort', () => {
	beforeEach(() => {
		// Clear localStorage before each test
		localStorage.clear();
	});

	it('renders track name for grunnlag', () => {
		const state = makeBaseState();
		render(SporkortTest, { props: { sporType: 'grunnlag' as SporType, state } });
		expect(screen.getByText('ANSVARSGRUNNLAG')).toBeInTheDocument();
	});

	it('renders track name for vederlag', () => {
		const state = makeBaseState();
		render(SporkortTest, { props: { sporType: 'vederlag' as SporType, state } });
		expect(screen.getByText('VEDERLAG')).toBeInTheDocument();
	});

	it('renders track name for frist', () => {
		const state = makeBaseState();
		render(SporkortTest, { props: { sporType: 'frist' as SporType, state } });
		expect(screen.getByText('FRISTFORLENGELSE')).toBeInTheDocument();
	});

	it('renders status badge', () => {
		const state = makeBaseState();
		render(SporkortTest, { props: { sporType: 'grunnlag' as SporType, state } });
		expect(screen.getByRole('status')).toHaveTextContent('Sendt');
	});

	it('renders godkjent status badge', () => {
		const state = makeBaseState({
			grunnlag: {
				status: 'godkjent',
				laast: false,
				antall_versjoner: 1,
				siste_oppdatert: '2025-01-10T12:00:00Z',
			},
		});
		render(SporkortTest, { props: { sporType: 'grunnlag' as SporType, state } });
		expect(screen.getByRole('status')).toHaveTextContent('Godkjent');
	});

	it('has correct left border variant for godkjent state', () => {
		const state = makeBaseState({
			grunnlag: {
				status: 'godkjent',
				laast: false,
				antall_versjoner: 1,
				siste_oppdatert: '2025-01-10T12:00:00Z',
			},
		});
		const { container } = render(SporkortTest, {
			props: { sporType: 'grunnlag' as SporType, state },
		});
		const card = container.querySelector('[data-spor="grunnlag"]');
		expect(card).toBeTruthy();
		expect(card?.getAttribute('data-border')).toBe('godkjent');
	});

	it('has correct left border variant for avslatt state', () => {
		const state = makeBaseState({
			grunnlag: {
				status: 'avslatt',
				laast: false,
				antall_versjoner: 1,
				siste_oppdatert: '2025-01-10T12:00:00Z',
			},
		});
		const { container } = render(SporkortTest, {
			props: { sporType: 'grunnlag' as SporType, state },
		});
		const card = container.querySelector('[data-spor="grunnlag"]');
		expect(card).toBeTruthy();
		expect(card?.getAttribute('data-border')).toBe('avslatt');
	});

	it('has correct left border variant for waiting state', () => {
		// Use a recent date so passivitet does not trigger (< 14 days)
		const recentDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
		const state = makeBaseState({
			grunnlag: {
				status: 'sendt',
				laast: false,
				antall_versjoner: 1,
				siste_oppdatert: recentDate,
			},
		});
		const { container } = render(SporkortTest, {
			props: { sporType: 'grunnlag' as SporType, state },
		});
		const card = container.querySelector('[data-spor="grunnlag"]');
		expect(card).toBeTruthy();
		expect(card?.getAttribute('data-border')).toBe('venter');
	});

	it('shows action button when role is set and action is available', () => {
		localStorage.setItem('koe-user-role', 'BH');
		const state = makeBaseState({
			grunnlag: {
				status: 'avslatt',
				laast: false,
				antall_versjoner: 1,
				siste_oppdatert: '2025-01-10T12:00:00Z',
			},
		});
		render(SporkortTest, { props: { sporType: 'grunnlag' as SporType, state } });
		expect(screen.getByRole('button', { name: /forsering/i })).toBeInTheDocument();
	});

	it('does not show action button when no role is set', () => {
		// localStorage is cleared in beforeEach
		const state = makeBaseState({
			grunnlag: {
				status: 'avslatt',
				laast: false,
				antall_versjoner: 1,
				siste_oppdatert: '2025-01-10T12:00:00Z',
			},
		});
		render(SporkortTest, { props: { sporType: 'grunnlag' as SporType, state } });
		expect(screen.queryByRole('button')).not.toBeInTheDocument();
	});

	it('shows passivitet warning for grunnlag sent > 14 days', () => {
		// Set date far in the past so daysSinceLastEvent > 14
		const state = makeBaseState({
			grunnlag: {
				status: 'sendt',
				laast: false,
				antall_versjoner: 1,
				siste_oppdatert: '2024-01-01T12:00:00Z', // >1 year ago
			},
		});
		render(SporkortTest, { props: { sporType: 'grunnlag' as SporType, state } });
		expect(screen.getByRole('alert')).toHaveTextContent('uten svar');
	});

	it('shows critical background for passivitet', () => {
		const state = makeBaseState({
			grunnlag: {
				status: 'sendt',
				laast: false,
				antall_versjoner: 1,
				siste_oppdatert: '2024-01-01T12:00:00Z',
			},
		});
		const { container } = render(SporkortTest, {
			props: { sporType: 'grunnlag' as SporType, state },
		});
		const card = container.querySelector('[data-spor="grunnlag"]');
		expect(card?.classList.contains('bg-critical')).toBe(true);
	});

	it('does not show passivitet for non-grunnlag tracks', () => {
		const state = makeBaseState({
			vederlag: {
				status: 'sendt',
				antall_versjoner: 1,
				siste_oppdatert: '2024-01-01T12:00:00Z',
			},
		});
		render(SporkortTest, { props: { sporType: 'vederlag' as SporType, state } });
		expect(screen.queryByRole('alert')).not.toBeInTheDocument();
	});

	it('does not show passivitet when grunnlag is not sendt', () => {
		const state = makeBaseState({
			grunnlag: {
				status: 'under_behandling',
				laast: false,
				antall_versjoner: 1,
				siste_oppdatert: '2024-01-01T12:00:00Z',
			},
		});
		render(SporkortTest, { props: { sporType: 'grunnlag' as SporType, state } });
		expect(screen.queryByRole('alert')).not.toBeInTheDocument();
	});

	it('generates correct href for track', () => {
		const state = makeBaseState();
		const { container } = render(SporkortTest, {
			props: {
				sporType: 'vederlag' as SporType,
				state,
				prosjektId: 'P001',
				sakId: 'SAK-001',
			},
		});
		const link = container.querySelector('a[data-spor="vederlag"]');
		expect(link?.getAttribute('href')).toBe('/P001/SAK-001/vederlag');
	});

	it('shows data line for grunnlag with tittel', () => {
		const state = makeBaseState({
			grunnlag: {
				status: 'sendt',
				laast: false,
				antall_versjoner: 1,
				siste_oppdatert: '2025-01-10T12:00:00Z',
				tittel: 'Endring i grunnforhold',
				hovedkategori: 'SVIKT',
			},
		});
		render(SporkortTest, { props: { sporType: 'grunnlag' as SporType, state } });
		expect(screen.getByText('Endring i grunnforhold')).toBeInTheDocument();
	});

	it('shows data line for vederlag with method and amount', () => {
		const state = makeBaseState({
			vederlag: {
				status: 'sendt',
				antall_versjoner: 1,
				siste_oppdatert: '2025-01-10T12:00:00Z',
				metode: 'REGNINGSARBEID',
				krevd_belop: 450000,
			},
		});
		render(SporkortTest, { props: { sporType: 'vederlag' as SporType, state } });
		expect(screen.getByText('Regningsarbeid')).toBeInTheDocument();
		expect(screen.getByText('450k')).toBeInTheDocument();
	});

	it('shows data line for frist with days', () => {
		const state = makeBaseState({
			frist: {
				status: 'sendt',
				antall_versjoner: 1,
				siste_oppdatert: '2025-01-10T12:00:00Z',
				krevd_dager: 30,
			},
		});
		render(SporkortTest, { props: { sporType: 'frist' as SporType, state } });
		expect(screen.getByText('30d')).toBeInTheDocument();
	});
});
