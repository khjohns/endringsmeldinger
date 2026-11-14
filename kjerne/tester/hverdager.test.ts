/**
 * Hverdagene i forlengelsen etter GFK-U17 og GFK-U24. Fridagene er dem i lov om helligdager og
 * helligdagsfred § 2 og høytidsdagene 1. og 17. mai, og påskedagene er slått opp i almanakken
 * (2026: 5. april, 2027: 28. mars).
 */
import { describe, expect, it } from 'vitest';
import { erHverdag, forlengetFrist, hverdagerIForlengelsen } from '../regler/hverdager.ts';

describe('hverdagene etter NS 8407 punkt 40.3 (GFK-U24)', () => {
  it.each([
    ['2026-11-14', 'lørdag', true],
    ['2026-11-15', 'søndag', false],
    ['2026-11-16', 'mandag', true],
    ['2026-01-01', 'nyttårsdag', false],
    ['2026-04-02', 'skjærtorsdag', false],
    ['2026-04-03', 'langfredag', false],
    ['2026-04-04', 'påskeaften, en lørdag', true],
    ['2026-04-06', 'andre påskedag', false],
    ['2026-05-14', 'Kristi himmelfartsdag', false],
    ['2026-05-25', 'andre pinsedag', false],
    ['2027-05-01', '1. mai på en lørdag', false],
    ['2027-05-17', '17. mai på en mandag', false],
    ['2027-05-06', 'Kristi himmelfartsdag 2027', false],
    ['2027-03-29', 'andre påskedag 2027', false],
    ['2026-12-24', 'julaften', true],
    ['2026-12-26', 'andre juledag', false],
  ])('%s (%s) er hverdag: %s', (dato, _hva, hverdag) => {
    expect(erHverdag(dato)).toBe(hverdag);
  });
});

describe('hverdagene i forlengelsen (GFK-U17)', () => {
  it('teller dagene etter fristen til og med den nye fristen, uten søndagen og juledagene', () => {
    // 24., 28., 29. og 30. desember. 25. og 26. er juledagene, 27. er en søndag.
    expect(hverdagerIForlengelsen('2026-12-23', 7)).toBe(4);
  });

  it('påsken tar fire av sju kalenderdager', () => {
    // 1., 4. og 7. april. 2., 3. og 6. er helligdager, og 5. er påskedag.
    expect(hverdagerIForlengelsen('2026-03-31', 7)).toBe(3);
  });

  it('fristdagen selv regnes ikke med', () => {
    expect(hverdagerIForlengelsen('2026-11-15', 1)).toBe(1);
    expect(hverdagerIForlengelsen('2026-11-14', 1)).toBe(0);
  });

  it('null dager er ingen hverdager', () => {
    expect(hverdagerIForlengelsen('2026-11-16', 0)).toBe(0);
  });

  it('avviser en dato som ikke finnes, og et antall som ikke er kalenderdager', () => {
    expect(() => hverdagerIForlengelsen('2026-02-30', 1)).toThrow('finnes ikke');
    expect(() => hverdagerIForlengelsen('16.11.2026', 1)).toThrow('ÅÅÅÅ-MM-DD');
    expect(() => hverdagerIForlengelsen('2026-11-16', 1.5)).toThrow('kalenderdager');
  });
});

describe('fristen etter forlengelsene (GFK-U19, NS 8407 punkt 1.2)', () => {
  it('forlenger med kalenderdager, også over et årsskifte og en skuddag', () => {
    expect(forlengetFrist('2026-12-20', 15)).toBe('2027-01-04');
    expect(forlengetFrist('2028-02-28', 1)).toBe('2028-02-29');
    expect(forlengetFrist('2026-11-16', 0)).toBe('2026-11-16');
  });

  it('avviser et antall som ikke er kalenderdager', () => {
    expect(() => forlengetFrist('2026-11-16', -1)).toThrow('kalenderdager');
  });
});
