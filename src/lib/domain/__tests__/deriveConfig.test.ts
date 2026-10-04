import { describe, it, expect } from 'vitest';
import { deriveFristDomainConfig } from '../deriveConfig';
import { scenario1_3AktiveSpor } from '$lib/mocks/caseState';
import type { SakState } from '$lib/types/timeline';

function medFrist(frist: Partial<SakState['frist']>): SakState {
  return {
    ...scenario1_3AktiveSpor,
    frist: { ...scenario1_3AktiveSpor.frist, ...frist },
  };
}

describe('deriveFristDomainConfig — tidligere svar (#181)', () => {
  it('behandler null fra API-et som at BH ikke har svart', () => {
    const sak = medFrist({
      bh_respondert_versjon: null as unknown as undefined,
      frist_varsel_ok: undefined,
    });
    expect(deriveFristDomainConfig(sak).harTidligereVarselITide).toBe(false);
  });

  it('regner et tidligere svar uten innsigelse som varslet i tide', () => {
    const sak = medFrist({ bh_respondert_versjon: 0, frist_varsel_ok: undefined });
    expect(deriveFristDomainConfig(sak).harTidligereVarselITide).toBe(true);
  });
});

describe('deriveFristDomainConfig — svar på forespørselen (#181)', () => {
  it('gjelder bare kravet som besvarte forespørselen', () => {
    const svaret = medFrist({ har_bh_foresporsel: true, kravet_besvarer_foresporselen: true });
    expect(deriveFristDomainConfig(svaret).erSvarPaForesporsel).toBe(true);
  });

  it('gjelder ikke en senere revisjon, selv om forespørselen finnes', () => {
    const revisjon = medFrist({ har_bh_foresporsel: true, kravet_besvarer_foresporselen: false });
    expect(deriveFristDomainConfig(revisjon).erSvarPaForesporsel).toBe(false);
  });
});
