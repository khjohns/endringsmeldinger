import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import SectionHeading from '../SectionHeading.svelte';

describe('SectionHeading', () => {
	it('renders title', () => {
		render(SectionHeading, { props: { title: 'Grunnlag' } });
		expect(screen.getByText('Grunnlag')).toBeInTheDocument();
	});

	it('renders paragrafRef when provided', () => {
		render(SectionHeading, { props: { title: 'Varsel', paragrafRef: '§ 32.2' } });
		expect(screen.getByText('§ 32.2')).toBeInTheDocument();
	});

	it('does not render paragrafRef when not provided', () => {
		const { container } = render(SectionHeading, { props: { title: 'Grunnlag' } });
		expect(container.querySelector('.section-ref')).toBeNull();
	});
});
