import { describe, expect, it } from 'vitest';
import { decisionSummary } from './letter';
import type { ReviewItem } from './types';

const item = (
  track: 'vederlag' | 'frist',
  data: Record<string, unknown>,
  basis: Partial<NonNullable<ReviewItem['basis']>>
) => ({ track, data, basis }) as ReviewItem;
const kr = (value: number) => `${value.toLocaleString('nb-NO')} kr`;

describe('decisionSummary ved avslått eller prekludert grunnlag (#168, #186)', () => {
  it('sier at hele svaret er subsidiært, med resultatet av beløpene', () => {
    expect(
      decisionSummary(
        item(
          'vederlag',
          { beregnings_resultat: 'delvis_godkjent', total_godkjent_belop: 150000 },
          { resultat: 'avslatt' }
        )
      )
    ).toBe(`Prinsipalt avslått (grunnlaget) · Subsidiært delvis godkjent: ${kr(150000)}`);
    expect(
      decisionSummary(
        item(
          'frist',
          { beregnings_resultat: 'godkjent', godkjent_dager: 10 },
          { resultat: 'avslatt' }
        )
      )
    ).toBe('Prinsipalt avslått (grunnlaget) · Subsidiært godkjent: 10 dager');
  });

  it('lar et subsidiært standpunkt i svaret stå etter som atter subsidiært', () => {
    expect(
      decisionSummary(
        item(
          'frist',
          {
            beregnings_resultat: 'avslatt',
            godkjent_dager: 0,
            subsidiaer_resultat: 'delvis_godkjent',
            subsidiaer_godkjent_dager: 4,
          },
          { resultat: 'avslatt' }
        )
      )
    ).toBe(
      'Prinsipalt avslått (grunnlaget) · Subsidiært avslått: 0 dager · Atter subsidiært delvis godkjent: 4 dager'
    );
  });

  it.each([
    ['EO', `Godkjent · ${kr(150000)}`],
    ['IRREG', `Prinsipalt avslått (grunnlaget) · Subsidiært godkjent: ${kr(150000)}`],
  ])('§ 32.2 gjelder bare endring uten formell endringsordre (%s)', (underkategori, forventet) => {
    expect(
      decisionSummary(
        item(
          'vederlag',
          { beregnings_resultat: 'godkjent', total_godkjent_belop: 150000 },
          { resultat: 'godkjent', hovedkategori: 'ENDRING', underkategori, varsletITide: false }
        )
      )
    ).toBe(forventet);
  });
});
