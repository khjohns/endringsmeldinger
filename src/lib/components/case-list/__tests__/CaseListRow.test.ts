import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import CaseListRowTest from './CaseListRowTest.svelte';
import { lagSakslinje } from '$lib/mocks/sakslinje';
import type { Sakslinje } from '$lib/types/api';

const vis = (linje: Sakslinje) =>
  render(CaseListRowTest, { props: { linje, prosjektId: 'PRJ-01' } });

const ingenting = {
  betegnelse: null,
  venter_paa_svar: false,
  svar_ikke_godtatt: false,
  kravet_staar: false,
};

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

  it('saken har ingen samlet status: raden viser betegnelsen per spor (MM-U22, MM-U30)', () => {
    vis(
      lagSakslinje({
        grunnlag: {
          ...ingenting,
          betegnelse: 'venter_paa_svar',
          venter_paa_svar: true,
          svar: null,
        },
        vederlag: {
          ...ingenting,
          betegnelse: 'svar_ikke_godtatt',
          kravet_staar: true,
          krav: { beloep: 1_000_000, metode: 'tilbud' },
          svar: { resultat: 'delvis_godkjent', beloep: 600_000, subsidiaert: true },
          enighet: null,
        },
      })
    );
    expect(screen.getByText('Kravet venter på byggherrens svar')).toBeInTheDocument();
    expect(screen.getByText('Svaret er ikke godtatt')).toBeInTheDocument();
    expect(screen.queryByText('Frist:')).not.toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it.each([
    ['ikke_forstaatt', 'Ikke forstått', 'badge-uavklart'],
    ['avslaget_paa_grunnlaget_godtatt', 'Avsluttet: avslått', 'badge-avslatt'],
    ['grunnlaget_trukket', 'Avsluttet: trukket', 'badge-avslatt'],
    ['kravene_avgjort', 'Alle krav sendt i appen er avgjort', 'badge-godkjent'],
  ] as const)(
    'saksbetegnelsen %s vises som merket «%s» i stedet for betegnelsene per spor (MM-U22)',
    (saksbetegnelse, tekst, klasse) => {
      vis(
        lagSakslinje({
          saksbetegnelse,
          grunnlag: { ...ingenting, betegnelse: 'enige', svar: null },
        })
      );
      expect(screen.getByText(tekst)).toHaveClass(klasse);
      expect(screen.queryByText('Enige')).not.toBeInTheDocument();
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

  it('kravene avgjort med registrert brev får tillegget fra visningen av saken (OV-U10)', () => {
    vis(lagSakslinje({ saksbetegnelse: 'kravene_avgjort', brev_utenfor_appen: true }));
    expect(screen.getByText('Alle krav sendt i appen er avgjort')).toBeInTheDocument();
    expect(
      screen.getByText('Saken har brev sendt utenfor appen. Appen vurderer ikke innholdet.')
    ).toBeInTheDocument();
  });

  it('tillegget står bare ved «kravene avgjort», som i visningen av saken (OV-U10)', () => {
    vis(lagSakslinje({ saksbetegnelse: 'grunnlaget_trukket', brev_utenfor_appen: true }));
    expect(screen.queryByText(/brev sendt utenfor appen/)).not.toBeInTheDocument();
  });

  it('et krav som ikke finnes, vises som strek og ikke som 0', () => {
    vis(lagSakslinje());
    expect(screen.getByLabelText('Krevd vederlag: —')).toBeInTheDocument();
    expect(screen.getByLabelText('Krevd frist: —')).toBeInTheDocument();
  });
});
