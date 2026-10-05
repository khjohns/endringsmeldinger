import { describe, it, expect } from 'vitest';
import {
  getDefaults,
  erEndringMed32_2,
  erPaalegg,
  erPrekludert,
  erGrunnlagetSubsidiaert,
  beregnPassivitet,
  getVerdictOptions,
  buildEventData,
  buildTeRevisionEventData,
  type GrunnlagFormState,
  type GrunnlagDomainConfig,
} from '../grunnlagDomain';
import { REGELVERSJON } from '../regelversjon';

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
  it('returns create mode defaults (no pre-selection)', () => {
    const defaults = getDefaults({ isUpdateMode: false });
    expect(defaults.varsletITide).toBeUndefined();
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

// ============================================================================
// erPrekludert
// ============================================================================

describe('erGrunnlagetSubsidiaert', () => {
  it.each([
    [{ resultat: 'avslatt', hovedkategori: 'SVIKT' }, true],
    [
      {
        resultat: 'godkjent',
        hovedkategori: 'ENDRING',
        underkategori: 'IRREG',
        varsletITide: false,
      },
      true,
    ],
    [
      {
        resultat: 'godkjent',
        hovedkategori: 'ENDRING',
        underkategori: ['IRREG'],
        varsletITide: false,
      },
      true,
    ],
    [
      { resultat: 'godkjent', hovedkategori: 'ENDRING', underkategori: 'EO', varsletITide: false },
      false,
    ],
    [
      {
        resultat: 'godkjent',
        hovedkategori: 'ENDRING',
        underkategori: 'IRREG',
        varsletITide: true,
      },
      false,
    ],
    [{ resultat: 'godkjent', hovedkategori: 'SVIKT', varsletITide: false }, false],
  ])('%o gir %s', (grunnlag, forventet) => {
    expect(erGrunnlagetSubsidiaert(grunnlag)).toBe(forventet);
  });
});

describe('erPrekludert', () => {
  it('returns true for ENDRING when varsletITide is false', () => {
    expect(
      erPrekludert(
        makeState({ varsletITide: false }),
        makeConfig({ grunnlagEvent: { hovedkategori: 'ENDRING', underkategori: 'ANNEN' } })
      )
    ).toBe(true);
  });

  it('returns false for ENDRING when varsletITide is true', () => {
    expect(
      erPrekludert(
        makeState({ varsletITide: true }),
        makeConfig({ grunnlagEvent: { hovedkategori: 'ENDRING', underkategori: 'ANNEN' } })
      )
    ).toBe(false);
  });

  it('returns false for EO even when varsletITide is false', () => {
    expect(
      erPrekludert(
        makeState({ varsletITide: false }),
        makeConfig({ grunnlagEvent: { hovedkategori: 'ENDRING', underkategori: 'EO' } })
      )
    ).toBe(false);
  });

  it('returns false for FORCE_MAJEURE', () => {
    expect(
      erPrekludert(
        makeState({ varsletITide: false }),
        makeConfig({ grunnlagEvent: { hovedkategori: 'FORCE_MAJEURE' } })
      )
    ).toBe(false);
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
// getVerdictOptions
// ============================================================================

describe('getVerdictOptions', () => {
  it('returns godkjent and avslatt for normal ENDRING', () => {
    const opts = getVerdictOptions(
      makeConfig({
        grunnlagEvent: { hovedkategori: 'ENDRING', underkategori: 'ANNEN' },
      })
    );
    expect(opts).toHaveLength(2);
    expect(opts.map((o) => o.value)).toEqual(['godkjent', 'avslatt']);
  });

  it('includes frafalt for IRREG (paaleg)', () => {
    const opts = getVerdictOptions(
      makeConfig({
        grunnlagEvent: { hovedkategori: 'ENDRING', underkategori: 'IRREG' },
      })
    );
    expect(opts).toHaveLength(3);
    expect(opts.map((o) => o.value)).toContain('frafalt');
  });

  it('includes frafalt for VALGRETT (paaleg)', () => {
    const opts = getVerdictOptions(
      makeConfig({
        grunnlagEvent: { hovedkategori: 'ENDRING', underkategori: 'VALGRETT' },
      })
    );
    expect(opts).toHaveLength(3);
    expect(opts.map((o) => o.value)).toContain('frafalt');
  });

  it('does not include frafalt for EO', () => {
    const opts = getVerdictOptions(
      makeConfig({
        grunnlagEvent: { hovedkategori: 'ENDRING', underkategori: 'EO' },
      })
    );
    expect(opts).toHaveLength(2);
  });

  it('does not include frafalt for FORCE_MAJEURE', () => {
    const opts = getVerdictOptions(
      makeConfig({
        grunnlagEvent: { hovedkategori: 'FORCE_MAJEURE' },
      })
    );
    expect(opts).toHaveLength(2);
  });
});

// ============================================================================
// buildEventData
// ============================================================================

describe('buildEventData', () => {
  it('builds create mode event data', () => {
    const state = makeState({
      resultat: 'godkjent',
      begrunnelse: 'Test begrunnelse',
      varsletITide: true,
    });
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
    expect(data.regelversjon).toBe(REGELVERSJON);
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
    expect(data.regelversjon).toBe(REGELVERSJON);
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
    const state = makeState({
      resultat: 'godkjent',
      begrunnelse: 'Oppdatert',
      varsletITide: false,
    });
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
// buildTeRevisionEventData
// ============================================================================

describe('buildTeRevisionEventData', () => {
  it('preserves required basis fields when revising the description for the API', () => {
    const data = buildTeRevisionEventData({
      originalEventId: 'original',
      begrunnelseHtml: '<p>Oppdatert redegjørelse</p>',
      grunnlag: {
        status: 'sendt',
        laast: false,
        antall_versjoner: 1,
        tittel: 'Grunnforhold',
        hovedkategori: 'SVIKT',
        underkategori: 'GRUNNFORHOLD',
        dato_oppdaget: '2026-09-01',
        grunnlag_varsel: { dato_sendt: '2026-09-02' },
      },
    });
    expect(data).toMatchObject({
      tittel: 'Grunnforhold',
      hovedkategori: 'SVIKT',
      underkategori: 'GRUNNFORHOLD',
      dato_oppdaget: '2026-09-01',
      grunnlag_varsel: { dato_sendt: '2026-09-02' },
      beskrivelse: '<p>Oppdatert redegjørelse</p>',
    });
  });
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
