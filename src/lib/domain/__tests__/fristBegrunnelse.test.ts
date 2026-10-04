import { describe, expect, it } from 'vitest';
import { generateFristResponseBegrunnelse } from '../begrunnelse/fristBegrunnelse';

describe('generateFristResponseBegrunnelse', () => {
  it('omtaler både prinsipalt §33.4-rettstap og subsidiær §33.6.1-begrensning', () => {
    const begrunnelse = generateFristResponseBegrunnelse({
      varselType: 'spesifisert',
      krevdDager: 45,
      fristVarselOk: false,
      spesifisertKravOk: false,
      vilkarOppfylt: true,
      godkjentDager: 20,
      erPrekludert: true,
      erRedusert_33_6_1: true,
      harTidligereVarselITide: false,
      erGrunnlagSubsidiaer: false,
      erGrunnlagPrekludert: false,
      prinsipaltResultat: 'avslatt',
      subsidiaertResultat: 'delvis_godkjent',
      visSubsidiaertResultat: true,
    });

    expect(begrunnelse).toContain('prinsipalt tapt etter §33.4');
    expect(begrunnelse).toContain('fremsatt for sent iht. §33.6.1');
    expect(begrunnelse).toContain('Subsidiært');
  });

  it('viser aldri 100 % ved delvis godkjenning (#177)', () => {
    const begrunnelse = generateFristResponseBegrunnelse({
      varselType: 'spesifisert',
      krevdDager: 200,
      fristVarselOk: true,
      spesifisertKravOk: true,
      vilkarOppfylt: true,
      godkjentDager: 199,
      erPrekludert: false,
      erRedusert_33_6_1: false,
      harTidligereVarselITide: true,
      erGrunnlagSubsidiaer: false,
      erGrunnlagPrekludert: false,
      prinsipaltResultat: 'delvis_godkjent',
      subsidiaertResultat: 'delvis_godkjent',
      visSubsidiaertResultat: false,
    });

    expect(begrunnelse).toContain('199 dager av krevde 200 dager (99%)');
  });
});
