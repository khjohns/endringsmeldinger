/**
 * Brevkontrollen og sendingen for en TS-sak (#718, #909), med samme `submit` som
 * `createClaimReview`, så TE-skjemaene brukes i begge stier. Dataene fra skjemaet blir
 * kommandoen til kjernen, TE ser den låste teksten (LV-U2), og kommandoen sendes med
 * `kjernesak.send`. Trekket, aksepten og innsigelsen har ikke noe skjema og går
 * gjennom `trekk`, `aksept` og `innsigelse`. Et registrert varsel har ingen tekst fra
 * appen (MM-U17) og sendes uten brevkontroll. Vedleggene brevet viser til, står i
 * teksten, så kjernen får dem når brevet lages (OV-U5).
 */

import { createLetterConfirmation, LetterCancelled } from '$lib/approval/claimReview.svelte';
import type { VederlagSubmissionEventData } from '$lib/domain/vederlagSubmissionDomain';
import type { EventType, SporType } from '$lib/types/timeline';
import type { Vedleggsoppslag } from '$kjerne/kommandoer/skriving';
import type { Spor } from '$kjerne/typer';
import { brevhindring, type Kjernesakkontekst } from './kontekst.svelte';
import { fristkommandoFraSkjema, type Fristskjemadata } from './fristkrav';
import { grunnlagsversjonFraSkjema } from './grunnlagskrav';
import { vedleggsoppslag } from './skjemadata';
import { vederlagskravFraSkjema } from './vederlagskrav';

export interface Kjernebrev {
  tittel: string;
  tekst: string[];
  utdypning?: string;
  /** Det TE gjør med brevet, som overskrift i panelet ved siden av brevet (#943). Uten den: kravet. */
  handling?: string;
}

type Kommando = Record<string, unknown> & { utdypning?: string };

const SPORNAVN: Record<Spor, string> = {
  grunnlag: 'Grunnlag',
  vederlag: 'Vederlag',
  frist: 'Frist',
};

const HANDLING: Record<string, string> = {
  krav: 'Du sender kravet',
  send_varsel: 'Du sender varselet',
  trekk: 'Du trekker kravet',
  aksept: 'Du godtar svaret',
  innsigelse: 'Du gjør innsigelse',
};

function kommandoFraSkjema(
  kjernesak: Kjernesakkontekst,
  spor: SporType,
  type: EventType,
  data: object
): { kommando: Kommando; vedlegg?: Vedleggsoppslag } {
  if (spor === 'vederlag' && (type === 'vederlag_krav_sendt' || type === 'vederlag_krav_oppdatert'))
    return { kommando: vederlagskravFraSkjema(data as VederlagSubmissionEventData) };
  if (spor === 'frist' && type.startsWith('frist_krav_')) {
    const d = data as Fristskjemadata;
    return {
      kommando: fristkommandoFraSkjema(d),
      vedlegg: vedleggsoppslag((d.registrert ?? d.tidligereVarsel)?.vedlegg ?? []),
    };
  }
  if (spor === 'grunnlag' && type === 'grunnlag_oppdatert')
    return {
      kommando: grunnlagsversjonFraSkjema(
        kjernesak.utledning?.spor.grunnlag.gjeldendeKrav?.innhold,
        data
      ),
    };
  throw new Error('Dette skjemaet kan ikke sendes for denne saken ennå.');
}

export function lagKravkontroll(kjernesak: Kjernesakkontekst) {
  const kontroll = createLetterConfirmation<Kjernebrev>();
  let sender = $state(false);
  // En feil som ikke står i `kjernesak.feil`, som en avvisning før brevet vises (#943).
  let feil = $state<string | null>(null);

  /** Brevet kjernen lager for kommandoen, eller avvisningen som feil (#719). */
  function brev(kommando: Kommando, spor: Spor, vedlegg?: Vedleggsoppslag): Kjernebrev {
    const b = kjernesak.brev(kommando, vedlegg);
    // #719: uten låst tekst sendes ikke kommandoen, så TE ser aldri et brev uten teksten.
    const tekst = b && 'tekst' in b ? b.tekst : null;
    if (!tekst)
      throw new Error(
        (b && brevhindring(b)) ?? 'Appen kunne ikke lage brevet. Brevet er ikke sendt.'
      );
    return {
      tittel: `${SPORNAVN[spor]} – ${kjernesak.saksbilde?.tittel ?? 'Sak'}`,
      tekst,
      utdypning: kommando.utdypning,
      handling: HANDLING[kommando.type as string] ?? 'Du sender brevet',
    };
  }

  async function visOgSend(kommando: Kommando, vist: Kjernebrev) {
    await kontroll.show(vist);
    if (!(await kjernesak.send(kommando, vist.tekst)))
      throw new Error(kjernesak.feil ?? 'Brevet ble ikke sendt.');
  }

  /**
   * Et utsagn uten skjema. Avviser kjernen det, kastes meldingen før brevet vises.
   * Avbryter TE brevkontrollen, sendes ingenting. En annen feil enn den `kjernesak.feil`
   * viser, står i `feil`.
   */
  function utsagn(kommando: Kommando, spor: Spor): { send: () => Promise<void> } {
    feil = null;
    const vist = brev(kommando, spor);
    return {
      send: async () => {
        sender = true;
        try {
          await visOgSend(kommando, vist);
        } catch (e) {
          if (e instanceof LetterCancelled || kjernesak.feil) return;
          feil = e instanceof Error ? e.message : 'Brevet ble ikke sendt.';
        } finally {
          sender = false;
        }
      },
    };
  }

  /** Som `utsagn`, men avvisningen før brevet vises står også i `feil`. */
  function sendUtsagn(lag: () => { send: () => Promise<void> }): Promise<void> {
    try {
      return lag().send();
    } catch (e) {
      feil = e instanceof Error ? e.message : 'Brevet ble ikke sendt.';
      return Promise.resolve();
    }
  }

  return {
    get letter() {
      return kontroll.letter;
    },
    /** Fra kommandoen er levert fra skjemaet til sendingen er ferdig, også mens brevet kontrolleres. */
    get sender() {
      return sender;
    },
    get feil() {
      return feil;
    },
    fjernFeil: () => (feil = null),
    confirm: kontroll.confirm,
    cancel: kontroll.cancel,
    async submit(spor: SporType, type: EventType, data: object): Promise<void> {
      feil = null;
      sender = true;
      try {
        const { kommando, vedlegg } = kommandoFraSkjema(kjernesak, spor, type, data);
        // MM-U17: et registrert brev har ingen tekst fra appen, så det er ikke noe brev å kontrollere.
        if (kommando.type === 'varsel') {
          if (!(await kjernesak.send(kommando, undefined, vedlegg)))
            throw new Error(kjernesak.feil ?? 'Varselet ble ikke registrert.');
          return;
        }
        await visOgSend(kommando, brev(kommando, spor as Spor, vedlegg));
      } finally {
        sender = false;
      }
    },
    /** Trekket i sporet, uten fritekst (KA-U22). */
    trekk: (spor: Spor) => utsagn({ type: 'trekk', spor }, spor),
    /**
     * Aksepten av byggherrens svar `svar`, det gjeldende svaret knappen er vist for, med
     * regelversjonen brevet er forhåndsvist med (KA-U10). Ingen fritekst: kommandoen har ingen.
     */
    aksept: (spor: Spor, svar: string) =>
      sendUtsagn(() =>
        utsagn(
          {
            type: 'aksept',
            spor,
            svar,
            regelversjon: kjernesak.regelversjon,
          },
          spor
        )
      ),
    /**
     * TEs innsigelse etter § 5 tredje ledd mot byggherrens varsel, krav eller svar, uten
     * fritekst (VS-U1, VS-U9, VS-U14). Brevet vises med sporet elementet hører til.
     */
    innsigelse: (gjelder: string, spor: Spor) =>
      sendUtsagn(() => utsagn({ type: 'innsigelse', gjelder }, spor)),
  };
}

export type Kravkontroll = ReturnType<typeof lagKravkontroll>;
