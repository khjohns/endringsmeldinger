/**
 * Lesepunktet for saksvisningen (#313): SakState → display-data og domain configs.
 *
 * Komponentene i saksvisningen leser `SporStatus`, `overordnet_status` og
 * etikettene for dem bare herfra, så byttet til kjernens predikater, handlinger
 * og visning skjer her.
 *
 * Ren TypeScript — ingen Svelte-avhengigheter.
 * Domain config-avledninger er delt via $lib/domain/deriveConfig.
 */
import type { SakState, SporStatus, SubsidiaerTrigger } from '$lib/types/timeline';
import { erGrunnlagetSubsidiaert, erPrekludertEtter32_2 } from '$lib/domain/grunnlagDomain';
import { getHjemmelLabel, getHjemmelObj } from '$lib/constants/categories.js';
import { GRUNNLAG_RESULTAT_LABELS } from '$lib/constants/responseOptions.js';
import { SPOR_STATUS_LABELS } from '$lib/constants/statusLabels.js';
import { getOverordnetStatusStyle } from '$lib/constants/statusStyles.js';
import type { SporKey } from './types.js';

// Re-export shared domain config derivation functions
export {
  deriveVederlagDomainConfig,
  deriveFristDomainConfig,
  deriveGrunnlagDomainConfig,
} from '$lib/domain/deriveConfig';

export interface TrackDisplay {
  label: string;
  num: string;
  // Grunnlag (binary)
  tePosition?: string;
  teRef?: string;
  bhPosition?: string;
  // Vederlag/Frist (numeric)
  krevdValue?: number;
  krevdUnit?: string;
  bhPrinsipal?: number;
  bhSubsidiaer?: number;
  bhUnit?: string;
  // Tekst
  teText: string;
  bhText: string;
  // Status
  isBinary: boolean;
  unspecified?: boolean;
  hasNotice?: boolean;
  isDisputed: boolean;
  /** Grunnlaget er prekludert etter § 32.2, ikke avslått. Gjelder bare ansvar. */
  isPrecluded?: boolean;
  isSubsidiary: boolean;
  isWithdrawn: boolean;
  /** TE har godtatt byggherrens avslag — sporet er oppgjort ved enighet. */
  isRejectionAccepted: boolean;
  withdrawnReason?: string;
  withdrawnViaGrunnlag?: boolean;
  // Oppdatering
  sisteOppdatert?: string;
  antallVersjoner: number;
}

const TRACK_META: Record<SporKey, { label: string; num: string }> = {
  ansvar: { label: 'Grunnlag', num: '' },
  vederlag: { label: 'Vederlag', num: '' },
  frist: { label: 'Fristforlengelse', num: '' },
};

export interface BhStandpunkt {
  prinsipalt: number;
  subsidiaert: number;
  atterSubsidiaert?: number;
}

/**
 * Er grunnlaget avslått eller prekludert (B-13, 05.10), er hele svaret
 * subsidiært: beløpet eller dagene er det subsidiære standpunktet, og et eget
 * subsidiært standpunkt i svaret står atter subsidiært, som i brevet.
 */
export function bhStandpunkt(
  avslattPaaGrunnlag: boolean,
  godkjent: number | null | undefined,
  subsidiaerGodkjent: number | null | undefined
): BhStandpunkt {
  if (avslattPaaGrunnlag) {
    return {
      prinsipalt: 0,
      subsidiaert: godkjent ?? 0,
      atterSubsidiaert: subsidiaerGodkjent ?? undefined,
    };
  }
  return { prinsipalt: godkjent ?? 0, subsidiaert: subsidiaerGodkjent ?? godkjent ?? 0 };
}

function bhPosisjon(
  bhResultat: string | undefined,
  standpunkt: BhStandpunkt
): Pick<TrackDisplay, 'bhPrinsipal' | 'bhSubsidiaer'> {
  if (!bhResultat) return { bhPrinsipal: undefined, bhSubsidiaer: undefined };
  return { bhPrinsipal: standpunkt.prinsipalt, bhSubsidiaer: standpunkt.subsidiaert };
}

function grunnlagetFor(sak: SakState) {
  const g = sak.grunnlag;
  return {
    resultat: g.bh_resultat,
    hovedkategori: g.hovedkategori,
    underkategori: g.underkategori,
    varsletITide: g.grunnlag_varslet_i_tide,
  };
}

/**
 * Hele svaret er subsidiært når grunnlaget er avslått eller prekludert,
 * også når beløpet eller dagene er avslått. `er_subsidiaert_*` fra serveren
 * gjelder bare et godkjent beløp; brevet og fullmakten ser på grunnlaget alene.
 * Ved frafall (§ 32.3 c) kan TE kreve påløpte kostnader, og vederlaget er ikke
 * subsidiært, som i `er_subsidiaert_vederlag`.
 */
export function svaretErSubsidiaert(sak: SakState, spor: 'vederlag' | 'frist'): boolean {
  if (spor === 'vederlag' && sak.grunnlag.bh_resultat === 'frafalt') return false;
  return Boolean(sak[spor].bh_resultat) && erGrunnlagetSubsidiaert(grunnlagetFor(sak));
}

/** Byggherren har svart at grunnlaget er varslet for sent (§ 32.2), uansett resultat. */
export function grunnlagetErPrekludert(sak: SakState): boolean {
  return Boolean(sak.grunnlag.bh_resultat) && erPrekludertEtter32_2(grunnlagetFor(sak));
}

/** Årsaken i grunnlaget utledes av saken og lagres ikke i svaret (B-13, 05.10). */
export function grunnlagTriggers(sak: SakState, spor: 'vederlag' | 'frist'): SubsidiaerTrigger[] {
  if (!svaretErSubsidiaert(sak, spor)) return [];
  return [
    ...(sak.grunnlag.bh_resultat === 'avslatt' ? (['grunnlag_avslatt'] as const) : []),
    ...(erPrekludertEtter32_2(grunnlagetFor(sak)) ? (['grunnlag_prekludert_32_2'] as const) : []),
  ];
}

export function deriveTrackDisplay(sak: SakState, spor: SporKey): TrackDisplay {
  const meta = TRACK_META[spor];

  if (spor === 'ansvar') {
    const g = sak.grunnlag;
    const hjemmel = getHjemmelObj(g.underkategori);
    const prekludert = g.bh_resultat !== 'frafalt' && grunnlagetErPrekludert(sak);
    return {
      ...meta,
      isBinary: true,
      tePosition: getHjemmelLabel(g.underkategori),
      teRef: hjemmel ? `§ ${hjemmel.hjemmel_basis}` : undefined,
      bhPosition: prekludert
        ? 'Prekludert (§ 32.2)'
        : g.bh_resultat
          ? (GRUNNLAG_RESULTAT_LABELS[g.bh_resultat] ?? g.bh_resultat)
          : 'Ikke besvart',
      teText: g.beskrivelse ?? '',
      bhText: g.bh_begrunnelse ?? '',
      isDisputed: g.bh_resultat === 'avslatt' || prekludert,
      isPrecluded: prekludert,
      isSubsidiary: false,
      isWithdrawn: g.status === 'trukket',
      isRejectionAccepted: g.status === 'avslatt_akseptert',
      withdrawnReason: g.trukket_begrunnelse,
      sisteOppdatert: g.siste_oppdatert,
      antallVersjoner: g.antall_versjoner,
    };
  }

  if (spor === 'vederlag') {
    const v = sak.vederlag;
    return {
      ...meta,
      isBinary: false,
      unspecified: !v.metode,
      hasNotice: Boolean(v.varsler?.length),
      krevdValue: v.krevd_belop ?? v.netto_belop ?? 0,
      krevdUnit: ',-',
      ...bhPosisjon(
        v.bh_resultat,
        bhStandpunkt(
          svaretErSubsidiaert(sak, 'vederlag'),
          v.godkjent_belop,
          v.subsidiaer_godkjent_belop
        )
      ),
      bhUnit: ',-',
      teText: v.begrunnelse ?? '',
      bhText: v.bh_begrunnelse ?? '',
      isDisputed: v.bh_resultat === 'avslatt' || svaretErSubsidiaert(sak, 'vederlag'),
      isSubsidiary: svaretErSubsidiaert(sak, 'vederlag'),
      isWithdrawn: v.status === 'trukket',
      isRejectionAccepted: v.status === 'avslatt_akseptert',
      withdrawnReason: v.trukket_begrunnelse,
      withdrawnViaGrunnlag: v.trukket_via_grunnlag,
      sisteOppdatert: v.siste_oppdatert,
      antallVersjoner: v.antall_versjoner,
    };
  }

  // frist
  const f = sak.frist;
  return {
    ...meta,
    isBinary: false,
    unspecified: f.varsel_type !== 'spesifisert' && f.krevd_dager == null,
    hasNotice: Boolean(f.frist_varsel),
    krevdValue: f.krevd_dager ?? 0,
    krevdUnit: ' dager',
    ...bhPosisjon(
      f.bh_resultat,
      bhStandpunkt(svaretErSubsidiaert(sak, 'frist'), f.godkjent_dager, f.subsidiaer_godkjent_dager)
    ),
    bhUnit: ' dager',
    teText: f.begrunnelse ?? '',
    bhText: f.bh_begrunnelse ?? '',
    isDisputed: f.bh_resultat === 'avslatt' || svaretErSubsidiaert(sak, 'frist'),
    isSubsidiary: svaretErSubsidiaert(sak, 'frist'),
    isWithdrawn: f.status === 'trukket',
    isRejectionAccepted: f.status === 'avslatt_akseptert',
    withdrawnReason: f.trukket_begrunnelse,
    withdrawnViaGrunnlag: f.trukket_via_grunnlag,
    sisteOppdatert: f.siste_oppdatert,
    antallVersjoner: f.antall_versjoner,
  };
}

/** Ubesvarte krav inngår ikke i bestridt omfang. */
export function assessedGap(claimed: number, assessed: number | undefined): number | undefined {
  return assessed === undefined ? undefined : Math.max(0, claimed - assessed);
}

/**
 * Etikett for beregningsresultat (godkjent / delvis_godkjent / avslatt).
 * Løs typing: VederlagBeregningResultat inneholder også 'hold_tilbake' som ikke er SporStatus.
 */
export function sporResultatLabel(status: string): string {
  return SPOR_STATUS_LABELS[status as SporStatus] ?? status;
}

/** Saksstatusen i sidefeltet, fra `overordnet_status`. */
export function saksstatus(sak: SakState) {
  return {
    ...getOverordnetStatusStyle(sak.overordnet_status),
    sendt: sak.overordnet_status === 'SENDT',
  };
}

/** Fristsporet har status `sendt`. */
export function fristErSendt(sak: SakState): boolean {
  return sak.frist.status === 'sendt';
}

/** Et spesifisert vederlagskrav eller et fristkrav med dager har status `godkjent` eller `laast`. */
export function harGodkjentKrav(sak: SakState): boolean {
  const godkjent = (status: SporStatus) => status === 'godkjent' || status === 'laast';
  return (
    (!!sak.vederlag.metode && godkjent(sak.vederlag.status)) ||
    (sak.frist.krevd_dager != null && godkjent(sak.frist.status))
  );
}
