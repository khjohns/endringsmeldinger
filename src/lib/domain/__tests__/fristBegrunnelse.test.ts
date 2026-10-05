import { describe, expect, it } from 'vitest';
import {
  type FristResponseInput,
  generateFristResponseBegrunnelse,
} from '../begrunnelse/fristBegrunnelse';

function input(overrides: Partial<FristResponseInput> = {}): FristResponseInput {
  return {
    varselType: 'spesifisert',
    krevdDager: 45,
    fristVarselOk: true,
    spesifisertKravOk: true,
    vilkarOppfylt: true,
    godkjentDager: 45,
    erPrekludert: false,
    erRedusert_33_6_1: false,
    harTidligereVarselITide: false,
    erGrunnlagSubsidiaer: false,
    erGrunnlagPrekludert: false,
    prinsipaltResultat: 'godkjent',
    subsidiaertResultat: 'godkjent',
    visSubsidiaertResultat: false,
    ...overrides,
  };
}

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

  it('navngir begge innsigelsene når dagene er atter subsidiære (#211)', () => {
    const begrunnelse = generateFristResponseBegrunnelse(
      input({
        fristVarselOk: false,
        vilkarOppfylt: false,
        godkjentDager: 30,
        erPrekludert: true,
        prinsipaltResultat: 'avslatt',
        subsidiaertResultat: 'delvis_godkjent',
        visSubsidiaertResultat: true,
      })
    );

    expect(begrunnelse).toContain(
      'Dersom byggherren verken får medhold i preklusjonsinnsigelsen eller i at forholdet ' +
        'ikke har hindret fremdriften, kan entreprenøren maksimalt ha krav på 30 dager ' +
        '(atter subsidiært standpunkt).'
    );
    expect(begrunnelse).toContain(
      'Atter subsidiært, hva gjelder antall dager: Kravet godkjennes delvis med 30 dager'
    );
  });

  it('gjør dagene til subsidiært standpunkt når bare hindringen bestrides (#211)', () => {
    const begrunnelse = generateFristResponseBegrunnelse(
      input({
        vilkarOppfylt: false,
        godkjentDager: 30,
        prinsipaltResultat: 'avslatt',
        subsidiaertResultat: 'delvis_godkjent',
        visSubsidiaertResultat: true,
      })
    );

    expect(begrunnelse).toContain(
      'Dersom byggherren ikke får medhold i at forholdet ikke har hindret fremdriften, ' +
        'kan entreprenøren maksimalt ha krav på 30 dager (subsidiært standpunkt).'
    );
    expect(begrunnelse).toContain('Subsidiært, hva gjelder antall dager:');
    expect(begrunnelse).not.toContain('Atter subsidiært');
  });

  it('begrunner 0 dager med §33.5 når hindringen erkjennes (#180)', () => {
    const begrunnelse = generateFristResponseBegrunnelse(
      input({ godkjentDager: 0, prinsipaltResultat: 'avslatt', subsidiaertResultat: 'avslatt' })
    );

    expect(begrunnelse).toContain('Det erkjennes at forholdet har hindret fremdriften');
    expect(begrunnelse).toContain(
      'Hva gjelder antall dager: Byggherren gjør gjeldende at hindringen ikke har hatt ' +
        'virkning på fremdriften som gir rett til fristforlengelse, jf. §33.5. Kravet om ' +
        '45 dager fristforlengelse kan derfor ikke imøtekommes.'
    );
  });

  it('gjentar ikke §33.5 når hindringen bestrides og dagene er 0', () => {
    const begrunnelse = generateFristResponseBegrunnelse(
      input({
        vilkarOppfylt: false,
        godkjentDager: 0,
        prinsipaltResultat: 'avslatt',
        subsidiaertResultat: 'avslatt',
        visSubsidiaertResultat: true,
      })
    );

    expect(begrunnelse).not.toContain('§33.5');
    expect(begrunnelse).toContain('Kravet om 45 dager fristforlengelse kan ikke imøtekommes.');
  });
});
