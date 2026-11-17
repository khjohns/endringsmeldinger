import { describe, expect, it } from 'vitest';
import startjournaler from '../../../../docs/domenetabell/brukerforlop/startjournaler.json';
import { KJERNE } from '#kjerne/versjon.ts';
import { FORLOEP, medGjeldendeRegelversjon } from '../demosak.ts';

/** Hver verdi med feltet `regelversjon` i `data`, i alle nivåer. */
function regelversjonene(data: unknown): unknown[] {
  if (Array.isArray(data)) return data.flatMap(regelversjonene);
  if (typeof data !== 'object' || data === null) return [];
  return Object.entries(data).flatMap(([felt, verdi]) =>
    felt === 'regelversjon' ? [verdi] : regelversjonene(verdi)
  );
}

describe('startjournalene i demoruta (#2116)', () => {
  it('en startjournal skrevet med en eldre regelversjon får gjeldende versjon i beslutningsgrunnlaget og aksepten', () => {
    const eldre = KJERNE.regler.versjon - 1;
    const journal = {
      svar: [{ beslutningsgrunnlag: { regelversjon: eldre, linje: 'regelversjon' } }],
      utsagn: [{ art: 'aksept', regelversjon: eldre }],
    };
    expect(medGjeldendeRegelversjon(journal)).toEqual({
      svar: [
        { beslutningsgrunnlag: { regelversjon: KJERNE.regler.versjon, linje: 'regelversjon' } },
      ],
      utsagn: [{ art: 'aksept', regelversjon: KJERNE.regler.versjon }],
    });
  });

  it('forløpene i demoruta har gjeldende regelversjon der startjournalene har en', () => {
    const iFila = regelversjonene(startjournaler);
    expect(iFila.length, 'forutsetning: fila har regelversjoner').toBeGreaterThan(0);
    const iDemoen = regelversjonene(FORLOEP);
    expect(iDemoen).toHaveLength(iFila.length);
    expect(new Set(iDemoen)).toEqual(new Set([KJERNE.regler.versjon]));
  });
});
