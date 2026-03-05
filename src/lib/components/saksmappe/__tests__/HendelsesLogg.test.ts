import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import HendelsesLoggTest from './HendelsesLoggTest.svelte';
import type { TimelineEvent } from '$lib/types/timeline';

function makeEvent(
	overrides: Partial<TimelineEvent> & { type: string; time: string },
): TimelineEvent {
	return {
		specversion: '1.0',
		id: `evt-${Math.random().toString(36).slice(2, 8)}`,
		source: '/projects/P001/cases/SAK-001',
		actorrole: 'TE',
		...overrides,
	};
}

function makeManyEvents(count: number): TimelineEvent[] {
	const types = [
		'no.oslo.koe.grunnlag_opprettet',
		'no.oslo.koe.grunnlag_oppdatert',
		'no.oslo.koe.respons_grunnlag',
		'no.oslo.koe.vederlag_krav_sendt',
		'no.oslo.koe.respons_vederlag',
	];
	return Array.from({ length: count }, (_, i) =>
		makeEvent({
			type: types[i % types.length],
			time: `2025-01-${String(10 + i).padStart(2, '0')}T12:00:00Z`,
			actorrole: i % 2 === 0 ? 'TE' : 'BH',
		}),
	);
}

describe('HendelsesLogg', () => {
	it('always shows first 3 events', () => {
		const events = makeManyEvents(3);
		render(HendelsesLoggTest, { props: { events } });
		// All 3 should be visible as event-lines, no toggle needed
		expect(screen.queryByRole('button', { name: /hendelser til/i })).not.toBeInTheDocument();
		expect(screen.getByText('varslet')).toBeInTheDocument();
	});

	it('shows toggle for remaining events when more than 3', () => {
		const events = makeManyEvents(5);
		render(HendelsesLoggTest, { props: { events } });
		expect(screen.getByRole('button', { name: /2 hendelser til/i })).toBeInTheDocument();
	});

	it('hides everything for 0 events', () => {
		render(HendelsesLoggTest, { props: { events: [] } });
		expect(screen.queryByRole('button')).not.toBeInTheDocument();
	});

	it('shows correct remaining count in toggle label', () => {
		const events = makeManyEvents(7);
		render(HendelsesLoggTest, { props: { events } });
		expect(screen.getByText('4 hendelser til')).toBeInTheDocument();
	});

	it('calls onToggle when toggle-bar is clicked', async () => {
		const user = userEvent.setup();
		const onToggle = vi.fn();
		const events = makeManyEvents(5);
		render(HendelsesLoggTest, { props: { events, onToggle } });

		const toggleBtn = screen.getByRole('button', { name: /2 hendelser til/i });
		await user.click(toggleBtn);
		expect(onToggle).toHaveBeenCalledOnce();
	});

	it('shows event lines when expanded', () => {
		const events = [
			makeEvent({
				type: 'no.oslo.koe.grunnlag_opprettet',
				time: '2025-01-15T12:00:00Z',
				actorrole: 'TE',
			}),
			makeEvent({
				type: 'no.oslo.koe.respons_grunnlag',
				time: '2025-01-16T12:00:00Z',
				actorrole: 'BH',
			}),
			makeEvent({
				type: 'no.oslo.koe.grunnlag_oppdatert',
				time: '2025-01-17T12:00:00Z',
				actorrole: 'TE',
			}),
			makeEvent({
				type: 'no.oslo.koe.vederlag_krav_sendt',
				time: '2025-01-18T12:00:00Z',
				actorrole: 'TE',
			}),
		];
		render(HendelsesLoggTest, { props: { events, expanded: true } });

		// Should show event labels
		expect(screen.getByText('varslet')).toBeInTheDocument();
		expect(screen.getByText('responderte')).toBeInTheDocument();
		expect(screen.getByText('oppdatert')).toBeInTheDocument();
		expect(screen.getByText('sendte krav')).toBeInTheDocument();
	});

	it('shows first 3 events but hides remaining when collapsed', () => {
		const events = makeManyEvents(5);
		render(HendelsesLoggTest, { props: { events, expanded: false } });

		// First 3 events should be visible
		expect(screen.getByText('varslet')).toBeInTheDocument();
		// Toggle should show remaining count
		expect(screen.getByRole('button', { name: /2 hendelser til/i })).toBeInTheDocument();
	});

	it('renders event date in DD.MM format', () => {
		const events = [
			makeEvent({ type: 'no.oslo.koe.grunnlag_opprettet', time: '2025-03-05T12:00:00Z' }),
			makeEvent({ type: 'no.oslo.koe.grunnlag_oppdatert', time: '2025-03-06T12:00:00Z' }),
			makeEvent({ type: 'no.oslo.koe.respons_grunnlag', time: '2025-03-07T12:00:00Z' }),
			makeEvent({ type: 'no.oslo.koe.vederlag_krav_sendt', time: '2025-03-08T12:00:00Z' }),
		];
		render(HendelsesLoggTest, { props: { events, expanded: true } });
		expect(screen.getByText('05.03')).toBeInTheDocument();
	});

	it('uses summary from event when available', () => {
		const events = [
			makeEvent({
				type: 'no.oslo.koe.grunnlag_opprettet',
				time: '2025-01-10T12:00:00Z',
				summary: 'Varslet om endrede grunnforhold',
			}),
			makeEvent({
				type: 'no.oslo.koe.grunnlag_oppdatert',
				time: '2025-01-11T12:00:00Z',
			}),
			makeEvent({
				type: 'no.oslo.koe.respons_grunnlag',
				time: '2025-01-12T12:00:00Z',
			}),
			makeEvent({
				type: 'no.oslo.koe.vederlag_krav_sendt',
				time: '2025-01-13T12:00:00Z',
			}),
		];
		render(HendelsesLoggTest, { props: { events, expanded: true } });
		expect(screen.getByText('Varslet om endrede grunnforhold')).toBeInTheDocument();
	});

	it('shows correct icon for opprettet events', () => {
		const events = makeManyEvents(4);
		const { container } = render(HendelsesLoggTest, {
			props: { events, expanded: true },
		});
		// Flag icon for opprettet
		const icons = container.querySelectorAll('.event-icon');
		expect(icons.length).toBe(4);
	});

	it('shows revision info when event has respondert_versjon', () => {
		const events = [
			makeEvent({
				type: 'no.oslo.koe.respons_grunnlag',
				time: '2025-01-10T12:00:00Z',
				actorrole: 'BH',
				data: { resultat: 'godkjent', begrunnelse: 'ok', respondert_versjon: 2 } as never,
			}),
			makeEvent({ type: 'no.oslo.koe.grunnlag_opprettet', time: '2025-01-09T12:00:00Z' }),
			makeEvent({ type: 'no.oslo.koe.grunnlag_oppdatert', time: '2025-01-08T12:00:00Z' }),
			makeEvent({ type: 'no.oslo.koe.vederlag_krav_sendt', time: '2025-01-07T12:00:00Z' }),
		];
		render(HendelsesLoggTest, { props: { events, expanded: true } });
		expect(screen.getByText('Rev. 2')).toBeInTheDocument();
	});
});
