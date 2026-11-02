/**
 * Skjemaet for ny sak i Varden (BF-05, #1481): forholdene TE kan påberope, kommandoene
 * skjemaet bygger av kjernens typer, og grensen det sender gjennom. Saken, korrespondansen
 * og den første påberopelsen lagres i én handling (KT-U11), så skjemaet sender begge
 * kommandoene samlet. Demoruta fyller grensen i minnet, og saksruta med kommandoen fra #1487.
 */

import { KRAV_STRUKTUR_NS8407, type Kontraktsforhold } from '$lib/constants/categories';
import { getKontraktsregel, type Kontraktsregel } from '$lib/constants/kontraktsregler';
import { kravMotNySak, type Brev } from '$lib/kjernesak/brevtekst';
import { oppgittDato, type OppgittDato } from '$kjerne/format/format';
import { kategoriFraKatalogen, UNDERKATEGORI_FRA_KATALOGEN } from '$kjerne/format/koder';
import type { Kjerne } from '$kjerne/versjon';
import type { Part } from '$kjerne/typer';

/** Opprettelsen og påberopelsen, med brevteksten kjernen laget i brevkontrollen. */
export interface NySak {
  /** ID-en saken får. Brevteksten har saksnummeret (LV-U4), så den er bestemt før sendingen. */
  sakId: string;
  opprettelse: { type: 'opprett_sak'; sakstittel: string };
  paaberopelse: Paaberopelse;
  tekst: string[];
}

export type Paaberopelse = {
  type: 'krav';
  spor: 'forhold';
  innhold: Record<string, unknown>;
  utdypning?: string;
};

/**
 * Grensen skjemaet sender gjennom, som `send?` i `lagKjernesak`. Den gir saken som ble
 * opprettet, eller kaster med meldingen som vises i sendepanelet. Ingen sak finnes etter
 * en avvisning (KT-U11).
 */
export type SendNySak = (nySak: NySak) => Promise<{ sakId: string }>;

/** Katalogens forhold med bare dem kjernen har en kode for. Force majeure har ingen (#367). */
export const FORHOLDENE: Kontraktsforhold[] = KRAV_STRUKTUR_NS8407.map((g) => ({
  ...g,
  hjemler: g.hjemler.filter((h) => Object.hasOwn(UNDERKATEGORI_FRA_KATALOGEN, h.kode)),
})).filter((g) => g.hjemler.length);

export interface Forholdsvalg {
  gruppe: string;
  kode: string;
}

/** Forholdene der feltene heter «pålegget» (F-5, VS-U26): punkt 32.1, 14.6, 24.2.2 og offentlig myndighet. */
const PAALEGG = (kode: string) =>
  ['IRREG', 'VALGRETT', 'SVAR_VARSEL'].includes(kode) || kode.startsWith('LOV_');

export interface Feltene {
  dato: OppgittDato | null;
  beskrivelse: string;
  datotekst: string | null;
  /** Spørsmålet om varselet som alt er sendt, gjelder bare der punkt 32.2 gjelder (F-5). */
  punkt322: boolean;
  endringsordre: boolean;
}

/** Ledetekstene og feltene som følger forholdet (F-5, VS-U26, GR-U16). */
export function feltene(valg: Forholdsvalg, kjerne: Kjerne): Feltene {
  const { hovedkategori, underkategori } = kategoriFraKatalogen({
    hovedkategori: valg.gruppe,
    underkategori: valg.kode,
  });
  const dato = oppgittDato(hovedkategori, underkategori);
  const paalegg = PAALEGG(valg.kode);
  return {
    dato,
    beskrivelse: paalegg ? 'Beskrivelse av pålegget' : 'Beskrivelse av forholdet',
    datotekst:
      dato === null
        ? null
        : paalegg
          ? 'Dato du mottok pålegget'
          : 'Dato du ble klar over forholdet',
    punkt322: kjerne.regler.gjelderVarslingsplikten(hovedkategori, underkategori),
    endringsordre: underkategori === 'endringsordre',
  };
}

/** Forholdets navn uten katalogens merknad i parentes: «Irregulær endring» (OV-U77, D-1). */
export const forholdsnavn = (label: string) => label.replace(/\s*\([^)]*\)\s*$/, '');

export function forholdet(valg: Forholdsvalg) {
  const gruppe = FORHOLDENE.find((g) => g.kode === valg.gruppe)!;
  const hjemmel = gruppe.hjemler.find((h) => h.kode === valg.kode)!;
  return {
    gruppe,
    hjemmel,
    regel: getKontraktsregel(hjemmel.hjemmel_basis) as Kontraktsregel | null,
  };
}

export interface Utfylling {
  forhold: Forholdsvalg;
  tittel: string;
  beskrivelse: string;
  dato: string;
  endringsordre: string;
}

/** Kommandoene for utfyllingen. Tittelen er sakstittelen (avgjørelse 2 i #666, G-3). */
export function kommandoene(u: Utfylling, kjerne: Kjerne) {
  const kategori = kategoriFraKatalogen({
    hovedkategori: u.forhold.gruppe,
    underkategori: u.forhold.kode,
  });
  const f = feltene(u.forhold, kjerne);
  const utdypning = u.beskrivelse.trim();
  const opprettelse = { type: 'opprett_sak' as const, sakstittel: u.tittel.trim() };
  const paaberopelse: Paaberopelse = {
    type: 'krav',
    spor: 'forhold',
    innhold: {
      hovedkategori: kategori.hovedkategori,
      underkategori: kategori.underkategori,
      ...(f.dato && u.dato ? { [f.dato]: u.dato } : {}),
      ...(f.endringsordre && u.endringsordre.trim()
        ? { endringsordre: u.endringsordre.trim() }
        : {}),
    },
    ...(utdypning ? { utdypning } : {}),
  };
  return { opprettelse, paaberopelse };
}

/**
 * Brevet kjernen lager for påberopelsen mot en ny sak, prøvd med `sendes` (#1271, GR-U15).
 * Påberopelsen binder ingen vedlegg ennå (#1037), så oppslaget er tomt.
 */
export function brevet(u: Utfylling, sakId: string, kjerne: Kjerne): Brev {
  const { opprettelse, paaberopelse } = kommandoene(u, kjerne);
  return kravMotNySak(opprettelse, paaberopelse, 'TE', kjerne, new Map(), sakId);
}

/**
 * Det brevkontrollen trenger av saken: `Kjernesakkontekst` for en sak som finnes, og
 * skjemaets sending for en ny sak, der saken først finnes etter sendingen (KT-U11).
 */
export interface Brevsending {
  readonly part: Part | null;
  readonly versjon: number | null;
  readonly saksbilde: { tittel: string | null } | null;
  readonly sender: boolean;
  readonly feil: string | null;
  send(kommando: Record<string, unknown>, tekst?: string[]): Promise<boolean>;
  fjernFeil(): void;
}
