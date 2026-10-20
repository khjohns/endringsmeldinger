import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import CaseListRowTest from './CaseListRowTest.svelte';
import { lagSakslinje } from '$lib/mocks/sakslinje';
import type { Sakslinje } from '$lib/types/api';

const vis = (linje: Sakslinje) =>
  render(CaseListRowTest, { props: { linje, prosjektId: 'PRJ-01' } });

const ingenting = { etiketter: [], venter_paa_svar: false, svar_ikke_godtatt: false };

describe('CaseListRow', () => {
  it('viser sak-ID, tittel, kategori og lenken til saken', () => {
    vis(lagSakslinje());
    expect(screen.getByText('SAK-001')).toBeInTheDocument();
    expect(screen.getByText('Endring i grunnarbeider')).toBeInTheDocument();
    expect(screen.getByText('Endringer')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Åpne sak SAK-001' })).toHaveAttribute(
      'href',
      '/PRJ-01/SAK-001'
    );
  });

  it('viser «Uten tittel» når saken ikke har sakstittel', () => {
    vis(lagSakslinje({ sakstittel: null }));
    expect(screen.getByText('Uten tittel')).toBeInTheDocument();
  });

  it('saken har ingen samlet status: raden viser etikettene per spor (MM-U22)', () => {
    vis(
      lagSakslinje({
        grunnlag: {
          ...ingenting,
          etiketter: ['venter_paa_svar'],
          venter_paa_svar: true,
          svar: null,
        },
        vederlag: {
          ...ingenting,
          etiketter: ['subsidiaert'],
          krav: { beloep: 1_000_000, metode: 'tilbud' },
          svar: { resultat: 'delvis_godkjent', beloep: 600_000, subsidiaert: true },
          enighet: null,
        },
      })
    );
    expect(screen.getByText('Venter på svar')).toBeInTheDocument();
    expect(screen.getByText('Subsidiært standpunkt')).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it.each([
    ['ikke_forstaatt', 'Ikke forstått', 'badge-uavklart'],
    ['avslaget_paa_grunnlaget_godtatt', 'Avsluttet: avslått', 'badge-avslatt'],
    ['grunnlaget_trukket', 'Avsluttet: trukket', 'badge-avslatt'],
    ['kravene_avgjort', 'Alle krav sendt i appen er avgjort', 'badge-godkjent'],
  ] as const)(
    'saksbetegnelsen %s vises som merket «%s» i stedet for etikettene (MM-U22)',
    (saksbetegnelse, tekst, klasse) => {
      vis(
        lagSakslinje({
          saksbetegnelse,
          grunnlag: { ...ingenting, etiketter: ['avklart'], svar: null },
        })
      );
      expect(screen.getByText(tekst)).toHaveClass(klasse);
      expect(screen.queryByText('Avklart')).not.toBeInTheDocument();
    }
  );

  it('TEs krav og byggherrens subsidiære svar står hver for seg, med svaret merket (MM-U28)', () => {
    vis(
      lagSakslinje({
        vederlag: {
          ...ingenting,
          krav: { beloep: 1_000_000, metode: 'tilbud' },
          svar: { resultat: 'delvis_godkjent', beloep: 600_000, subsidiaert: true },
          enighet: null,
        },
        frist: {
          ...ingenting,
          krav: { dager: 30 },
          svar: { resultat: 'delvis_godkjent', dager: 20, subsidiaert: false },
          enighet: null,
        },
      })
    );
    expect(screen.getByLabelText('Krevd vederlag: 1M')).toBeInTheDocument();
    expect(screen.getByText('BH 600k subsidiært')).toBeInTheDocument();
    expect(screen.getByLabelText('Krevd frist: 30d')).toBeInTheDocument();
    expect(screen.getByText('BH 20d')).toBeInTheDocument();
  });

  it('enigheten står foran svaret, med virkningen som appens lesing (MM-U28)', () => {
    vis(
      lagSakslinje({
        vederlag: {
          ...ingenting,
          krav: { beloep: 1_000_000, metode: 'tilbud' },
          svar: { resultat: 'delvis_godkjent', beloep: 600_000, subsidiaert: true },
          enighet: { beloep: 600_000, virkning: 'betinget' },
        },
        frist: {
          ...ingenting,
          krav: { dager: 30 },
          svar: null,
          enighet: { dager: null, virkning: 'virksom' },
        },
      })
    );
    expect(screen.getByText('Enige 600k, betinget')).toBeInTheDocument();
    expect(screen.queryByText('BH 600k subsidiært')).not.toBeInTheDocument();
    expect(screen.getByText('Enige, virksom')).toBeInTheDocument();
  });

  it('et krav som ikke finnes, vises som strek og ikke som 0', () => {
    vis(lagSakslinje());
    expect(screen.getByLabelText('Krevd vederlag: —')).toBeInTheDocument();
    expect(screen.getByLabelText('Krevd frist: —')).toBeInTheDocument();
  });
});
