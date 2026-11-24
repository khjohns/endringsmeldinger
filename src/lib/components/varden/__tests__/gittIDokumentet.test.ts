import { describe, expect, it } from 'vitest';
import { KRAVSKJEMA } from '../tekster';

// LV-U45 og arbeidsvalget 1 A 16.11 i #807: dokumentet nevnes med typen, og et notat eller annet
// dokument som «dokumentet».
describe('dokumentet en kravpost ble varslet i (VS-U53)', () => {
  it.each([
    ['brev', 'brevet'],
    ['e_post', 'e-posten'],
    ['moetereferat', 'møtereferatet'],
    ['notat', 'dokumentet'],
  ] as const)('%s nevnes som «%s»', (type, ord) => {
    expect(KRAVSKJEMA.gittIDokumentet(type, '2026-10-05')).toBe(
      `Gitt i ${ord} av 5. oktober 2026, som legges ved kravet.`
    );
  });
});
