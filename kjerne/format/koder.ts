/**
 * Kodene i formatet for kategoriene i påberopelsen, og oversettelsen fra
 * katalogen i frontenden (`KRAV_STRUKTUR_NS8407`), som beholder de gamle kodene
 * (arbeidsvalget 10.10 i #335, HF-U2). Kjernen bruker bare sine egne koder.
 * Klienten oversetter på grensen med tabellene her.
 */

import { foersteUnderkategori } from '../regler/forhold.ts';
import { KATEGORIER, type Hovedkategori, type Underkategori } from '../regler/typer.ts';

/** Kategoriene står i regelsettet, så reglene kan types mot dem (#516). */
export { KATEGORIER, type Hovedkategori, type Underkategori };

export const HOVEDKATEGORIER = Object.keys(KATEGORIER) as Hovedkategori[];
export const UNDERKATEGORIER = Object.values(KATEGORIER).flat() as Underkategori[];

export const HOVEDKATEGORI_FRA_KATALOGEN: Record<string, Hovedkategori> = {
  ENDRING: 'endring',
  SVIKT: 'svikt',
  ANDRE: 'andre_forhold',
  FORCE_MAJEURE: 'force_majeure',
};

export const UNDERKATEGORI_FRA_KATALOGEN: Record<string, Underkategori> = {
  EO: 'endringsordre',
  IRREG: 'irregulaer_endring',
  VALGRETT: 'valg_av_loesning',
  SVAR_VARSEL: 'svar_paa_varsel',
  LOV_GJENSTAND: 'lovendring_gjenstand',
  LOV_PROSESS: 'lovendring_prosess',
  GEBYR: 'gebyrer_og_avgifter',
  SAMORD: 'samordning',
  MEDVIRK: 'medvirkning',
  GRUNN: 'grunnforhold',
  KULTURMINNER: 'kulturminner',
  PROSJ_RISIKO: 'prosjektering',
  NEKT_MH: 'nektet_kontraktsmedhjelper',
  SKADE_BH: 'skade_fra_byggherren',
  BRUKSTAKELSE: 'brukstakelse',
  STANS_BET: 'stans_ved_betalingsmislighold',
  ANDRE_ANDRE: 'annet_forhold',
};

/**
 * Kjernens kode for katalogens kode etter `tabell`. En verdi som ikke er en
 * katalogkode, gis tilbake uendret, så formatet avviser den.
 */
export function fraKatalogen(tabell: Record<string, string>, kode: unknown): unknown {
  return typeof kode === 'string' && Object.hasOwn(tabell, kode) ? tabell[kode] : kode;
}

/** Kjernens koder for kategorien i katalogen. Av en liste underkategorier gjelder den første, som i kjernen. */
export function kategoriFraKatalogen(kategori: {
  hovedkategori?: unknown;
  underkategori?: unknown;
}): { hovedkategori: string | null; underkategori: string | null } {
  const kode = (tabell: Record<string, string>, v: unknown) =>
    typeof v === 'string' ? (fraKatalogen(tabell, v) as string) : null;
  return {
    hovedkategori: kode(HOVEDKATEGORI_FRA_KATALOGEN, kategori.hovedkategori),
    underkategori: kode(
      UNDERKATEGORI_FRA_KATALOGEN,
      foersteUnderkategori(kategori.underkategori as string | string[] | null | undefined)
    ),
  };
}

/** Katalogens kode for kjernens kode etter `tabell`, motsatt vei av `fraKatalogen`. */
export function tilKatalogen(tabell: Record<string, string>, kode: unknown): unknown {
  const funnet = Object.entries(tabell).find(([, ny]) => ny === kode);
  return funnet ? funnet[0] : kode;
}
