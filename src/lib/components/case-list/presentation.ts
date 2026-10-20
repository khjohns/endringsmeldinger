/**
 * Visningen av linja i sakslisten fra TS (#1023). Saken har ingen samlet status:
 * raden viser saksbetegnelsen i de fire tilfellene i MM-U22, ellers etikettene per
 * spor, og tallene som krav, svar og enighet hver for seg (MM-U28).
 */
import type { ComponentProps } from 'svelte';
import type Badge from '$lib/components/primitives/Badge.svelte';
import type { Enighetsvirkning, Saksbetegnelse, Sakslinje } from '$lib/types/api';
import { HOVEDKATEGORI_FRA_KATALOGEN } from '$kjerne/format/koder';
import { getKontraktsforholdLabel } from '$lib/constants/categories';
import { etikett } from '$lib/kjernesak/saksbilde';
import { formatCurrencyCompact, formatDaysCompact } from '$lib/utils/formatters';

type Merkevariant = ComponentProps<typeof Badge>['variant'];

/** Tekstene følger statustekstene i visningen av saken (OV-U10). */
const BETEGNELSE: Record<Saksbetegnelse, { label: string; variant: Merkevariant }> = {
  ikke_forstaatt: { label: 'Ikke forstått', variant: 'uavklart' },
  avslaget_paa_grunnlaget_godtatt: { label: 'Avsluttet: avslått', variant: 'avslatt' },
  grunnlaget_trukket: { label: 'Avsluttet: trukket', variant: 'avslatt' },
  kravene_avgjort: { label: 'Alle krav sendt i appen er avgjort', variant: 'godkjent' },
};

export function betegnelsesmerke(linje: Sakslinje) {
  return linje.saksbetegnelse ? BETEGNELSE[linje.saksbetegnelse] : null;
}

const SPORNAVN = { grunnlag: 'Ansvar', vederlag: 'Vederlag', frist: 'Frist' } as const;

/** Etikettene per spor, for sporene som har noen. */
export function sporetiketter(linje: Sakslinje): { spor: string; tekst: string }[] {
  return (['grunnlag', 'vederlag', 'frist'] as const)
    .filter((spor) => linje[spor].etiketter.length)
    .map((spor) => ({
      spor: SPORNAVN[spor],
      tekst: linje[spor].etiketter.map((kode) => etikett(kode).tekst).join(', '),
    }));
}

const KATALOGKODE = Object.fromEntries(
  Object.entries(HOVEDKATEGORI_FRA_KATALOGEN).map(([katalog, kjerne]) => [kjerne, katalog])
);

export function kategoritekst(linje: Sakslinje): string {
  const kode = linje.hovedkategori;
  return kode ? getKontraktsforholdLabel(KATALOGKODE[kode] ?? kode) : '';
}

/** Appens lesing av enighetens virkning (MM-U28). */
const VIRKNING: Record<Enighetsvirkning, string> = {
  betinget: 'betinget',
  virksom: 'virksom',
  uten_virkning: 'uten virkning',
};

/**
 * Byggherrens svar eller enigheten under kravet. Enigheten står foran svaret når
 * den finnes; et subsidiært tall merkes, fordi et subsidiært standpunkt er et avslag.
 */
function underKravet(
  svar: { tall: number; subsidiaert: boolean } | null,
  enighet: { tall: number | null; virkning: Enighetsvirkning } | null,
  fmt: (n: number) => string
): string | null {
  if (enighet)
    return `Enige${enighet.tall === null ? '' : ` ${fmt(enighet.tall)}`}, ${VIRKNING[enighet.virkning]}`;
  if (svar) return `BH ${fmt(svar.tall)}${svar.subsidiaert ? ' subsidiært' : ''}`;
  return null;
}

export function vederlagstall(linje: Sakslinje) {
  const v = linje.vederlag;
  return {
    krav: v.krav?.beloep ?? null,
    kravtekst: formatCurrencyCompact(v.krav?.beloep ?? null),
    under: underKravet(
      v.svar && { tall: v.svar.beloep, subsidiaert: v.svar.subsidiaert },
      v.enighet && { tall: v.enighet.beloep, virkning: v.enighet.virkning },
      (n) => formatCurrencyCompact(n)
    ),
  };
}

export function fristtall(linje: Sakslinje) {
  const f = linje.frist;
  return {
    krav: f.krav?.dager ?? null,
    kravtekst: formatDaysCompact(f.krav?.dager ?? null),
    under: underKravet(
      f.svar && { tall: f.svar.dager, subsidiaert: f.svar.subsidiaert },
      f.enighet && { tall: f.enighet.dager, virkning: f.enighet.virkning },
      (n) => formatDaysCompact(n)
    ),
  };
}
