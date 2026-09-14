import { describe, it, expect } from 'vitest';
import {
  generateVederlagResponseBegrunnelse,
  type VederlagResponseInput,
} from '../begrunnelse/vederlagBegrunnelse';
import { getDefaults, har34_1_2Preklusjon } from '../vederlagDomain';

/**
 * Basisinput for et alminnelig hovedkrav uten særskilte krav.
 * Enkelttester overstyrer bare feltene de handler om.
 */
function baseInput(overrides: Partial<VederlagResponseInput> = {}): VederlagResponseInput {
  return {
    metode: 'FASTPRIS_TILBUD',
    hovedkravBelop: 100_000,
    harRiggKrav: false,
    harProduktivitetKrav: false,
    akseptererMetode: true,
    hovedkravVurdering: 'godkjent',
    hovedkravGodkjentBelop: 100_000,
    totalKrevd: 100_000,
    totalGodkjent: 100_000,
    harPrekludertKrav: false,
    ...overrides,
  };
}

/**
 * `toLocaleString('nb-NO')` bruker hardt mellomrom som tusenskille. Testene
 * normaliserer det slik at forventningene kan skrives med vanlig mellomrom.
 */
function gen(...args: Parameters<typeof generateVederlagResponseBegrunnelse>): string {
  return generateVederlagResponseBegrunnelse(...args).replace(/[\u00a0\u202f\u2007]/g, ' ');
}

describe('generateVederlagResponseBegrunnelse — §34.1.2 avgrensning', () => {
  it('påberoper §34.1.2-preklusjon for SVIKT når hovedkravet ikke er varslet i tide', () => {
    const tekst = gen(
      baseInput({
        hovedkategori: 'SVIKT',
        hovedkravVarsletITide: false,
        harPrekludertKrav: true,
      })
    );
    expect(tekst).toContain('prekludert iht. §34.1.2');
  });

  it('påberoper ikke §34.1.2 ved ENDRING, der regelen ikke gjelder (§34.1.1)', () => {
    // Reproduksjon: et etterslept «ikke varslet i tide»-flagg fra en tidligere
    // kategori må ikke gi preklusjonspåstand etter at saken er ENDRING.
    const tekst = gen(
      baseInput({
        hovedkategori: 'ENDRING',
        hovedkravVarsletITide: false,
        harPrekludertKrav: true,
      })
    );
    expect(tekst).not.toContain('§34.1.2');
    expect(tekst).not.toContain('prekludert');
  });

  it('påberoper ikke §34.1.2 ved FORCE_MAJEURE', () => {
    const tekst = gen(
      baseInput({
        hovedkategori: 'FORCE_MAJEURE',
        hovedkravVarsletITide: false,
        harPrekludertKrav: true,
      })
    );
    expect(tekst).not.toContain('§34.1.2');
  });

  it('samsvarer med har34_1_2Preklusjon() for alle hovedkategorier', () => {
    const kategorier = ['ENDRING', 'SVIKT', 'ANDRE', 'FORCE_MAJEURE'] as const;
    for (const hovedkategori of kategorier) {
      const tekst = gen(
        baseInput({ hovedkategori, hovedkravVarsletITide: false, harPrekludertKrav: true })
      );
      expect(tekst.includes('§34.1.2'), `hovedkategori=${hovedkategori}`).toBe(
        har34_1_2Preklusjon({ hovedkategori })
      );
    }
  });

  it('holder brevteksten i takt med hendelsesfeltet hovedkrav_varslet_i_tide', () => {
    // getDefaults gjenoppretter et tidligere «nei» i oppdateringsmodus. Når saken
    // i mellomtiden er ENDRING, dropper buildEventData feltet; teksten må følge etter.
    const state = getDefaults({
      isUpdateMode: true,
      lastResponseEvent: { eventId: 'e1', hovedkravVarsletITide: false },
    });
    expect(state.hovedkravVarsletITide).toBe(false);

    const tekst = gen(
      baseInput({
        hovedkategori: 'ENDRING',
        hovedkravVarsletITide: state.hovedkravVarsletITide,
        harPrekludertKrav: true,
      })
    );
    expect(tekst).not.toContain('prekludert');
  });
});

describe('generateVederlagResponseBegrunnelse — særskilte krav (§34.1.3)', () => {
  it('prekluderer rigg/drift uavhengig av hovedkategori', () => {
    // §34.1.3 gjelder alle hovedkategorier, også ENDRING der §34.1.2 ikke gjelder.
    const tekst = gen(
      baseInput({
        hovedkategori: 'ENDRING',
        harRiggKrav: true,
        riggBelop: 40_000,
        riggVarsletITide: false,
        riggVurdering: 'godkjent',
        harPrekludertKrav: true,
      })
    );
    expect(tekst).toContain('prekludert iht. §34.1.3');
    expect(tekst).toContain('rigg- og driftskostnader');
    expect(tekst).not.toContain('§34.1.2');
  });

  it('prekluderer produktivitetstap uavhengig av hovedkategori', () => {
    const tekst = gen(
      baseInput({
        hovedkategori: 'ENDRING',
        harProduktivitetKrav: true,
        produktivitetBelop: 25_000,
        produktivitetVarsletITide: false,
        produktivitetVurdering: 'avslatt',
        harPrekludertKrav: true,
      })
    );
    expect(tekst).toContain('prekludert iht. §34.1.3');
    expect(tekst).toContain('produktivitetstap');
  });

  it('gir alminnelig vurderingstekst når særskilt krav er varslet i tide', () => {
    const tekst = gen(
      baseInput({
        harRiggKrav: true,
        riggBelop: 40_000,
        riggVarsletITide: true,
        riggVurdering: 'delvis',
        riggGodkjentBelop: 10_000,
      })
    );
    expect(tekst).not.toContain('prekludert');
    expect(tekst).toContain('godkjennes delvis med kr 10 000,- av krevde kr 40 000,-');
  });
});

describe('generateVederlagResponseBegrunnelse — grunnlag og metode', () => {
  it('markerer hele vurderingen som subsidiær ved prekludert grunnlag (§32.2)', () => {
    const tekst = gen(baseInput({ erGrunnlagPrekludert: true }));
    expect(tekst).toContain('§32.2');
    expect(tekst).toContain('gjelder derfor subsidiært');
  });

  it('markerer vurderingen som subsidiær når grunnlaget er avvist', () => {
    const tekst = gen(baseInput({ erGrunnlagAvslatt: true }));
    expect(tekst).toContain('Kontraktsforholdet er avvist');
  });

  it('oppgir ønsket metode når byggherren ikke godtar den foreslåtte', () => {
    const tekst = gen(
      baseInput({
        metode: 'REGNINGSARBEID',
        akseptererMetode: false,
        oensketMetode: 'ENHETSPRISER',
      })
    );
    expect(tekst).toContain('godtar ikke den foreslåtte beregningsmetoden regningsarbeid (§34.4)');
    expect(tekst).toContain('krever i stedet beregning etter enhetspriser (§34.3)');
  });

  it('bruker metodespesifikk terminologi for regningsarbeid', () => {
    const tekst = gen(baseInput({ metode: 'REGNINGSARBEID' }));
    expect(tekst).toContain('Hva gjelder kostnadsoverslaget:');
    expect(tekst).toContain('Kostnadsoverslaget på kr 100 000,- aksepteres.');
  });

  it('utelater beløpsvurderingen når betaling holdes tilbake (§30.2)', () => {
    const tekst = gen(baseInput({ holdTilbake: true }));
    expect(tekst).toContain('holder tilbake betaling');
    expect(tekst).not.toContain('Hva gjelder beløpet:');
    expect(tekst).not.toContain('Samlet');
  });

  it('gjengir byggherrens standpunkt til justerte enhetspriser (§34.3.3)', () => {
    const tekst = gen(
      baseInput({
        metode: 'ENHETSPRISER',
        kreverJustertEp: true,
        epJusteringVarsletITide: false,
        epJusteringAkseptert: false,
      })
    );
    expect(tekst).toContain('§34.3.3 første ledd');
    expect(tekst).toContain('justerte enhetspriser (§34.3.2) avvises');
  });
});

describe('generateVederlagResponseBegrunnelse — konklusjon', () => {
  it('oppsummerer godkjent mot krevd beløp', () => {
    const tekst = gen(
      baseInput({
        hovedkravVurdering: 'delvis',
        hovedkravGodkjentBelop: 60_000,
        totalGodkjent: 60_000,
      })
    );
    expect(tekst).toContain('godkjennes delvis med kr 60 000,- av krevde kr 100 000,- (60%)');
    expect(tekst).toContain('Samlet godkjent beløp utgjør etter dette kr 60 000,-');
  });

  it('oppgir subsidiært samlet beløp når noe er prekludert', () => {
    const tekst = gen(
      baseInput({
        hovedkategori: 'SVIKT',
        hovedkravVarsletITide: false,
        harPrekludertKrav: true,
        totalGodkjent: 0,
        totalGodkjentSubsidiaer: 100_000,
      })
    );
    expect(tekst).toContain(
      'ville samlet godkjent beløp utgjort kr 100 000,- (subsidiært standpunkt)'
    );
  });

  it('utelater subsidiær sum når den ikke er høyere enn prinsipal sum', () => {
    const tekst = gen(
      baseInput({
        hovedkategori: 'SVIKT',
        hovedkravVarsletITide: false,
        harPrekludertKrav: true,
        hovedkravVurdering: 'avslatt',
        totalGodkjent: 0,
        totalGodkjentSubsidiaer: 0,
      })
    );
    expect(tekst).not.toContain('subsidiært standpunkt');
  });
});
