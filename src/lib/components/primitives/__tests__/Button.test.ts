import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import { userEvent } from '@testing-library/user-event';
import ButtonTest from './ButtonTest.svelte';

describe('Button', () => {
	it('renders with children text', () => {
		render(ButtonTest, { props: { text: 'Lagre' } });
		expect(screen.getByRole('button')).toHaveTextContent('Lagre');
	});

	it('applies variant class', () => {
		render(ButtonTest, { props: { text: 'Slett', variant: 'destructive' } });
		expect(screen.getByRole('button')).toHaveClass('btn-destructive');
	});

	it('disables when disabled prop is true', () => {
		render(ButtonTest, { props: { disabled: true } });
		expect(screen.getByRole('button')).toBeDisabled();
	});

	it('disables and shows aria-busy when loading', () => {
		render(ButtonTest, { props: { loading: true } });
		const btn = screen.getByRole('button');
		expect(btn).toBeDisabled();
		expect(btn).toHaveAttribute('aria-busy', 'true');
	});

	it('calls onclick when clicked', async () => {
		const onclick = vi.fn();
		const user = userEvent.setup();
		render(ButtonTest, { props: { onclick } });
		await user.click(screen.getByRole('button'));
		expect(onclick).toHaveBeenCalledOnce();
	});

	it('does not call onclick when disabled', async () => {
		const onclick = vi.fn();
		const user = userEvent.setup();
		render(ButtonTest, { props: { onclick, disabled: true } });
		await user.click(screen.getByRole('button'));
		expect(onclick).not.toHaveBeenCalled();
	});
});
