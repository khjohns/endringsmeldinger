/**
 * Visningen av linja i sakslisten fra TS (#1023). Saken har ingen samlet status:
 * raden viser saksbetegnelsen i de fire tilfellene i MM-U22, ellers betegnelsen per
 * spor (MM-U30), og tallene som krav, svar og enighet hver for seg (MM-U28).
 */
import type { ComponentProps } from 'svelte';
import type Badge from '$lib/components/primitives/Badge.svelte';
import type { Enighetsvirkning, Saksbetegnelse, Sakslinje } from '$lib/types/api';
import { HOVEDKATEGORI_FRA_KATALOGEN, tilKatalogen } from '$kjerne/format/koder';
import { SPOR } from '$kjerne/typer';
import { getKontraktsforholdLabel } from '$lib/constants/categories';
import { betegnelsestekst } from '$lib/kjernesak/saksbilde';
import { SPORNAVN } from '$lib/components/saksoversikt/foreligger';
import { formatCurrencyCompact, formatDaysCompact } from '$lib/utils/formatters';

type Merkevariant = ComponentProps<typeof Badge>['variant'];

/** Tekstene følger statustekstene i visningen av saken (OV-U10). */
const BETEGNELSE: Record<Saksbetegnelse, { label: string; variant: Merkevariant }> = {
  ikke_forstaatt: { label: 'Ikke forstått', variant: 'uavklart' },
  avslaget_paa_grunnlaget_godtatt: { label: 'Avsluttet: avslått', variant: 'avslatt' },
  grunnlaget_trukket: { label: 'Avsluttet: trukket', variant: 'avslatt' },
  kravene_avgjort: { label: 'Alle krav sendt i appen er avgjort', variant: 'godkjent' },
};

/** Tillegget i visningen av saken (`BREV_UTENFOR_APPEN` i `kjerne/utledning/visning.ts`, OV-U10). */
const BREV_UTENFOR_APPEN = 'Saken har brev sendt utenfor appen. Appen vurderer ikke innholdet.';

export function betegnelsesmerke(linje: Sakslinje) {
  if (!linje.saksbetegnelse) return null;
  const tillegg =
    linje.saksbetegnelse === 'kravene_avgjort' && linje.brev_utenfor_appen
      ? BREV_UTENFOR_APPEN
      : null;
  return { ...BETEGNELSE[linje.saksbetegnelse], tillegg };
}

/** Betegnelsen per spor, for sporene som har en (MM-U30). */
export function sporbetegnelser(linje: Sakslinje): { spor: string; tekst: string }[] {
  return SPOR.flatMap((spor) => {
    const b = linje[spor].betegnelse;
    return b ? [{ spor: SPORNAVN[spor], tekst: betegnelsestekst(b) }] : [];
  });
}

export function kategoritekst(linje: Sakslinje): string {
  const kode = linje.hovedkategori;
  return kode
    ? getKontraktsforholdLabel(String(tilKatalogen(HOVEDKATEGORI_FRA_KATALOGEN, kode)))
    : '';
}

/** Appens lesing av enighetens virkning (MM-U28). */
const VIRKNING: Record<Enighetsvirkning, string> = {
  betinget: 'betinget',
  virksom: 'virksom',
  uten_virkning: 'uten virkning',
};

/**
 * Kravet, og byggherrens svar eller enigheten under kravet. Enigheten står foran
 * svaret når den finnes; et subsidiært tall merkes, fordi et subsidiært standpunkt
 * er et avslag.
 */
function kravtall(
  krav: number | null,
  svar: { tall: number; subsidiaert: boolean } | null,
  enighet: { tall: number | null; virkning: Enighetsvirkning } | null,
  fmt: (n: number | null) => string
) {
  let under: string | null = null;
  if (enighet)
    under = `Enige${enighet.tall === null ? '' : ` ${fmt(enighet.tall)}`}, ${VIRKNING[enighet.virkning]}`;
  else if (svar) under = `BH ${fmt(svar.tall)}${svar.subsidiaert ? ' subsidiært' : ''}`;
  return { krav, kravtekst: fmt(krav), under };
}

export function vederlagstall({ vederlag: v }: Sakslinje) {
  return kravtall(
    v.krav?.beloep ?? null,
    v.svar && { tall: v.svar.beloep, subsidiaert: v.svar.subsidiaert },
    v.enighet && { tall: v.enighet.beloep, virkning: v.enighet.virkning },
    formatCurrencyCompact
  );
}

export function fristtall({ frist: f }: Sakslinje) {
  return kravtall(
    f.krav?.dager ?? null,
    f.svar && { tall: f.svar.dager, subsidiaert: f.svar.subsidiaert },
    f.enighet && { tall: f.enighet.dager, virkning: f.enighet.virkning },
    formatDaysCompact
  );
}
