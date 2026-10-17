/**
 * Brevkontrollen og sendingen for en TS-sak (#718), med samme `submit` som
 * `createClaimReview`, så `TeVederlagForm` brukes uendret i begge stier. Dataene fra
 * skjemaet blir kravet til kjernen, TE ser den låste teksten (LV-U2), og kravet
 * sendes med `kjernesak.send`. Bare det første vederlagskravet kan sendes ennå.
 */

import { createLetterConfirmation } from '$lib/approval/claimReview.svelte';
import type { VederlagSubmissionEventData } from '$lib/domain/vederlagSubmissionDomain';
import type { EventType, SporType } from '$lib/types/timeline';
import type { Kjernesakkontekst } from './kontekst.svelte';
import { vederlagskravFraSkjema } from './vederlagskrav';

export interface Kjernebrev {
  tittel: string;
  tekst: string[];
  utdypning?: string;
}

export function lagKravkontroll(kjernesak: Kjernesakkontekst) {
  const kontroll = createLetterConfirmation<Kjernebrev>();
  return {
    get letter() {
      return kontroll.letter;
    },
    confirm: kontroll.confirm,
    cancel: kontroll.cancel,
    async submit(track: SporType, type: EventType, data: object): Promise<void> {
      if (track !== 'vederlag' || type !== 'vederlag_krav_sendt')
        throw new Error('Bare det første vederlagskravet kan sendes for denne saken ennå.');
      const kommando = vederlagskravFraSkjema(data as VederlagSubmissionEventData);
      const tekst = kjernesak.brevtekst(kommando);
      // #719: uten låst tekst sendes ikke kravet, så TE ser aldri et krav uten brevet.
      if (!tekst)
        throw new Error(
          'Appen kunne ikke lage brevet for kravet. Kontroller beløpet. Kravet er ikke sendt.'
        );
      await kontroll.show({
        tittel: `Vederlag – ${kjernesak.saksbilde?.tittel ?? 'Sak'}`,
        tekst,
        utdypning: kommando.utdypning,
      });
      if (!(await kjernesak.send(kommando, tekst)))
        throw new Error(kjernesak.feil ?? 'Kravet ble ikke sendt.');
    },
  };
}

export type Kravkontroll = ReturnType<typeof lagKravkontroll>;
