/**
 * Den offentlige tilstanden etter `tilstand` i `docs/domenetabell/kontrakt.json`.
 * Alle felt finnes alltid; `null` betyr at feltet ikke har verdi. Feltene med
 * `x-bruk: adapter` er med for at korpuset og dagens frontend skal kunne lese
 * dem; de er ikke en del av modellen.
 */

import {
  gjeldendeSvar,
  grunnlagetErLaast,
  grunnlagsvurdering,
  kanUtstedeEo,
  samletStatus,
  sporstatus,
  standpunktFor,
  teHarAkseptert,
  type Sak,
  type Sportilstand,
} from './sak.ts';

const ellerNull = <T>(v: T | undefined): T | null => (v === undefined ? null : v);

function svarfelt(spor: Sportilstand) {
  const gjeldende = gjeldendeSvar(spor);
  return {
    te_akseptert: teHarAkseptert(spor),
    krav_event_id: spor.krav?.eventId ?? null,
    gjeldende_respons_event_id: gjeldende?.eventId ?? null,
  };
}

function krevdBelop(data: Record<string, unknown>): number | null {
  const belop = data.metode === 'REGNINGSARBEID' ? data.kostnads_overslag : data.belop_direkte;
  return typeof belop === 'number' ? belop : null;
}

export function offentligTilstand(sak: Sak) {
  const g = sak.grunnlag;
  const gSvar = gjeldendeSvar(g);
  const v = sak.vederlag;
  const vData = v.svar?.data ?? {};
  const f = sak.frist;
  const fData = f.svar?.data ?? {};
  const subsidiaertGodkjent = (navn: 'vederlag' | 'frist') => {
    const resultat = sak[navn].svar?.data.beregnings_resultat;
    return (
      standpunktFor(sak, navn).subsidiaert &&
      (resultat === 'godkjent' || resultat === 'delvis_godkjent')
    );
  };
  return {
    sak_id: sak.sakId,
    overordnet_status: samletStatus(sak),
    er_subsidiaert_vederlag: subsidiaertGodkjent('vederlag'),
    er_subsidiaert_frist: subsidiaertGodkjent('frist'),
    kan_utstede_eo: kanUtstedeEo(sak),
    grunnlag: {
      status: sporstatus(sak, 'grunnlag'),
      bh_resultat: ellerNull(gSvar?.data.resultat),
      ...svarfelt(g),
      respons_event_id: gSvar?.eventId ?? null,
      antall_versjoner: g.krav?.versjon ?? 0,
      laast: grunnlagetErLaast(sak),
      grunnlag_varslet_i_tide: grunnlagsvurdering(sak).varsletITide,
      underkategori: ellerNull(g.krav?.data.underkategori),
    },
    vederlag: {
      status: sporstatus(sak, 'vederlag'),
      krevd_belop: v.krav ? krevdBelop(v.krav.data) : null,
      godkjent_belop: ellerNull(vData.total_godkjent_belop),
      bh_resultat: ellerNull(vData.beregnings_resultat),
      antall_versjoner: v.krav?.versjon ?? 0,
      ...svarfelt(v),
      respons_event_id: v.svar?.eventId ?? null,
      bh_respondert_versjon: v.svar ? v.svar.kravversjon - 1 : null,
    },
    frist: {
      status: sporstatus(sak, 'frist'),
      krevd_dager: ellerNull(f.krav?.data.antall_dager),
      godkjent_dager: ellerNull(fData.godkjent_dager),
      bh_resultat: ellerNull(fData.beregnings_resultat),
      frist_varsel_ok: ellerNull(fData.frist_varsel_ok),
      spesifisert_krav_ok: ellerNull(fData.spesifisert_krav_ok),
      foresporsel_svar_ok: ellerNull(fData.foresporsel_svar_ok),
      vilkar_oppfylt: ellerNull(fData.vilkar_oppfylt),
      subsidiaer_resultat: ellerNull(fData.subsidiaer_resultat),
      subsidiaer_godkjent_dager: ellerNull(fData.subsidiaer_godkjent_dager),
      subsidiaer_triggers: ellerNull(fData.subsidiaer_triggers),
      ...svarfelt(f),
    },
  };
}

export type OffentligTilstand = ReturnType<typeof offentligTilstand>;
