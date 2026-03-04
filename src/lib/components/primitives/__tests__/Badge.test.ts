import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import BadgeTest from './BadgeTest.svelte';

describe('Badge', () => {
	it('renders with text content', () => {
		render(BadgeTest, { props: { variant: 'godkjent', text: 'Godkjent' } });
		expect(screen.getByRole('status')).toHaveTextContent('Godkjent');
	});

	it('applies variant class for each variant', () => {
		const variants = ['godkjent', 'avslatt', 'delvis', 'uavklart', 'na'] as const;
		for (const variant of variants) {
			const { unmount } = render(BadgeTest, { props: { variant, text: variant } });
			expect(screen.getByRole('status')).toHaveClass(`badge-${variant}`);
			unmount();
		}
	});
});
