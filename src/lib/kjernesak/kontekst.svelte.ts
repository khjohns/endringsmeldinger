/**
 * Sakskonteksten for en TS-sak (#313, #663). Journalen hentes fra TS-serveren, og
 * versjonen, visningen og handlingene regnes lokalt av kjernen fra den, ikke av
 * visningen i svaret. Serveren vurderer kommandoen på nytt og avgjør.
 */

import { getContext, setContext } from 'svelte';
import { ApiError } from '$lib/api/client';
import { brevFor, type Brev } from './brevtekst';
import { somJournal } from './journal';
import { lagSaksbilde } from './saksbilde';
import { sendForsoek, usikkertUtfall } from './forsoek';
import {
  hentKjernesak,
  lastOppKjernevedlegg,
  nyKommandoId,
  sendKommando,
  type Kjernesak,
} from '$lib/api/kjerne';
import { utledJournal, type Vedleggsoppslag } from '$kjerne/kommandoer/skriving';
import { handlinger } from '$kjerne/kommandoer/handlinger';
import { visning } from '$kjerne/utledning/visning';
import { KJERNE, type Kjerne } from '$kjerne/versjon';
import type { Part } from '$kjerne/typer';

/**
 * En kommando som fikk et usikkert utfall. Den kan være lagret, så et nytt forsøk
 * sender den uendret, med samme ID og versjon, og får kvitteringen hvis den er det (#418).
 */
export interface Ventende {
  kommandoId: string;
  versjon: number;
  kommando: Record<string, unknown>;
}

const USIKKERT = usikkertUtfall('brevet ble lagret', 'det lagres ikke to ganger');

export interface Kjernesakvalg {
  sakId: string;
  /** Prosjektet fra ruta, for lesingen og kommandoene (#743). */
  prosjektId: string;
  /**
   * Siden brevteksten forhåndsvises for, før saken er lastet eller i prøvene. Uten
   * den brukes leserens side fra serveren (#705). Uten side tilbys ingen handling.
   */
  part?: Part | null;
  hent?: typeof hentKjernesak;
  send?: typeof sendKommando;
  kjerne?: Kjerne;
  /** Kommandoen med usikkert utfall fra et tidligere forsøk, som i utkastet for opprettelsen. */
  ventende?: Ventende | null;
}

const meldingFra = (e: unknown, reserve: string | null) =>
  e instanceof ApiError ? e.message : reserve;

/** Meldingen til brukeren, med årsaken fra serveren eller lastingen etter når den finnes. */
const melding = (hva: string, aarsak: string | null) => (aarsak ? `${hva} ${aarsak}` : hva);

/** Kjernen kastet i stedet for å lage brevet eller avvise kommandoen (#695 p3, #865). */
export type Programfeil = { programfeil: string };

export const PROGRAMFEIL =
  'Appen kunne ikke lage brevet på grunn av en feil i appen. Kravet er ikke avvist, men det kan ikke sendes nå.';

/** Årsaken til at brevet ikke kan sendes, før noe er prøvd; `null` når det kan sendes. */
export function brevaarsak(brev: Brev | Programfeil | null): string | null {
  if (!brev || 'tekst' in brev) return null;
  return 'programfeil' in brev
    ? brev.programfeil
    : melding('Brevet kan ikke sendes.', brev.avvisning.melding);
}

/** Det som hindrer at brevet sendes, eller `null` når det har en tekst eller ikke lager en. */
export function brevhindring(brev: Brev | Programfeil): string | null {
  if ('programfeil' in brev) return brev.programfeil;
  if ('avvisning' in brev) return melding('Brevet ble ikke sendt.', brev.avvisning.melding);
  return null;
}

export function lagKjernesak(valg: Kjernesakvalg) {
  const { sakId } = valg;
  const hent = valg.hent ?? hentKjernesak;
  const send = valg.send ?? sendKommando;
  const kjerne = valg.kjerne ?? KJERNE;

  let sak = $state<Kjernesak | null>(null);
  let feil = $state<string | null>(null);
  let sender = $state(false);
  let finnes = $state<boolean | null>(null);
  let ventende = $state<Ventende | null>(valg.ventende ?? null);
  // Årsaken til at saken som vises, er utdatert. Den står til saken er lastet på nytt.
  let utdatertAarsak = $state<string | null>(null);
  const part = $derived(valg.part !== undefined ? valg.part : (sak?.part ?? null));

  const journal = $derived(sak ? somJournal(sakId, sak.journal) : []);
  const utledning = $derived(sak ? utledJournal(journal, kjerne) : null);
  const vist = $derived(utledning ? visning(utledning, kjerne.regler) : null);
  const tilbudt = $derived(utledning && part ? handlinger(utledning, part) : []);
  const bilde = $derived(
    sak && utledning && vist ? lagSaksbilde(journal, sak.leveringsoppdrag, utledning, vist) : null
  );

  let lastinger = 0;
  let gjeldende: Promise<boolean> = Promise.resolve(false);

  /**
   * Laster saken. `true` når den er lastet. Bare det siste kallet skriver saken, så et
   * eldre svar som kommer sist, overskriver ikke et nyere; et eldre kall gir utfallet
   * til det siste (#695).
   */
  function last(): Promise<boolean> {
    const nr = ++lastinger;
    gjeldende = hentOgSkriv(nr);
    return gjeldende;
  }

  async function hentOgSkriv(nr: number): Promise<boolean> {
    try {
      const hentet = await hent(sakId, valg.prosjektId);
      if (nr !== lastinger) return gjeldende;
      sak = hentet;
      finnes = true;
      utdatertAarsak = null;
      // Et usikkert utfall står til «Prøv igjen» har fått svar (#816).
      feil = ventende ? USIKKERT : null;
      return true;
    } catch (e) {
      if (nr !== lastinger) return gjeldende;
      // Serveren svarer 404 for en sak TS-kjernen ikke har skrevet (#705). En sak som
      // alt er lastet, finnes, så en senere 404 er en lastefeil (#719).
      if (e instanceof ApiError && e.status === 404 && finnes !== true) {
        finnes = false;
        sak = null;
      }
      feil = meldingFra(e, 'Saken kunne ikke hentes.');
      return false;
    }
  }

  /**
   * Brevet for kommandoen mot saken slik den er lastet: den låste teksten eller
   * avvisningen. En programfeil i kjernen blir en melding, så visningen ikke velter.
   * `null` før saken er lastet og uten side.
   */
  function brev(
    kommando: Record<string, unknown>,
    vedlegg?: Vedleggsoppslag
  ): Brev | Programfeil | null {
    if (!sak || !part) return null;
    try {
      return brevFor(kommando, sakId, part, journal, kjerne, vedlegg);
    } catch (e) {
      console.error(e);
      return { programfeil: PROGRAMFEIL };
    }
  }

  /**
   * Sender kommandoen med den låste teksten. `true` når serveren lagret den; `utdatert`
   * sier om saken ikke kunne lastes på nytt etterpå. Med `sett` sendes teksten
   * avsenderen har kontrollert, og serveren avviser den hvis saken nå gir en annen
   * (LV-U2). Uten `sett` sendes ingenting kjernen avviser (#695). Er det samme
   * kommandoen mot samme versjon som en ventende, er det samme brukerhandling, og den
   * sendes med samme ID. `vedlegg` er vedleggene et registrert brev viser til, som
   * kjernen trenger for å godta det uten tekst (MM-U17).
   */
  async function sendMedBrev(
    kommando: Record<string, unknown>,
    sett?: string[],
    vedlegg?: Vedleggsoppslag
  ): Promise<boolean> {
    if (sender) {
      feil = 'Et brev sendes allerede. Vent til det er ferdig.';
      return false;
    }
    if (!sak) {
      feil = 'Saken er ikke lastet. Last den på nytt og prøv igjen.';
      return false;
    }
    let tekst = sett ?? null;
    if (!sett) {
      if (!part) {
        feil = 'Du har ingen kontraktsside i saken og kan ikke sende brev i den.';
        return false;
      }
      const vurdert = brev(kommando, vedlegg)!;
      if (!('tekst' in vurdert)) {
        feil = brevhindring(vurdert);
        return false;
      }
      tekst = vurdert.tekst;
    }
    const innhold = tekst ? { ...kommando, brevtekst: tekst } : kommando;
    const igjen =
      ventende?.versjon === sak.versjon &&
      JSON.stringify(ventende.kommando) === JSON.stringify(innhold);
    return sendBrev(
      igjen && ventende
        ? ventende
        : { kommandoId: nyKommandoId(), versjon: sak.versjon, kommando: innhold }
    );
  }

  /** Sender den ventende kommandoen uendret, med samme ID. `false` uten ventende kommando. */
  async function provIgjen(): Promise<boolean> {
    return ventende && !sender ? sendBrev(ventende) : false;
  }

  async function sendBrev(forsoek: Ventende): Promise<boolean> {
    sender = true;
    feil = null;
    try {
      const utfall = await sendForsoek(forsoek, (f) =>
        send(sakId, f.versjon, f.kommandoId, f.kommando, valg.prosjektId)
      );
      if (utfall.lagret) {
        ventende = null;
        if (!(await last())) {
          utdatertAarsak = melding('Brevet er lagret, men saken kunne ikke lastes på nytt.', feil);
          feil = utdatertAarsak;
        }
        return true;
      }
      ventende = utfall.ventende;
      const e = utfall.feil;
      const hva = ventende ? USIKKERT : 'Brevet ble ikke sendt.';
      const aarsak = ventende ? null : meldingFra(e, null);
      // Saken er endret siden den ble lastet. Den lastes på nytt, og meldingen skal stå etterpå.
      const lastet = e instanceof ApiError && e.status === 409 ? await last() : true;
      feil = melding(melding(hva, aarsak), lastet ? null : feil);
      return false;
    } finally {
      sender = false;
    }
  }

  /**
   * Fjerner feilen når brukeren avbryter (#719). Meldingen om et usikkert utfall står til
   * «Prøv igjen» har fått svar, for kommandoen kan være lagret. Ellers står årsaken til at
   * saken er utdatert.
   */
  function fjernFeil() {
    feil = ventende ? USIKKERT : utdatertAarsak;
  }

  return {
    sakId,
    get part() {
      return part;
    },
    get sak() {
      return sak;
    },
    get versjon() {
      return utledning?.versjon ?? null;
    },
    get journal() {
      return journal;
    },
    get utledning() {
      return utledning;
    },
    get visning() {
      return vist;
    },
    get handlinger() {
      return tilbudt;
    },
    /** Regelversjonen brevet forhåndsvises med, som aksepten bærer (KA-U10). */
    get regelversjon() {
      return kjerne.regler.versjon;
    },
    get saksbilde() {
      return bilde;
    },
    /**
     * `false` når saken ikke er en TS-sak i prosjektet: serveren svarte 404. `null`
     * før svaret, og når serveren svarte med en annen feil.
     */
    get finnes() {
      return finnes;
    },
    get feil() {
      return feil;
    },
    get sender() {
      return sender;
    },
    /** Kommandoen med usikkert utfall, som «Prøv igjen» sender på nytt, eller `null`. */
    get ventende() {
      return ventende;
    },
    /** Brevet er lagret, men saken er ikke lastet på nytt; den som vises, er utdatert. */
    get utdatert() {
      return utdatertAarsak !== null;
    },
    last,
    brev,
    send: sendMedBrev,
    /** Laster opp filen til mellomlageret i saken, i prosjektet fra ruta (#743). */
    lastOppVedlegg: (fil: File) => lastOppKjernevedlegg(sakId, fil, valg.prosjektId),
    provIgjen,
    fjernFeil,
  };
}

export type Kjernesakkontekst = ReturnType<typeof lagKjernesak>;

const NOEKKEL = Symbol('kjernesak');

export const settKjernesak = (kontekst: Kjernesakkontekst) => setContext(NOEKKEL, kontekst);

export function hentKjernesakkontekst(): Kjernesakkontekst {
  const kontekst = getContext<Kjernesakkontekst | undefined>(NOEKKEL);
  if (!kontekst) throw new Error('Sakskonteksten for TS-saken er ikke satt.');
  return kontekst;
}
