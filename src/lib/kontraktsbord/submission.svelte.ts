import { orderTimeline } from '$lib/utils/timelineOrder';
import { LetterCancelled } from '$lib/approval/claimReview.svelte';
import type { TimelineEvent, SporType } from '$lib/types/timeline';
import { onMount } from 'svelte';
import {
  hentUtkast,
  lagreUtkast,
  slettUtkast,
  UtkastKonflikt,
  type ServerUtkast,
} from '$lib/api/utkast';

/** Resolve claims explicitly: a track's siste_event_id may point to a BH response. */
export function submissionRefs(timeline: TimelineEvent[], spor: SporType) {
  timeline = orderTimeline(timeline);
  const claimTypes =
    spor === 'grunnlag'
      ? ['grunnlag_opprettet', 'grunnlag_oppdatert']
      : [`${spor}_krav_sendt`, `${spor}_krav_oppdatert`, `${spor}_krav_spesifisert`];
  const matches = (event: TimelineEvent, names: string[]) =>
    names.some((name) => event.type === name || event.type.endsWith(`.${name}`));
  const claimIndex = timeline.findLastIndex(
    (event) =>
      matches(event, claimTypes) &&
      !(
        spor === 'vederlag' &&
        event.data &&
        'varsel_type' in event.data &&
        event.data.varsel_type === 'varsel'
      )
  );
  const responseIndex = timeline.findLastIndex((event) =>
    matches(event, [`respons_${spor}`, `respons_${spor}_oppdatert`])
  );
  const response =
    responseIndex > claimIndex
      ? {
          ...timeline[responseIndex],
          // Response revisions can be partial; restore all fields of this claim's response.
          data: Object.assign(
            {},
            ...timeline
              .slice(claimIndex + 1, responseIndex + 1)
              .filter((event) => matches(event, [`respons_${spor}`, `respons_${spor}_oppdatert`]))
              .map((event) => event.data)
          ),
        }
      : undefined;
  return {
    claimId: claimIndex >= 0 ? timeline[claimIndex].id : undefined,
    responseId: responseIndex > claimIndex ? timeline[responseIndex].id : undefined,
    response,
  };
}

export function requireEventId(id: string | undefined): string {
  if (!id) throw new Error('Fant ikke innsendt krav i sakshistorikken. Last saken på nytt.');
  return id;
}

/** Keep failed submissions open, and ignore repeated clicks while saving. */
export function createSubmission(onSuccess?: () => void) {
  let pending = $state(false);
  let error = $state<string | null>(null);
  return {
    get pending() {
      return pending;
    },
    get error() {
      return error;
    },
    async run(action: () => void | Promise<void>, complete: () => void = () => {}) {
      if (pending) return;
      pending = true;
      error = null;
      try {
        await action();
        onSuccess?.();
        complete();
      } catch (cause) {
        if (cause instanceof LetterCancelled) return;
        error = cause instanceof Error ? cause.message : 'Kunne ikke sende. Prøv igjen.';
      } finally {
        pending = false;
      }
    },
  };
}

/** Hvor lenge vi venter etter siste tastetrykk før utkastet skrives. */
const LAGRE_FORSINKELSE_MS = 1200;

export interface UtkastIdentitet {
  sakId: string;
  spor: SporType;
  /** Revisjonen utkastet hører til. En innsending fryser sin egen revisjon. */
  revisjon: number;
}

export type UtkastStatus = 'uendret' | 'lagrer' | 'lagret' | 'frakoblet' | 'konflikt';

/**
 * Felles arbeidsutkast for et saksskjema.
 *
 * Utkastet ligger på serveren og deles av organisasjonen: alle i samme
 * Catenda-team arbeider i samme tekst. Det erstatter lokal nettleserlagring,
 * som ikke hadde noen bekreftet eier — en ny bruker i samme nettleser kunne få
 * forrige brukers kravtekst.
 *
 * Samtidige skrivinger flettes ikke. To som skriver i samme avsnitt får en
 * konflikt, ikke en sammenslått tekst, og brukeren velger hvilken som gjelder.
 * «Siste skriving vinner» ville tapt kollegaens tekst stille, og det er ikke
 * et akseptabelt utfall for tekst som går inn i et kontraktsbrev.
 */
export function createFormDraft<T extends Record<string, unknown>>(
  enabled: boolean,
  identitet: UtkastIdentitet,
  read: () => T,
  restore: (data: T) => void,
  initial?: Record<string, unknown>
) {
  let ready = $state(!enabled);
  let status = $state<UtkastStatus>('uendret');
  let konflikt = $state<ServerUtkast<T> | null>(null);
  let sistEndretAv = $state<string | null>(null);
  let cleared = $state(false);
  let lagringPagar = false;
  let nesteLagring: T | null = null;

  // Versjonen vi sist så fra serveren. null betyr «utkastet finnes ikke».
  let sistVersjon: number | null = null;
  // Teksten som svarer til den versjonen, slik at et uendret skjema ikke
  // skriver seg selv tilbake og bumper versjonen for ingenting.
  let sistLagretJson: string | null = null;

  const { sakId, spor, revisjon } = identitet;

  function overtaServerens(utkast: ServerUtkast<T>) {
    sistVersjon = utkast.versjon;
    sistLagretJson = JSON.stringify(utkast.innhold);
    sistEndretAv = utkast.oppdatert_av;
  }

  async function lagre(data: T) {
    if (cleared || konflikt) return;
    if (lagringPagar) {
      nesteLagring = data;
      return;
    }
    if (!lagringPagar && JSON.stringify(data) === sistLagretJson) return;
    lagringPagar = true;
    status = 'lagrer';
    try {
      const lagret = await lagreUtkast<T>(sakId, spor, revisjon, data, sistVersjon);
      if (cleared) return;
      overtaServerens(lagret);
      // Skrivingen kan ha skjedd mens brukeren skrev videre; da er teksten
      // vår nyere enn den vi nettopp sendte.
      sistLagretJson = JSON.stringify(data);
      konflikt = null;
      status = 'lagret';
    } catch (feil) {
      if (cleared) return;
      if (feil instanceof UtkastKonflikt) {
        konflikt = feil.gjeldende as ServerUtkast<T> | null;
        status = 'konflikt';
        return;
      }
      // Nettverksfeil skal ikke stjele teksten brukeren har skrevet. Den blir
      // stående i skjemaet, og neste endring forsøker på nytt.
      status = 'frakoblet';
    } finally {
      lagringPagar = false;
      const neste = nesteLagring;
      nesteLagring = null;
      if (cleared) {
        // DELETE må komme etter vår siste PUT, ellers kan PUT gjenopprette utkastet.
        void slettUtkast(sakId, spor, revisjon).catch(() => {});
      } else if (neste && status === 'lagret') {
        // Bare siste ventende tekst trengs, med versjonen vi nettopp fikk bekreftet.
        void lagre(neste);
      }
    }
  }

  onMount(() => {
    if (initial) {
      restore(initial as T);
      ready = true;
      return;
    }
    if (!enabled) return;
    sistLagretJson = JSON.stringify(read());
    let avbrutt = false;
    void (async () => {
      try {
        const lagret = await hentUtkast<T>(sakId, spor, revisjon);
        if (avbrutt) return;
        if (lagret) {
          restore(lagret.innhold);
          overtaServerens(lagret);
        }
      } catch {
        // Uten kontakt med serveren skal skjemaet fortsatt kunne brukes.
        if (!avbrutt) status = 'frakoblet';
      }
      if (!avbrutt) ready = true;
    })();
    return () => {
      avbrutt = true;
    };
  });

  $effect(() => {
    // read() kalles her for at effekten skal spore feltene i skjemaet.
    const data = JSON.parse(JSON.stringify(read())) as T;
    if (!enabled || !ready || cleared) return;
    if (!lagringPagar && JSON.stringify(data) === sistLagretJson) return;
    // Konflikten må avklares av brukeren før vi skriver igjen; ellers ville
    // neste tastetrykk overskrevet kollegaens tekst uten at noen valgte det.
    if (konflikt) return;
    const timer = setTimeout(() => void lagre(data), LAGRE_FORSINKELSE_MS);
    return () => clearTimeout(timer);
  });

  return {
    get ready() {
      return ready;
    },
    get status() {
      return status;
    },
    /** Serverens tekst når en kollega har skrevet siden vi leste. */
    get konflikt() {
      return konflikt;
    },
    get sistEndretAv() {
      return sistEndretAv;
    },
    /** Behold min tekst: skriv over kollegaens versjon, bevisst valgt. */
    behold() {
      if (!konflikt) return;
      sistVersjon = konflikt.versjon;
      konflikt = null;
      void lagre(read());
    },
    /** Hent inn deres: forkast min tekst til fordel for den lagrede. */
    hentInn() {
      if (!konflikt) return;
      const deres = konflikt;
      restore(deres.innhold);
      overtaServerens(deres);
      konflikt = null;
      status = 'lagret';
    },
    snapshot() {
      return JSON.parse(JSON.stringify(read())) as Record<string, unknown>;
    },
    clear() {
      if (cleared) return;
      cleared = true;
      nesteLagring = null;
      konflikt = null;
      status = 'uendret';
      if (enabled && !lagringPagar) void slettUtkast(sakId, spor, revisjon).catch(() => {});
    },
  };
}
