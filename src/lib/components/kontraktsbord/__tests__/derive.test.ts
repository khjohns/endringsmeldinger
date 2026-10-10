import { describe, it, expect } from 'vitest';
import {
  deriveTrackDisplay,
  assessedGap,
  bhStandpunkt,
  grunnlagTriggers,
  grunnlagetErPrekludert,
  svaretErSubsidiaert,
  deriveVederlagDomainConfig,
  deriveFristDomainConfig,
  deriveGrunnlagDomainConfig,
} from '../derive';
import {
  scenario1_3AktiveSpor,
  scenario2_BlandetTilstand,
  scenario4_Omforent,
} from '$lib/mocks/caseState';
import { getHjemmelLabel } from '$lib/constants/categories';
import { GRUNNLAG_RESULTAT_LABELS } from '$lib/constants/responseOptions';

describe('deriveTrackDisplay', () => {
  it('utleder vederlag-display fra SakState', () => {
    const result = deriveTrackDisplay(scenario1_3AktiveSpor, 'vederlag');
    expect(result.label).toBe('Vederlag');
    expect(result.krevdValue).toBe(2930000);
    expect(result.krevdUnit).toBe(',-');
    expect(result.teText).toContain('Kostnadsoverslag');
  });

  it('utleder grunnlag-display fra SakState', () => {
    const result = deriveTrackDisplay(scenario1_3AktiveSpor, 'ansvar');
    expect(result.label).toBe('Grunnlag');
    expect(result.tePosition).toBe(getHjemmelLabel('GRUNN'));
    expect(result.teRef).toBe('§ 23.1');
    expect(result.bhPosition).toBe('Ikke besvart');
    expect(result.isDisputed).toBe(false);
    expect(result.teText).toContain('leirelag');
  });

  it('utleder frist-display fra SakState', () => {
    const result = deriveTrackDisplay(scenario1_3AktiveSpor, 'frist');
    expect(result.label).toBe('Fristforlengelse');
    expect(result.krevdValue).toBe(45);
    expect(result.krevdUnit).toBe(' dager');
  });

  it('skiller et godtatt avslag fra et trukket krav og fra uenighet', () => {
    // TFR-01: TE har godtatt byggherrens avslag. Sporet er oppgjort ved enighet,
    // ikke trukket av TE, og ikke lenger omtvistet i den forstand at partene
    // står mot hverandre — men byggherrens standpunkt var et avslag, og det
    // skal fortsatt kunne leses av bh_resultat.
    const sak = structuredClone(scenario2_BlandetTilstand);
    sak.vederlag.status = 'avslatt_akseptert';
    sak.vederlag.bh_resultat = 'avslatt';
    sak.vederlag.te_akseptert = true;

    const result = deriveTrackDisplay(sak, 'vederlag');
    expect(result.isRejectionAccepted).toBe(true);
    expect(result.isWithdrawn).toBe(false);

    // Et trukket krav er noe annet, og skal ikke forveksles.
    const trukket = structuredClone(scenario2_BlandetTilstand);
    trukket.vederlag.status = 'trukket';
    const trukketResult = deriveTrackDisplay(trukket, 'vederlag');
    expect(trukketResult.isRejectionAccepted).toBe(false);
    expect(trukketResult.isWithdrawn).toBe(true);
  });

  it('håndterer omforent sak med godkjent grunnlag', () => {
    const result = deriveTrackDisplay(scenario4_Omforent, 'ansvar');
    expect(result.tePosition).toBe(getHjemmelLabel('IRREG'));
    expect(result.teRef).toBe('§ 32.1');
    expect(result.bhPosition).toBe(GRUNNLAG_RESULTAT_LABELS.godkjent);
    expect(result.isDisputed).toBe(false);
  });

  it('håndterer blandet sak med delvis godkjent frist', () => {
    const result = deriveTrackDisplay(scenario2_BlandetTilstand, 'frist');
    expect(result.krevdValue).toBe(30);
    expect(result.bhPrinsipal).toBe(20);
  });
});

describe('svar på vederlag og frist når grunnlaget er avslått eller prekludert', () => {
  // #214, B-13 (05.10): hele svaret er subsidiært, som i brevet og fullmakten.
  function sakMedGodkjentBelopOgDager() {
    const sak = structuredClone(scenario2_BlandetTilstand);
    sak.vederlag.bh_resultat = 'godkjent';
    sak.vederlag.krevd_belop = 500000;
    sak.vederlag.godkjent_belop = 500000;
    sak.vederlag.subsidiaer_godkjent_belop = undefined;
    sak.frist.bh_resultat = 'godkjent';
    sak.frist.krevd_dager = 30;
    sak.frist.godkjent_dager = 30;
    sak.frist.subsidiaer_godkjent_dager = undefined;
    return sak;
  }

  it('viser prinsipalt avslag og beløpet som subsidiært når grunnlaget er avslått', () => {
    const sak = sakMedGodkjentBelopOgDager();
    sak.grunnlag.bh_resultat = 'avslatt';
    sak.er_subsidiaert_vederlag = true;
    sak.er_subsidiaert_frist = true;

    const vederlag = deriveTrackDisplay(sak, 'vederlag');
    expect(vederlag.isDisputed).toBe(true);
    expect(vederlag.isSubsidiary).toBe(true);
    expect(vederlag.bhPrinsipal).toBe(0);
    expect(vederlag.bhSubsidiaer).toBe(500000);

    const frist = deriveTrackDisplay(sak, 'frist');
    expect(frist.isDisputed).toBe(true);
    expect(frist.bhPrinsipal).toBe(0);
    expect(frist.bhSubsidiaer).toBe(30);

    expect(grunnlagTriggers(sak, 'vederlag')).toEqual(['grunnlag_avslatt']);
    expect(grunnlagTriggers(sak, 'frist')).toEqual(['grunnlag_avslatt']);
  });

  it('gjør det samme ved preklusjon etter § 32.2, selv om grunnlaget er godkjent', () => {
    const sak = sakMedGodkjentBelopOgDager();
    sak.grunnlag.bh_resultat = 'godkjent';
    sak.grunnlag.hovedkategori = 'ENDRING';
    sak.grunnlag.underkategori = 'IRREG';
    sak.grunnlag.grunnlag_varslet_i_tide = false;
    sak.er_subsidiaert_vederlag = true;
    sak.er_subsidiaert_frist = true;

    const vederlag = deriveTrackDisplay(sak, 'vederlag');
    expect(vederlag.isDisputed).toBe(true);
    expect(vederlag.bhPrinsipal).toBe(0);
    expect(vederlag.bhSubsidiaer).toBe(500000);
    expect(grunnlagTriggers(sak, 'frist')).toEqual(['grunnlag_prekludert_32_2']);
  });

  it('skiller preklusjon fra avslag på grunnlagslinjen (#236)', () => {
    const sak = sakMedGodkjentBelopOgDager();
    sak.grunnlag.hovedkategori = 'ENDRING';
    sak.grunnlag.underkategori = 'IRREG';
    sak.grunnlag.grunnlag_varslet_i_tide = false;

    for (const resultat of ['godkjent', 'avslatt'] as const) {
      sak.grunnlag.bh_resultat = resultat;
      const ansvar = deriveTrackDisplay(sak, 'ansvar');
      expect(ansvar.bhPosition).toBe('Prekludert (§ 32.2)');
      expect(ansvar.isDisputed).toBe(true);
      expect(ansvar.isPrecluded).toBe(true);
      expect(grunnlagetErPrekludert(sak)).toBe(true);
    }

    sak.grunnlag.grunnlag_varslet_i_tide = true;
    sak.grunnlag.bh_resultat = 'avslatt';
    const avslatt = deriveTrackDisplay(sak, 'ansvar');
    expect(avslatt.bhPosition).toBe(GRUNNLAG_RESULTAT_LABELS.avslatt);
    expect(avslatt.isDisputed).toBe(true);
    expect(avslatt.isPrecluded).toBe(false);
    expect(grunnlagetErPrekludert(sak)).toBe(false);
  });

  it('regner ikke grunnlaget som prekludert før byggherren har svart', () => {
    const sak = sakMedGodkjentBelopOgDager();
    sak.grunnlag.hovedkategori = 'ENDRING';
    sak.grunnlag.underkategori = 'IRREG';
    sak.grunnlag.grunnlag_varslet_i_tide = false;
    sak.grunnlag.bh_resultat = undefined;
    expect(grunnlagetErPrekludert(sak)).toBe(false);
    expect(deriveTrackDisplay(sak, 'ansvar').isDisputed).toBe(false);
  });

  it('følger serverfeltet og viser «Godkjent» når grunnlaget står', () => {
    const sak = sakMedGodkjentBelopOgDager();
    sak.grunnlag.bh_resultat = 'godkjent';
    sak.er_subsidiaert_vederlag = false;
    sak.er_subsidiaert_frist = false;

    const vederlag = deriveTrackDisplay(sak, 'vederlag');
    expect(vederlag.isDisputed).toBe(false);
    expect(vederlag.bhPrinsipal).toBe(500000);
    expect(grunnlagTriggers(sak, 'vederlag')).toEqual([]);
  });

  it('ser på grunnlaget alene, også når beløpet er avslått, som brevet', () => {
    const sak = sakMedGodkjentBelopOgDager();
    sak.grunnlag.bh_resultat = 'avslatt';
    sak.vederlag.bh_resultat = 'avslatt';
    sak.vederlag.godkjent_belop = 0;
    sak.vederlag.subsidiaer_godkjent_belop = 300000;
    // Serveren setter flagget bare når beløpet er godkjent.
    sak.er_subsidiaert_vederlag = false;

    expect(svaretErSubsidiaert(sak, 'vederlag')).toBe(true);
    const vederlag = deriveTrackDisplay(sak, 'vederlag');
    expect(vederlag.isDisputed).toBe(true);
    expect(vederlag.bhPrinsipal).toBe(0);
    expect(vederlag.bhSubsidiaer).toBe(0);
    expect(vederlag.isSubsidiary).toBe(true);
    expect(grunnlagTriggers(sak, 'vederlag')).toEqual(['grunnlag_avslatt']);
  });

  it('gjør ikke vederlaget subsidiært ved frafall (§ 32.3 c), som serveren', () => {
    const sak = sakMedGodkjentBelopOgDager();
    sak.grunnlag.bh_resultat = 'frafalt';
    sak.grunnlag.hovedkategori = 'ENDRING';
    sak.grunnlag.underkategori = 'IRREG';
    sak.grunnlag.grunnlag_varslet_i_tide = false;

    const vederlag = deriveTrackDisplay(sak, 'vederlag');
    expect(vederlag.isDisputed).toBe(false);
    expect(vederlag.isSubsidiary).toBe(false);
    expect(vederlag.bhPrinsipal).toBe(500000);
    expect(grunnlagTriggers(sak, 'vederlag')).toEqual([]);
  });

  it('gjelder ikke før byggherren har svart på sporet', () => {
    const sak = sakMedGodkjentBelopOgDager();
    sak.grunnlag.bh_resultat = 'avslatt';
    sak.frist.bh_resultat = undefined;

    expect(svaretErSubsidiaert(sak, 'frist')).toBe(false);
    expect(grunnlagTriggers(sak, 'frist')).toEqual([]);
  });

  it('setter et eget subsidiært standpunkt i svaret atter subsidiært', () => {
    expect(bhStandpunkt(true, 400000, 500000)).toEqual({
      prinsipalt: 0,
      subsidiaert: 400000,
      atterSubsidiaert: 500000,
    });
    expect(bhStandpunkt(false, 400000, 500000)).toEqual({
      prinsipalt: 400000,
      subsidiaert: 500000,
    });
    // API-svaret har null, ikke undefined, når svaret mangler et eget subsidiært standpunkt.
    expect(bhStandpunkt(true, 400000, null)).toEqual({
      prinsipalt: 0,
      subsidiaert: 400000,
      atterSubsidiaert: undefined,
    });
    expect(bhStandpunkt(false, 400000, undefined)).toEqual({
      prinsipalt: 400000,
      subsidiaert: 400000,
    });
  });
});

describe('deriveVederlagDomainConfig', () => {
  it('utleder config fra scenario1', () => {
    const cfg = deriveVederlagDomainConfig(scenario1_3AktiveSpor);
    expect(cfg.metode).toBe('REGNINGSARBEID');
    expect(cfg.hovedkravBelop).toBe(2400000);
    expect(cfg.harRiggKrav).toBe(true);
    expect(cfg.riggBelop).toBe(350000);
    expect(cfg.harProduktivitetKrav).toBe(true);
    expect(cfg.produktivitetBelop).toBe(180000);
    expect(cfg.grunnlagStatus).toBeUndefined();
  });

  it('utleder config fra omforent sak', () => {
    const cfg = deriveVederlagDomainConfig(scenario4_Omforent);
    expect(cfg.grunnlagStatus).toBe('godkjent');
    expect(cfg.hovedkravBelop).toBe(1100000);
  });
});

describe('deriveFristDomainConfig', () => {
  it('utleder config fra scenario1', () => {
    const cfg = deriveFristDomainConfig(scenario1_3AktiveSpor);
    expect(cfg.krevdDager).toBe(45);
    expect(cfg.varselType).toBe('spesifisert');
    expect(cfg.erGrunnlagSubsidiaer).toBe(false);
    expect(cfg.harTidligereVarselITide).toBe(false);
  });

  it('utleder config fra blandet sak med godkjent grunnlag', () => {
    const cfg = deriveFristDomainConfig(scenario2_BlandetTilstand);
    expect(cfg.krevdDager).toBe(30);
    expect(cfg.erGrunnlagSubsidiaer).toBe(false); // grunnlag godkjent
    expect(cfg.harTidligereVarselITide).toBe(true); // tidligere BH-respons foreligger
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

describe('vurdert omfang og eksponering', () => {
  it.each(['frist', 'vederlag'] as const)('skiller ubesvart %s fra uttrykkelig null', (track) => {
    const sak = structuredClone(scenario1_3AktiveSpor);
    sak[track].bh_resultat = undefined;
    const unanswered = deriveTrackDisplay(sak, track);
    expect(unanswered.bhPrinsipal).toBeUndefined();
    expect(unanswered.bhSubsidiaer).toBeUndefined();
    expect(assessedGap(unanswered.krevdValue!, unanswered.bhPrinsipal)).toBeUndefined();

    sak[track].bh_resultat = 'avslatt';
    sak.frist.godkjent_dager = 0;
    sak.frist.subsidiaer_godkjent_dager = 0;
    sak.vederlag.godkjent_belop = 0;
    sak.vederlag.subsidiaer_godkjent_belop = 0;
    const rejected = deriveTrackDisplay(sak, track);
    expect(rejected.bhPrinsipal).toBe(0);
    expect(rejected.bhSubsidiaer).toBe(0);
    expect(assessedGap(rejected.krevdValue!, rejected.bhPrinsipal)).toBe(rejected.krevdValue);
  });
});
