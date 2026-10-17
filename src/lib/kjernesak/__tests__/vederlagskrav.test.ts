/**
 * Vederlagskravet saksbildet bygger på TS-stien (#667). Kilden til forventningene
 * er formatet i kjernen (bare tilbud i prøven, OV-U1), katalogens koder (#335) og
 * avgjørelsen om utdypningen (oppdragsgiver 17.10, «B: Utdypning, valgfri», #667).
 * At kjernen godtar formen, prøves med kjernens egen formkontroll.
 */

import { describe, expect, it } from 'vitest';
import { metodeKanSendesTilKjernen, vederlagskrav } from '$lib/kjernesak/vederlagskrav';
import { formfeil } from '$kjerne/kommandoer/kommando';

describe('vederlagskravet fra saksbildet', () => {
  it('tilbud med begrunnelse blir krav med metoden tilbud, beløpet og utdypningen', () => {
    const kommando = vederlagskrav({
      metode: 'FASTPRIS_TILBUD',
      beloep: 250000,
      utdypning: '  Tilbudet gjelder ny fundamentering.  ',
    });
    expect(kommando).toEqual({
      type: 'krav',
      spor: 'vederlag',
      innhold: { metode: 'tilbud', beloep: 250000 },
      utdypning: 'Tilbudet gjelder ny fundamentering.',
    });
    expect(formfeil(kommando)).toEqual([]);
  });

  it('uten begrunnelse sendes kravet uten utdypning (oppdragsgiver 17.10)', () => {
    const kommando = vederlagskrav({ metode: 'FASTPRIS_TILBUD', beloep: 1000, utdypning: ' ' });
    expect(kommando).not.toHaveProperty('utdypning');
    expect(formfeil(kommando)).toEqual([]);
  });

  it.each(['REGNINGSARBEID', 'ENHETSPRISER', ''])(
    'metoden %s avvises og tilbys ikke (OV-U1)',
    (metode) => {
      expect(metodeKanSendesTilKjernen(metode)).toBe(false);
      expect(() => vederlagskrav({ metode, beloep: 1000, utdypning: '' })).toThrow(
        'kan ikke sendes i TS-stien'
      );
    }
  );

  it('kjernen avviser et beløp som ikke er over null', () => {
    const kommando = vederlagskrav({ metode: 'FASTPRIS_TILBUD', beloep: 0, utdypning: '' });
    expect(formfeil(kommando)).not.toEqual([]);
  });
});
