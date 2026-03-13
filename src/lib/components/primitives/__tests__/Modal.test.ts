import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import ModalTest from './ModalTest.svelte';

describe('Modal', () => {
  it('renders title and content when open', () => {
    render(ModalTest, { props: { open: true, title: 'Slett krav' } });
    expect(screen.getByText('Slett krav')).toBeInTheDocument();
    expect(screen.getByText('Er du sikker på at du vil fortsette?')).toBeInTheDocument();
  });

  it('renders action buttons', () => {
    render(ModalTest, { props: { open: true } });
    expect(screen.getByText('Avbryt')).toBeInTheDocument();
    expect(screen.getByText('Bekreft')).toBeInTheDocument();
  });

  it('renders close button', () => {
    render(ModalTest, { props: { open: true } });
    expect(screen.getByLabelText('Lukk')).toBeInTheDocument();
  });
});
