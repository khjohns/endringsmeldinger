/**
 * Punktene i panelet følger brevet (#2190). Med flere kravposter har bare den første posten
 * overskriften i brevet (KA-U53), og de andre står under den.
 */
import { describe, expect, it } from 'vitest';
import type { Avsnitt } from '#kjerne/typer.ts';
import { panelpunktene, punktoverskriftene } from '../svarskjema';

const avsnitt = (punkt: string, overskrift?: string): Avsnitt => ({
  gjelder: 'svar-1',
  punkt,
  overskrift,
  laast: '',
});

describe('punktene i panelet med flere kravposter (KA-U53)', () => {
  const brevet = [
    avsnitt('metode', '3. Beregningsmetode'),
    avsnitt('P1', '4. Vederlagsjustering (punkt 34.1.2)'),
    avsnitt('P2'),
    avsnitt('P3'),
    avsnitt('forbeholdet', '5. Forbehold'),
  ];
  const skjemaet = [
    { punkt: 'P2', navn: 'P2: Beløp' },
    { punkt: 'metode', navn: 'Beregningsmetode' },
    { punkt: 'P3', navn: 'P3: Beløp' },
    { punkt: 'P1', navn: 'P1: Beløp' },
    { punkt: 'forbeholdet', navn: 'Forbehold' },
  ];

  it('postene uten egen overskrift står rett etter den første posten, i brevets rekkefølge', () => {
    const panelet = panelpunktene(skjemaet, punktoverskriftene(brevet));
    expect(panelet.map((p) => p.navn)).toEqual([
      '3. Beregningsmetode',
      '4. Vederlagsjustering (punkt 34.1.2)',
      'P2: Beløp',
      'P3: Beløp',
      '5. Forbehold',
    ]);
  });

  it('bare punktene med overskrift har brevets navn', () => {
    const overskriftene = punktoverskriftene(brevet);
    expect(overskriftene.get('P1')).toBe('4. Vederlagsjustering (punkt 34.1.2)');
    expect(overskriftene.get('P2')).toBeUndefined();
  });
});
