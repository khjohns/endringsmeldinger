import { describe, expect, it } from 'vitest';
import { FORMATFEIL, lesKroner, OEREFEIL, visKroner } from '../belop';

// Forventningene er OV-U58 og kravene til rettingen i #1285.
describe('beløpet parten skriver (OV-U58, #1285)', () => {
  it('desimalkommaet bevares: 100 000,40 er 100 000 kroner og 40 øre', () => {
    expect(lesKroner('100 000,40')).toEqual({ verdi: 100000.4 });
    expect(lesKroner('100 000,4')).toEqual({ verdi: 100000.4 });
    expect(lesKroner('250000')).toEqual({ verdi: 250000 });
  });

  it('avsluttende nuller godtas når beløpet fortsatt er et helt antall øre', () => {
    expect(lesKroner('100 000,400')).toEqual({ verdi: 100000.4 });
    expect(lesKroner('100,00')).toEqual({ verdi: 100 });
    expect(lesKroner('100,')).toEqual({ verdi: 100 });
  });

  it('brøkdeler av øre avvises og rundes ikke av', () => {
    expect(lesKroner('100 000,405')).toEqual({ feil: OEREFEIL });
    expect(lesKroner('124 999,995')).toEqual({ feil: OEREFEIL });
  });

  it('et format som ikke støttes, avvises og gjøres ikke om ved å fjerne tegn', () => {
    for (const tekst of ['100.000', '100 000.40', '1e5', '-100', '100 kr', 'abc', '1,2,3'])
      expect(lesKroner(tekst), tekst).toEqual({ feil: FORMATFEIL });
  });

  it('tom tekst er ikke oppgitt', () => {
    expect(lesKroner('  ')).toEqual({ verdi: undefined });
  });

  it('beløpet vises med øre bare når det har øre', () => {
    expect(visKroner(100000.4).replace(/\s/g, ' ')).toBe('100 000,40');
    expect(visKroner(250000).replace(/\s/g, ' ')).toBe('250 000');
    expect(visKroner(undefined)).toBe('');
  });
});
