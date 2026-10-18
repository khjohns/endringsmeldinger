/**
 * Verdiene reglene regner med, med kjernens koder (#335). Python-enumene og
 * `docs/domenetabell/kontrakt.json` har katalogens koder; oversettelsen står i
 * `koder.ts`.
 */

export const GRUNNLAGSRESULTATER = ['godkjent', 'avslaatt', 'paalegg_frafalt'] as const;
export type Grunnlagsresultat = (typeof GRUNNLAGSRESULTATER)[number];
export const VEDERLAGSRESULTATER = [
  'godkjent',
  'delvis_godkjent',
  'avslaatt',
  'tilbakeholdelse',
] as const;
export type Vederlagsresultat = (typeof VEDERLAGSRESULTATER)[number];
export const FRISTRESULTATER = ['godkjent', 'delvis_godkjent', 'avslaatt'] as const;
export type Fristresultat = (typeof FRISTRESULTATER)[number];
export const BELOEPSVURDERINGER = ['godkjent', 'delvis', 'avslaatt'] as const;
export type Beloepsvurdering = (typeof BELOEPSVURDERINGER)[number];
export type Vederlagsmetode = 'enhetspriser' | 'regningsarbeid' | 'tilbud';
export type Fristvarseltype = 'varsel' | 'spesifisert' | 'begrunnelse_utsatt';

export const SUBSIDIAERE_UTLOSERE = [
  'grunnlag_avslaatt',
  'grunnlag_prekludert_32_2',
  'forseringsrett_avslaatt',
  'preklusjon_hovedkrav',
  'preklusjon_rigg',
  'preklusjon_produktivitet',
  'reduksjon_ep_justering',
  'preklusjon_varsel',
  'reduksjon_spesifisert',
  'ingen_hindring',
  'metode_avslaatt',
] as const;
export type SubsidiaerUtloser = (typeof SUBSIDIAERE_UTLOSERE)[number];

/** Hovedkategoriene (§ 33.1 a–c, § 33.3) med underkategoriene, som kontraktens overskrifter. */
export const KATEGORIER = {
  endring: [
    'endringsordre',
    'irregulaer_endring',
    'valg_av_loesning',
    'svar_paa_varsel',
    'lovendring_gjenstand',
    'lovendring_prosess',
    'gebyrer_og_avgifter',
    'samordning',
  ],
  svikt: ['medvirkning', 'grunnforhold', 'kulturminner', 'prosjektering'],
  andre_forhold: [
    'nektet_kontraktsmedhjelper',
    'skade_fra_byggherren',
    'brukstakelse',
    'stans_ved_betalingsmislighold',
    'annet_forhold',
  ],
  force_majeure: [],
} as const satisfies Record<string, readonly string[]>;

export type Hovedkategori = keyof typeof KATEGORIER;
export type Underkategori = (typeof KATEGORIER)[Hovedkategori][number];
