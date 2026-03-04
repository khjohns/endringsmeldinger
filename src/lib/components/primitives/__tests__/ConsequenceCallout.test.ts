import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import ConsequenceCalloutTest from './ConsequenceCalloutTest.svelte';

describe('ConsequenceCallout', () => {
	it('renders content', () => {
		render(ConsequenceCalloutTest, { props: { text: 'Viktig konsekvens' } });
		expect(screen.getByText('Viktig konsekvens')).toBeInTheDocument();
	});

	it('applies variant class', () => {
		const { container } = render(ConsequenceCalloutTest, { props: { variant: 'kritisk', text: 'Kritisk' } });
		expect(container.querySelector('.callout-kritisk')).not.toBeNull();
	});

	it('applies godkjent variant', () => {
		const { container } = render(ConsequenceCalloutTest, { props: { variant: 'godkjent', text: 'OK' } });
		expect(container.querySelector('.callout-godkjent')).not.toBeNull();
	});

	it('defaults to info variant', () => {
		const { container } = render(ConsequenceCalloutTest, { props: { text: 'Info' } });
		expect(container.querySelector('.callout-info')).not.toBeNull();
	});
});
