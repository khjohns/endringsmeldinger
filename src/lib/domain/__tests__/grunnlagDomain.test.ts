import { describe, it, expect } from 'vitest';
import {
  getDefaults,
  erEndringMed32_2,
  erPaalegg,
  erForceMajeure,
  erPrekludert,
  beregnPassivitet,
  erSnuoperasjon,
  getVerdictOptions,
  getDynamicPlaceholder,
  buildEventData,
  getBhUpdateDefaults,
  detekterEndringer,
  buildTeRevisionEventData,
  type GrunnlagFormState,
  type GrunnlagDomainConfig,
} from '../grunnlagDomain';

// ============================================================================
// HELPERS
// ============================================================================

function makeState(overrides: Partial<GrunnlagFormState> = {}): GrunnlagFormState {
  return {
    varsletITide: true,
    resultat: undefined,
    resultatError: false,
    begrunnelse: '',
    begrunnelseValidationError: undefined,
    ...overrides,
  };
}

function makeConfig(overrides: Partial<GrunnlagDomainConfig> = {}): GrunnlagDomainConfig {
  return {
    grunnlagEvent: { hovedkategori: 'ENDRING', underkategori: 'ANNEN' },
    isUpdateMode: false,
    harSubsidiaereSvar: false,
    ...overrides,
  };
}

// ============================================================================
// getDefaults
// ============================================================================

describe('getDefaults', () => {
  it('returns create mode defaults', () => {
    const defaults = getDefaults({ isUpdateMode: false });
    expect(defaults.varsletITide).toBe(true);
    expect(defaults.resultat).toBeUndefined();
    expect(defaults.begrunnelse).toBe('');
  });

  it('pre-fills resultat in update mode', () => {
    const defaults = getDefaults({
      isUpdateMode: true,
      lastResponseEvent: { resultat: 'avslatt' },
    });
    expect(defaults.resultat).toBe('avslatt');
  });
});

// ============================================================================
// Category checks
// ============================================================================

describe('erEndringMed32_2', () => {
  it('returns true for ENDRING with non-EO', () => {
    expect(erEndringMed32_2({ hovedkategori: 'ENDRING', underkategori: 'ANNEN' })).toBe(true);
  });

  it('returns true for ENDRING with IRREG', () => {
    expect(erEndringMed32_2({ hovedkategori: 'ENDRING', underkategori: 'IRREG' })).toBe(true);
  });

  it('returns false for ENDRING with EO', () => {
    expect(erEndringMed32_2({ hovedkategori: 'ENDRING', underkategori: 'EO' })).toBe(false);
  });

  it('returns false for FORCE_MAJEURE', () => {
    expect(erEndringMed32_2({ hovedkategori: 'FORCE_MAJEURE' })).toBe(false);
  });

  it('returns false for undefined event', () => {
    expect(erEndringMed32_2(undefined)).toBe(false);
  });
});

describe('erPaalegg', () => {
  it('returns true for IRREG', () => {
    expect(erPaalegg({ hovedkategori: 'ENDRING', underkategori: 'IRREG' })).toBe(true);
  });

  it('returns true for VALGRETT', () => {
    expect(erPaalegg({ hovedkategori: 'ENDRING', underkategori: 'VALGRETT' })).toBe(true);
  });

  it('returns false for ANNEN', () => {
    expect(erPaalegg({ hovedkategori: 'ENDRING', underkategori: 'ANNEN' })).toBe(false);
  });

  it('returns false for EO', () => {
    expect(erPaalegg({ hovedkategori: 'ENDRING', underkategori: 'EO' })).toBe(false);
  });
});

describe('erForceMajeure', () => {
  it('returns true for FORCE_MAJEURE', () => {
    expect(erForceMajeure({ hovedkategori: 'FORCE_MAJEURE' })).toBe(true);
  });

  it('returns false for ENDRING', () => {
    expect(erForceMajeure({ hovedkategori: 'ENDRING' })).toBe(false);
  });
});

// ============================================================================
// erPrekludert
// ============================================================================

describe('erPrekludert', () => {
  it('returns true for ENDRING when varsletITide is false', () => {
    expect(erPrekludert(
      makeState({ varsletITide: false }),
      makeConfig({ grunnlagEvent: { hovedkategori: 'ENDRING', underkategori: 'ANNEN' } }),
    )).toBe(true);
  });

  it('returns false for ENDRING when varsletITide is true', () => {
    expect(erPrekludert(
      makeState({ varsletITide: true }),
      makeConfig({ grunnlagEvent: { hovedkategori: 'ENDRING', underkategori: 'ANNEN' } }),
    )).toBe(false);
  });

  it('returns false for EO even when varsletITide is false', () => {
    expect(erPrekludert(
      makeState({ varsletITide: false }),
      makeConfig({ grunnlagEvent: { hovedkategori: 'ENDRING', underkategori: 'EO' } }),
    )).toBe(false);
  });

  it('returns false for FORCE_MAJEURE', () => {
    expect(erPrekludert(
      makeState({ varsletITide: false }),
      makeConfig({ grunnlagEvent: { hovedkategori: 'FORCE_MAJEURE' } }),
    )).toBe(false);
  });
});

// ============================================================================
// beregnPassivitet
// ============================================================================

describe('beregnPassivitet', () => {
  it('returns erPassiv true when > 10 days since varsel for ENDRING', () => {
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - 15);
    const result = beregnPassivitet({
      hovedkategori: 'ENDRING',
      underkategori: 'ANNEN',
      dato_varslet: daysAgo.toISOString().split('T')[0],
    });
    expect(result.erPassiv).toBe(true);
    expect(result.dagerSidenVarsel).toBeGreaterThanOrEqual(15);
  });

  it('returns erPassiv false when <= 10 days since varsel', () => {
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - 5);
    const result = beregnPassivitet({
      hovedkategori: 'ENDRING',
      underkategori: 'ANNEN',
      dato_varslet: daysAgo.toISOString().split('T')[0],
    });
    expect(result.erPassiv).toBe(false);
  });

  it('returns erPassiv false for EO even with old varsel', () => {
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - 30);
    const result = beregnPassivitet({
      hovedkategori: 'ENDRING',
      underkategori: 'EO',
      dato_varslet: daysAgo.toISOString().split('T')[0],
    });
    expect(result.erPassiv).toBe(false);
  });

  it('returns 0 dagerSidenVarsel when no dato_varslet', () => {
    const result = beregnPassivitet({ hovedkategori: 'ENDRING', underkategori: 'ANNEN' });
    expect(result.dagerSidenVarsel).toBe(0);
    expect(result.erPassiv).toBe(false);
  });
});

// ============================================================================
// erSnuoperasjon
// ============================================================================

describe('erSnuoperasjon', () => {
  it('returns true when update mode, forrige avslatt, nå godkjent', () => {
    expect(erSnuoperasjon(
      makeState({ resultat: 'godkjent' }),
      makeConfig({ isUpdateMode: true, forrigeResultat: 'avslatt' }),
    )).toBe(true);
  });

  it('returns false when not update mode', () => {
    expect(erSnuoperasjon(
      makeState({ resultat: 'godkjent' }),
      makeConfig({ isUpdateMode: false, forrigeResultat: 'avslatt' }),
    )).toBe(false);
  });

  it('returns false when forrige was godkjent', () => {
    expect(erSnuoperasjon(
      makeState({ resultat: 'godkjent' }),
      makeConfig({ isUpdateMode: true, forrigeResultat: 'godkjent' }),
    )).toBe(false);
  });

  it('returns false when nå is avslatt', () => {
    expect(erSnuoperasjon(
      makeState({ resultat: 'avslatt' }),
      makeConfig({ isUpdateMode: true, forrigeResultat: 'avslatt' }),
    )).toBe(false);
  });
});

// ============================================================================
// getVerdictOptions
// ============================================================================

describe('getVerdictOptions', () => {
  it('returns godkjent and avslatt for normal ENDRING', () => {
    const opts = getVerdictOptions(makeConfig({
      grunnlagEvent: { hovedkategori: 'ENDRING', underkategori: 'ANNEN' },
    }));
    expect(opts).toHaveLength(2);
    expect(opts.map(o => o.value)).toEqual(['godkjent', 'avslatt']);
  });

  it('includes frafalt for IRREG (paaleg)', () => {
    const opts = getVerdictOptions(makeConfig({
      grunnlagEvent: { hovedkategori: 'ENDRING', underkategori: 'IRREG' },
    }));
    expect(opts).toHaveLength(3);
    expect(opts.map(o => o.value)).toContain('frafalt');
  });

  it('includes frafalt for VALGRETT (paaleg)', () => {
    const opts = getVerdictOptions(makeConfig({
      grunnlagEvent: { hovedkategori: 'ENDRING', underkategori: 'VALGRETT' },
    }));
    expect(opts).toHaveLength(3);
    expect(opts.map(o => o.value)).toContain('frafalt');
  });

  it('does not include frafalt for EO', () => {
    const opts = getVerdictOptions(makeConfig({
      grunnlagEvent: { hovedkategori: 'ENDRING', underkategori: 'EO' },
    }));
    expect(opts).toHaveLength(2);
  });

  it('does not include frafalt for FORCE_MAJEURE', () => {
    const opts = getVerdictOptions(makeConfig({
      grunnlagEvent: { hovedkategori: 'FORCE_MAJEURE' },
    }));
    expect(opts).toHaveLength(2);
  });
});

// ============================================================================
// getDynamicPlaceholder
// ============================================================================

describe('getDynamicPlaceholder', () => {
  it('returns default when no resultat', () => {
    expect(getDynamicPlaceholder(undefined, false)).toContain('Velg resultat');
  });

  it('returns prekludert + godkjent placeholder', () => {
    expect(getDynamicPlaceholder('godkjent', true)).toContain('preklusjonsinnsigelse');
    expect(getDynamicPlaceholder('godkjent', true)).toContain('godkjenning');
  });

  it('returns prekludert + avslatt placeholder', () => {
    expect(getDynamicPlaceholder('avslatt', true)).toContain('preklusjonsinnsigelse');
    expect(getDynamicPlaceholder('avslatt', true)).toContain('avslag');
  });

  it('returns godkjent placeholder', () => {
    expect(getDynamicPlaceholder('godkjent', false)).toContain('vurdering');
  });

  it('returns avslatt placeholder', () => {
    expect(getDynamicPlaceholder('avslatt', false)).toContain('grunnlag for krav');
  });

  it('returns frafalt placeholder', () => {
    expect(getDynamicPlaceholder('frafalt', false)).toContain('frafalles');
  });
});

// ============================================================================
// buildEventData
// ============================================================================

describe('buildEventData', () => {
  it('builds create mode event data', () => {
    const state = makeState({ resultat: 'godkjent', begrunnelse: 'Test begrunnelse', varsletITide: true });
    const config = {
      ...makeConfig(),
      grunnlagEventId: 'grunnlag-42',
      lastResponseEventId: undefined,
    };
    const data = buildEventData(state, config);
    expect(data.grunnlag_event_id).toBe('grunnlag-42');
    expect(data.resultat).toBe('godkjent');
    expect(data.begrunnelse).toBe('Test begrunnelse');
    expect(data.grunnlag_varslet_i_tide).toBe(true);
  });

  it('builds update mode event data', () => {
    const state = makeState({ resultat: 'godkjent', begrunnelse: 'Oppdatert' });
    const config = {
      ...makeConfig({ isUpdateMode: true }),
      grunnlagEventId: 'grunnlag-42',
      lastResponseEventId: 'evt-99',
    };
    const data = buildEventData(state, config);
    expect(data.original_respons_id).toBe('evt-99');
    expect(data.resultat).toBe('godkjent');
    expect(data.begrunnelse).toBe('Oppdatert');
    expect(data.dato_endret).toBeDefined();
    expect(data.grunnlag_event_id).toBeUndefined();
  });

  it('omits grunnlag_varslet_i_tide for EO', () => {
    const state = makeState({ resultat: 'godkjent', begrunnelse: 'Test' });
    const config = {
      ...makeConfig({ grunnlagEvent: { hovedkategori: 'ENDRING', underkategori: 'EO' } }),
      grunnlagEventId: 'grunnlag-42',
    };
    const data = buildEventData(state, config);
    expect(data.grunnlag_varslet_i_tide).toBeUndefined();
  });

  it('includes dager_siden_varsel when > 0', () => {
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - 5);
    const state = makeState({ resultat: 'godkjent', begrunnelse: 'Test' });
    const config = {
      ...makeConfig({
        grunnlagEvent: {
          hovedkategori: 'ENDRING',
          underkategori: 'ANNEN',
          dato_varslet: daysAgo.toISOString().split('T')[0],
        },
      }),
      grunnlagEventId: 'grunnlag-42',
    };
    const data = buildEventData(state, config);
    expect(data.dager_siden_varsel).toBeGreaterThanOrEqual(5);
  });

  it('includes grunnlag_varslet_i_tide in update mode for ENDRING', () => {
    const state = makeState({ resultat: 'godkjent', begrunnelse: 'Oppdatert', varsletITide: false });
    const config = {
      ...makeConfig({
        isUpdateMode: true,
        grunnlagEvent: { hovedkategori: 'ENDRING', underkategori: 'ANNEN' },
      }),
      grunnlagEventId: 'grunnlag-42',
      lastResponseEventId: 'evt-99',
    };
    const data = buildEventData(state, config);
    expect(data.grunnlag_varslet_i_tide).toBe(false);
  });
});

// ============================================================================
// getBhUpdateDefaults
// ============================================================================

describe('getBhUpdateDefaults', () => {
  it('pre-fills all fields from previous response', () => {
    const defaults = getBhUpdateDefaults({
      forrigeResultat: 'avslatt',
      forrigeVarsletITide: false,
      forrigeBegrunnelseHtml: '<p>Forrige begrunnelse</p>',
    });
    expect(defaults.resultat).toBe('avslatt');
    expect(defaults.varsletITide).toBe(false);
    expect(defaults.begrunnelse).toBe('<p>Forrige begrunnelse</p>');
  });

  it('defaults varsletITide to true when not set', () => {
    const defaults = getBhUpdateDefaults({
      forrigeResultat: 'godkjent',
    });
    expect(defaults.varsletITide).toBe(true);
    expect(defaults.begrunnelse).toBe('');
  });
});

// ============================================================================
// detekterEndringer
// ============================================================================

describe('detekterEndringer', () => {
  it('detects snuoperasjon (avslått → godkjent)', () => {
    const info = detekterEndringer(
      { resultat: 'godkjent', varsletITide: true, begrunnelse: '' },
      { resultat: 'avslatt' },
    );
    expect(info.harEndring).toBe(true);
    expect(info.endringer).toHaveLength(1);
    expect(info.endringer[0].type).toBe('snuoperasjon');
  });

  it('detects trekker_godkjenning (godkjent → avslått)', () => {
    const info = detekterEndringer(
      { resultat: 'avslatt', varsletITide: true, begrunnelse: '' },
      { resultat: 'godkjent' },
    );
    expect(info.harEndring).toBe(true);
    expect(info.endringer[0].type).toBe('trekker_godkjenning');
  });

  it('detects frafaller_innsigelse (false → true)', () => {
    const info = detekterEndringer(
      { resultat: 'avslatt', varsletITide: true, begrunnelse: '' },
      { resultat: 'avslatt', varsletITide: false },
    );
    expect(info.harEndring).toBe(true);
    expect(info.endringer[0].type).toBe('frafaller_innsigelse');
  });

  it('detects ny_innsigelse (true → false)', () => {
    const info = detekterEndringer(
      { resultat: 'avslatt', varsletITide: false, begrunnelse: '' },
      { resultat: 'avslatt', varsletITide: true },
    );
    expect(info.harEndring).toBe(true);
    expect(info.endringer[0].type).toBe('ny_innsigelse');
  });

  it('detects begrunnelse change', () => {
    const info = detekterEndringer(
      { resultat: 'avslatt', varsletITide: true, begrunnelse: '<p>Ny</p>' },
      { resultat: 'avslatt', begrunnelse: '<p>Gammel</p>' },
    );
    expect(info.harEndring).toBe(true);
    expect(info.endringer[0].felt).toBe('begrunnelse');
  });

  it('returns no changes when nothing changed', () => {
    const info = detekterEndringer(
      { resultat: 'avslatt', varsletITide: false, begrunnelse: '<p>Samme</p>' },
      { resultat: 'avslatt', varsletITide: false, begrunnelse: '<p>Samme</p>' },
    );
    expect(info.harEndring).toBe(false);
    expect(info.endringer).toHaveLength(0);
  });

  it('detects multiple changes at once', () => {
    const info = detekterEndringer(
      { resultat: 'godkjent', varsletITide: true, begrunnelse: '<p>Ny</p>' },
      { resultat: 'avslatt', varsletITide: false, begrunnelse: '<p>Gammel</p>' },
    );
    expect(info.harEndring).toBe(true);
    expect(info.endringer).toHaveLength(3);
  });
});

// ============================================================================
// buildTeRevisionEventData
// ============================================================================

describe('buildTeRevisionEventData', () => {
  it('builds TE revision payload', () => {
    const data = buildTeRevisionEventData({
      originalEventId: 'evt-grunnlag-1',
      begrunnelseHtml: '<p>Oppdatert begrunnelse</p>',
    });
    expect(data.original_event_id).toBe('evt-grunnlag-1');
    expect(data.begrunnelse).toBe('<p>Oppdatert begrunnelse</p>');
    expect(data.dato_revidert).toBeDefined();
  });
});
