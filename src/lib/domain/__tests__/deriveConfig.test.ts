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
