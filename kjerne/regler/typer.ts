/**
 * Verdiene reglene regner med. De er de samme som i `docs/domenetabell/kontrakt.json`
 * og Python-enumene skjemaet viser til (`x-python`); kontrakttesten i språkprøven
 * holder dem like.
 */

export const GRUNNLAGSRESULTATER = ['godkjent', 'avslatt', 'frafalt'] as const;
export type Grunnlagsresultat = (typeof GRUNNLAGSRESULTATER)[number];
export const VEDERLAGSRESULTATER = [
  'godkjent',
  'delvis_godkjent',
  'avslatt',
  'hold_tilbake',
] as const;
export type Vederlagsresultat = (typeof VEDERLAGSRESULTATER)[number];
export const FRISTRESULTATER = ['godkjent', 'delvis_godkjent', 'avslatt'] as const;
export type Fristresultat = (typeof FRISTRESULTATER)[number];
export const BELOPSVURDERINGER = ['godkjent', 'delvis', 'avslatt'] as const;
export type Belopsvurdering = (typeof BELOPSVURDERINGER)[number];
export type Vederlagsmetode = 'ENHETSPRISER' | 'REGNINGSARBEID' | 'FASTPRIS_TILBUD';
export type Fristvarseltype = 'varsel' | 'spesifisert' | 'begrunnelse_utsatt';

export const SUBSIDIAERE_UTLOSERE = [
  'grunnlag_avslatt',
  'grunnlag_prekludert_32_2',
  'forseringsrett_avslatt',
  'preklusjon_hovedkrav',
  'preklusjon_rigg',
  'preklusjon_produktivitet',
  'reduksjon_ep_justering',
  'preklusjon_varsel',
  'reduksjon_spesifisert',
  'ingen_hindring',
  'metode_avslatt',
] as const;
export type SubsidiaerUtloser = (typeof SUBSIDIAERE_UTLOSERE)[number];
