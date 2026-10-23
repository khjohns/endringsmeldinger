/**
 * Avleder domain configs fra SakState.
 *
 * Ren TypeScript — ingen Svelte-avhengigheter.
 * Brukes av mockup-adapter og kan brukes av produksjonsruter.
 */
import type { SakState } from '$lib/types/timeline';
import type { VederlagDomainConfig } from './vederlagDomain';
import type { FristDomainConfig } from './fristDomain';
import {
  erPrekludertEtter32_2,
  forsteUnderkategori,
  type GrunnlagDomainConfig,
} from './grunnlagDomain';

/**
 * Avleder VederlagDomainConfig fra SakState.
 *
 * Plukker ut vederlag- og grunnlag-felt som trengs for
 * vederlag-domenets beregninger (bestemmelse, varslingsflagg, EP-justering).
 */
export function deriveVederlagDomainConfig(sak: SakState): VederlagDomainConfig {
  const v = sak.vederlag;
  const g = sak.grunnlag;
  const prekludert = erPrekludertEtter32_2({
    hovedkategori: g.hovedkategori,
    underkategori: g.underkategori,
    varsletITide: g.grunnlag_varslet_i_tide,
  });
  const hovedbelop = v.metode === 'REGNINGSARBEID' ? v.kostnads_overslag : v.belop_direkte;
  const harSaerskilt = !!v.saerskilt_krav?.rigg_drift || !!v.saerskilt_krav?.produktivitet;
  // OV-U23: med særskilte krav er `krevd_belop` summen, så uten eget hovedbeløp har kravet ingen
  // justering ellers.
  const harHovedkrav = hovedbelop != null || !harSaerskilt;
  return {
    metode: v.metode,
    harHovedkrav,
    hovedkravBelop: harHovedkrav ? (hovedbelop ?? v.krevd_belop ?? v.netto_belop ?? 0) : 0,
    riggBelop: v.saerskilt_krav?.rigg_drift?.belop,
    produktivitetBelop: v.saerskilt_krav?.produktivitet?.belop,
    harRiggKrav: !!v.saerskilt_krav?.rigg_drift,
    harProduktivitetKrav: !!v.saerskilt_krav?.produktivitet,
    kreverJustertEp: v.krever_justert_ep ?? false,
    kostnadsOverslag: v.kostnads_overslag,
    hovedkategori: g.hovedkategori as VederlagDomainConfig['hovedkategori'],
    underkategori: forsteUnderkategori(g.underkategori),
    grunnlagVarsletForSent: prekludert,
    grunnlagStatus: g.bh_resultat as VederlagDomainConfig['grunnlagStatus'],
  };
}

/**
 * Avleder FristDomainConfig fra SakState.
 *
 * Plukker ut frist- og grunnlag-felt som trengs for
 * frist-domenets beregninger (varseltype, subsidiær-flagg).
 */
export function deriveFristDomainConfig(sak: SakState): FristDomainConfig {
  const f = sak.frist;
  const g = sak.grunnlag;
  return {
    varselType: f.varsel_type,
    krevdDager: f.krevd_dager ?? 0,
    erSvarPaForesporsel: f.kravet_besvarer_foresporselen === true,
    harInnsigelseMotVarsel: f.frist_varsel_ok === false,
    // Bare et uttrykkelig tidligere BH-standpunkt kan gjøre § 33.4-vurderingen overflødig.
    // Et innsendt varsel uten svar er fortsatt ikke vurdert.
    harTidligereVarselITide:
      f.frist_varsel_ok === true ||
      (typeof f.bh_respondert_versjon === 'number' && f.frist_varsel_ok !== false),
    erGrunnlagSubsidiaer: g.bh_resultat === 'avslatt',
    erHelFristSubsidiaerPgaGrunnlag: erPrekludertEtter32_2({
      hovedkategori: g.hovedkategori,
      underkategori: g.underkategori,
      varsletITide: g.grunnlag_varslet_i_tide,
    }),
  };
}

/**
 * Avleder GrunnlagDomainConfig fra SakState.
 *
 * Plukker ut grunnlag-felt og subsidiær-status for
 * grunnlag-domenets beregninger (oppdateringsmodus, forrige resultat).
 */
export function deriveGrunnlagDomainConfig(sak: SakState): GrunnlagDomainConfig {
  const g = sak.grunnlag;
  return {
    grunnlagEvent: {
      hovedkategori: g.hovedkategori,
      underkategori: forsteUnderkategori(g.underkategori),
    },
    isUpdateMode: (g.bh_respondert_versjon ?? -1) >= 0,
    forrigeResultat: g.bh_resultat,
    harSubsidiaereSvar: sak.er_subsidiaert_vederlag || sak.er_subsidiaert_frist,
  };
}
