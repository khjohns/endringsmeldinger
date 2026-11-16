import { describe, expect, it } from 'vitest';
import { detSomKontrolleres, type Kontrollbrev } from '../Brevkontroll.svelte';

const brevet: Kontrollbrev = {
  avsnitt: [{ gjelder: 'k', laast: 'Vi påberoper en irregulær endring.' }],
  merking: 'K201-KOE-017-01',
  deresRef: [],
  tittel: 'Påberopelse av irregulær endring',
};

describe('det avsenderen godkjenner i brevet (LV-U2, LV-U46, #1892)', () => {
  it('det samme brevet gir det samme', () => {
    expect(detSomKontrolleres({ ...brevet })).toBe(detSomKontrolleres(brevet));
  });

  it.each([
    ['teksten', { avsnitt: [{ gjelder: 'k', laast: 'En annen tekst.' }] }],
    ['Vår ref.', { merking: 'K201-KOE-018-01' }],
    ['Deres ref.', { deresRef: ['BH-12'] }],
    ['tittelen', { tittel: 'Varsel om irregulær endring' }],
  ])('endres bare %s, er brevet et annet', (_del, endring) => {
    expect(detSomKontrolleres({ ...brevet, ...endring })).not.toBe(detSomKontrolleres(brevet));
  });
});
