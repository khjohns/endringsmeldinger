/** Byggherrens svar på krav om fristforlengelse, NS 8407 § 33. Port av `regler/frist.py`. */

import { mangler, type Fristresultat, type Fristvarseltype } from './typer.ts';
import { UgyldigVurdering } from './feil.ts';

export interface Fristkrav {
  krevd_dager: number;
  varsel_type: Fristvarseltype | null;
  er_svar_paa_foresporsel: boolean;
  /**
   * § 33.6.2 femte ledd: TE har begrunnet etter annet ledd b før kravet, så § 33.6.1 gjelder.
   * Svaret gjør gjeldende at begrunnelsen kom for sent, gjentar påberopelsen eller gir den opp
   * (VS-U88 punkt 8 og 9).
   */
  har_begrunnelse_etter_b?: boolean;
  har_innsigelse_mot_varsel: boolean;
  har_tidligere_varsel_i_tide: boolean;
}

/** Byggherrens vurderinger. En vurdering som ikke er gjort, er `null` eller utelatt (KA-U4). */
export interface Fristvurdering {
  frist_varsel_ok?: boolean | null;
  spesifisert_krav_ok?: boolean | null;
  foresporsel_svar_ok?: boolean | null;
  vilkar_oppfylt?: boolean | null;
  godkjent_dager?: unknown;
}

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
    // VS-U88 punkt 8 og 9: etter begrunnelsen tar svaret stilling til om den kom for sent.
    foresporsel_svar_ok: krav.er_svar_paa_foresporsel || krav.har_begrunnelse_etter_b === true,
  };
}

export function resultatAvDager(hindring: boolean, krevd: number, godkjent: number): Fristresultat {
  if (!hindring) return 'avslaatt';
  if (krevd === 0) return 'godkjent';
  // Oppdragsgiver 04.10: 0 dager er «avslått», som 0 kr for vederlag.
  if (godkjent === 0) return 'avslaatt';
  // B-13 (24.09): «godkjent» bare når hele kravet er godkjent.
  if (godkjent >= krevd) return 'godkjent';
  return 'delvis_godkjent';
}

const erHeltall = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v);

/** Et spørsmål om hele kravet byggherren tar stilling til i svaret. */
export type Fristspoersmaal =
  | 'frist_varsel_ok'
  | 'spesifisert_krav_ok'
  | 'foresporsel_svar_ok'
  | 'vilkar_oppfylt';

/**
 * Spørsmålene om hele kravet regelen krever svar på (`beregnSynlighet`, og hindringen etter
 * § 33.1 alltid), med bestemmelsen. Dagene for hver frist kreves i tillegg (`kontroller`).
 */
export function paakrevdeSpoersmaal(krav: Fristkrav): [Fristspoersmaal, string][] {
  const synlig = beregnSynlighet(krav);
  const spoersmaal: [boolean, Fristspoersmaal, string][] = [
    [synlig.frist_varsel_ok, 'frist_varsel_ok', 'punkt 33.4'],
    [synlig.spesifisert_krav_ok, 'spesifisert_krav_ok', 'punkt 33.6.1'],
    [synlig.foresporsel_svar_ok, 'foresporsel_svar_ok', 'punkt 33.6.2'],
    [true, 'vilkar_oppfylt', 'punkt 33.1'],
  ];
  return spoersmaal.filter(([gjelder]) => gjelder).map(([, felt, hjemmel]) => [felt, hjemmel]);
}

export function kontroller(v: Fristvurdering, krav: Fristkrav): void {
  const feil: Record<string, string> = {};
  for (const [felt, hjemmel] of paakrevdeSpoersmaal(krav)) {
    if (mangler(v[felt])) feil[felt] = `mangler (${hjemmel})`;
  }
  // Et svar som ikke er ja eller nei, gir ikke et standpunkt, så det avvises (#2242).
  const spoersmaalene: Fristspoersmaal[] = [
    'frist_varsel_ok',
    'spesifisert_krav_ok',
    'foresporsel_svar_ok',
    'vilkar_oppfylt',
  ];
  for (const felt of spoersmaalene)
    if (!mangler(v[felt]) && typeof v[felt] !== 'boolean')
      feil[felt] = 'er verken true eller false';
  // VS-U88 punkt 8 og 9: standpunktet etter § 33.6.2 gjelder svaret eller begrunnelsen.
  if (
    !krav.er_svar_paa_foresporsel &&
    !krav.har_begrunnelse_etter_b &&
    !mangler(v.foresporsel_svar_ok)
  )
    feil.foresporsel_svar_ok =
      'kravet svarer ikke på en forespørsel etter punkt 33.6.2, og totalentreprenøren har ikke begrunnet etter annet ledd b';
  // KA-U78 siste setning: laget etter punkt 33.6.1 finnes ikke, så ethvert svar avvises.
  if (krav.er_svar_paa_foresporsel && !mangler(v.spesifisert_krav_ok)) {
    feil.spesifisert_krav_ok =
      'kravet svarer på forespørselen, så byggherren tar ikke stilling til spesifiseringen etter punkt 33.6.1 (punkt 33.6.2 fjerde ledd)';
  }
  const dager = v.godkjent_dager;
  if (mangler(dager)) feil.godkjent_dager = 'mangler (punkt 33.5)';
  else if (!erHeltall(dager)) feil.godkjent_dager = 'er ikke et helt antall dager';
  else if (dager < 0) feil.godkjent_dager = 'kan ikke være negativt';
  else if (dager > krav.krevd_dager) feil.godkjent_dager = 'er flere enn de krevde dagene';
  if (Object.keys(feil).length) throw new UgyldigVurdering(feil);
}
