import { describe, it, expect } from 'vitest';
import { deriveFristDomainConfig } from '../deriveConfig';
import { beregnVisibility, buildEventData, getDefaults } from '../fristDomain';
import { scenario1_3AktiveSpor } from '$lib/mocks/caseState';
import type { SakState } from '$lib/types/timeline';

function medFrist(frist: Partial<SakState['frist']>): SakState {
  return {
    ...scenario1_3AktiveSpor,
    frist: { ...scenario1_3AktiveSpor.frist, ...frist },
  };
}

describe('deriveFristDomainConfig — tidligere svar (#181)', () => {
  it('behandler null fra API-et som at BH ikke har svart', () => {
    const sak = medFrist({
      bh_respondert_versjon: null as unknown as undefined,
      frist_varsel_ok: undefined,
    });
    expect(deriveFristDomainConfig(sak).harTidligereVarselITide).toBe(false);
  });

  it('regner et tidligere svar uten innsigelse som varslet i tide', () => {
    const sak = medFrist({ bh_respondert_versjon: 0, frist_varsel_ok: undefined });
    expect(deriveFristDomainConfig(sak).harTidligereVarselITide).toBe(true);
  });
});

describe('deriveFristDomainConfig — svar på forespørselen (#181)', () => {
  it('gjelder bare kravet som besvarte forespørselen', () => {
    const svaret = medFrist({ har_bh_foresporsel: true, kravet_besvarer_foresporselen: true });
    expect(deriveFristDomainConfig(svaret).erSvarPaForesporsel).toBe(true);
  });

  it('gjelder ikke en senere revisjon, selv om forespørselen finnes', () => {
    const revisjon = medFrist({ har_bh_foresporsel: true, kravet_besvarer_foresporselen: false });
    expect(deriveFristDomainConfig(revisjon).erSvarPaForesporsel).toBe(false);
  });
});

/** Fristsporet slik API-et sender det: felt som ikke er satt, er `null` (`model_dump(mode="json")`). */
function fristFraApi(felt: Record<string, unknown>): SakState {
  const tomme = {
    varsel_type: null,
    krevd_dager: null,
    krav_event_id: null,
    bh_respondert_versjon: null,
    frist_varsel_ok: null,
    spesifisert_krav_ok: null,
    foresporsel_svar_ok: null,
    har_bh_foresporsel: null,
    foresporsel_krav_id: null,
    kravet_besvarer_foresporselen: false,
    vilkar_oppfylt: null,
    godkjent_dager: null,
    bh_resultat: null,
    subsidiaer_resultat: null,
    subsidiaer_godkjent_dager: null,
  };
  return medFrist({ ...tomme, ...felt } as unknown as Partial<SakState['frist']>);
}

const beregnet = {
  prinsipaltResultat: 'godkjent' as const,
  subsidiaertResultat: 'godkjent' as const,
  visSubsidiaertResultat: false,
  subsidiaerTriggers: [],
};

describe('fristsporet med null fra API-et (#181)', () => {
  it('første svar på et spesifisert krav uten varsel spør om § 33.4 og § 33.6.1', () => {
    const config = deriveFristDomainConfig(
      fristFraApi({ varsel_type: 'spesifisert', krevd_dager: 30, krav_event_id: 'krav-1' })
    );
    expect(config).toMatchObject({
      krevdDager: 30,
      erSvarPaForesporsel: false,
      harInnsigelseMotVarsel: false,
      harTidligereVarselITide: false,
    });
    expect(beregnVisibility({ fristVarselOk: undefined }, config)).toEqual({
      showFristVarselOk: true,
      showSpesifisertKravOk: true,
      showForesporselSvarOk: false,
    });
    const tilstand = { ...getDefaults({ krevdDager: 30, isUpdateMode: false }) };
    Object.assign(tilstand, { fristVarselOk: true, spesifisertKravOk: true, vilkarOppfylt: true });
    const svar = buildEventData({ ...tilstand, godkjentDager: 30 }, config, beregnet, 'krav-1', '');
    expect(svar.frist_varsel_ok).toBe(true);
    expect(svar.spesifisert_krav_ok).toBe(true);
    expect(svar.foresporsel_svar_ok).toBeUndefined();
  });

  it('oppdatert svar på kravet som besvarte forespørselen sender bare § 33.6.2', () => {
    const sak = fristFraApi({
      varsel_type: 'spesifisert',
      krevd_dager: 30,
      krav_event_id: 'krav-2',
      bh_respondert_versjon: 1,
      frist_varsel_ok: true,
      har_bh_foresporsel: true,
      kravet_besvarer_foresporselen: true,
      foresporsel_svar_ok: true,
      vilkar_oppfylt: true,
      godkjent_dager: 10,
    });
    const config = deriveFristDomainConfig(sak);
    expect(config.harTidligereVarselITide).toBe(true);
    expect(config.erSvarPaForesporsel).toBe(true);

    // Forrige svar kom fra API-et med null i felt BH ikke besvarte.
    const tilstand = getDefaults({
      krevdDager: 30,
      isUpdateMode: true,
      lastResponseEvent: { godkjent_dager: 10 },
      fristTilstand: {
        frist_varsel_ok: null,
        spesifisert_krav_ok: false,
        foresporsel_svar_ok: true,
        vilkar_oppfylt: true,
      } as unknown as Parameters<typeof getDefaults>[0]['fristTilstand'],
    });
    expect(tilstand.fristVarselOk).toBe(true);
    const svar = buildEventData(tilstand, config, beregnet, 'krav-2', '');
    expect(svar.frist_varsel_ok).toBeUndefined();
    expect(svar.spesifisert_krav_ok).toBeUndefined();
    expect(svar.foresporsel_svar_ok).toBe(true);
  });

  it('et foreløpig varsel uten dager gir 0 krevde dager', () => {
    const config = deriveFristDomainConfig(fristFraApi({ varsel_type: 'varsel' }));
    expect(config.krevdDager).toBe(0);
    expect(beregnVisibility({ fristVarselOk: undefined }, config).showFristVarselOk).toBe(true);
  });
});

describe('deriveFristDomainConfig — § 32.2 (#186)', () => {
  it.each([
    ['EO', false],
    ['IRREG', true],
  ])(
    'hele fristen er subsidiær bare utenfor formell endringsordre (%s)',
    (underkategori, forventet) => {
      const sak: SakState = {
        ...scenario1_3AktiveSpor,
        grunnlag: {
          ...scenario1_3AktiveSpor.grunnlag,
          hovedkategori: 'ENDRING',
          underkategori,
          grunnlag_varslet_i_tide: false,
        },
      };
      expect(deriveFristDomainConfig(sak).erHelFristSubsidiaerPgaGrunnlag).toBe(forventet);
    }
  );
});
