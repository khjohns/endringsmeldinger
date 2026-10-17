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
import { hentKjernesak, sendKommando, type Kjernesak } from '$lib/api/kjerne';
import { utledJournal } from '$kjerne/kommandoer/skriving';
import { handlinger } from '$kjerne/kommandoer/handlinger';
import { visning } from '$kjerne/utledning/visning';
import { KJERNE, type Kjerne } from '$kjerne/versjon';
import type { Part } from '$kjerne/typer';

export interface Kjernesakvalg {
  sakId: string;
  /** Prosjektet fra ruta. Uten det brukes det aktive prosjektet. */
  prosjektId?: string;
  /**
   * Siden brevteksten forhåndsvises for, før saken er lastet eller i prøvene. Uten
   * den brukes leserens side fra serveren (#705). Uten side tilbys ingen handling.
   */
  part?: Part | null;
  hent?: typeof hentKjernesak;
  send?: typeof sendKommando;
  kjerne?: Kjerne;
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

  /** Sender kommandoen med den låste teksten. `true` når serveren lagret den. */
  async function sendMedBrev(kommando: Record<string, unknown>): Promise<boolean> {
    if (!sak || sender) return false;
    sender = true;
    feil = null;
    try {
      const tekst = brevtekst(kommando);
      await send(sakId, sak.versjon, tekst ? { ...kommando, brevtekst: tekst } : kommando);
      await last();
      if (feil) feil = `Kommandoen er lagret, men saken kunne ikke lastes på nytt. ${feil}`;
      return true;
    } catch (e) {
      const melding = meldingFra(e, 'Kommandoen ble ikke sendt.');
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
    last,
    brevtekst,
    send: sendMedBrev,
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
