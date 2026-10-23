import { describe, it, expect } from 'vitest';
import type { SubsidiaerTrigger } from '../../types/timeline';
import {
  getDefaults,
  har34_1_2Preklusjon,
  erHelVederlagSubsidiaerPgaGrunnlag,
  erSubsidiaer,
  beregnHovedkravPrekludert,
  beregnRiggPrekludert,
  beregnProduktivitetPrekludert,
  harPreklusjonsSteg,
  kanHoldeTilbake,
  maSvarePaJustering,
  beregnGodkjentBelop,
  beregnTotaler,
  beregnPrinsipaltResultat,
  beregnSubsidiaertResultat,
  beregnSubsidiaerTriggers,
  erKravlinjeGyldig,
  buildEventData,
  beregnAlt,
  type VederlagFormState,
  type VederlagDomainConfig,
} from '../vederlagDomain';
import { REGELVERSJON } from '../regelversjon';

// ============================================================================
// HELPERS
// ============================================================================

function makeState(overrides: Partial<VederlagFormState> = {}): VederlagFormState {
  return {
    hovedkravVarsletITide: true,
    riggVarsletITide: true,
    produktivitetVarsletITide: true,
    akseptererMetode: true,
    holdTilbake: false,
    hovedkravVurdering: 'godkjent',
    begrunnelse: '',
    ...overrides,
  };
}

function makeConfig(overrides: Partial<VederlagDomainConfig> = {}): VederlagDomainConfig {
  return {
    metode: 'ENHETSPRISER',
    harHovedkrav: true,
    hovedkravBelop: 100000,
    harRiggKrav: false,
    harProduktivitetKrav: false,
    kreverJustertEp: false,
    grunnlagVarsletForSent: false,
    ...overrides,
  };
}

const noPreklusjon = { hovedkrav: false, rigg: false, produktivitet: false };

// ============================================================================
// getDefaults
// ============================================================================

describe('getDefaults', () => {
  it('returns blank defaults for create mode (no pre-selection)', () => {
    const defaults = getDefaults({ isUpdateMode: false });
    expect(defaults.hovedkravVarsletITide).toBeUndefined();
    expect(defaults.riggVarsletITide).toBeUndefined();
    expect(defaults.produktivitetVarsletITide).toBeUndefined();
    expect(defaults.akseptererMetode).toBeUndefined();
    expect(defaults.holdTilbake).toBe(false);
    expect(defaults.hovedkravVurdering).toBeUndefined();
    expect(defaults.begrunnelse).toBe('');
  });

  it('pre-fills from lastResponseEvent in update mode', () => {
    const defaults = getDefaults({
      isUpdateMode: true,
      lastResponseEvent: {
        eventId: 'e1',
        akseptererMetode: false,
        oensketMetode: 'REGNINGSARBEID',
        hovedkravVurdering: 'delvis',
        hovedkravGodkjentBelop: 50000,
        riggVarsletITide: false,
      },
    });
    expect(defaults.akseptererMetode).toBe(false);
    expect(defaults.oensketMetode).toBe('REGNINGSARBEID');
    expect(defaults.hovedkravVurdering).toBe('delvis');
    expect(defaults.hovedkravGodkjentBelop).toBe(50000);
    expect(defaults.riggVarsletITide).toBe(false);
    expect(defaults.begrunnelse).toBe('');
  });

  it('falls back to TE-favorable defaults for missing fields in update mode', () => {
    const defaults = getDefaults({
      isUpdateMode: true,
      lastResponseEvent: { eventId: 'e1' },
    });
    expect(defaults.hovedkravVarsletITide).toBe(true);
    expect(defaults.akseptererMetode).toBe(true);
    expect(defaults.holdTilbake).toBe(false);
    expect(defaults.hovedkravVurdering).toBe('godkjent');
  });
});

// ============================================================================
// Preclusion
// ============================================================================

describe('har34_1_2Preklusjon', () => {
  it('returns true for SVIKT', () => {
    expect(har34_1_2Preklusjon({ hovedkategori: 'SVIKT' })).toBe(true);
  });

  it('returns true for ANDRE', () => {
    expect(har34_1_2Preklusjon({ hovedkategori: 'ANDRE' })).toBe(true);
  });

  it('returns false for ENDRING', () => {
    expect(har34_1_2Preklusjon({ hovedkategori: 'ENDRING' })).toBe(false);
  });

  it('returns false for FORCE_MAJEURE', () => {
    expect(har34_1_2Preklusjon({ hovedkategori: 'FORCE_MAJEURE' })).toBe(false);
  });

  it('returns false when undefined', () => {
    expect(har34_1_2Preklusjon({})).toBe(false);
  });
});

describe('erHelVederlagSubsidiaerPgaGrunnlag', () => {
  it('returns true for ENDRING with grunnlagVarsletForSent', () => {
    expect(
      erHelVederlagSubsidiaerPgaGrunnlag({
        hovedkategori: 'ENDRING',
        grunnlagVarsletForSent: true,
      })
    ).toBe(true);
  });

  it('returns false for ENDRING without grunnlagVarsletForSent', () => {
    expect(
      erHelVederlagSubsidiaerPgaGrunnlag({
        hovedkategori: 'ENDRING',
        grunnlagVarsletForSent: false,
      })
    ).toBe(false);
  });

  it('returns false for EO even with grunnlagVarsletForSent (§ 32.2, B-13)', () => {
    expect(
      erHelVederlagSubsidiaerPgaGrunnlag({
        hovedkategori: 'ENDRING',
        underkategori: 'EO',
        grunnlagVarsletForSent: true,
      })
    ).toBe(false);
  });

  it('returns false for SVIKT even with grunnlagVarsletForSent', () => {
    expect(
      erHelVederlagSubsidiaerPgaGrunnlag({
        hovedkategori: 'SVIKT',
        grunnlagVarsletForSent: true,
      })
    ).toBe(false);
  });
});

describe('erSubsidiaer', () => {
  it('returns true when grunnlag is avslått', () => {
    expect(
      erSubsidiaer({
        grunnlagStatus: 'avslatt',
        hovedkategori: 'ENDRING',
        grunnlagVarsletForSent: false,
      })
    ).toBe(true);
  });

  it('returns true when grunnlag varslet for sent (§32.2)', () => {
    expect(
      erSubsidiaer({
        grunnlagStatus: 'godkjent',
        hovedkategori: 'ENDRING',
        grunnlagVarsletForSent: true,
      })
    ).toBe(true);
  });

  it('returns false when grunnlag is godkjent and not §32.2', () => {
    expect(
      erSubsidiaer({
        grunnlagStatus: 'godkjent',
        hovedkategori: 'ENDRING',
        grunnlagVarsletForSent: false,
      })
    ).toBe(false);
  });
});

describe('beregnHovedkravPrekludert', () => {
  it('precluded when SVIKT and varslet for sent', () => {
    expect(
      beregnHovedkravPrekludert({ hovedkravVarsletITide: false }, { hovedkategori: 'SVIKT' })
    ).toBe(true);
  });

  it('not precluded when SVIKT and varslet i tide', () => {
    expect(
      beregnHovedkravPrekludert({ hovedkravVarsletITide: true }, { hovedkategori: 'SVIKT' })
    ).toBe(false);
  });

  it('never precluded for ENDRING (§34.1.2 does not apply)', () => {
    expect(
      beregnHovedkravPrekludert({ hovedkravVarsletITide: false }, { hovedkategori: 'ENDRING' })
    ).toBe(false);
  });
});

describe('beregnRiggPrekludert', () => {
  it('precluded when harRiggKrav and varslet for sent', () => {
    expect(beregnRiggPrekludert({ riggVarsletITide: false }, { harRiggKrav: true })).toBe(true);
  });

  it('not precluded when no rigg krav', () => {
    expect(beregnRiggPrekludert({ riggVarsletITide: false }, { harRiggKrav: false })).toBe(false);
  });
});

describe('beregnProduktivitetPrekludert', () => {
  it('precluded when harProduktivitetKrav and varslet for sent', () => {
    expect(
      beregnProduktivitetPrekludert(
        { produktivitetVarsletITide: false },
        { harProduktivitetKrav: true }
      )
    ).toBe(true);
  });
});

describe('harPreklusjonsSteg', () => {
  it('true when harRiggKrav', () => {
    expect(harPreklusjonsSteg(makeConfig({ harRiggKrav: true }))).toBe(true);
  });

  it('true when SVIKT (§34.1.2 applies)', () => {
    expect(harPreklusjonsSteg(makeConfig({ hovedkategori: 'SVIKT' }))).toBe(true);
  });

  it('false when ENDRING with no særskilte krav', () => {
    expect(harPreklusjonsSteg(makeConfig({ hovedkategori: 'ENDRING' }))).toBe(false);
  });
});

// ============================================================================
// Method derivations
// ============================================================================

describe('kanHoldeTilbake', () => {
  it('true for REGNINGSARBEID without kostnadsoverslag', () => {
    expect(kanHoldeTilbake({ metode: 'REGNINGSARBEID' })).toBe(true);
  });

  it('false for REGNINGSARBEID with kostnadsoverslag', () => {
    expect(kanHoldeTilbake({ metode: 'REGNINGSARBEID', kostnadsOverslag: 50000 })).toBe(false);
  });

  it('false for ENHETSPRISER', () => {
    expect(kanHoldeTilbake({ metode: 'ENHETSPRISER' })).toBe(false);
  });
});

describe('maSvarePaJustering', () => {
  it('true for ENHETSPRISER with kreverJustertEp', () => {
    expect(maSvarePaJustering({ metode: 'ENHETSPRISER', kreverJustertEp: true })).toBe(true);
  });

  it('false for ENHETSPRISER without kreverJustertEp', () => {
    expect(maSvarePaJustering({ metode: 'ENHETSPRISER', kreverJustertEp: false })).toBe(false);
  });

  it('false for REGNINGSARBEID even with kreverJustertEp', () => {
    expect(maSvarePaJustering({ metode: 'REGNINGSARBEID', kreverJustertEp: true })).toBe(false);
  });
});

// ============================================================================
// beregnGodkjentBelop
// ============================================================================

describe('beregnGodkjentBelop', () => {
  it('returns full amount when godkjent', () => {
    expect(beregnGodkjentBelop('godkjent', 100000, undefined)).toBe(100000);
  });

  it('returns delvis amount when delvis', () => {
    expect(beregnGodkjentBelop('delvis', 100000, 60000)).toBe(60000);
  });

  it('returns 0 when delvis but no amount specified', () => {
    expect(beregnGodkjentBelop('delvis', 100000, undefined)).toBe(0);
  });

  it('returns 0 when avslatt', () => {
    expect(beregnGodkjentBelop('avslatt', 100000, undefined)).toBe(0);
  });

  it('returns 0 when prekludert regardless of vurdering', () => {
    expect(beregnGodkjentBelop('godkjent', 100000, undefined, true)).toBe(0);
  });
});

// ============================================================================
// beregnTotaler
// ============================================================================

describe('beregnTotaler', () => {
  it('calculates totals for hovedkrav only', () => {
    const state = makeState({ hovedkravVurdering: 'godkjent' });
    const config = makeConfig({ hovedkravBelop: 100000 });
    const totaler = beregnTotaler(state, config, noPreklusjon);

    expect(totaler.totalKrevd).toBe(100000);
    expect(totaler.totalKrevdInklPrekludert).toBe(100000);
    expect(totaler.totalGodkjent).toBe(100000);
    expect(totaler.totalGodkjentInklPrekludert).toBe(100000);
    expect(totaler.harPrekludertKrav).toBe(false);
  });

  it('includes rigg and produktivitet in totals', () => {
    const state = makeState({
      hovedkravVurdering: 'godkjent',
      riggVurdering: 'godkjent',
      produktivitetVurdering: 'delvis',
      produktivitetGodkjentBelop: 15000,
    });
    const config = makeConfig({
      hovedkravBelop: 100000,
      harRiggKrav: true,
      riggBelop: 30000,
      harProduktivitetKrav: true,
      produktivitetBelop: 20000,
    });
    const totaler = beregnTotaler(state, config, noPreklusjon);

    expect(totaler.totalKrevd).toBe(150000);
    expect(totaler.totalGodkjent).toBe(145000); // 100k + 30k + 15k
  });

  it('excludes precluded krav from principal totals', () => {
    const state = makeState({
      hovedkravVurdering: 'godkjent',
      riggVurdering: 'godkjent',
    });
    const config = makeConfig({
      hovedkravBelop: 100000,
      harRiggKrav: true,
      riggBelop: 30000,
    });
    const preklusjon = { hovedkrav: false, rigg: true, produktivitet: false };
    const totaler = beregnTotaler(state, config, preklusjon);

    // Principal: rigg excluded
    expect(totaler.totalKrevd).toBe(100000);
    expect(totaler.totalGodkjent).toBe(100000);

    // Subsidiary: rigg included
    expect(totaler.totalKrevdInklPrekludert).toBe(130000);
    expect(totaler.totalGodkjentInklPrekludert).toBe(130000);
    expect(totaler.harPrekludertKrav).toBe(true);
  });

  it('handles delvis godkjent for precluded krav in subsidiary', () => {
    const state = makeState({
      hovedkravVurdering: 'godkjent',
      riggVurdering: 'delvis',
      riggGodkjentBelop: 10000,
    });
    const config = makeConfig({
      hovedkravBelop: 100000,
      harRiggKrav: true,
      riggBelop: 30000,
    });
    const preklusjon = { hovedkrav: false, rigg: true, produktivitet: false };
    const totaler = beregnTotaler(state, config, preklusjon);

    expect(totaler.totalGodkjent).toBe(100000); // rigg excluded
    expect(totaler.totalGodkjentInklPrekludert).toBe(110000); // 100k + 10k subsidiary
  });

  it('tracks harMetodeendring', () => {
    const state = makeState({ akseptererMetode: false });
    const totaler = beregnTotaler(state, makeConfig(), noPreklusjon);
    expect(totaler.harMetodeendring).toBe(true);
  });
});

// ============================================================================
// beregnPrinsipaltResultat
// ============================================================================

describe('beregnPrinsipaltResultat', () => {
  it('returns hold_tilbake when holdTilbake is true', () => {
    expect(
      beregnPrinsipaltResultat({
        totalKrevdInklPrekludert: 100000,
        totalGodkjent: 100000,
        harMetodeendring: false,
        holdTilbake: true,
      })
    ).toBe('hold_tilbake');
  });

  it('returns godkjent when fully approved', () => {
    expect(
      beregnPrinsipaltResultat({
        totalKrevdInklPrekludert: 100000,
        totalGodkjent: 100000,
        harMetodeendring: false,
        holdTilbake: false,
      })
    ).toBe('godkjent');
  });

  it('returns delvis_godkjent when partially approved', () => {
    expect(
      beregnPrinsipaltResultat({
        totalKrevdInklPrekludert: 100000,
        totalGodkjent: 50000,
        harMetodeendring: false,
        holdTilbake: false,
      })
    ).toBe('delvis_godkjent');
  });

  it('returns delvis_godkjent when method changed even if fully approved', () => {
    expect(
      beregnPrinsipaltResultat({
        totalKrevdInklPrekludert: 100000,
        totalGodkjent: 100000,
        harMetodeendring: true,
        holdTilbake: false,
      })
    ).toBe('delvis_godkjent');
  });

  it('returns avslatt when nothing approved', () => {
    expect(
      beregnPrinsipaltResultat({
        totalKrevdInklPrekludert: 100000,
        totalGodkjent: 0,
        harMetodeendring: false,
        holdTilbake: false,
      })
    ).toBe('avslatt');
  });

  it('returns delvis_godkjent at 99,5 % (B-13: no threshold)', () => {
    expect(
      beregnPrinsipaltResultat({
        totalKrevdInklPrekludert: 100000,
        totalGodkjent: 99500,
        harMetodeendring: false,
        holdTilbake: false,
      })
    ).toBe('delvis_godkjent');
  });

  it('returns godkjent when equal to the nearest krone (ROUND_HALF_UP)', () => {
    expect(
      beregnPrinsipaltResultat({
        totalKrevdInklPrekludert: 100000.4,
        totalGodkjent: 99999.5,
        harMetodeendring: false,
        holdTilbake: false,
      })
    ).toBe('godkjent');
    expect(
      beregnPrinsipaltResultat({
        totalKrevdInklPrekludert: 100000.5,
        totalGodkjent: 100000.49,
        harMetodeendring: false,
        holdTilbake: false,
      })
    ).toBe('delvis_godkjent');
  });

  it('rounds to øre before krone, like the backend', () => {
    expect(
      beregnPrinsipaltResultat({
        totalKrevdInklPrekludert: 2,
        totalGodkjent: 1.495,
        harMetodeendring: false,
        holdTilbake: false,
      })
    ).toBe('godkjent');
  });

  it('returns avslatt when less than half an øre is approved', () => {
    expect(
      beregnPrinsipaltResultat({
        totalKrevdInklPrekludert: 100,
        totalGodkjent: 0.004,
        harMetodeendring: false,
        holdTilbake: false,
      })
    ).toBe('avslatt');
  });
});

// ============================================================================
// beregnSubsidiaertResultat
// ============================================================================

describe('beregnSubsidiaertResultat', () => {
  it('returns godkjent when fully approved ignoring preclusion', () => {
    expect(
      beregnSubsidiaertResultat({
        totalKrevdInklPrekludert: 130000,
        totalGodkjentInklPrekludert: 130000,
        harMetodeendring: false,
      })
    ).toBe('godkjent');
  });

  it('returns avslatt when all rejected', () => {
    expect(
      beregnSubsidiaertResultat({
        totalKrevdInklPrekludert: 130000,
        totalGodkjentInklPrekludert: 0,
        harMetodeendring: false,
      })
    ).toBe('avslatt');
  });

  it('returns delvis_godkjent when partially approved', () => {
    expect(
      beregnSubsidiaertResultat({
        totalKrevdInklPrekludert: 130000,
        totalGodkjentInklPrekludert: 80000,
        harMetodeendring: false,
      })
    ).toBe('delvis_godkjent');
  });

  it('returns avslatt for 0 kr regardless of how the claims are marked', () => {
    expect(
      beregnSubsidiaertResultat({
        totalKrevdInklPrekludert: 130000,
        totalGodkjentInklPrekludert: 0,
        harMetodeendring: false,
      })
    ).toBe('avslatt');
  });

  it('returns delvis_godkjent at 99,5 %', () => {
    expect(
      beregnSubsidiaertResultat({
        totalKrevdInklPrekludert: 100000,
        totalGodkjentInklPrekludert: 99500,
        harMetodeendring: false,
      })
    ).toBe('delvis_godkjent');
  });

  it('returns delvis_godkjent when method changed', () => {
    expect(
      beregnSubsidiaertResultat({
        totalKrevdInklPrekludert: 100000,
        totalGodkjentInklPrekludert: 100000,
        harMetodeendring: true,
      })
    ).toBe('delvis_godkjent');
  });
});

// ============================================================================
// beregnSubsidiaerTriggers
// ============================================================================

describe('beregnSubsidiaerTriggers', () => {
  it('returns empty array when no triggers', () => {
    const state = makeState();
    const config = makeConfig();
    expect(beregnSubsidiaerTriggers(state, config, noPreklusjon)).toEqual([]);
  });

  it('includes preklusjon_hovedkrav when hovedkrav precluded', () => {
    const triggers = beregnSubsidiaerTriggers(makeState(), makeConfig(), {
      hovedkrav: true,
      rigg: false,
      produktivitet: false,
    });
    expect(triggers).toContain('preklusjon_hovedkrav');
  });

  it('includes preklusjon_rigg and preklusjon_produktivitet', () => {
    const triggers = beregnSubsidiaerTriggers(makeState(), makeConfig(), {
      hovedkrav: false,
      rigg: true,
      produktivitet: true,
    });
    expect(triggers).toContain('preklusjon_rigg');
    expect(triggers).toContain('preklusjon_produktivitet');
  });

  it('includes reduksjon_ep_justering when EP varslet for sent', () => {
    const triggers = beregnSubsidiaerTriggers(
      makeState({ epJusteringVarsletITide: false }),
      makeConfig({ kreverJustertEp: true }),
      noPreklusjon
    );
    expect(triggers).toContain('reduksjon_ep_justering');
  });

  it('includes metode_avslatt when method rejected', () => {
    const triggers = beregnSubsidiaerTriggers(
      makeState({ akseptererMetode: false }),
      makeConfig(),
      noPreklusjon
    );
    expect(triggers).toContain('metode_avslatt');
  });

  it('collects multiple triggers simultaneously', () => {
    const triggers = beregnSubsidiaerTriggers(
      makeState({ akseptererMetode: false, epJusteringVarsletITide: false }),
      makeConfig({ kreverJustertEp: true }),
      { hovedkrav: true, rigg: true, produktivitet: false }
    );
    expect(triggers).toHaveLength(4);
    expect(triggers).toContain('preklusjon_hovedkrav');
    expect(triggers).toContain('preklusjon_rigg');
    expect(triggers).toContain('reduksjon_ep_justering');
    expect(triggers).toContain('metode_avslatt');
  });
});

// ============================================================================
// buildEventData
// ============================================================================

describe('buildEventData', () => {
  const baseState = makeState({ begrunnelse: 'Test begrunnelse' });
  const baseConfig = makeConfig({ hovedkravBelop: 100000 });
  const baseComputed = {
    har34_1_2_Preklusjon: false,
    prinsipaltResultat: 'godkjent' as const,
    subsidiaertResultat: 'godkjent' as const,
    visSubsidiaertResultat: false,
    totalGodkjent: 100000,
    totalKrevdInklPrekludert: 100000,
    totalGodkjentInklPrekludert: 100000,
  };

  it('builds new response event', () => {
    const result = buildEventData(
      baseState,
      baseConfig,
      baseComputed,
      { vederlagKravId: 'v1', isUpdateMode: false },
      'Auto begrunnelse',
      []
    );

    expect(result.eventType).toBe('respons_vederlag');
    expect(result.data.vederlag_krav_id).toBe('v1');
    expect(result.data.begrunnelse).toBe('Test begrunnelse');
    expect(result.data.beregnings_resultat).toBe('godkjent');
    expect(result.data.total_godkjent_belop).toBe(100000);
    expect(result.data.total_krevd_belop).toBe(100000);
    expect(result.data.subsidiaer_triggers).toBeUndefined();
    expect(result.data.regelversjon).toBe(REGELVERSJON);
  });

  it('builds update response event', () => {
    const result = buildEventData(
      baseState,
      baseConfig,
      baseComputed,
      { vederlagKravId: 'v1', lastResponseEventId: 'r1', isUpdateMode: true },
      'Auto begrunnelse',
      []
    );

    expect(result.eventType).toBe('respons_vederlag_oppdatert');
    expect(result.data.original_respons_id).toBe('r1');
    expect(result.data.dato_endret).toBeDefined();
    expect(result.data.vederlag_krav_id).toBeUndefined();
  });

  it('includes subsidiary data when visSubsidiaertResultat is true', () => {
    const computed = {
      ...baseComputed,
      visSubsidiaertResultat: true,
      subsidiaertResultat: 'delvis_godkjent' as const,
      totalGodkjentInklPrekludert: 80000,
    };
    const triggers: SubsidiaerTrigger[] = ['preklusjon_rigg'];

    const result = buildEventData(
      baseState,
      baseConfig,
      computed,
      { vederlagKravId: 'v1', isUpdateMode: false },
      'Auto begrunnelse',
      triggers
    );

    expect(result.data.subsidiaer_triggers).toEqual(['preklusjon_rigg']);
    expect(result.data.subsidiaer_resultat).toBe('delvis_godkjent');
    expect(result.data.subsidiaer_godkjent_belop).toBe(80000);
  });

  it('uses auto-begrunnelse when user begrunnelse is empty', () => {
    const state = makeState({ begrunnelse: '' });
    const result = buildEventData(
      state,
      baseConfig,
      baseComputed,
      { vederlagKravId: 'v1', isUpdateMode: false },
      'Auto-generert tekst',
      []
    );
    expect(result.data.begrunnelse).toBe('Auto-generert tekst');
  });

  it('calculates correct godkjent beløp per krav', () => {
    const state = makeState({
      hovedkravVurdering: 'delvis',
      hovedkravGodkjentBelop: 60000,
      riggVurdering: 'godkjent',
      produktivitetVurdering: 'avslatt',
    });
    const config = makeConfig({
      hovedkravBelop: 100000,
      harRiggKrav: true,
      riggBelop: 30000,
      harProduktivitetKrav: true,
      produktivitetBelop: 20000,
    });

    const result = buildEventData(
      state,
      config,
      baseComputed,
      { vederlagKravId: 'v1', isUpdateMode: false },
      '',
      []
    );

    expect(result.data.hovedkrav_godkjent_belop).toBe(60000);
    expect(result.data.rigg_godkjent_belop).toBe(30000);
    expect(result.data.produktivitet_godkjent_belop).toBe(0);
  });

  it('includes §34.1.2 fields only when applicable', () => {
    const computed = { ...baseComputed, har34_1_2_Preklusjon: true };
    const result = buildEventData(
      baseState,
      baseConfig,
      computed,
      { vederlagKravId: 'v1', isUpdateMode: false },
      '',
      []
    );
    expect(result.data.hovedkrav_varslet_i_tide).toBe(true);

    const result2 = buildEventData(
      baseState,
      baseConfig,
      baseComputed,
      { vederlagKravId: 'v1', isUpdateMode: false },
      '',
      []
    );
    expect(result2.data.hovedkrav_varslet_i_tide).toBeUndefined();
  });
});

// ============================================================================
// beregnAlt (integration)
// ============================================================================

describe('beregnAlt', () => {
  it('rounds each claim to øre before summing, like the backend', () => {
    const state = makeState({
      hovedkravVurdering: 'delvis',
      hovedkravGodkjentBelop: 0.004,
      riggVurdering: 'delvis',
      riggGodkjentBelop: 0.004,
    });
    const config = makeConfig({ hovedkravBelop: 100, harRiggKrav: true, riggBelop: 100 });
    const computed = beregnAlt(state, config);
    expect(computed.totalGodkjent).toBe(0);
    expect(computed.prinsipaltResultat).toBe('avslatt');
  });

  it('computes all values for simple godkjent case', () => {
    const state = makeState({ hovedkravVurdering: 'godkjent' });
    const config = makeConfig({ hovedkravBelop: 100000 });
    const result = beregnAlt(state, config);

    expect(result.prinsipaltResultat).toBe('godkjent');
    expect(result.totalGodkjent).toBe(100000);
    expect(result.harPrekludertKrav).toBe(false);
    expect(result.visSubsidiaertResultat).toBe(false);
    expect(result.subsidiaerTriggers).toEqual([]);
  });

  it('computes subsidiary for SVIKT with precluded rigg', () => {
    const state = makeState({
      hovedkravVurdering: 'godkjent',
      riggVarsletITide: false,
      riggVurdering: 'godkjent',
    });
    const config = makeConfig({
      hovedkravBelop: 100000,
      hovedkategori: 'SVIKT',
      harRiggKrav: true,
      riggBelop: 30000,
    });
    const result = beregnAlt(state, config);

    expect(result.har34_1_2_Preklusjon).toBe(true);
    expect(result.riggPrekludert).toBe(true);
    expect(result.harPrekludertKrav).toBe(true);
    expect(result.visSubsidiaertResultat).toBe(true);

    // Principal: rigg excluded → 100k godkjent
    expect(result.totalGodkjent).toBe(100000);
    expect(result.prinsipaltResultat).toBe('delvis_godkjent'); // 100k of 130k

    // Subsidiary: rigg included → 130k godkjent
    expect(result.totalGodkjentInklPrekludert).toBe(130000);
    expect(result.subsidiaertResultat).toBe('godkjent');

    expect(result.subsidiaerTriggers).toContain('preklusjon_rigg');
  });

  it('computes hold_tilbake for REGNINGSARBEID without overslag', () => {
    const state = makeState({ holdTilbake: true });
    const config = makeConfig({ metode: 'REGNINGSARBEID' });
    const result = beregnAlt(state, config);

    expect(result.kanHoldeTilbake).toBe(true);
    expect(result.prinsipaltResultat).toBe('hold_tilbake');
  });

  it('computes maSvarePaJustering for ENHETSPRISER with EP krav', () => {
    const state = makeState();
    const config = makeConfig({ metode: 'ENHETSPRISER', kreverJustertEp: true });
    const result = beregnAlt(state, config);

    expect(result.maSvarePaJustering).toBe(true);
  });

  it('handles full scenario with multiple preklusjoner and metodeendring', () => {
    const state = makeState({
      hovedkravVurdering: 'delvis',
      hovedkravGodkjentBelop: 60000,
      riggVarsletITide: false,
      riggVurdering: 'godkjent',
      produktivitetVarsletITide: false,
      produktivitetVurdering: 'delvis',
      produktivitetGodkjentBelop: 10000,
      akseptererMetode: false,
      oensketMetode: 'REGNINGSARBEID',
    });
    const config = makeConfig({
      hovedkravBelop: 100000,
      hovedkategori: 'ENDRING',
      harRiggKrav: true,
      riggBelop: 30000,
      harProduktivitetKrav: true,
      produktivitetBelop: 20000,
    });
    const result = beregnAlt(state, config);

    // ENDRING → no §34.1.2, but rigg+produktivitet can still be precluded via §34.1.3
    expect(result.har34_1_2_Preklusjon).toBe(false);
    expect(result.hovedkravPrekludert).toBe(false);
    expect(result.riggPrekludert).toBe(true);
    expect(result.produktivitetPrekludert).toBe(true);

    // Principal: only hovedkrav (60k delvis)
    expect(result.totalGodkjent).toBe(60000);
    expect(result.prinsipaltResultat).toBe('delvis_godkjent');

    // Subsidiary includes rigg (30k) + produktivitet (10k)
    expect(result.totalGodkjentInklPrekludert).toBe(100000); // 60k + 30k + 10k

    // Triggers
    expect(result.subsidiaerTriggers).toContain('preklusjon_rigg');
    expect(result.subsidiaerTriggers).toContain('preklusjon_produktivitet');
    expect(result.subsidiaerTriggers).toContain('metode_avslatt');
    expect(result.harMetodeendring).toBe(true);
    expect(result.harPreklusjonsSteg).toBe(true);
  });
});

// ============================================================================
// BH SVAR-VEDERLAG UI SCENARIOS
// ============================================================================

describe('BH Svar-Vederlag UI Scenarios', () => {
  const baseConfig: VederlagDomainConfig = {
    metode: 'REGNINGSARBEID',
    harHovedkrav: true,
    hovedkravBelop: 1_000_000,
    riggBelop: 200_000,
    produktivitetBelop: 150_000,
    harRiggKrav: true,
    harProduktivitetKrav: true,
    kreverJustertEp: false,
    kostnadsOverslag: 1_200_000,
    hovedkategori: 'ENDRING',
    grunnlagVarsletForSent: false,
    grunnlagStatus: 'godkjent',
  };

  const godkjentAlleState: VederlagFormState = {
    hovedkravVarsletITide: true,
    riggVarsletITide: true,
    produktivitetVarsletITide: true,
    akseptererMetode: true,
    holdTilbake: false,
    hovedkravVurdering: 'godkjent',
    riggVurdering: 'godkjent',
    produktivitetVurdering: 'godkjent',
    begrunnelse: '<p>Godkjent.</p>',
  };

  it('godkjent alle — prinsipalt godkjent, ingen subsidiært', () => {
    const computed = beregnAlt(godkjentAlleState, baseConfig);
    expect(computed.prinsipaltResultat).toBe('godkjent');
    expect(computed.visSubsidiaertResultat).toBe(false);
    expect(computed.totalGodkjent).toBe(1_350_000);
    expect(computed.totalKrevdInklPrekludert).toBe(1_350_000);
  });

  it('delvis godkjent hovedkrav — prinsipalt delvis', () => {
    const state: VederlagFormState = {
      ...godkjentAlleState,
      hovedkravVurdering: 'delvis',
      hovedkravGodkjentBelop: 600_000,
    };
    const computed = beregnAlt(state, baseConfig);
    expect(computed.prinsipaltResultat).toBe('delvis_godkjent');
    expect(computed.totalGodkjent).toBe(600_000 + 200_000 + 150_000);
  });

  it('prekludert rigg — vises subsidiært', () => {
    const state: VederlagFormState = {
      ...godkjentAlleState,
      riggVarsletITide: false,
    };
    const computed = beregnAlt(state, baseConfig);
    expect(computed.riggPrekludert).toBe(true);
    expect(computed.visSubsidiaertResultat).toBe(true);
    expect(computed.subsidiaerTriggers).toContain('preklusjon_rigg');
    expect(computed.totalGodkjent).toBe(1_000_000 + 150_000);
    expect(computed.totalGodkjentInklPrekludert).toBe(1_350_000);
  });

  it('metode avslått — trigger i subsidiært', () => {
    const state: VederlagFormState = {
      ...godkjentAlleState,
      akseptererMetode: false,
      oensketMetode: 'ENHETSPRISER',
    };
    const computed = beregnAlt(state, baseConfig);
    expect(computed.subsidiaerTriggers).toContain('metode_avslatt');
    expect(computed.prinsipaltResultat).toBe('delvis_godkjent');
  });

  it('grunnlag avslått → hele vederlag subsidiært', () => {
    const config: VederlagDomainConfig = {
      ...baseConfig,
      grunnlagStatus: 'avslatt',
    };
    const computed = beregnAlt(godkjentAlleState, config);
    expect(computed.erSubsidiaer).toBe(true);
  });

  it('SVIKT kategori → har §34.1.2 preklusjon for hovedkrav', () => {
    const config: VederlagDomainConfig = {
      ...baseConfig,
      hovedkategori: 'SVIKT',
    };
    const computed = beregnAlt(godkjentAlleState, config);
    expect(computed.har34_1_2_Preklusjon).toBe(true);
    expect(computed.harPreklusjonsSteg).toBe(true);
  });

  // OV-U27: påberopelsen etter § 34.1.2 gjelder hele kravet, også de særskilte postene.
  it('SVIKT + hovedkrav prekludert → prinsipalt avslått for hele kravet, subsidiært godkjent', () => {
    const config: VederlagDomainConfig = {
      ...baseConfig,
      hovedkategori: 'SVIKT',
    };
    const state: VederlagFormState = {
      ...godkjentAlleState,
      hovedkravVarsletITide: false,
    };
    const computed = beregnAlt(state, config);
    expect(computed.hovedkravPrekludert).toBe(true);
    expect(computed.visSubsidiaertResultat).toBe(true);
    expect(computed.subsidiaerTriggers).toContain('preklusjon_hovedkrav');
    expect(computed.prinsipaltResultat).toBe('avslatt');
    expect(computed.totalGodkjent).toBe(0);
    expect(computed.subsidiaertResultat).toBe('godkjent');
  });

  it('buildEventData produces correct event for new response', () => {
    const computed = beregnAlt(godkjentAlleState, baseConfig);
    const { eventType, data } = buildEventData(
      godkjentAlleState,
      baseConfig,
      computed,
      { vederlagKravId: 'evt-123', isUpdateMode: false },
      '',
      computed.subsidiaerTriggers
    );
    expect(eventType).toBe('respons_vederlag');
    expect(data.vederlag_krav_id).toBe('evt-123');
    expect(data.beregnings_resultat).toBe('godkjent');
    expect(data.total_godkjent_belop).toBe(1_350_000);
  });

  it('buildEventData produces correct event for update', () => {
    const computed = beregnAlt(godkjentAlleState, baseConfig);
    const { eventType, data } = buildEventData(
      godkjentAlleState,
      baseConfig,
      computed,
      { vederlagKravId: 'evt-123', lastResponseEventId: 'resp-456', isUpdateMode: true },
      '',
      computed.subsidiaerTriggers
    );
    expect(eventType).toBe('respons_vederlag_oppdatert');
    expect(data.original_respons_id).toBe('resp-456');
  });

  it('bare hovedkrav (ingen særskilte) — ingen preklusjonsSteg for ENDRING', () => {
    const config: VederlagDomainConfig = {
      ...baseConfig,
      harRiggKrav: false,
      harProduktivitetKrav: false,
      riggBelop: undefined,
      produktivitetBelop: undefined,
    };
    const computed = beregnAlt(godkjentAlleState, config);
    expect(computed.harPreklusjonsSteg).toBe(false);
  });
});

// ============================================================================
// erKravlinjeGyldig
// ============================================================================
describe('erKravlinjeGyldig', () => {
  it('returns false when vurdering is undefined', () => {
    expect(erKravlinjeGyldig(undefined, undefined)).toBe(false);
  });

  it('returns true when godkjent', () => {
    expect(erKravlinjeGyldig('godkjent', undefined)).toBe(true);
  });

  it('returns true when avslatt', () => {
    expect(erKravlinjeGyldig('avslatt', undefined)).toBe(true);
  });

  it('returns false when delvis without beløp', () => {
    expect(erKravlinjeGyldig('delvis', undefined)).toBe(false);
  });

  it('returns true when delvis with beløp', () => {
    expect(erKravlinjeGyldig('delvis', 50000)).toBe(true);
  });

  it('returns true when delvis with zero beløp', () => {
    expect(erKravlinjeGyldig('delvis', 0)).toBe(true);
  });
});

describe('buildEventData — posten etter § 34.1.3 (VS-U5, OV-U23)', () => {
  const config = makeConfig({
    metode: 'FASTPRIS_TILBUD',
    harProduktivitetKrav: true,
    produktivitetBelop: 200_000,
  });
  const svar = (s: Partial<VederlagFormState>, c: VederlagDomainConfig = config) => {
    const state: VederlagFormState = {
      ...makeState({ hovedkravVurdering: 'godkjent', akseptererMetode: true }),
      produktivitetVurdering: 'godkjent',
      ...s,
    };
    const computed = beregnAlt(state, c);
    return buildEventData(
      state,
      c,
      computed,
      { vederlagKravId: 'evt-1', isUpdateMode: false },
      '',
      computed.subsidiaerTriggers
    ).data;
  };

  it('sender beløpet etter begrensningen når for sent varsel er påberopt', () => {
    const data = svar({ produktivitetVarsletITide: false, produktivitetBegrensetBelop: 50_000 });
    expect(data.produktivitet_begrenset_belop).toBe(50_000);
    expect(data.produktivitet_godkjent_belop).toBe(200_000);
    expect(data.total_godkjent_belop).toBe(150_000);
    expect(data.subsidiaer_godkjent_belop).toBe(300_000);
  });

  it('sender ikke beløpet etter begrensningen når posten er varslet i tide', () => {
    // Kjernen avviser feltet uten påberopt begrensning (kjerne/regler/vederlag.ts, `kontroller`).
    const data = svar({ produktivitetVarsletITide: true, produktivitetBegrensetBelop: 50_000 });
    expect(data.produktivitet_begrenset_belop).toBeUndefined();
  });

  it('sender ingen vurdering av hovedkravet når kravet ikke har hovedbeløp', () => {
    const data = svar(
      { hovedkravVurdering: 'godkjent', produktivitetVarsletITide: true },
      { ...config, harHovedkrav: false, hovedkravBelop: 0 }
    );
    expect(data.hovedkrav_vurdering).toBeUndefined();
    expect(data.hovedkrav_godkjent_belop).toBeUndefined();
    expect(data.total_godkjent_belop).toBe(200_000);
    expect(data.beregnings_resultat).toBe('godkjent');
  });
});
