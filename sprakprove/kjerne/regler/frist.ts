/** Byggherrens svar på krav om fristforlengelse, NS 8407 § 33. Port av `regler/frist.py`. */

import type { Fristresultat, Fristvarseltype, SubsidiaerUtloser } from '../typer.ts';
import { UgyldigVurdering } from './feil.ts';

export interface Fristkrav {
  krevd_dager: number;
  varsel_type: Fristvarseltype | null;
  er_svar_paa_foresporsel: boolean;
  har_innsigelse_mot_varsel: boolean;
  har_tidligere_varsel_i_tide: boolean;
  er_grunnlag_subsidiaert: boolean;
  er_hele_fristen_subsidiaer_pga_grunnlag: boolean;
}

/** Byggherrens vurderinger. En vurdering som ikke er gjort, er `null` eller utelatt (KA-U4). */
export interface Fristvurdering {
  frist_varsel_ok?: boolean | null;
  spesifisert_krav_ok?: boolean | null;
  foresporsel_svar_ok?: boolean | null;
  vilkar_oppfylt?: boolean | null;
  godkjent_dager?: unknown;
}

export interface Fristberegning {
  beregnings_resultat: Fristresultat;
  godkjent_dager: number;
  subsidiaer_triggers: SubsidiaerUtloser[];
  subsidiaer_resultat: Fristresultat | null;
  subsidiaer_godkjent_dager: number | null;
  er_prekludert: boolean;
  er_redusert: boolean;
  hele_fristen_subsidiaer: boolean;
}

const mangler = (v: unknown) => v === null || v === undefined;

export function beregnSynlighet(krav: Fristkrav) {
  if (krav.varsel_type === 'begrunnelse_utsatt') {
    return { frist_varsel_ok: false, spesifisert_krav_ok: false, foresporsel_svar_ok: false };
  }
  let fristVarselOk: boolean;
  if (krav.er_svar_paa_foresporsel) fristVarselOk = krav.har_innsigelse_mot_varsel;
  else if (krav.varsel_type === 'varsel') fristVarselOk = true;
  else if (krav.varsel_type === 'spesifisert') fristVarselOk = !krav.har_tidligere_varsel_i_tide;
  else fristVarselOk = false;
  return {
    frist_varsel_ok: fristVarselOk,
    spesifisert_krav_ok: krav.varsel_type === 'spesifisert' && !krav.er_svar_paa_foresporsel,
    foresporsel_svar_ok: krav.er_svar_paa_foresporsel,
  };
}

/** § 33.4 og § 33.6.2 tredje ledd. */
export function beregnPreklusjon(v: Fristvurdering, krav: Fristkrav): boolean {
  if (krav.er_svar_paa_foresporsel && v.foresporsel_svar_ok === false) return true;
  if (krav.varsel_type === 'varsel') return v.frist_varsel_ok === false;
  if (krav.varsel_type === 'spesifisert') {
    if (krav.har_tidligere_varsel_i_tide) return false;
    return v.frist_varsel_ok === false;
  }
  return false;
}

/** § 33.6.1, også ved siden av preklusjon etter § 33.4. Ved svar på forespørselen gjelder § 33.6.2 fjerde ledd. */
export function beregnReduksjon(v: Fristvurdering, krav: Fristkrav): boolean {
  if (krav.er_svar_paa_foresporsel) return false;
  return krav.varsel_type === 'spesifisert' && v.spesifisert_krav_ok === false;
}

function resultatAvDager(hindring: boolean, krevd: number, godkjent: number): Fristresultat {
  if (!hindring) return 'avslatt';
  if (krevd === 0) return 'godkjent';
  // Oppdragsgiver 04.10: 0 dager er «avslått», som 0 kr for vederlag.
  if (godkjent === 0) return 'avslatt';
  // B-13 (24.09): «godkjent» bare når hele kravet er godkjent.
  if (godkjent >= krevd) return 'godkjent';
  return 'delvis_godkjent';
}

const erHeltall = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v);

export function kontroller(v: Fristvurdering, krav: Fristkrav): void {
  const feil: Record<string, string> = {};
  const synlig = beregnSynlighet(krav);
  const sporsmal: [boolean, keyof Fristvurdering, string][] = [
    [synlig.frist_varsel_ok, 'frist_varsel_ok', '§ 33.4'],
    [synlig.spesifisert_krav_ok, 'spesifisert_krav_ok', '§ 33.6.1'],
    [synlig.foresporsel_svar_ok, 'foresporsel_svar_ok', '§ 33.6.2'],
    [true, 'vilkar_oppfylt', '§ 33.1'],
  ];
  for (const [gjelder, felt, hjemmel] of sporsmal) {
    if (gjelder && mangler(v[felt])) feil[felt] = `mangler (${hjemmel})`;
  }
  if (krav.er_svar_paa_foresporsel && v.spesifisert_krav_ok === false) {
    feil.spesifisert_krav_ok =
      '§ 33.6.1 kan ikke påberopes når TE har svart på forespørselen (§ 33.6.2 fjerde ledd)';
  }
  const dager = v.godkjent_dager;
  if (mangler(dager)) feil.godkjent_dager = 'mangler (§ 33.5)';
  else if (!erHeltall(dager)) feil.godkjent_dager = 'er ikke et helt antall dager';
  else if (dager < 0) feil.godkjent_dager = 'kan ikke være negativt';
  else if (dager > krav.krevd_dager) feil.godkjent_dager = 'er flere enn de krevde dagene';
  if (Object.keys(feil).length) throw new UgyldigVurdering(feil);
}

export function beregnFrist(krav: Fristkrav, v: Fristvurdering): Fristberegning {
  kontroller(v, krav);
  const prekludert = beregnPreklusjon(v, krav);
  const redusert = beregnReduksjon(v, krav);
  const hindring = v.vilkar_oppfylt === true;
  const dager = v.godkjent_dager as number;
  const prinsipalt = prekludert ? 'avslatt' : resultatAvDager(hindring, krav.krevd_dager, dager);
  // Dagene er et subsidiært standpunkt også når hindringen bestrides (vedtak 05.10, #211).
  const subsidiaert = resultatAvDager(true, krav.krevd_dager, dager);
  const visSubsidiaert = prekludert || !hindring;
  const kandidater: [boolean, SubsidiaerUtloser][] = [
    [krav.er_grunnlag_subsidiaert, 'grunnlag_avslatt'],
    [prekludert, 'preklusjon_varsel'],
    [redusert, 'reduksjon_spesifisert'],
    [!hindring, 'ingen_hindring'],
  ];
  return {
    beregnings_resultat: prinsipalt,
    godkjent_dager: prinsipalt === 'avslatt' ? 0 : dager,
    subsidiaer_triggers: kandidater.filter(([g]) => g).map(([, t]) => t),
    subsidiaer_resultat: visSubsidiaert ? subsidiaert : null,
    subsidiaer_godkjent_dager: visSubsidiaert && subsidiaert !== 'avslatt' ? dager : null,
    er_prekludert: prekludert,
    er_redusert: redusert,
    hele_fristen_subsidiaer:
      krav.er_grunnlag_subsidiaert || krav.er_hele_fristen_subsidiaer_pga_grunnlag,
  };
}
