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
  it('renders section heading when there are urgent frister', () => {
    const now = new Date('2025-02-01T12:00:00Z');
    const state = makeBaseState({
      grunnlag: {
        status: 'sendt',
        siste_oppdatert: '2025-01-10T12:00:00Z', // 22 days → passivitet → critical
        laast: false,
        antall_versjoner: 1,
      },
    });

    render(FristerSectionTest, { props: { state, now } });
    expect(screen.getByText('Frister')).toBeInTheDocument();
  });

  it('shows Passivitet label for grunnlag sent > 14 days', () => {
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
    expect(screen.getByText('Passivitet')).toBeInTheDocument();
    expect(screen.getByText('22d')).toBeInTheDocument();
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
    expect(screen.queryByText('Passivitet')).not.toBeInTheDocument();
  });

  it('shows Advarsel label for tracks > 14 days', () => {
    const now = new Date('2025-01-30T12:00:00Z');
    const state = makeBaseState({
      frist: {
        status: 'sendt',
        siste_oppdatert: '2025-01-10T12:00:00Z', // 20 days → warning
        antall_versjoner: 1,
      },
    });

    render(FristerSectionTest, { props: { state, now } });
    expect(screen.getByText('Advarsel')).toBeInTheDocument();
    expect(screen.getByText('20d')).toBeInTheDocument();
  });

  it('hides normal-urgency items (only shows warning/critical)', () => {
    const now = new Date('2025-01-15T12:00:00Z');
    const state = makeBaseState({
      grunnlag: {
        status: 'sendt',
        siste_oppdatert: '2025-01-10T12:00:00Z', // 5 days → normal
        laast: false,
        antall_versjoner: 1,
      },
    });

    render(FristerSectionTest, { props: { state, now } });
    expect(screen.queryByText('Frister')).not.toBeInTheDocument();
  });

  it('sorts critical items first', () => {
    const now = new Date('2025-02-01T12:00:00Z');
    const state = makeBaseState({
      grunnlag: {
        status: 'sendt',
        siste_oppdatert: '2025-01-10T12:00:00Z', // 22 days, sendt → passivitet → critical
        laast: false,
        antall_versjoner: 1,
      },
      frist: {
        status: 'sendt',
        siste_oppdatert: '2025-01-10T12:00:00Z', // 22 days → warning
        antall_versjoner: 1,
      },
      vederlag: {
        status: 'ikke_relevant',
        antall_versjoner: 0,
      },
    });

    render(FristerSectionTest, { props: { state, now } });

    // Both visible as pills
    expect(screen.getByText('Passivitet')).toBeInTheDocument();
    expect(screen.getByText('Advarsel')).toBeInTheDocument();

    // Passivitet pill should come before Advarsel pill in DOM order
    const labels = screen.getAllByText(/Passivitet|Advarsel/);
    expect(labels[0]).toHaveTextContent('Passivitet');
    expect(labels[1]).toHaveTextContent('Advarsel');
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
