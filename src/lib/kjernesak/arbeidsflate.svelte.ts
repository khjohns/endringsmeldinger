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
import type { Utledning } from '$kjerne/utledning/utled';
import type { Kravspor } from '$kjerne/typer';
import type { Kjernesakkontekst } from './kontekst.svelte';
import {
  SPOR_FOR,
  kravversjon,
  sporetsStatustekst,
  sporvisning,
  tilSakState,
  tilTidslinje,
} from './sakstilstand';
import type { Vederlagsvarsel } from './vederlagskrav';
import {
  grunnlagetForSvaret,
  vederlagConfigFraKjernen,
  vederlagslag,
  vederlagssvarFraSkjema,
  type Vederlagslag,
} from './vederlagssvar';

interface Projeksjon {
  sak: SakState;
  utledning: Utledning;
  statustekst: Record<SporKey, string>;
  timeline: TimelineEvent[];
  visning: Record<SporKey, TrackDisplay>;
}

/** Varselet fra appen, kravet eller registreringen av et varsel sendt utenfor appen. */
export type Kravvalg = 'varsel' | 'spesifisert' | 'registrert';

const TOM_UI: SporUIState = { draft: null, att: [], note: null };

export function lagKjernesakflate(kjernesak: Kjernesakkontekst, projectId: string) {
  const { sakId } = kjernesak;
  const teNavn = getPartsNavn('TE');
  const tilbyrTe = (handling: string) =>
    kjernesak.part === 'TE' && kjernesak.handlinger.includes(handling);
  // I vederlagssporet er det særskilte varselet etter § 34.1.3 et varsel ved siden av
  // varselet i sporet (OV-U25).
  const tilbyrVarsel = (type: 'sende_varsel' | 'varsle', spor: Kravspor) =>
    tilbyrTe(`${type}:${spor}`) || (spor === 'vederlag' && tilbyrTe(`${type}:34.1.3`));
  const bhNavn = getPartsNavn('BH');
  // Etter en ny lasting som feiler, står saken slik den sist ble lest.
  let forrige: Projeksjon | null = null;
  const projeksjon = $derived.by(() => {
    const u = kjernesak.utledning;
    const bilde = kjernesak.saksbilde;
    if (u && bilde) {
      const titler = Object.fromEntries(bilde.journal.map((j) => [j.hendelse, j.tittel]));
      const sak = tilSakState(sakId, bilde.tittel, kjernesak.journal, u);
      const vist = kjernesak.visning;
      const statustekst = (spor: SporKey) => (vist ? sporetsStatustekst(vist, spor) : '');
      forrige = {
        sak,
        utledning: u,
        statustekst: {
          ansvar: statustekst('ansvar'),
          vederlag: statustekst('vederlag'),
          frist: statustekst('frist'),
        },
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
    /**
     * Kjernen tilbyr TE handlingen, som `krav:frist` (krav G i #718). TE-skjemaene tilbys
     * bare TE, og uten side tilbys ingenting (#737 p3).
     */
    tilbyrTe,
    /** Valgene kjernen tilbyr TE i kravskjemaet, i rekkefølgen skjemaet viser dem (OV-U5). */
    teValg(spor: Kravspor): Kravvalg[] {
      return [
        ...(tilbyrVarsel('sende_varsel', spor) ? (['varsel'] as const) : []),
        ...(tilbyrTe(`krav:${spor}`) ? (['spesifisert'] as const) : []),
        ...(tilbyrVarsel('varsle', spor) ? (['registrert'] as const) : []),
      ];
    },
    /**
     * Varslene i vederlagssporet kjernen tilbyr TE som varsel fra appen eller registrering:
     * varselet etter § 34.1.2 og det særskilte etter § 34.1.3 (OV-U25, OV-U8).
     */
    teVarsler(valg: 'varsel' | 'registrert'): Vederlagsvarsel[] {
      const type = valg === 'varsel' ? 'sende_varsel' : 'varsle';
      return [
        ...(tilbyrTe(`${type}:vederlag`) ? (['34.1.2'] as const) : []),
        ...(tilbyrTe(`${type}:34.1.3`) ? (['34.1.3'] as const) : []),
      ];
    },
    /**
     * Skjemaet TE får i sporet, med teksten på knappen, eller `null` når kjernen ikke
     * tilbyr TE et krav eller et varsel i det. Knappen og skjemaet leser det samme (#943).
     */
    teSkjema(nokkel: SporKey): string | null {
      const spor = SPOR_FOR[nokkel];
      const krav = tilbyrTe(`krav:${spor}`);
      const varsel =
        spor !== 'grunnlag' && (tilbyrVarsel('sende_varsel', spor) || tilbyrVarsel('varsle', spor));
      if (!krav && !varsel) return null;
      if (krav && kravversjon(projeksjon.utledning, nokkel) > 0)
        return spor === 'grunnlag' ? 'Send ny versjon av grunnlaget' : 'Send ny versjon av kravet';
      if (spor === 'grunnlag') return null;
      return varsel && krav
        ? 'Send varsel eller krav'
        : krav
          ? spor === 'frist'
            ? 'Send krav om fristforlengelse'
            : 'Send krav om vederlagsjustering'
          : tilbyrVarsel('sende_varsel', spor)
            ? 'Send varsel'
            : 'Registrer varsel';
    },
    /**
     * Skjemaet BH får i sporet, med teksten på knappen, når kjernen tilbyr BH å svare på
     * vederlagskravet (#1047). Svar i de andre sporene er ikke bygget for TS-saken (#818).
     */
    bhSkjema(nokkel: SporKey): string | null {
      return nokkel === 'vederlag' &&
        kjernesak.part === 'BH' &&
        kjernesak.handlinger.includes('svare:vederlag') &&
        projeksjon.utledning.spor.vederlag.gjeldendeKrav
        ? 'Svar på kravet'
        : null;
    },
    /**
     * Skjemaet leseren får i sporet, med teksten på knappen, eller `null`. Knappen i
     * `ActionBar` og skjemaet i `Kontrollrommet` leser begge dette (#1238).
     */
    skjema(nokkel: SporKey): string | null {
      return this.teSkjema(nokkel) ?? this.bhSkjema(nokkel);
    },
    /** Configen for `VederlagForm` fra kravet kjernen har i sporet, eller `null` uten krav. */
    get vederlagConfig() {
      return vederlagConfigFraKjernen(projeksjon.utledning);
    },
    /** Det brevet setter foran BHs svar på vederlaget, fra kjernen (#1261). */
    get grunnlagetForVederlagssvaret() {
      return grunnlagetForSvaret(projeksjon.utledning);
    },
    /**
     * Lagene i BHs svar på vederlaget med dataene fra skjemaet, slik kjernen forhåndsviser
     * brevet (#1261). `null` når kjernen ikke kan lage svaret ennå.
     */
    vederlagslag(data: Record<string, unknown>): Vederlagslag | null {
      const u = projeksjon.utledning;
      if (!u.spor.vederlag.gjeldendeKrav) return null;
      const etter = kjernesak.forhaandsvist(
        vederlagssvarFraSkjema(data, u, kjernesak.regelversjon)
      );
      return etter ? vederlagslag(u, etter) : null;
    },
    /** Byggherrens gjeldende svar i sporet når kjernen tilbyr TE å godta det (KA-U10), ellers `null`. */
    godtar(nokkel: SporKey): string | null {
      const spor = SPOR_FOR[nokkel];
      return tilbyrTe(`godta:${spor}`)
        ? (projeksjon.utledning.spor[spor].gjeldendeSvar?.id ?? null)
        : null;
    },
    /**
     * Byggherrens svar i sporet kjernen tilbyr TE innsigelse mot etter § 5 tredje ledd,
     * det nyeste først (VS-U1, VS-U14).
     */
    innsigelser(nokkel: SporKey): string[] {
      return projeksjon.utledning.spor[SPOR_FOR[nokkel]].svar
        .map((s) => s.id)
        .filter((id) => tilbyrTe(`innsigelse:${id}`))
        .reverse();
    },
    /** Kravversjonen i saken slik den sist ble lest (krav E i #718). */
    kravversjon: (spor: SporKey) => kravversjon(projeksjon.utledning, spor),
    teNavn,
    bhNavn,
    draftCount: 0,
    get submitting() {
      return kjernesak.sender;
    },
    get submissionError() {
      return kjernesak.feil;
    },
    display: (spor: SporKey) => projeksjon.visning[spor],
    /** Fra saken slik den sist ble lest, som resten av Kontrollrommet (#732 p10). */
    statustekst: (spor: SporKey) => projeksjon.statustekst[spor],
    getUI: (): SporUIState => TOM_UI,
    setDraft() {},
  };
}

export type KjernesakArbeidsflate = ReturnType<typeof lagKjernesakflate>;
