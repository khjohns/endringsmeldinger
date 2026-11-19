import { describe, expect, it } from 'vitest';
import { detSomKontrolleres } from '../Brevkontroll.svelte';
import type { Kontrollbrev } from '../nysak';

const brevet: Kontrollbrev = {
  avsnitt: [{ gjelder: 'k', laast: 'Vi påberoper en irregulær endring.' }],
  merking: 'K201-KOE-017-01',
  deresRef: [],
  tittel: 'Påberopelse av irregulær endring',
};

describe('det avsenderen godkjenner i brevet (LV-U2, LV-U46, #1892)', () => {
  it('det samme brevet, laget på nytt, gir det samme', () => {
    const igjen: Kontrollbrev = {
      avsnitt: [{ gjelder: 'k', laast: 'Vi påberoper en irregulær endring.' }],
      merking: 'K201-KOE-017-01',
      deresRef: [],
      tittel: 'Påberopelse av irregulær endring',
    };
    expect(detSomKontrolleres(igjen)).toBe(detSomKontrolleres(brevet));
  });

  it('delene blandes ikke: en Deres ref. er ikke det samme som tittelen', () => {
    const a: Kontrollbrev = { avsnitt: [], merking: null, deresRef: ['A'], tittel: 'B' };
    const b: Kontrollbrev = {
      avsnitt: [{ gjelder: 'k', laast: 'B' }],
      merking: null,
      deresRef: [],
      tittel: 'A',
    };
    expect(detSomKontrolleres(a)).not.toBe(detSomKontrolleres(b));
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
