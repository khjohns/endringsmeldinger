/**
 * Saksbildet viser det konteksten har lest (#665): status, etikettene per spor,
 * kravene og brevene med den låste teksten og leveringsoppdragene.
 */

import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/svelte';
import Saksbilde from '../Saksbilde.svelte';
import type { Saksbilde as Bilde } from '$lib/kjernesak/saksbilde';

const bilde: Bilde = {
  tittel: 'Ny peling',
  versjon: 2,
  status: { kode: 'venter_paa_svar', tekst: 'Venter på svar' },
  merknader: [],
  spor: [
    {
      spor: 'grunnlag',
      navn: 'Grunnlag',
      etiketter: [{ kode: 'venter_paa_svar', tekst: 'Venter på svar' }],
      poster: [
        {
          art: 'krav',
          id: 'k-1',
          brev: 2,
          gjeldende: true,
          revidert: false,
          tekst: 'Krav, i brev 2 (gjeldende)',
        },
      ],
    },
    { spor: 'vederlag', navn: 'Vederlag', etiketter: [], poster: [] },
    { spor: 'frist', navn: 'Frist', etiketter: [], poster: [] },
  ],
  journal: [
    {
      hendelse: 'e-2',
      versjon: 2,
      tidsstempel: '2026-10-16T09:00:00.000Z',
      tittel: 'Brev fra TE',
      tolket: true,
      tekst: [
        { gjelder: 'k-1', laast: 'TE krever endringsordre.', utdypning: 'BH påla ny peling.' },
        { gjelder: 'k-2', laast: 'TE varsler etter § 32.2.' },
      ],
      oppdrag: [
        {
          id: 'l-1',
          event_id: 'e-2',
          dokumentnoekkel: 'brev-e-2',
          filnavn: 'krav.pdf',
          innhold_sha256: '0'.repeat(64),
          opprettet: '2026-10-16T09:00:01.000Z',
        },
      ],
    },
  ],
};

describe('saksbildet', () => {
  it('viser status, kravene per spor og brevet med den låste teksten og oppdraget', () => {
    render(Saksbilde, { bilde });
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Ny peling');
    expect(screen.getByTestId('status')).toHaveTextContent('Venter på svar');

    const grunnlag = within(screen.getByTestId('spor-grunnlag'));
    expect(grunnlag.getByText('Venter på svar')).toBeInTheDocument();
    expect(grunnlag.getByText('Krav, i brev 2 (gjeldende)')).toBeInTheDocument();
    expect(
      within(screen.getByTestId('spor-vederlag')).getByText('Ingen krav eller svar i sporet.')
    ).toBeInTheDocument();

    const brev = within(screen.getByTestId('journal-2'));
    expect(brev.getByText('TE krever endringsordre.')).toBeInTheDocument();
    expect(brev.getByText('BH påla ny peling.')).toBeInTheDocument();
    expect(brev.getByText('TE varsler etter § 32.2.')).toBeInTheDocument();
    expect(
      brev.getByText(/Leveringsoppdrag krav\.pdf: frosset .*, ikke levert/)
    ).toBeInTheDocument();
  });

  it('merker en hendelse kjernen ikke har tolket', () => {
    render(Saksbilde, {
      bilde: { ...bilde, journal: [{ ...bilde.journal[0], tolket: false, tekst: null }] },
    });
    expect(within(screen.getByTestId('journal-2')).getByText('Ikke tolket')).toBeInTheDocument();
  });
});
