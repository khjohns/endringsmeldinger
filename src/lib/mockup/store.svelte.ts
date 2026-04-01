/**
 * Reaktiv mockup-store. Wrapper DD/EVT som $state slik at
 * skjema-handlinger reflekteres i lesemodus og historikk.
 */
import { DD as initialDD, EVT as initialEVT, TE, BH } from './data.js';
import { groupByDate } from './utils.js';
import type { Track, TrackKey, HistoryEvent, Role } from './types.js';

function createStore() {
  let tracks: Record<TrackKey, Track> = $state(structuredClone(initialDD));
  let events: HistoryEvent[] = $state([...initialEVT]);

  const evtGrouped = $derived(groupByDate(events));
  const draftCount = $derived(Object.values(tracks).filter((t) => t.draftState === 'draft').length);

  function now(): { d: string; t: string } {
    const n = new Date();
    const d = `${n.getDate().toString().padStart(2, '0')}.${(n.getMonth() + 1).toString().padStart(2, '0')}`;
    const t = `${n.getHours().toString().padStart(2, '0')}:${n.getMinutes().toString().padStart(2, '0')}`;
    return { d, t };
  }

  function addEvent(role: Role, subject: string, detail: string) {
    const { d, t } = now();
    const name = role === 'TE' ? TE : BH;
    events = [{ d, t, a: role, n: name, s: subject, x: detail }, ...events];
  }

  /** BH sender svar på grunnlag */
  function sendGrunnlagSvar(resultat: 'godkjent' | 'avslatt' | 'frafalt') {
    const labels: Record<string, string> = {
      godkjent: 'Grunnlag godkjent',
      avslatt: 'Grunnlag avslått',
      frafalt: 'Pålegg frafalt',
    };
    tracks.ansvar = {
      ...tracks.ansvar,
      status: resultat === 'avslatt' ? 'disputed' : 'empty',
      bh: {
        ...tracks.ansvar.bh,
        position: resultat === 'godkjent' ? 'Godkjent' : 'Avvist',
      },
      draftState: 'empty',
      draft: null,
    };
    addEvent('BH', labels[resultat] ?? 'Grunnlag vurdert', `${resultat}.`);
  }

  /** BH sender svar på vederlag */
  function sendVederlagSvar(godkjentBelop: number) {
    const krevd = tracks.vederlag.te.value!;
    const label =
      godkjentBelop >= krevd
        ? 'Vederlag godkjent'
        : godkjentBelop > 0
          ? 'Vederlag delvis godkjent'
          : 'Vederlag avslått';
    tracks.vederlag = {
      ...tracks.vederlag,
      bh: { ...tracks.vederlag.bh, subsidiaer: godkjentBelop },
      draftState: 'empty',
      draft: null,
    };
    addEvent('BH', label, `${godkjentBelop.toLocaleString('nb-NO')},-`);
  }

  /** BH sender svar på frist */
  function sendFristSvar(godkjentDager: number) {
    const krevd = tracks.frist.te.value!;
    const label =
      godkjentDager >= krevd
        ? 'Frist godkjent'
        : godkjentDager > 0
          ? 'Frist delvis godkjent'
          : 'Frist avslått';
    tracks.frist = {
      ...tracks.frist,
      bh: { ...tracks.frist.bh, subsidiaer: godkjentDager },
      draftState: 'empty',
      draft: null,
    };
    addEvent('BH', label, `${godkjentDager} dager.`);
  }

  /** TE sender/reviderer grunnlag */
  function sendTeGrunnlag(begrunnelse: string) {
    tracks.ansvar = {
      ...tracks.ansvar,
      teT: begrunnelse,
    };
    addEvent('TE', 'Grunnlag revidert', 'Oppdatert begrunnelse.');
  }

  /** TE sender vederlagskrav */
  function sendTeVederlag(belop: number, metode: string) {
    tracks.vederlag = {
      ...tracks.vederlag,
      te: { ...tracks.vederlag.te, value: belop },
    };
    addEvent('TE', 'Vederlagskrav sendt', `${belop.toLocaleString('nb-NO')},- (${metode}).`);
  }

  /** TE sender fristkrav */
  function sendTeFrist(dager: number) {
    tracks.frist = {
      ...tracks.frist,
      te: { ...tracks.frist.te, value: dager },
    };
    addEvent('TE', 'Fristkrav sendt', `${dager} dager.`);
  }

  function reset() {
    tracks = structuredClone(initialDD);
    events = [...initialEVT];
  }

  return {
    get tracks() {
      return tracks;
    },
    get events() {
      return events;
    },
    get evtGrouped() {
      return evtGrouped;
    },
    get draftCount() {
      return draftCount;
    },
    sendGrunnlagSvar,
    sendVederlagSvar,
    sendFristSvar,
    sendTeGrunnlag,
    sendTeVederlag,
    sendTeFrist,
    reset,
  };
}

export const store = createStore();
