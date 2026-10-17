/**
 * TS-saken slik Kontrollrommet leser den (FK-8b, #718): utledningen og journalen
 * projisert til `SakState`, `TimelineEvent` og visningen per spor. Her står ingen
 * regel, bare oppslag. Kategoriene og metoden oversettes til katalogens koder med
 * `tilKatalogen`. Byggherrens svar vises bare som at svar finnes (oppdragsgiver
 * 17.10, #718), så resultatet, beløpet og subsidiariteten leses ikke her.
 */

import {
  HOVEDKATEGORI_FRA_KATALOGEN,
  METODE_FRA_KATALOGEN,
  UNDERKATEGORI_FRA_KATALOGEN,
  tilKatalogen,
} from '$kjerne/format/koder';
import type { Utledning } from '$kjerne/utledning/utled';
import type { Avsnitt, Journalrad, Krav, Spor } from '$kjerne/typer';
import type {
  SakState,
  SporStatus,
  SporType,
  TimelineEvent,
  VederlagsMetode,
} from '$lib/types/timeline';
import { getHjemmelLabel, getHjemmelObj } from '$lib/constants/categories';
import type { TrackDisplay } from '$lib/components/kontraktsbord/derive';
import type { SporKey } from '$lib/components/kontraktsbord/types';

export const SPOR_FOR: Record<SporKey, Spor> = {
  ansvar: 'grunnlag',
  vederlag: 'vederlag',
  frist: 'frist',
};

const SPORNAVN: Record<SporKey, string> = {
  ansvar: 'Grunnlag',
  vederlag: 'Vederlag',
  frist: 'Fristforlengelse',
};

/** TEs utdypning under kravet, i brevet kravet står i (LV-U2). */
function utdypning(journal: Journalrad[], u: Utledning, krav: Krav | null): string {
  if (!krav) return '';
  const rad = journal.find((r) => r.event_id === u.elementer[krav.id]?.hendelse);
  const tekst = rad?.data.brevtekst as Avsnitt[] | undefined;
  return tekst?.find((a) => a.gjelder === krav.id)?.utdypning ?? '';
}

function sisteOppdatert(journal: Journalrad[], u: Utledning, spor: Spor): string | undefined {
  const s = u.spor[spor];
  const siste = s.gjeldendeSvar ?? s.gjeldendeKrav;
  return siste
    ? journal.find((r) => r.event_id === u.elementer[siste.id]?.hendelse)?.tidsstempel
    : undefined;
}

/** Etiketten for sporet. Den er ikke en status kjernen leser, og den leses ikke av regler i appen. */
function sporStatus(u: Utledning, spor: Spor): SporStatus {
  const s = u.spor[spor];
  if (s.trukket) return 'trukket';
  if (s.gjeldendeSvar) return 'under_behandling';
  return s.gjeldendeKrav ? 'sendt' : 'ikke_relevant';
}

const tall = (v: unknown): number | undefined => (typeof v === 'number' ? v : undefined);
const tekst = (v: unknown): string | undefined => (typeof v === 'string' ? v : undefined);

export function tilSakState(
  sakId: string,
  tittel: string | null,
  journal: Journalrad[],
  u: Utledning
): SakState {
  const g = u.spor.grunnlag.gjeldendeKrav;
  const v = u.spor.vederlag.gjeldendeKrav;
  const f = u.spor.frist.gjeldendeKrav;
  const beloep = tall(v?.innhold.beloep);
  const felles = (spor: Spor) => ({
    status: sporStatus(u, spor),
    antall_versjoner: u.spor[spor].krav.length,
    siste_oppdatert: sisteOppdatert(journal, u, spor),
  });
  return {
    sak_id: sakId,
    sakstittel: tittel ?? 'Sak',
    sakstype: 'standard',
    grunnlag: {
      ...felles('grunnlag'),
      hovedkategori: tekst(tilKatalogen(HOVEDKATEGORI_FRA_KATALOGEN, g?.innhold.hovedkategori)),
      underkategori: tekst(tilKatalogen(UNDERKATEGORI_FRA_KATALOGEN, g?.innhold.underkategori)),
      beskrivelse: utdypning(journal, u, g),
      laast: false,
    },
    vederlag: {
      ...felles('vederlag'),
      metode: tekst(tilKatalogen(METODE_FRA_KATALOGEN, v?.innhold.metode)) as
        | VederlagsMetode
        | undefined,
      belop_direkte: beloep,
      krevd_belop: beloep,
      begrunnelse: utdypning(journal, u, v),
    },
    frist: {
      ...felles('frist'),
      krevd_dager: tall(f?.innhold.dager),
      begrunnelse: utdypning(journal, u, f),
    },
    er_subsidiaert_vederlag: false,
    er_subsidiaert_frist: false,
    visningsstatus_vederlag: '',
    visningsstatus_frist: '',
    // Leses ikke for en TS-sak. Kontrollrommet viser `visning.status` (#718).
    overordnet_status: 'UNDER_BEHANDLING',
    kan_utstede_eo: false,
    neste_handling: { rolle: null, handling: '', spor: null },
    sum_krevd: 0,
    sum_godkjent: 0,
    antall_events: journal.length,
  };
}

/** Sporet en hendelse har krav eller svar i. */
function sporFor(u: Utledning, hendelse: string): SporType | null {
  for (const spor of ['grunnlag', 'vederlag', 'frist'] as const) {
    const s = u.spor[spor];
    if ([...s.krav, ...s.svar].some((e) => u.elementer[e.id]?.hendelse === hendelse)) return spor;
  }
  return null;
}

export function tilTidslinje(
  prosjektId: string,
  sakId: string,
  journal: Journalrad[],
  u: Utledning,
  titler: Record<string, string>
): TimelineEvent[] {
  return journal.map((r) => ({
    specversion: '1.0',
    id: r.event_id,
    source: `/projects/${prosjektId}/cases/${sakId}`,
    type: `no.oslo.koe.${r.event_type}`,
    time: r.tidsstempel,
    subject: sakId,
    streamposition: r.versjon,
    actorrole: r.aktor_rolle,
    summary: titler[r.event_id],
    spor: sporFor(u, r.event_id),
  }));
}

/** Visningen av sporet i venstrekolonnen og bestemmelsespanelet. */
export function sporvisning(sak: SakState, u: Utledning, nokkel: SporKey): TrackDisplay {
  const s = u.spor[SPOR_FOR[nokkel]];
  const svar = s.gjeldendeSvar !== null;
  const felles = {
    label: SPORNAVN[nokkel],
    num: '',
    bhText: '',
    bhHarSvart: svar,
    isDisputed: false,
    isSubsidiary: false,
    isWithdrawn: s.trukket,
    isRejectionAccepted: false,
    antallVersjoner: s.krav.length,
  };
  if (nokkel === 'ansvar') {
    const hjemmel = getHjemmelObj(sak.grunnlag.underkategori);
    return {
      ...felles,
      isBinary: true,
      tePosition: getHjemmelLabel(sak.grunnlag.underkategori),
      teRef: hjemmel ? `§ ${hjemmel.hjemmel_basis}` : undefined,
      bhPosition: svar ? 'BH har svart' : 'Ikke besvart',
      teText: sak.grunnlag.beskrivelse ?? '',
      sisteOppdatert: sak.grunnlag.siste_oppdatert,
    };
  }
  const krevd = nokkel === 'vederlag' ? sak.vederlag.krevd_belop : sak.frist.krevd_dager;
  return {
    ...felles,
    isBinary: false,
    unspecified: krevd === undefined,
    // Varselet etter § 33.4 er et utsagn i kjernen. Vederlaget har ingen varsler i TS ennå.
    hasNotice: nokkel === 'frist' && s.varsel !== null,
    krevdValue: krevd ?? 0,
    krevdUnit: nokkel === 'vederlag' ? ',-' : ' dager',
    bhUnit: nokkel === 'vederlag' ? ',-' : ' dager',
    teText: sak[nokkel].begrunnelse ?? '',
    sisteOppdatert: sak[nokkel].siste_oppdatert,
  };
}
