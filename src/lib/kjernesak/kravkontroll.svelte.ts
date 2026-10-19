/**
 * Brevkontrollen og sendingen for en TS-sak (#718, #909), med samme `submit` som
 * `createClaimReview`, så TE-skjemaene brukes i begge stier. Dataene fra skjemaet blir
 * kommandoen til kjernen, TE ser den låste teksten (LV-U2), og kommandoen sendes med
 * `kjernesak.send`. Et trekk har ikke noe skjema og går gjennom `trekk`.
 */

import { createLetterConfirmation, LetterCancelled } from '$lib/approval/claimReview.svelte';
import { letterText } from '$lib/approval/letter';
import type { FristSubmissionEventData } from '$lib/domain/fristSubmissionDomain';
import type { VederlagSubmissionEventData } from '$lib/domain/vederlagSubmissionDomain';
import type { EventType, SporType } from '$lib/types/timeline';
import type { Spor } from '$kjerne/typer';
import { brevhindring, type Kjernesakkontekst } from './kontekst.svelte';
import { fristkommandoFraSkjema } from './fristkrav';
import { nyGrunnlagsversjon } from './grunnlagskrav';
import { vederlagskravFraSkjema } from './vederlagskrav';

export interface Kjernebrev {
  tittel: string;
  tekst: string[];
  utdypning?: string;
}

type Kommando = Record<string, unknown> & { utdypning?: string };

const SPORNAVN: Record<Spor, string> = {
  grunnlag: 'Grunnlag',
  vederlag: 'Vederlag',
  frist: 'Frist',
};

function kommandoFraSkjema(
  kjernesak: Kjernesakkontekst,
  spor: SporType,
  type: EventType,
  data: object
): Kommando {
  if (spor === 'vederlag' && (type === 'vederlag_krav_sendt' || type === 'vederlag_krav_oppdatert'))
    return vederlagskravFraSkjema(data as VederlagSubmissionEventData);
  if (spor === 'frist' && type.startsWith('frist_krav_'))
    return fristkommandoFraSkjema(data as FristSubmissionEventData);
  if (spor === 'grunnlag' && type === 'grunnlag_oppdatert') {
    const gjeldende = kjernesak.utledning?.spor.grunnlag.gjeldendeKrav;
    if (!gjeldende)
      throw new Error('Grunnlaget er ikke sendt. Det finnes ingen versjon å oppdatere.');
    const d = data as { begrunnelse?: string; vedlegg_ids?: string[] };
    if (d.vedlegg_ids?.length) throw new Error('Vedlegg kan ikke sendes i TS-stien ennå.');
    return nyGrunnlagsversjon(gjeldende.innhold, letterText(d.begrunnelse ?? ''));
  }
  throw new Error(`Brevet ${type} kan ikke sendes for denne saken ennå.`);
}

export function lagKravkontroll(kjernesak: Kjernesakkontekst) {
  const kontroll = createLetterConfirmation<Kjernebrev>();
  let sender = $state(false);

  /** Brevet kjernen lager for kommandoen, eller avvisningen som feil (#719). */
  function brev(kommando: Kommando, spor: Spor): Kjernebrev {
    const b = kjernesak.brev(kommando);
    // #719: uten låst tekst sendes ikke kommandoen, så TE ser aldri et brev uten teksten.
    const tekst = b && 'tekst' in b ? b.tekst : null;
    if (!tekst)
      throw new Error(
        (b && brevhindring(b)) ?? 'Appen kunne ikke lage brevet. Kravet er ikke sendt.'
      );
    return {
      tittel: `${SPORNAVN[spor]} – ${kjernesak.saksbilde?.tittel ?? 'Sak'}`,
      tekst,
      utdypning: kommando.utdypning,
    };
  }

  async function visOgSend(kommando: Kommando, vist: Kjernebrev) {
    await kontroll.show(vist);
    if (!(await kjernesak.send(kommando, vist.tekst)))
      throw new Error(kjernesak.feil ?? 'Brevet ble ikke sendt.');
  }

  return {
    get letter() {
      return kontroll.letter;
    },
    /** Fra kommandoen er levert fra skjemaet til sendingen er ferdig, også mens brevet kontrolleres. */
    get sender() {
      return sender;
    },
    confirm: kontroll.confirm,
    cancel: kontroll.cancel,
    async submit(spor: SporType, type: EventType, data: object): Promise<void> {
      sender = true;
      try {
        const kommando = kommandoFraSkjema(kjernesak, spor, type, data);
        await visOgSend(kommando, brev(kommando, spor));
      } finally {
        sender = false;
      }
    },
    /**
     * Trekket i sporet, uten fritekst (KA-U22). Avviser kjernen trekket, kastes meldingen
     * før brevet vises. Avbryter TE brevkontrollen, sendes ingenting.
     */
    trekk(spor: Spor): { send: () => Promise<void> } {
      const kommando: Kommando = { type: 'trekk', spor };
      const vist = brev(kommando, spor);
      return {
        send: async () => {
          sender = true;
          try {
            await visOgSend(kommando, vist);
          } catch (feil) {
            if (!(feil instanceof LetterCancelled)) throw feil;
          } finally {
            sender = false;
          }
        },
      };
    },
  };
}

export type Kravkontroll = ReturnType<typeof lagKravkontroll>;
