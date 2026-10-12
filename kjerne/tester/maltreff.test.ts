/**
 * Hvordan et mål i feilinnføringene treffer et testnavn (#436): `vurder` og `--ankre` i
 * `feilinnfoering.ts` bruker begge `treffer`.
 */

import { describe, expect, it } from 'vitest';
import { treffer } from './maltreff.ts';

describe('målet til en feilinnføring', () => {
  it.each([
    ['forløp A–E i minnet F-MM-D', 'F-MM-D'],
    ['forløp A–E i minnet F-MM-D-godtatt', 'F-MM-D-godtatt'],
    ['forløp A–E i minnet F-MM-D: aksept', 'F-MM-D'],
    ['forløp A–E i minnet F-MM-D-godtatt og F-MM-D', 'F-MM-D'],
    ['avviser constructor i innholdet', 'avviser constructor'],
    ['brevet med teksten i VS-U15', 'med teksten i VS-U15'],
  ])('«%s» treffes av «%s»', (navn, mal) => {
    expect(treffer(navn, mal)).toBe(true);
  });

  it.each([
    ['forløp A–E i minnet F-MM-D-godtatt', 'F-MM-D'],
    ['forløp A–E i minnet F-MM-A5b', 'F-MM-A'],
    ['forløp A–E i minnet F-MM-C3d-kontroll', 'F-MM-C3d'],
    ['forløp A–E i minnet F-MM-D_ny', 'F-MM-D'],
    ['forløp A–E i minnet XF-MM-D', 'F-MM-D'],
    ['brevet med teksten i VS-U15a', 'med teksten i VS-U15'],
    ['avviser constructor i innholdet', 'avviser constr'],
  ])('«%s» treffes ikke av «%s»', (navn, mal) => {
    expect(treffer(navn, mal)).toBe(false);
  });
});
