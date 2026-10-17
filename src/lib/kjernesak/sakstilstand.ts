/**
 * TS-saken slik Kontrollrommet leser den (FK-8b, #718): utledningen og journalen
 * projisert til `SakState`, `TimelineEvent` og visningen per spor. Kategoriene og
 * metoden oversettes til katalogens koder med `tilKatalogen`. Byggherrens svar vises
 * bare som at svar finnes (oppdragsgiver 17.10, #718), så resultatet, beløpet og
 * subsidiariteten leses ikke her.
 *
 * Statusfeltene i `SakState` projiseres ikke: status er en etikett, og kjernens
 * etiketter står i `visning`. Leser Kontrollrommet et av feltene for en TS-sak,
 * kaster getteren i utvikling og test, så en ny lesing gir rød test i stedet for
 * en oppdiktet status.
 */

import {
  HOVEDKATEGORI_FRA_KATALOGEN,
  METODE_FRA_KATALOGEN,
  UNDERKATEGORI_FRA_KATALOGEN,
  tilKatalogen,
} from '$kjerne/format/koder';
import type { Utledning } from '$kjerne/utledning/utled';
import type { Avsnitt, Journalrad, Krav, Spor } from '$kjerne/typer';
import type { Visning } from '$kjerne/utledning/visning';
import type { SakState, SporType, TimelineEvent, VederlagsMetode } from '$lib/types/timeline';
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

/** Gir `o` gettere som kaster for feltene som ikke projiseres for en TS-sak. */
function utenStatus<T, K extends keyof T & string>(o: Omit<T, K>, felt: readonly K[]): T {
  for (const f of felt)
    Object.defineProperty(o, f, {
      enumerable: false,
      // I produksjon gir lesingen `undefined`, så en lesing testene ikke fanger,
      // ikke tar ned hele Kontrollrommet.
      get() {
        if (import.meta.env.DEV)
          throw new Error(`${f} projiseres ikke for en TS-sak. Les kjernens visning (#718).`);
      },
    });
  return o as T;
}

const SPORETS_STATUSFELT = ['status', 'antall_versjoner', 'bh_resultat'] as const;
const SAKENS_STATUSFELT = [
  'overordnet_status',
  'kan_utstede_eo',
  'sum_krevd',
  'sum_godkjent',
  'er_subsidiaert_vederlag',
  'er_subsidiaert_frist',
  'visningsstatus_vederlag',
  'visningsstatus_frist',
  'neste_handling',
] as const;

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
  const sist = (spor: Spor) => ({ siste_oppdatert: sisteOppdatert(journal, u, spor) });
  return utenStatus<SakState, (typeof SAKENS_STATUSFELT)[number]>(
    {
      sak_id: sakId,
      sakstittel: tittel ?? 'Sak',
      sakstype: 'standard',
      grunnlag: utenStatus<SakState['grunnlag'], (typeof SPORETS_STATUSFELT)[number] | 'laast'>(
        {
          ...sist('grunnlag'),
          hovedkategori: tekst(tilKatalogen(HOVEDKATEGORI_FRA_KATALOGEN, g?.innhold.hovedkategori)),
          underkategori: tekst(tilKatalogen(UNDERKATEGORI_FRA_KATALOGEN, g?.innhold.underkategori)),
          beskrivelse: utdypning(journal, u, g),
        },
        [...SPORETS_STATUSFELT, 'laast']
      ),
      vederlag: utenStatus<SakState['vederlag'], (typeof SPORETS_STATUSFELT)[number]>(
        {
          ...sist('vederlag'),
          metode: tekst(tilKatalogen(METODE_FRA_KATALOGEN, v?.innhold.metode)) as
            | VederlagsMetode
            | undefined,
          belop_direkte: beloep,
          krevd_belop: beloep,
          begrunnelse: utdypning(journal, u, v),
        },
        SPORETS_STATUSFELT
      ),
      frist: utenStatus<SakState['frist'], (typeof SPORETS_STATUSFELT)[number]>(
        {
          ...sist('frist'),
          krevd_dager: tall(f?.innhold.dager),
          begrunnelse: utdypning(journal, u, f),
        },
        SPORETS_STATUSFELT
      ),
      antall_events: journal.length,
    },
    SAKENS_STATUSFELT
  );
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

/**
 * Statusteksten for sporet i handlingslinjen, fra kjernens visning. Kan saken ikke
 * utledes (MM-U2), er det sakens status. Ellers er det etikettene for sporet:
 * `trukket`, `venter_paa_svar` (GR-U24 er lest inn der) og `ingen_krav`, og
 * deretter om sporet har svar, krav eller et varsel etter § 33.4.
 */
export function sporetsStatustekst(
  vist: Visning,
  u: Utledning,
  nokkel: SporKey,
  part: 'TE' | 'BH' | null,
  bhNavn: string
): string {
  if (vist.status.kode === 'kan_ikke_utledes') return vist.status.tekst;
  const spor = SPOR_FOR[nokkel];
  const etiketter = vist.spor[spor].etiketter;
  if (etiketter.includes('trukket')) return 'Kravet er trukket';
  if (etiketter.includes('venter_paa_svar'))
    return part === 'BH' ? 'Kravet er ikke besvart' : `Avventer svar fra ${bhNavn}`;
  if (etiketter.includes('ingen_krav')) return 'Ingen krav';
  const s = u.spor[spor];
  if (s.gjeldendeSvar) return `${bhNavn} har svart`;
  if (s.krav.length) return vist.status.tekst;
  return s.varsel ? 'Varslet – ikke spesifisert' : 'Ingen krav';
}
