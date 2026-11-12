/**
 * Skjemaet for ny sak i Varden (BF-05, #1481): forholdene TE kan påberope, kommandoene
 * skjemaet bygger av kjernens typer, og grensen det sender gjennom. Saken, korrespondansen
 * og den første påberopelsen lagres i én handling (KT-U11), så skjemaet sender begge
 * kommandoene samlet. Demoruta fyller grensen i minnet, og saksruta med kommandoen fra #1487.
 */

import { KRAV_STRUKTUR_NS8407 } from '$lib/constants/categories';
import { getKontraktsregel, type Kontraktsregel } from '$lib/constants/kontraktsregler';
import { kravMotNySak, type Brev, type Saksmerking } from '$lib/kjernesak/brevtekst';
import { PROGRAMFEIL, type Programfeil } from '$lib/kjernesak/kontekst.svelte';
import { oppgittDato, type OppgittDato } from '$kjerne/spor/forhold/format';
import {
  kategoriFraKatalogen,
  tilKatalogen,
  UNDERKATEGORI_FRA_KATALOGEN,
} from '$kjerne/format/koder';
import { FORHOLDSGRUPPER } from './tekster';
import type { Kjerne } from '$kjerne/versjon';
import type { Part, Vedlegg } from '$kjerne/typer';

/** Opprettelsen og påberopelsen, med brevteksten kjernen laget i brevkontrollen. */
export interface NySak {
  /** ID-en saken får. Brevteksten har saksnummeret (LV-U4), så den er bestemt før sendingen. */
  sakId: string;
  opprettelse: { type: 'opprett_sak'; sakstittel: string };
  paaberopelse: Paaberopelse;
  tekst: string[];
  /** Skjemaet slik det var sendt, så et nytt forsøk etter ny innlasting sender det samme (#1526). */
  utkast: Utfylling;
}

export type Paaberopelse = {
  type: 'krav';
  spor: 'forhold';
  innhold: Record<string, unknown>;
  utdypning?: string;
  /** Vedleggene lastet opp før saken finnes (#1037). */
  dokumentasjon?: string[];
};

/** Vedlegget i mellomlageret, med størrelsen, som `Kjernevedlegg` i `$lib/api/kjerne`. */
export type Kjernevedlegg = Vedlegg & { stoerrelse: number };

/**
 * Grensen for vedleggene før saken finnes (#1037): `lastOppVedleggForNySak` og
 * `slettVedleggForNySak` i saksruta, og minnet i demoruta.
 */
export interface VedleggForNySak {
  lastOpp(fil: File): Promise<Kjernevedlegg>;
  slett(vedleggId: string): Promise<unknown>;
}

/** Filene serveren tar imot (`STOERSTE_VEDLEGG` i `server/vedlegg.ts`). */
export const STOERSTE_VEDLEGG = 15 * 1024 * 1024;

/**
 * Grensen skjemaet sender gjennom, som `send?` i `lagKjernesak`. Den gir saken som ble
 * opprettet, eller kaster med meldingen som vises i sendepanelet. Ingen sak finnes etter
 * en avvisning (KT-U11).
 */
export type SendNySak = (nySak: NySak) => Promise<{ sakId: string }>;

/** Ett forhold i velgeren, med katalogens koder kjernen oversetter (`kategoriFraKatalogen`). */
export interface Forholdet {
  gruppe: string;
  kode: string;
  navn: string;
  punkt: string;
  beskrivelse: string;
}

/** Forholdene i gruppene fra skissen (OV-U77, OV-U78), med katalogens henvisning og beskrivelse. */
export const FORHOLDENE: { navn: string; forhold: Forholdet[] }[] = FORHOLDSGRUPPER.map((g) => ({
  navn: g.navn,
  forhold: g.forhold.map(([kjernekode, navn]) => {
    const kode = tilKatalogen(UNDERKATEGORI_FRA_KATALOGEN, kjernekode) as string;
    const gruppe = KRAV_STRUKTUR_NS8407.find((k) => k.hjemler.some((h) => h.kode === kode))!;
    const hjemmel = gruppe.hjemler.find((h) => h.kode === kode)!;
    return {
      gruppe: gruppe.kode,
      kode,
      navn,
      punkt: hjemmel.hjemmel_basis,
      beskrivelse: hjemmel.beskrivelse,
    };
  }),
}));

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

/**
 * Feltene før forholdet er valgt: ledetekstene for et pålegg, som i skissen versjon 3. De
 * følger forholdet når det er valgt, og spørsmålet om varsel som alt er sendt, vises først
 * når punkt 32.2 gjelder for forholdet (F-5, akseptkriterium 1 i #1481).
 */
export const FELTENE_UTEN_FORHOLD: Feltene = {
  dato: null,
  beskrivelse: 'Beskrivelse av pålegget',
  datotekst: 'Dato du mottok pålegget',
  punkt322: false,
  endringsordre: false,
};

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

export function forholdet(valg: Forholdsvalg) {
  const forhold = FORHOLDENE.flatMap((g) => g.forhold).find((f) => f.kode === valg.kode)!;
  return { ...forhold, regel: getKontraktsregel(forhold.punkt) as Kontraktsregel | null };
}

export interface Utfylling {
  forhold: Forholdsvalg;
  tittel: string;
  beskrivelse: string;
  dato: string;
  endringsordre: string;
  vedlegg: Kjernevedlegg[];
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
    ...(u.vedlegg.length ? { dokumentasjon: u.vedlegg.map((v) => v.vedlegg_id) } : {}),
  };
  return { opprettelse, paaberopelse };
}

/**
 * Brevet kjernen lager for påberopelsen mot en ny sak, prøvd med `sendes` (#1271, GR-U15).
 * Kjernen slår opp vedleggene påberopelsen binder, som serveren gjør (#1037). En programfeil i
 * kjernen blir `PROGRAMFEIL`, som i `brev` i `lagKjernesak`, så skjemaet ikke velter (#898).
 */
export function brevet(
  u: Utfylling,
  sakId: string,
  merking: Saksmerking,
  kjerne: Kjerne
): Brev | Programfeil {
  try {
    const { opprettelse, paaberopelse } = kommandoene(u, kjerne);
    // Oppslaget har bare feltene brevet binder (`Vedlegg` i kjernen), ikke størrelsen.
    const vedlegg = new Map(
      u.vedlegg.map(({ vedlegg_id, filnavn, innhold_sha256 }) => [
        vedlegg_id,
        { vedlegg_id, filnavn, innhold_sha256 },
      ])
    );
    return kravMotNySak(opprettelse, paaberopelse, 'TE', merking, kjerne, vedlegg, sakId);
  } catch (e) {
    console.error(e);
    return { programfeil: PROGRAMFEIL };
  }
}

/**
 * Det brevkontrollen trenger av saken: `Kjernesakkontekst` for en sak som finnes, og
 * skjemaets sending for en ny sak, der saken først finnes etter sendingen (KT-U11).
 */
export interface Brevsending {
  readonly part: Part | null;
  readonly saksbilde: { tittel: string | null } | null;
  readonly sender: boolean;
  readonly feil: string | null;
  send(kommando: Record<string, unknown>, tekst?: string[]): Promise<boolean>;
  fjernFeil(): void;
}
