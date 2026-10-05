import { describe, it, expect } from 'vitest';
import {
  getDefaults,
  beregnVisibility,
  beregnPreklusjon,
  beregnReduksjon,
  beregnPrinsipaltResultat,
  beregnSubsidiaertResultat,
  beregnSubsidiaerTriggers,
  buildEventData,
  beregnAlt,
  type FristFormState,
  type FristDomainConfig,
} from '../fristDomain';
import { REGELVERSJON } from '../regelversjon';

// ============================================================================
// HELPERS
// ============================================================================

function makeState(overrides: Partial<FristFormState> = {}): FristFormState {
  return {
    fristVarselOk: true,
    spesifisertKravOk: true,
    foresporselSvarOk: true,
    vilkarOppfylt: true,
    godkjentDager: 10,
    begrunnelse: '',
    begrunnelseValidationError: undefined,
    ...overrides,
  };
}

function makeConfig(overrides: Partial<FristDomainConfig> = {}): FristDomainConfig {
  return {
    varselType: 'spesifisert',
    krevdDager: 10,
    erSvarPaForesporsel: false,
    harTidligereVarselITide: false,
    erGrunnlagSubsidiaer: false,
    erHelFristSubsidiaerPgaGrunnlag: false,
    ...overrides,
  };
}

// ============================================================================
// getDefaults
// ============================================================================

describe('getDefaults', () => {
  it('returns blank defaults for create mode (no pre-selection)', () => {
    const defaults = getDefaults({ krevdDager: 10, isUpdateMode: false });
    expect(defaults.fristVarselOk).toBeUndefined();
    expect(defaults.spesifisertKravOk).toBeUndefined();
    expect(defaults.vilkarOppfylt).toBeUndefined();
    expect(defaults.godkjentDager).toBeUndefined();
    expect(defaults.begrunnelse).toBe('');
  });

  it('pre-fills from lastResponseEvent in update mode', () => {
    const defaults = getDefaults({
      krevdDager: 10,
      isUpdateMode: true,
      lastResponseEvent: { godkjent_dager: 7 },
      fristTilstand: { frist_varsel_ok: false, vilkar_oppfylt: true },
    });
    expect(defaults.fristVarselOk).toBe(false);
    expect(defaults.vilkarOppfylt).toBe(true);
    expect(defaults.godkjentDager).toBe(7);
  });

  it('falls back to krevdDager when godkjent_dager is missing in update mode', () => {
    const defaults = getDefaults({
      krevdDager: 15,
      isUpdateMode: true,
      lastResponseEvent: {},
      fristTilstand: {},
    });
    expect(defaults.godkjentDager).toBe(15);
  });
});

// ============================================================================
// beregnVisibility
// ============================================================================

describe('beregnVisibility', () => {
  it('shows fristVarselOk for varsel type', () => {
    const vis = beregnVisibility(makeState(), makeConfig({ varselType: 'varsel' }));
    expect(vis.showFristVarselOk).toBe(true);
  });

  it('shows fristVarselOk for spesifisert without prior varsel', () => {
    const vis = beregnVisibility(
      makeState(),
      makeConfig({ varselType: 'spesifisert', harTidligereVarselITide: false })
    );
    expect(vis.showFristVarselOk).toBe(true);
  });

  it('hides fristVarselOk for spesifisert with prior varsel i tide', () => {
    const vis = beregnVisibility(
      makeState(),
      makeConfig({ varselType: 'spesifisert', harTidligereVarselITide: true })
    );
    expect(vis.showFristVarselOk).toBe(false);
  });

  it('shows spesifisertKravOk for spesifisert type', () => {
    const vis = beregnVisibility(makeState(), makeConfig({ varselType: 'spesifisert' }));
    expect(vis.showSpesifisertKravOk).toBe(true);
  });

  it('hides spesifisertKravOk for varsel type', () => {
    const vis = beregnVisibility(makeState(), makeConfig({ varselType: 'varsel' }));
    expect(vis.showSpesifisertKravOk).toBe(false);
  });

  it('hides spesifisertKravOk when svar pa foresporsel', () => {
    const vis = beregnVisibility(
      makeState(),
      makeConfig({ varselType: 'spesifisert', erSvarPaForesporsel: true })
    );
    expect(vis.showSpesifisertKravOk).toBe(false);
  });

  it('shows foresporselSvarOk when svar pa foresporsel', () => {
    const vis = beregnVisibility(makeState(), makeConfig({ erSvarPaForesporsel: true }));
    expect(vis.showForesporselSvarOk).toBe(true);
  });

  it('hides all controls for begrunnelse_utsatt', () => {
    const vis = beregnVisibility(makeState(), makeConfig({ varselType: 'begrunnelse_utsatt' }));
    expect(vis.showFristVarselOk).toBe(false);
    expect(vis.showSpesifisertKravOk).toBe(false);
    expect(vis.showForesporselSvarOk).toBe(false);
  });
});

// ============================================================================
// beregnPreklusjon
// ============================================================================

describe('innsigelse og forespørsel før spesifiseringen', () => {
  // Vedtak om nøytralt fristvarsel (hovedplanen 3.1, 23.09) og NS 8407 § 5 tredje
  // ledd: innsigelsen mot § 33.4-varselet gjelder også når TE senere svarer på
  // forespørselen med dager.
  const config = makeConfig({ erSvarPaForesporsel: true, harInnsigelseMotVarsel: true });

  it('viser § 33.4-spørsmålet ved siden av svaret på forespørselen', () => {
    const vis = beregnVisibility(makeState(), config);
    expect(vis.showFristVarselOk).toBe(true);
    expect(vis.showForesporselSvarOk).toBe(true);
  });

  it('gir prinsipalt avslag når varselet er for sent', () => {
    const resultat = beregnAlt(makeState({ fristVarselOk: false }), config);
    expect(resultat.erPrekludert).toBe(true);
    expect(resultat.prinsipaltResultat).toBe('avslatt');
  });

  it('fyller inn innsigelsen som standpunkt til § 33.4', () => {
    const defaults = getDefaults({
      krevdDager: 10,
      isUpdateMode: false,
      harInnsigelseMotVarsel: true,
    });
    expect(defaults.fristVarselOk).toBe(false);
  });

  it('uten innsigelse er spørsmålet skjult som før', () => {
    const vis = beregnVisibility(makeState(), makeConfig({ erSvarPaForesporsel: true }));
    expect(vis.showFristVarselOk).toBe(false);
  });
});

describe('beregnPreklusjon', () => {
  it('returns true for varsel when fristVarselOk is false', () => {
    expect(
      beregnPreklusjon(makeState({ fristVarselOk: false }), makeConfig({ varselType: 'varsel' }))
    ).toBe(true);
  });

  it('returns false for varsel when fristVarselOk is true', () => {
    expect(
      beregnPreklusjon(makeState({ fristVarselOk: true }), makeConfig({ varselType: 'varsel' }))
    ).toBe(false);
  });

  it('returns true for spesifisert without prior varsel when fristVarselOk is false', () => {
    expect(
      beregnPreklusjon(
        makeState({ fristVarselOk: false }),
        makeConfig({ varselType: 'spesifisert', harTidligereVarselITide: false })
      )
    ).toBe(true);
  });

  it('returns false for spesifisert with prior varsel i tide', () => {
    expect(
      beregnPreklusjon(
        makeState({ fristVarselOk: false }),
        makeConfig({ varselType: 'spesifisert', harTidligereVarselITide: true })
      )
    ).toBe(false);
  });

  it('returns true when foresporsel svar er for sent', () => {
    expect(
      beregnPreklusjon(
        makeState({ foresporselSvarOk: false }),
        makeConfig({ erSvarPaForesporsel: true })
      )
    ).toBe(true);
  });

  it('returns false for begrunnelse_utsatt', () => {
    expect(
      beregnPreklusjon(
        makeState({ fristVarselOk: false }),
        makeConfig({ varselType: 'begrunnelse_utsatt' })
      )
    ).toBe(false);
  });
});

// ============================================================================
// beregnReduksjon
// ============================================================================

describe('beregnReduksjon', () => {
  it('returns true when spesifisert with prior varsel and spesifisertKravOk is false', () => {
    expect(
      beregnReduksjon(
        makeState({ spesifisertKravOk: false }),
        makeConfig({ varselType: 'spesifisert', harTidligereVarselITide: true })
      )
    ).toBe(true);
  });

  it('returns true when spesifisert without prior varsel, fristVarselOk true, spesifisertKravOk false', () => {
    expect(
      beregnReduksjon(
        makeState({ fristVarselOk: true, spesifisertKravOk: false }),
        makeConfig({ varselType: 'spesifisert', harTidligereVarselITide: false })
      )
    ).toBe(true);
  });

  it('retains §33.6.1 as a subsidiary limitation when §33.4 is also precluded', () => {
    expect(
      beregnReduksjon(
        makeState({ fristVarselOk: false, spesifisertKravOk: false }),
        makeConfig({ varselType: 'spesifisert', harTidligereVarselITide: false })
      )
    ).toBe(true);
  });

  it('returns false for svar pa foresporsel', () => {
    expect(
      beregnReduksjon(
        makeState({ spesifisertKravOk: false }),
        makeConfig({ varselType: 'spesifisert', erSvarPaForesporsel: true })
      )
    ).toBe(false);
  });

  it('returns false for varsel type', () => {
    expect(beregnReduksjon(makeState(), makeConfig({ varselType: 'varsel' }))).toBe(false);
  });
});

// ============================================================================
// beregnPrinsipaltResultat
// ============================================================================

describe('beregnPrinsipaltResultat', () => {
  it('returns godkjent when all positive', () => {
    expect(
      beregnPrinsipaltResultat({
        erPrekludert: false,
        harHindring: true,
        krevdDager: 10,
        godkjentDager: 10,
      })
    ).toBe('godkjent');
  });

  it('returns avslatt when prekludert', () => {
    expect(
      beregnPrinsipaltResultat({
        erPrekludert: true,
        harHindring: true,
        krevdDager: 10,
        godkjentDager: 10,
      })
    ).toBe('avslatt');
  });

  it('returns avslatt when no hindring', () => {
    expect(
      beregnPrinsipaltResultat({
        erPrekludert: false,
        harHindring: false,
        krevdDager: 10,
        godkjentDager: 10,
      })
    ).toBe('avslatt');
  });

  it('returns delvis_godkjent when godkjent < krevd', () => {
    expect(
      beregnPrinsipaltResultat({
        erPrekludert: false,
        harHindring: true,
        krevdDager: 10,
        godkjentDager: 5,
      })
    ).toBe('delvis_godkjent');
  });

  it('returns godkjent when krevdDager is 0', () => {
    expect(
      beregnPrinsipaltResultat({
        erPrekludert: false,
        harHindring: true,
        krevdDager: 0,
        godkjentDager: 0,
      })
    ).toBe('godkjent');
  });

  it('returns delvis_godkjent at 99 of 100 days (B-13: no threshold)', () => {
    expect(
      beregnPrinsipaltResultat({
        erPrekludert: false,
        harHindring: true,
        krevdDager: 100,
        godkjentDager: 99,
      })
    ).toBe('delvis_godkjent');
  });

  it('returns avslatt for 0 days even when hindring is accepted', () => {
    expect(
      beregnPrinsipaltResultat({
        erPrekludert: false,
        harHindring: true,
        krevdDager: 10,
        godkjentDager: 0,
      })
    ).toBe('avslatt');
  });
});

// ============================================================================
// beregnSubsidiaertResultat
// ============================================================================

describe('beregnSubsidiaertResultat', () => {
  it('returns godkjent for full days', () => {
    expect(
      beregnSubsidiaertResultat({
        krevdDager: 10,
        godkjentDager: 10,
      })
    ).toBe('godkjent');
  });

  it('returns delvis_godkjent when partial days', () => {
    expect(
      beregnSubsidiaertResultat({
        krevdDager: 10,
        godkjentDager: 5,
      })
    ).toBe('delvis_godkjent');
  });

  it('returns delvis_godkjent at 199 of 200 days', () => {
    expect(
      beregnSubsidiaertResultat({
        krevdDager: 200,
        godkjentDager: 199,
      })
    ).toBe('delvis_godkjent');
  });

  it('returns avslatt for 0 days', () => {
    expect(
      beregnSubsidiaertResultat({
        krevdDager: 10,
        godkjentDager: 0,
      })
    ).toBe('avslatt');
  });

  it('returns godkjent when krevdDager is 0', () => {
    expect(
      beregnSubsidiaertResultat({
        krevdDager: 0,
        godkjentDager: 0,
      })
    ).toBe('godkjent');
  });
});

// ============================================================================
// beregnSubsidiaerTriggers
// ============================================================================

describe('beregnSubsidiaerTriggers', () => {
  it('returns empty when nothing triggers', () => {
    expect(
      beregnSubsidiaerTriggers({
        erGrunnlagSubsidiaer: false,
        erPrekludert: false,
        harHindring: true,
      })
    ).toEqual([]);
  });

  it('includes grunnlag_avslatt when erGrunnlagSubsidiaer', () => {
    const triggers = beregnSubsidiaerTriggers({
      erGrunnlagSubsidiaer: true,
      erPrekludert: false,
      harHindring: true,
    });
    expect(triggers).toContain('grunnlag_avslatt');
  });

  it('includes preklusjon_varsel when prekludert', () => {
    const triggers = beregnSubsidiaerTriggers({
      erGrunnlagSubsidiaer: false,
      erPrekludert: true,
      harHindring: true,
    });
    expect(triggers).toContain('preklusjon_varsel');
  });

  it('includes ingen_hindring when vilkar not met', () => {
    const triggers = beregnSubsidiaerTriggers({
      erGrunnlagSubsidiaer: false,
      erPrekludert: false,
      harHindring: false,
    });
    expect(triggers).toContain('ingen_hindring');
  });

  it('includes reduksjon_spesifisert when §33.6.1 is invoked', () => {
    const triggers = beregnSubsidiaerTriggers({
      erGrunnlagSubsidiaer: false,
      erPrekludert: true,
      erRedusert: true,
      harHindring: true,
    });
    expect(triggers).toContain('preklusjon_varsel');
    expect(triggers).toContain('reduksjon_spesifisert');
  });

  it('includes all triggers when all conditions met', () => {
    const triggers = beregnSubsidiaerTriggers({
      erGrunnlagSubsidiaer: true,
      erPrekludert: true,
      harHindring: false,
    });
    expect(triggers).toHaveLength(3);
    expect(triggers).toContain('grunnlag_avslatt');
    expect(triggers).toContain('preklusjon_varsel');
    expect(triggers).toContain('ingen_hindring');
  });
});

// ============================================================================
// buildEventData
// ============================================================================

describe('buildEventData', () => {
  it('includes subsidiaer_triggers when present', () => {
    const state = makeState({ begrunnelse: 'Test begrunnelse' });
    const config = makeConfig();
    const computed = {
      prinsipaltResultat: 'avslatt' as const,
      subsidiaertResultat: 'godkjent' as const,
      visSubsidiaertResultat: true,
      subsidiaerTriggers: ['preklusjon_varsel' as const],
    };
    const data = buildEventData(state, config, computed, 'frist-1', 'auto-tekst');
    expect(data.subsidiaer_triggers).toEqual(['preklusjon_varsel']);
    expect(data.subsidiaer_resultat).toBe('godkjent');
    expect(data.subsidiaer_begrunnelse).toBe('Test begrunnelse');
    expect(data.regelversjon).toBe(REGELVERSJON);
  });

  it('omits answers to hidden questions (#181)', () => {
    const state = makeState({
      fristVarselOk: true,
      spesifisertKravOk: false,
      foresporselSvarOk: true,
    });
    const computed = {
      prinsipaltResultat: 'godkjent' as const,
      subsidiaertResultat: 'godkjent' as const,
      visSubsidiaertResultat: false,
      subsidiaerTriggers: [],
    };
    const svar = buildEventData(
      state,
      makeConfig({ erSvarPaForesporsel: true }),
      computed,
      'frist-1',
      'auto-tekst'
    );
    expect(svar.spesifisert_krav_ok).toBeUndefined();
    expect(svar.frist_varsel_ok).toBeUndefined();
    expect(svar.foresporsel_svar_ok).toBe(true);

    const tidligere = buildEventData(
      state,
      makeConfig({ harTidligereVarselITide: true }),
      computed,
      'frist-1',
      'auto-tekst'
    );
    expect(tidligere.frist_varsel_ok).toBeUndefined();
    expect(tidligere.spesifisert_krav_ok).toBe(false);
    expect(tidligere.foresporsel_svar_ok).toBeUndefined();
  });

  it('sends the subsidiary days when principally rejected (#176)', () => {
    const state = makeState({ godkjentDager: 7 });
    const computed = {
      prinsipaltResultat: 'avslatt' as const,
      subsidiaertResultat: 'delvis_godkjent' as const,
      visSubsidiaertResultat: true,
      subsidiaerTriggers: ['preklusjon_varsel' as const],
    };
    const data = buildEventData(state, makeConfig(), computed, 'frist-1', 'auto-tekst');
    expect(data.godkjent_dager).toBe(0);
    expect(data.subsidiaer_godkjent_dager).toBe(7);
  });

  it('omits subsidiary days when the subsidiary result is avslatt', () => {
    const computed = {
      prinsipaltResultat: 'avslatt' as const,
      subsidiaertResultat: 'avslatt' as const,
      visSubsidiaertResultat: true,
      subsidiaerTriggers: ['ingen_hindring' as const],
    };
    const data = buildEventData(makeState(), makeConfig(), computed, 'frist-1', 'auto-tekst');
    expect(data.subsidiaer_godkjent_dager).toBeUndefined();
  });

  it('omits subsidiaer fields when prinsipalt is not avslatt', () => {
    const state = makeState({ begrunnelse: 'Test begrunnelse' });
    const config = makeConfig();
    const computed = {
      prinsipaltResultat: 'godkjent' as const,
      subsidiaertResultat: 'godkjent' as const,
      visSubsidiaertResultat: false,
      subsidiaerTriggers: [],
    };
    const data = buildEventData(state, config, computed, 'frist-1', 'auto-tekst');
    expect(data.subsidiaer_triggers).toBeUndefined();
    expect(data.subsidiaer_resultat).toBeUndefined();
  });

  it('sets godkjent_dager to 0 when avslatt', () => {
    const state = makeState({ godkjentDager: 10, begrunnelse: 'Test' });
    const config = makeConfig();
    const computed = {
      prinsipaltResultat: 'avslatt' as const,
      subsidiaertResultat: 'godkjent' as const,
      visSubsidiaertResultat: true,
      subsidiaerTriggers: ['preklusjon_varsel' as const],
    };
    const data = buildEventData(state, config, computed, 'frist-1', '');
    expect(data.godkjent_dager).toBe(0);
  });

  it('uses autoBegrunnelse as fallback when begrunnelse is empty', () => {
    const state = makeState({ begrunnelse: '' });
    const config = makeConfig();
    const computed = {
      prinsipaltResultat: 'godkjent' as const,
      subsidiaertResultat: 'godkjent' as const,
      visSubsidiaertResultat: false,
      subsidiaerTriggers: [],
    };
    const data = buildEventData(state, config, computed, 'frist-1', 'auto-tekst');
    expect(data.begrunnelse).toBe('auto-tekst');
    expect(data.auto_begrunnelse).toBe('auto-tekst');
  });

  it('includes core fields', () => {
    const state = makeState({ begrunnelse: 'Begrunnelse her' });
    const config = makeConfig({ krevdDager: 15 });
    const computed = {
      prinsipaltResultat: 'godkjent' as const,
      subsidiaertResultat: 'godkjent' as const,
      visSubsidiaertResultat: false,
      subsidiaerTriggers: [],
    };
    const data = buildEventData(state, config, computed, 'frist-42', '');
    expect(data.frist_krav_id).toBe('frist-42');
    expect(data.krevd_dager).toBe(15);
    expect(data.beregnings_resultat).toBe('godkjent');
  });
});

// ============================================================================
// beregnAlt (convenience)
// ============================================================================

describe('beregnAlt', () => {
  it('computes all values consistently', () => {
    const state = makeState();
    const config = makeConfig();
    const computed = beregnAlt(state, config);

    expect(computed.erPrekludert).toBe(false);
    expect(computed.prinsipaltResultat).toBe('godkjent');
    expect(computed.visSubsidiaertResultat).toBe(false);
    expect(computed.visibility.showSpesifisertKravOk).toBe(true);
  });

  it('rejects 0 days without a subsidiary standpoint when hindring is accepted', () => {
    const computed = beregnAlt(makeState({ godkjentDager: 0 }), makeConfig());

    expect(computed.prinsipaltResultat).toBe('avslatt');
    expect(computed.visSubsidiaertResultat).toBe(false);
    expect(computed.subsidiaerTriggers).toEqual([]);
  });

  it('keeps the days as a further subsidiary standpoint without hindring (#211)', () => {
    const state = makeState({ fristVarselOk: false, vilkarOppfylt: false, godkjentDager: 30 });
    const config = makeConfig({ krevdDager: 45 });
    const computed = beregnAlt(state, config);

    expect(computed.prinsipaltResultat).toBe('avslatt');
    expect(computed.subsidiaertResultat).toBe('delvis_godkjent');
    expect(computed.subsidiaerTriggers).toEqual(['preklusjon_varsel', 'ingen_hindring']);

    const data = buildEventData(state, config, computed, 'frist-1', 'auto-tekst');
    expect(data.godkjent_dager).toBe(0);
    expect(data.subsidiaer_resultat).toBe('delvis_godkjent');
    expect(data.subsidiaer_godkjent_dager).toBe(30);
  });

  it('reflects preclusion in all derived values', () => {
    const state = makeState({ fristVarselOk: false });
    const config = makeConfig({ varselType: 'varsel' });
    const computed = beregnAlt(state, config);

    expect(computed.erPrekludert).toBe(true);
    expect(computed.prinsipaltResultat).toBe('avslatt');
    expect(computed.visSubsidiaertResultat).toBe(true);
    expect(computed.subsidiaertResultat).toBe('godkjent');
    expect(computed.subsidiaerTriggers).toContain('preklusjon_varsel');
    expect(computed.port2ErSubsidiaer).toBe(true);
    expect(computed.port3ErSubsidiaer).toBe(true);
  });

  it('retains the §33.6.1 limitation when both notice stages are late', () => {
    const state = makeState({ fristVarselOk: false, spesifisertKravOk: false });
    const config = makeConfig({
      varselType: 'spesifisert',
      harTidligereVarselITide: false,
    });
    const computed = beregnAlt(state, config);

    expect(computed.erPrekludert).toBe(true);
    expect(computed.erRedusert).toBe(true);
    expect(computed.subsidiaerTriggers).toContain('preklusjon_varsel');
    expect(computed.subsidiaerTriggers).toContain('reduksjon_spesifisert');
  });
});
