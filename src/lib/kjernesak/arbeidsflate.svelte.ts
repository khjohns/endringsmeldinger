/**
 * Kontrollrommets sakskontekst for en TS-sak (FK-8b, #718): den tredje varianten av
 * `CaseWorkspace`, ved siden av Python-saken og demoen. Den leser sakskonteksten
 * for TS-saken og projiserer den med `sakstilstand.ts`. Skrivingen går gjennom
 * `kjernesak.send`, ikke `submit`, og utkast er av for TS-saker (oppdragsgiver
 * 17.10, #718).
 */

import type { SporKey, SporUIState } from '$lib/components/kontraktsbord/types';
import type { TrackDisplay } from '$lib/components/kontraktsbord/derive';
import type { SakState, TimelineEvent } from '$lib/types/timeline';
import { getPartsNavn } from '$lib/utils/partsNavn';
import type { Kjernesakkontekst } from './kontekst.svelte';
import {
  SPOR_FOR,
  sporetsStatustekst,
  sporvisning,
  tilSakState,
  tilTidslinje,
} from './sakstilstand';
import { tilbyrFoersteVederlagskrav } from './vederlagskrav';

interface Projeksjon {
  sak: SakState;
  timeline: TimelineEvent[];
  visning: Record<SporKey, TrackDisplay>;
}

const TOM_UI: SporUIState = { draft: null, att: [], note: null };

export function lagKjernesakflate(kjernesak: Kjernesakkontekst, projectId: string) {
  const { sakId } = kjernesak;
  // Etter en ny lasting som feiler, står saken slik den sist ble lest.
  let forrige: Projeksjon | null = null;
  const projeksjon = $derived.by(() => {
    const u = kjernesak.utledning;
    const bilde = kjernesak.saksbilde;
    if (u && bilde) {
      const titler = Object.fromEntries(bilde.journal.map((j) => [j.hendelse, j.tittel]));
      const sak = tilSakState(sakId, bilde.tittel, kjernesak.journal, u);
      forrige = {
        sak,
        timeline: tilTidslinje(projectId, sakId, kjernesak.journal, u, titler),
        visning: {
          ansvar: sporvisning(sak, u, 'ansvar'),
          vederlag: sporvisning(sak, u, 'vederlag'),
          frist: sporvisning(sak, u, 'frist'),
        },
      };
    }
    if (!forrige) throw new Error('TS-saken er ikke lastet.');
    return forrige;
  });
  const teNavn = getPartsNavn('TE');
  const bhNavn = getPartsNavn('BH');

  return {
    isDemo: false as const,
    erKjernesak: true as const,
    kjernesak,
    sakId,
    projectId,
    demo: undefined,
    get sak() {
      return projeksjon.sak;
    },
    get timeline() {
      return projeksjon.timeline;
    },
    get version() {
      return kjernesak.versjon ?? 0;
    },
    /** Leserens side fra serveren. Uten side tilbys ingen handling (#705). */
    get part() {
      return kjernesak.part;
    },
    get saksbilde() {
      return kjernesak.saksbilde;
    },
    get tilbyrVederlagskrav() {
      const u = kjernesak.utledning;
      return u ? tilbyrFoersteVederlagskrav(kjernesak.handlinger, u) : false;
    },
    /**
     * Antall versjoner av det gjeldende kravet i sporet, talt langs `erstatter` fra
     * `gjeldendeKrav`. 0 når sporet ikke har et gjeldende krav (krav E i #718).
     */
    kravversjon(track: SporKey): number {
      const s = kjernesak.utledning?.spor[SPOR_FOR[track]];
      let antall = 0;
      for (let k = s?.gjeldendeKrav; k; antall++) {
        const forrige = k.erstatter;
        k = s!.krav.find((e) => e.id === forrige);
      }
      return antall;
    },
    teNavn,
    bhNavn,
    // Ingen `*DomainConfig`: de leser Python-projeksjonens statusfelt (krav E i #718).
    draftCount: 0,
    get submitting() {
      return kjernesak.sender;
    },
    catendaSyncStatus: 'clear' as const,
    get submissionError() {
      return kjernesak.feil;
    },
    display: (track: SporKey) => projeksjon.visning[track],
    statustekst(track: SporKey) {
      const { visning, utledning } = kjernesak;
      return visning && utledning
        ? sporetsStatustekst(visning, utledning, track, kjernesak.part, bhNavn)
        : '';
    },
    getUI: (): SporUIState => TOM_UI,
    setDraft() {},
    beginEdit() {},
    endEdit() {},
    refresh: () => kjernesak.last(),
    submit(): Promise<void> {
      throw new Error('En TS-sak sendes med kommandoene til kjernen, ikke som hendelse.');
    },
  };
}

export type KjernesakArbeidsflate = ReturnType<typeof lagKjernesakflate>;
