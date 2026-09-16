import { orderTimeline } from '$lib/utils/timelineOrder';
import { LetterCancelled } from '$lib/approval/claimReview.svelte';
import type { TimelineEvent, SporType } from '$lib/types/timeline';
import { onDestroy, onMount } from 'svelte';
import { getActiveProjectId } from '$lib/api/client';
import { draftOwner } from '$lib/utils/draftOwner';
import { createDraftRecovery } from '$lib/utils/draftRecovery';
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

/** JSON-feltrekkefølge kan endres i transporten uten at teksten er endret. */
function innholdJson(data: unknown): string {
  return JSON.stringify(data, (_key, value: unknown) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return value;
    const objekt = value as Record<string, unknown>;
    return Object.fromEntries(
      Object.keys(objekt)
        .sort()
        .map((key) => [key, objekt[key]])
    );
  });
}

export interface UtkastIdentitet {
  sakId: string;
  spor: SporType;
  /** Revisjonen utkastet hører til. En innsending fryser sin egen revisjon. */
  revisjon: number;
}

export type UtkastStatus =
  | 'uendret'
  | 'lagrer'
  | 'lagret'
  | 'frakoblet'
  | 'konflikt'
  | 'gjenopprettet'
  | 'sesjon_endret';

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
  let konfliktAktiv = $state(false);
  let sistEndretAv = $state<string | null>(null);
  let cleared = $state(false);
  let lagringPagar = false;
  let nesteLagring: T | null = null;
  let avbrutt = false;
  let sesjonEndret = false;
  const prosjektId = getActiveProjectId();
  const eier = draftOwner();
  let buffer: ReturnType<typeof createDraftRecovery<T>> | null = null;

  // Versjonen vi sist så fra serveren. null betyr «utkastet finnes ikke».
  let sistVersjon: number | null = null;
  // Teksten som svarer til den versjonen, slik at et uendret skjema ikke
  // skriver seg selv tilbake og bumper versjonen for ingenting.
  let sistLagretJson: string | null = null;

  const { sakId, spor, revisjon } = identitet;

  function bevarLokalt(data: T) {
    if (innholdJson(data) === sistLagretJson && !lagringPagar && !konfliktAktiv) {
      buffer?.clear();
    } else {
      buffer?.save({ innhold: data, forventetVersjon: sistVersjon, grunnlagJson: sistLagretJson });
    }
  }

  onDestroy(() => {
    if (enabled && ready && !cleared) bevarLokalt(read());
    avbrutt = true;
    nesteLagring = null;
  });

  function overtaServerens(utkast: ServerUtkast<T>) {
    sistVersjon = utkast.versjon;
    sistLagretJson = innholdJson(utkast.innhold);
    sistEndretAv = utkast.oppdatert_av;
  }

  async function lagre(data: T) {
    if (cleared || avbrutt || sesjonEndret || draftOwner() !== eier || konfliktAktiv) return;
    if (lagringPagar) {
      nesteLagring = data;
      return;
    }
    if (innholdJson(data) === sistLagretJson) {
      status = 'lagret';
      bevarLokalt(read());
      return;
    }
    lagringPagar = true;
    status = 'lagrer';
    try {
      const lagret = await lagreUtkast<T>(sakId, spor, revisjon, data, sistVersjon, prosjektId);
      if (cleared || avbrutt) return;
      overtaServerens(lagret);
      // Skrivingen kan ha skjedd mens brukeren skrev videre; da er teksten
      // vår nyere enn den vi nettopp sendte.
      sistLagretJson = innholdJson(data);
      konflikt = null;
      konfliktAktiv = false;
      status = 'lagret';
    } catch (feil) {
      if (cleared || avbrutt) return;
      if (feil instanceof UtkastKonflikt) {
        konflikt = feil.gjeldende as ServerUtkast<T> | null;
        konfliktAktiv = true;
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
      if (cleared && !sesjonEndret && draftOwner() === eier) {
        // DELETE må komme etter vår siste PUT, ellers kan PUT gjenopprette utkastet.
        void slettUtkast(sakId, spor, revisjon, prosjektId).catch(() => {});
      } else if (!avbrutt && neste && status === 'lagret') {
        // Bare siste ventende tekst trengs, med versjonen vi nettopp fikk bekreftet.
        void lagre(neste);
      }
      if (!cleared && !avbrutt) bevarLokalt(read());
    }
  }

  onMount(() => {
    if (initial) {
      restore(initial as T);
      ready = true;
      return;
    }
    if (!enabled) return;
    sistLagretJson = innholdJson(read());
    void (async () => {
      try {
        const {
          utkast: lagret,
          team_id: team,
          user_id: bruker,
        } = await hentUtkast<T>(sakId, spor, revisjon, prosjektId);
        if (avbrutt || draftOwner() !== eier) return;
        if (eier && bruker !== eier) {
          sesjonEndret = true;
          status = 'sesjon_endret';
          ready = true;
          return;
        }
        buffer = createDraftRecovery<T>(eier, [prosjektId, team, sakId, spor, revisjon]);
        const lokal = buffer.load();
        if (lagret) {
          restore(lagret.innhold);
          overtaServerens(lagret);
        }
        if (lokal && innholdJson(lokal.innhold) !== sistLagretJson) {
          restore(lokal.innhold);
          if (lokal.forventetVersjon !== sistVersjon || lokal.grunnlagJson !== sistLagretJson) {
            konflikt = lagret;
            konfliktAktiv = true;
            status = 'konflikt';
            // Behold konfliktens opprinnelige grunnlag også ved en ny omlasting.
            sistVersjon = lokal.forventetVersjon;
            sistLagretJson = lokal.grunnlagJson;
          } else {
            status = 'gjenopprettet';
          }
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
    const data = JSON.parse(innholdJson(read())) as T;
    if (!enabled || !ready || cleared) return;
    bevarLokalt(data);
    if (!lagringPagar && innholdJson(data) === sistLagretJson) return;
    // Konflikten må avklares av brukeren før vi skriver igjen; ellers ville
    // neste tastetrykk overskrevet kollegaens tekst uten at noen valgte det.
    if (konfliktAktiv) return;
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
      if (!konfliktAktiv) return;
      sistVersjon = konflikt?.versjon ?? null;
      sistLagretJson = konflikt ? innholdJson(konflikt.innhold) : null;
      konflikt = null;
      konfliktAktiv = false;
      void lagre(read());
    },
    /** Hent inn deres: forkast min tekst til fordel for den lagrede. */
    hentInn() {
      if (!konflikt) return;
      const deres = konflikt;
      restore(deres.innhold);
      overtaServerens(deres);
      konflikt = null;
      konfliktAktiv = false;
      status = 'lagret';
    },
    snapshot() {
      return JSON.parse(innholdJson(read())) as Record<string, unknown>;
    },
    clear() {
      if (cleared) return;
      cleared = true;
      buffer?.clear();
      nesteLagring = null;
      konflikt = null;
      konfliktAktiv = false;
      status = 'uendret';
      if (enabled && !lagringPagar && !sesjonEndret && draftOwner() === eier)
        void slettUtkast(sakId, spor, revisjon, prosjektId).catch(() => {});
    },
  };
}
