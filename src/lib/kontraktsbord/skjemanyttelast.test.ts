/**
 * Nyttelasten skjemaene sender, som fixture for backendens rutetester (B-13, #63).
 *
 * `buildEventData` i `src/lib/domain/` bygger svarene av en sak med samme krav
 * som BR-01-testene. Backend sender dem gjennom `/api/events` og kontrollerer
 * at `sak` er lik tilstanden serveren faktisk leverer
 * (`backend/tests/test_services/test_serverens_utregning.py`). Endres
 * nyttelasten, oppdateres fila med `npx vitest run -u`.
 */
import { describe, expect, it } from 'vitest';
import type { SakState } from '$lib/types/timeline';
import { deriveFristDomainConfig, deriveVederlagDomainConfig } from '$lib/domain/deriveConfig';
import * as frist from '$lib/domain/fristDomain';
import * as vederlag from '$lib/domain/vederlagDomain';

const sak = {
  grunnlag: {
    hovedkategori: 'ENDRING',
    underkategori: 'EO',
    bh_resultat: 'godkjent',
    grunnlag_varslet_i_tide: null,
    bh_respondert_versjon: 0,
  },
  vederlag: {
    metode: 'FASTPRIS_TILBUD',
    belop_direkte: 500000,
    kostnads_overslag: null,
    krever_justert_ep: false,
    saerskilt_krav: null,
  },
  frist: {
    varsel_type: 'spesifisert',
    krevd_dager: 30,
    frist_varsel_ok: null,
    bh_respondert_versjon: null,
    kravet_besvarer_foresporselen: false,
  },
};
const sakState = sak as unknown as SakState;

function fristsvar(state: Partial<frist.FristFormState>) {
  const config = deriveFristDomainConfig(sakState);
  const form: frist.FristFormState = {
    fristVarselOk: undefined,
    spesifisertKravOk: undefined,
    foresporselSvarOk: undefined,
    vilkarOppfylt: undefined,
    godkjentDager: undefined,
    begrunnelse: 'Begrunnelse.',
    begrunnelseValidationError: undefined,
    ...state,
  };
  return frist.buildEventData(form, config, frist.beregnAlt(form, config), 'KRAV');
}

function vederlagssvar(state: Partial<vederlag.VederlagFormState>) {
  const config = deriveVederlagDomainConfig(sakState);
  const form: vederlag.VederlagFormState = {
    hovedkravVarsletITide: undefined,
    riggVarsletITide: undefined,
    produktivitetVarsletITide: undefined,
    akseptererMetode: true,
    holdTilbake: false,
    hovedkravVurdering: undefined,
    begrunnelse: 'Begrunnelse.',
    ...state,
  };
  const computed = vederlag.beregnAlt(form, config);
  return vederlag.buildEventData(
    form,
    config,
    computed,
    { vederlagKravId: 'KRAV', isUpdateMode: false },
    computed.subsidiaerTriggers
  ).data;
}

describe('nyttelasten skjemaene sender', () => {
  it('er lik fixturen backend sender gjennom ruta', async () => {
    const fixture = {
      sak,
      svar: {
        respons_frist_delvis: fristsvar({
          fristVarselOk: true,
          spesifisertKravOk: true,
          vilkarOppfylt: true,
          godkjentDager: 20,
        }),
        respons_frist_prekludert: fristsvar({
          fristVarselOk: false,
          spesifisertKravOk: true,
          vilkarOppfylt: true,
          godkjentDager: 20,
        }),
        respons_frist_uten_hindring: fristsvar({
          fristVarselOk: true,
          spesifisertKravOk: true,
          vilkarOppfylt: false,
          godkjentDager: 20,
        }),
        respons_vederlag_delvis: vederlagssvar({
          hovedkravVurdering: 'delvis',
          hovedkravGodkjentBelop: 123456.785,
        }),
      },
    };
    await expect(JSON.stringify(fixture, null, 2) + '\n').toMatchFileSnapshot(
      '../../../backend/tests/fixtures/skjemaenes_nyttelast.json'
    );
  });
});
