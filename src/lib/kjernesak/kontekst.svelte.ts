/**
 * Sakskonteksten for en TS-sak (#313, #663). Journalen hentes fra TS-serveren, og
 * versjonen, visningen og handlingene regnes lokalt av kjernen fra den, ikke av
 * visningen i svaret. Serveren vurderer kommandoen på nytt og avgjør.
 */

import { getContext, setContext } from 'svelte';
import { ApiError } from '$lib/api/client';
import { laastBrevtekst } from './brevtekst';
import { somJournal } from './journal';
import { lagSaksbilde } from './saksbilde';
import {
  erUsikkertUtfall,
  hentKjernesak,
  nyKommandoId,
  sendKommando,
  type Kjernesak,
} from '$lib/api/kjerne';
import { utledJournal } from '$kjerne/kommandoer/skriving';
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

const USIKKERT = 'Det er usikkert om kommandoen ble lagret. Prøv igjen: den lagres ikke to ganger.';

export interface Kjernesakvalg {
  sakId: string;
  /** Prosjektet fra ruta, for lesingen og kommandoene. Uten det brukes det aktive prosjektet. */
  prosjektId?: string;
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

const meldingFra = (e: unknown, reserve: string) => (e instanceof ApiError ? e.message : reserve);

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
  const part = $derived(valg.part !== undefined ? valg.part : (sak?.part ?? null));

  const journal = $derived(sak ? somJournal(sakId, sak.journal) : []);
  const utledning = $derived(sak ? utledJournal(journal, kjerne) : null);
  const vist = $derived(utledning ? visning(utledning, kjerne.regler) : null);
  const tilbudt = $derived(utledning && part ? handlinger(utledning, part) : []);
  const bilde = $derived(
    sak && utledning && vist ? lagSaksbilde(journal, sak.leveringsoppdrag, utledning, vist) : null
  );

  async function last() {
    try {
      sak = await hent(sakId, valg.prosjektId);
      finnes = true;
      feil = null;
    } catch (e) {
      // Serveren svarer 404 for en sak TS-kjernen ikke har skrevet (#705).
      if (e instanceof ApiError && e.status === 404) {
        finnes = false;
        sak = null;
      }
      feil = meldingFra(e, 'Saken kunne ikke hentes.');
    }
  }

  /** Den låste teksten for kommandoen mot saken slik den er lastet. Uten side er det ingen. */
  const brevtekst = (kommando: Record<string, unknown>): string[] | null =>
    sak && part ? laastBrevtekst(kommando, sakId, part, journal, kjerne) : null;

  /**
   * Sender kommandoen med den låste teksten. `true` når serveren lagret den. Med `sett`
   * sendes teksten avsenderen har kontrollert, og serveren avviser den hvis saken nå gir
   * en annen (LV-U2). Er det samme kommandoen mot samme versjon som en ventende, er det
   * samme brukerhandling, og den sendes med samme ID.
   */
  async function sendMedBrev(kommando: Record<string, unknown>, sett?: string[]): Promise<boolean> {
    if (!sak || sender) return false;
    const tekst = sett ?? brevtekst(kommando);
    const innhold = tekst ? { ...kommando, brevtekst: tekst } : kommando;
    const igjen =
      ventende?.versjon === sak.versjon &&
      JSON.stringify(ventende.kommando) === JSON.stringify(innhold);
    return sendForsoek(
      igjen && ventende
        ? ventende
        : { kommandoId: nyKommandoId(), versjon: sak.versjon, kommando: innhold }
    );
  }

  /** Sender den ventende kommandoen uendret, med samme ID. `false` uten ventende kommando. */
  async function provIgjen(): Promise<boolean> {
    return ventende && !sender ? sendForsoek(ventende) : false;
  }

  async function sendForsoek(forsoek: Ventende): Promise<boolean> {
    sender = true;
    feil = null;
    try {
      await send(sakId, forsoek.versjon, forsoek.kommandoId, forsoek.kommando, valg.prosjektId);
      ventende = null;
      await last();
      if (feil) feil = `Kommandoen er lagret, men saken kunne ikke lastes på nytt. ${feil}`;
      return true;
    } catch (e) {
      ventende = erUsikkertUtfall(e) ? forsoek : null;
      const melding = ventende ? USIKKERT : meldingFra(e, 'Kommandoen ble ikke sendt.');
      // Saken er endret siden den ble lastet. Den lastes på nytt, og meldingen skal stå etterpå.
      if (e instanceof ApiError && e.status === 409) await last();
      feil = feil ? `${melding} ${feil}` : melding;
      return false;
    } finally {
      sender = false;
    }
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
    last,
    brevtekst,
    send: sendMedBrev,
    provIgjen,
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
