import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import CaseListRowTest from './CaseListRowTest.svelte';
import type { CaseListItem } from '$lib/types/api';

const baseCaseItem: CaseListItem = {
	sak_id: 'SAK-001',
	sakstype: 'standard',
	cached_title: 'Endring i grunnarbeider',
	cached_status: 'UNDER_BEHANDLING',
	created_at: '2025-11-01T10:00:00Z',
	created_by: 'TE',
	last_event_at: '2025-12-22T14:30:00Z',
	cached_sum_krevd: 450000,
	cached_sum_godkjent: null,
	cached_dager_krevd: 30,
	cached_dager_godkjent: null,
	cached_hovedkategori: 'BH_ENDRING',
	cached_underkategori: null,
	cached_forsering_paalopt: null,
	cached_forsering_maks: null,
};

describe('CaseListRow', () => {
	it('renders sak-ID', () => {
		render(CaseListRowTest, { props: { case_item: baseCaseItem, prosjektId: 'PRJ-01' } });
		expect(screen.getByText('SAK-001')).toBeInTheDocument();
	});

	it('renders tittel', () => {
		render(CaseListRowTest, { props: { case_item: baseCaseItem, prosjektId: 'PRJ-01' } });
		expect(screen.getByText('Endring i grunnarbeider')).toBeInTheDocument();
	});

	it('shows fallback tittel "Uten tittel" when cached_title is null', () => {
		const item = { ...baseCaseItem, cached_title: null };
		render(CaseListRowTest, { props: { case_item: item, prosjektId: 'PRJ-01' } });
		expect(screen.getByText('Uten tittel')).toBeInTheDocument();
	});

	it('shows formatted beløp', () => {
		render(CaseListRowTest, { props: { case_item: baseCaseItem, prosjektId: 'PRJ-01' } });
		// 450000 → '450k'
		expect(screen.getByText('450k')).toBeInTheDocument();
	});

	it('shows formatted dager', () => {
		render(CaseListRowTest, { props: { case_item: baseCaseItem, prosjektId: 'PRJ-01' } });
		expect(screen.getByText('30d')).toBeInTheDocument();
	});

	it('links to correct URL', () => {
		render(CaseListRowTest, { props: { case_item: baseCaseItem, prosjektId: 'PRJ-01' } });
		const link = screen.getByRole('link', { name: /åpne sak SAK-001/i });
		expect(link).toHaveAttribute('href', '/PRJ-01/SAK-001');
	});

	it('shows Badge with status label for UNDER_BEHANDLING', () => {
		render(CaseListRowTest, { props: { case_item: baseCaseItem, prosjektId: 'PRJ-01' } });
		const badge = screen.getByRole('status');
		expect(badge).toHaveTextContent('Under behandling');
	});

	it('shows godkjent badge for OMFORENT status', () => {
		const item = { ...baseCaseItem, cached_status: 'OMFORENT' };
		render(CaseListRowTest, { props: { case_item: item, prosjektId: 'PRJ-01' } });
		const badge = screen.getByRole('status');
		expect(badge).toHaveClass('badge-godkjent');
		expect(badge).toHaveTextContent('Omforent');
	});

	it('shows avslatt badge for LUKKET_TRUKKET status', () => {
		const item = { ...baseCaseItem, cached_status: 'LUKKET_TRUKKET' };
		render(CaseListRowTest, { props: { case_item: item, prosjektId: 'PRJ-01' } });
		const badge = screen.getByRole('status');
		expect(badge).toHaveClass('badge-avslatt');
		expect(badge).toHaveTextContent('Trukket');
	});

	it('shows uavklart badge for UTKAST status', () => {
		const item = { ...baseCaseItem, cached_status: 'UTKAST' };
		render(CaseListRowTest, { props: { case_item: item, prosjektId: 'PRJ-01' } });
		const badge = screen.getByRole('status');
		expect(badge).toHaveClass('badge-uavklart');
	});

	it('shows em-dash when beløp is null', () => {
		const item = { ...baseCaseItem, cached_sum_krevd: null };
		render(CaseListRowTest, { props: { case_item: item, prosjektId: 'PRJ-01' } });
		// formatCurrencyCompact(null) → '—'
		expect(screen.getAllByText('—').length).toBeGreaterThan(0);
	});
});
