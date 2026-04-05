import { describe, it, expect } from 'vitest';
import { deriveTrackDisplay, deriveVederlagDomainConfig, deriveFristDomainConfig, deriveGrunnlagDomainConfig } from '../derive';
import { scenario1_3AktiveSpor, scenario2_BlandetTilstand, scenario4_Omforent } from '$lib/mocks/caseState';

describe('deriveTrackDisplay', () => {
  it('utleder vederlag-display fra SakState', () => {
    const result = deriveTrackDisplay(scenario1_3AktiveSpor, 'vederlag');
    expect(result.label).toBe('Økonomi');
    expect(result.num).toBe('II');
    expect(result.krevdValue).toBe(2930000);
    expect(result.krevdUnit).toBe(',-');
    expect(result.teText).toContain('Kostnadsoverslag');
  });

  it('utleder grunnlag-display fra SakState', () => {
    const result = deriveTrackDisplay(scenario1_3AktiveSpor, 'ansvar');
    expect(result.label).toBe('Ansvarsgrunnlag');
    expect(result.num).toBe('I');
    expect(result.tePosition).toBe('SVIKT');
    expect(result.teText).toContain('leirelag');
  });

  it('utleder frist-display fra SakState', () => {
    const result = deriveTrackDisplay(scenario1_3AktiveSpor, 'frist');
    expect(result.label).toBe('Frist');
    expect(result.num).toBe('III');
    expect(result.krevdValue).toBe(45);
    expect(result.krevdUnit).toBe(' dgr');
  });

  it('håndterer omforent sak med godkjent grunnlag', () => {
    const result = deriveTrackDisplay(scenario4_Omforent, 'ansvar');
    expect(result.bhPosition).toBe('Godkjent');
    expect(result.isDisputed).toBe(false);
  });

  it('håndterer blandet sak med delvis godkjent frist', () => {
    const result = deriveTrackDisplay(scenario2_BlandetTilstand, 'frist');
    expect(result.krevdValue).toBe(30);
    expect(result.bhPrinsipal).toBe(20);
  });
});

describe('deriveVederlagDomainConfig', () => {
  it('utleder config fra scenario1', () => {
    const cfg = deriveVederlagDomainConfig(scenario1_3AktiveSpor);
    expect(cfg.metode).toBe('REGNINGSARBEID');
    expect(cfg.hovedkravBelop).toBe(2930000);
    expect(cfg.harRiggKrav).toBe(true);
    expect(cfg.riggBelop).toBe(350000);
    expect(cfg.harProduktivitetKrav).toBe(true);
    expect(cfg.produktivitetBelop).toBe(180000);
    expect(cfg.grunnlagStatus).toBeUndefined();
  });

  it('utleder config fra omforent sak', () => {
    const cfg = deriveVederlagDomainConfig(scenario4_Omforent);
    expect(cfg.grunnlagStatus).toBe('godkjent');
    expect(cfg.hovedkravBelop).toBe(1250000);
  });
});

describe('deriveFristDomainConfig', () => {
  it('utleder config fra scenario1', () => {
    const cfg = deriveFristDomainConfig(scenario1_3AktiveSpor);
    expect(cfg.krevdDager).toBe(45);
    expect(cfg.varselType).toBe('spesifisert');
    expect(cfg.erGrunnlagSubsidiaer).toBe(false);
  });

  it('utleder config fra blandet sak med godkjent grunnlag', () => {
    const cfg = deriveFristDomainConfig(scenario2_BlandetTilstand);
    expect(cfg.krevdDager).toBe(30);
    expect(cfg.erGrunnlagSubsidiaer).toBe(false); // grunnlag godkjent
  });
});

describe('deriveGrunnlagDomainConfig', () => {
  it('utleder config fra scenario1', () => {
    const cfg = deriveGrunnlagDomainConfig(scenario1_3AktiveSpor);
    expect(cfg.grunnlagEvent?.hovedkategori).toBe('SVIKT');
    expect(cfg.isUpdateMode).toBe(false);
  });

  it('utleder updateMode fra sak med BH-respons', () => {
    const cfg = deriveGrunnlagDomainConfig(scenario4_Omforent);
    expect(cfg.isUpdateMode).toBe(true);
    expect(cfg.forrigeResultat).toBe('godkjent');
  });
});
