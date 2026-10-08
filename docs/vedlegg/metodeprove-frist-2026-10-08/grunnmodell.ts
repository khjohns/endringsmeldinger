export type Vurdering = boolean | null;
export type Forlop = {
  foresporsel: 'ingen' | 'gyldig' | 'ugyldig' | 'uavklart';
  te_svar: 'ingen' | 'spesifisert' | 'begrunnelse';
  te_rettidig: Vurdering;
  bh_innsigelse_mot_sen_te: Vurdering;
  svarfrist_oversittet: Vurdering;
};
export type Virkninger = {
  svarplikt_33_7: boolean;
  avskjaering_33_6_1: Vurdering;
  begrensning_33_6_1: Vurdering;
  kravstap_33_6_2: Vurdering;
  videre_33_6_1: boolean;
  uavklart: string[];
};

export function rettidighetEtterPunkt5(
  rettidig: Vurdering,
  virksomInnsigelse: Vurdering
): Vurdering {
  if (rettidig === true || virksomInnsigelse === false) return true;
  if (rettidig === false && virksomInnsigelse === true) return false;
  return null;
}

export function kvalifiserForesporsel(vilkar: Vurdering[]): Forlop['foresporsel'] {
  if (vilkar.length !== 4) throw new Error('fire vilkår kreves');
  if (vilkar.includes(false)) return 'ugyldig';
  if (vilkar.includes(null)) return 'uavklart';
  return 'gyldig';
}

function virkninger(felt: Partial<Virkninger> = {}): Virkninger {
  return {
    svarplikt_33_7: false,
    avskjaering_33_6_1: false,
    begrensning_33_6_1: false,
    kravstap_33_6_2: false,
    videre_33_6_1: false,
    uavklart: [],
    ...felt,
  };
}

export function vurder(forlop: Forlop): Virkninger {
  if (forlop.te_svar === 'begrunnelse' && forlop.foresporsel === 'ingen') {
    throw new Error('begrunnelse etter bokstav b krever en forespørsel i prøven');
  }
  const svarplikt_33_7 = forlop.te_svar === 'spesifisert';
  if (forlop.foresporsel === 'uavklart')
    return virkninger({
      svarplikt_33_7,
      avskjaering_33_6_1: null,
      begrensning_33_6_1: null,
      kravstap_33_6_2: null,
      uavklart: ['forespørselens rettslige kvalifikasjon'],
    });
  if (forlop.foresporsel === 'ugyldig')
    return virkninger({
      svarplikt_33_7,
      avskjaering_33_6_1: null,
      begrensning_33_6_1: null,
      uavklart: ['andre virkninger av mangelfull forespørsel'],
    });
  if (forlop.te_svar === 'ingen')
    return virkninger({
      kravstap_33_6_2: forlop.foresporsel === 'gyldig' ? forlop.svarfrist_oversittet : false,
    });
  const rettidig = rettidighetEtterPunkt5(forlop.te_rettidig, forlop.bh_innsigelse_mot_sen_te);
  if (forlop.foresporsel === 'ingen')
    return virkninger({
      svarplikt_33_7: true,
      begrensning_33_6_1: rettidig === null ? null : !rettidig,
      uavklart: rettidig === null ? ['rettidigheten til spesifiseringen'] : [],
    });
  if (rettidig !== true)
    return virkninger({
      svarplikt_33_7,
      avskjaering_33_6_1: null,
      begrensning_33_6_1: null,
      kravstap_33_6_2: rettidig === null ? null : true,
      uavklart: ['samspill ved sent eller uavklart svar på forespørselen'],
    });
  if (forlop.te_svar === 'begrunnelse') return virkninger({ videre_33_6_1: true });
  return virkninger({ svarplikt_33_7: true, avskjaering_33_6_1: true });
}

export type BhPremisser = {
  grunn: 'sen_spesifisering' | 'omfang';
  spesifisert_krav_mottatt: boolean;
  innsigelse_mottatt: boolean;
  innsigelse_rettidig: Vurdering;
  te_innsigelse_mot_sen_bh: Vurdering;
  svarfrist_oversittet: Vurdering;
};

export function vurderBhInnsigelse(p: BhPremisser): string {
  if (!p.spesifisert_krav_mottatt) return 'spesifisert krav ikke mottatt';
  if (!p.innsigelse_mottatt)
    return p.svarfrist_oversittet === null
      ? 'uavklart'
      : p.svarfrist_oversittet
        ? p.grunn === 'sen_spesifisering'
          ? 'tapt etter punkt 5'
          : 'tapt etter 33.7'
        : 'avventer';
  const rettidig =
    p.grunn === 'sen_spesifisering'
      ? p.innsigelse_rettidig
      : rettidighetEtterPunkt5(p.innsigelse_rettidig, p.te_innsigelse_mot_sen_bh);
  return rettidig === null
    ? 'uavklart'
    : rettidig
      ? 'ikke tapt på dette grunnlaget'
      : p.grunn === 'sen_spesifisering'
        ? 'tapt etter punkt 5'
        : 'tapt etter 33.7';
}
