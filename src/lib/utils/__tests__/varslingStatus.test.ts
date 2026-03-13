import { describe, it, expect } from 'vitest';
import { beregnVarslingStatus, varslingSymbol } from '$lib/utils/varslingStatus';
import type { SakState } from '$lib/types/timeline';

function makeBaseState(overrides: Partial<SakState> = {}): SakState {
  return {
    sak_id: 'SAK-001',
    sakstittel: 'Testsak',
    grunnlag: {
      status: 'utkast',
      laast: false,
      antall_versjoner: 1,
    },
    vederlag: {
      status: 'utkast',
      antall_versjoner: 1,
    },
    frist: {
      status: 'utkast',
      antall_versjoner: 1,
    },
    er_subsidiaert_vederlag: false,
    er_subsidiaert_frist: false,
    visningsstatus_vederlag: '',
    visningsstatus_frist: '',
    overordnet_status: 'UTKAST',
    kan_utstede_eo: false,
    neste_handling: { rolle: null, handling: '', spor: null },
    sum_krevd: 0,
    sum_godkjent: 0,
    antall_events: 0,
    ...overrides,
  };
}

describe('beregnVarslingStatus', () => {
  it('returns empty array when all tracks are ikke_relevant', () => {
    const state = makeBaseState({
      grunnlag: { status: 'ikke_relevant', laast: false, antall_versjoner: 0 },
      vederlag: { status: 'ikke_relevant', antall_versjoner: 0 },
      frist: { status: 'ikke_relevant', antall_versjoner: 0 },
    });

    const items = beregnVarslingStatus(state);
    expect(items).toHaveLength(0);
  });

  it('returns ok for grunnlag when varslet i tide', () => {
    const state = makeBaseState({
      grunnlag: {
        status: 'sendt',
        grunnlag_varsel: { dato_sendt: '2025-01-01' },
        grunnlag_varslet_i_tide: true,
        laast: false,
        antall_versjoner: 1,
      },
    });

    const items = beregnVarslingStatus(state);
    const grunnlagItem = items.find((i) => i.spor === 'grunnlag');
    expect(grunnlagItem).toBeDefined();
    expect(grunnlagItem!.status).toBe('ok');
    expect(grunnlagItem!.label).toBe('Endring varslet');
    expect(grunnlagItem!.paragrafRef).toBe('§32.2');
  });

  it('returns warning for grunnlag when not varslet i tide', () => {
    const state = makeBaseState({
      grunnlag: {
        status: 'sendt',
        grunnlag_varsel: { dato_sendt: '2025-01-01' },
        grunnlag_varslet_i_tide: false,
        laast: false,
        antall_versjoner: 1,
      },
    });

    const items = beregnVarslingStatus(state);
    const grunnlagItem = items.find((i) => i.spor === 'grunnlag');
    expect(grunnlagItem!.status).toBe('warning');
    expect(grunnlagItem!.label).toBe('Endring varslet sent');
  });

  it('returns na for grunnlag when no varsel', () => {
    const state = makeBaseState({
      grunnlag: {
        status: 'utkast',
        laast: false,
        antall_versjoner: 1,
      },
    });

    const items = beregnVarslingStatus(state);
    const grunnlagItem = items.find((i) => i.spor === 'grunnlag');
    expect(grunnlagItem!.status).toBe('na');
    expect(grunnlagItem!.label).toBe('Endring ikke varslet');
  });

  it('returns ok for frist when varslet ok', () => {
    const state = makeBaseState({
      frist: {
        status: 'sendt',
        frist_varsel: { dato_sendt: '2025-01-01' },
        frist_varsel_ok: true,
        antall_versjoner: 1,
      },
    });

    const items = beregnVarslingStatus(state);
    const fristVarselItem = items.find((i) => i.label.startsWith('Frist: varslet'));
    expect(fristVarselItem).toBeDefined();
    expect(fristVarselItem!.status).toBe('ok');
    expect(fristVarselItem!.label).toBe('Frist: varslet');
  });

  it('returns warning for frist when varslet sent', () => {
    const state = makeBaseState({
      frist: {
        status: 'sendt',
        frist_varsel: { dato_sendt: '2025-01-01' },
        frist_varsel_ok: false,
        antall_versjoner: 1,
      },
    });

    const items = beregnVarslingStatus(state);
    const fristVarselItem = items.find((i) => i.label === 'Frist: varslet sent');
    expect(fristVarselItem).toBeDefined();
    expect(fristVarselItem!.status).toBe('warning');
    expect(fristVarselItem!.paragrafRef).toBe('§33.4');
  });

  it('returns na for frist when not varslet', () => {
    const state = makeBaseState({
      frist: {
        status: 'utkast',
        antall_versjoner: 1,
      },
    });

    const items = beregnVarslingStatus(state);
    const fristVarselItem = items.find((i) => i.label === 'Frist: ikke varslet');
    expect(fristVarselItem).toBeDefined();
    expect(fristVarselItem!.status).toBe('na');
  });

  it('returns ok for frist spesifisert when ok', () => {
    const state = makeBaseState({
      frist: {
        status: 'sendt',
        spesifisert_varsel: { dato_sendt: '2025-01-01' },
        spesifisert_krav_ok: true,
        antall_versjoner: 1,
      },
    });

    const items = beregnVarslingStatus(state);
    const spesifisertItem = items.find((i) => i.label === 'Frist: spesifisert');
    expect(spesifisertItem).toBeDefined();
    expect(spesifisertItem!.status).toBe('ok');
    expect(spesifisertItem!.paragrafRef).toBe('§33.6');
  });

  it('returns warning for frist spesifisert when not ok', () => {
    const state = makeBaseState({
      frist: {
        status: 'sendt',
        spesifisert_varsel: { dato_sendt: '2025-01-01' },
        spesifisert_krav_ok: false,
        antall_versjoner: 1,
      },
    });

    const items = beregnVarslingStatus(state);
    const spesifisertItem = items.find((i) => i.paragrafRef === '§33.6' && i.status === 'warning');
    expect(spesifisertItem).toBeDefined();
    expect(spesifisertItem!.label).toBe('Frist: ikke spesifisert');
  });

  it('returns ok for vederlag when submitted', () => {
    const state = makeBaseState({
      vederlag: {
        status: 'sendt',
        antall_versjoner: 1,
      },
    });

    const items = beregnVarslingStatus(state);
    const vederlagItem = items.find((i) => i.spor === 'vederlag');
    expect(vederlagItem).toBeDefined();
    expect(vederlagItem!.status).toBe('ok');
    expect(vederlagItem!.label).toBe('Vederlag: varslet');
  });

  it('returns na for vederlag when utkast', () => {
    const state = makeBaseState({
      vederlag: {
        status: 'utkast',
        antall_versjoner: 1,
      },
    });

    const items = beregnVarslingStatus(state);
    const vederlagItem = items.find((i) => i.spor === 'vederlag');
    expect(vederlagItem).toBeDefined();
    expect(vederlagItem!.status).toBe('na');
    expect(vederlagItem!.label).toBe('Vederlag: ikke varslet');
  });

  it('returns all 4 items when all tracks are active', () => {
    const state = makeBaseState({
      grunnlag: {
        status: 'sendt',
        grunnlag_varsel: { dato_sendt: '2025-01-01' },
        grunnlag_varslet_i_tide: true,
        laast: false,
        antall_versjoner: 1,
      },
      frist: {
        status: 'sendt',
        frist_varsel: { dato_sendt: '2025-01-01' },
        frist_varsel_ok: true,
        spesifisert_varsel: { dato_sendt: '2025-02-01' },
        spesifisert_krav_ok: true,
        antall_versjoner: 1,
      },
      vederlag: {
        status: 'sendt',
        antall_versjoner: 1,
      },
    });

    const items = beregnVarslingStatus(state);
    expect(items).toHaveLength(4);
  });
});

describe('varslingSymbol', () => {
  it('returns correct symbols', () => {
    expect(varslingSymbol('ok')).toBe('✓');
    expect(varslingSymbol('warning')).toBe('⚠');
    expect(varslingSymbol('breach')).toBe('✕');
    expect(varslingSymbol('na')).toBe('–');
  });
});
