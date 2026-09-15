<script lang="ts">
  import type { CaseListItem } from '$lib/types/api';
  import Badge from '$lib/components/primitives/Badge.svelte';
  import { formatCurrencyCompact, formatDaysCompact, formatDateShort } from '$lib/utils/formatters';
  import { getKontraktsforholdLabel } from '$lib/constants/categories';
  import { getOverordnetStatusLabel } from '$lib/constants/statusLabels';
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import { caseAmount, caseDays } from './presentation';
  import { caseStatus } from '$lib/components/saksoversikt/overview';

  interface Props {
    case_item: CaseListItem;
    prosjektId: string;
    href?: string;
  }

  let { case_item, prosjektId, href }: Props = $props();

  type BadgeVariant = 'godkjent' | 'avslatt' | 'delvis' | 'uavklart' | 'na';

  function statusToBadgeVariant(status: string | null): BadgeVariant {
    switch (status) {
      case 'OMFORENT':
      case 'LUKKET':
      case 'akseptert':
        return 'godkjent';
      case 'LUKKET_TRUKKET':
      case 'bestridt':
        return 'avslatt';
      case 'SENDT':
      case 'VENTER_PAA_SVAR':
      case 'UNDER_BEHANDLING':
      case 'UNDER_FORHANDLING':
      case 'utstedt':
      case 'revidert':
        return 'delvis';
      case 'UTKAST':
      default:
        return 'uavklart';
    }
  }

  const path = $derived(
    href ??
      resolve('/[prosjektId]/[sakId]', {
        prosjektId: encodeURIComponent(prosjektId),
        sakId: encodeURIComponent(case_item.sak_id),
      })
  );
  const tittel = $derived(case_item.cached_title ?? 'Uten tittel');
  const isOrder = $derived(case_item.sakstype === 'endringsordre');
  const status = $derived(caseStatus(case_item));
  const badgeVariant = $derived(statusToBadgeVariant(status));
  const eoStatusLabels: Record<string, string> = {
    utkast: 'Utkast',
    utstedt: 'Utstedt',
    akseptert: 'Akseptert',
    bestridt: 'Bestridt',
    revidert: 'Revidert',
  };
  const statusLabel = $derived(
    status
      ? (eoStatusLabels[status] ??
          getOverordnetStatusLabel(status as import('$lib/types/timeline').OverordnetStatus))
      : '—'
  );
  const linkedCount = $derived(case_item.endringsordre_data?.relaterte_koe_saker.length ?? 0);
  const kategoriLabel = $derived(
    isOrder
      ? case_item.endringsordre_data
        ? linkedCount
          ? `${linkedCount} KOE · enighet`
          : 'Direkte pålegg'
        : '—'
      : getKontraktsforholdLabel(case_item.cached_hovedkategori)
  );
  const belopKrevd = $derived(
    isOrder && case_item.endringsordre_data && caseAmount(case_item) === null
      ? 'Uavklart'
      : formatCurrencyCompact(caseAmount(case_item))
  );
  const dagerKrevd = $derived(
    isOrder && case_item.endringsordre_data && caseDays(case_item) === null
      ? 'Uavklart'
      : formatDaysCompact(caseDays(case_item))
  );
  const amountLabel = $derived(
    isOrder
      ? case_item.endringsordre_data?.er_estimat
        ? 'Estimat i EO'
        : 'Vederlag i EO'
      : 'Krevd'
  );
  const sisteAktivitet = $derived(formatDateShort(case_item.last_event_at));

  function handleRowClick(event: MouseEvent) {
    // Let native links handle keyboard activation and opening a new tab.
    if (event.target instanceof Element && event.target.closest('a, button')) return;
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
      return;
    if (window.getSelection()?.toString()) return;
    // Allerede resolvet der verdien bygges.
    // eslint-disable-next-line svelte/no-navigation-without-resolve
    goto(path);
  }
</script>

<tr class="row" onclick={handleRowClick}>
  <td class="cell cell-id">
    <!-- Allerede resolvet der verdien bygges. -->
    <!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
    <a href={path} class="row-link" aria-label="Åpne sak {case_item.sak_id}">
      <span class="sak-id">{case_item.endringsordre_data?.eo_nummer || case_item.sak_id}</span>
    </a>
  </td>
  <td class="cell cell-tittel">
    <span class="cell-text">{tittel}</span>
    <span class="case-type" class:order={isOrder}>
      {isOrder ? 'Endringsordre' : case_item.sakstype === 'forsering' ? 'Forsering' : 'KOE-krav'}
    </span>
  </td>
  <td class="cell cell-status">
    <div class="cell-inner">
      <Badge variant={badgeVariant}>{statusLabel}</Badge>
    </div>
  </td>
  <td class="cell cell-kategori">
    <span class="cell-text cell-text-muted">{kategoriLabel || '—'}</span>
  </td>
  <td class="cell cell-num cell-belop">
    <span class="cell-text cell-text-num" aria-label={`${amountLabel}: ${belopKrevd}`}
      >{belopKrevd}</span
    >
    {#if isOrder}<span class="value-label">{amountLabel}</span>{/if}
  </td>
  <td class="cell cell-num cell-dager">
    <span
      class="cell-text cell-text-num"
      aria-label={`${isOrder ? 'Fristjustering i EO' : 'Krevd frist'}: ${dagerKrevd}`}
      >{dagerKrevd}</span
    >
  </td>
  <td class="cell cell-date">
    <span class="cell-text cell-text-date">{sisteAktivitet}</span>
  </td>
</tr>

<style>
  .row {
    border-bottom: 1px solid var(--color-wire);
    cursor: pointer;
  }

  .row:hover {
    background: var(--color-felt-hover);
  }

  .row:last-child {
    border-bottom: none;
  }

  .cell {
    padding: 0;
  }

  .cell-inner {
    display: flex;
    align-items: center;
    padding: 10px 12px;
  }

  .cell-text {
    display: block;
    padding: 10px 12px;
    font-size: 13px;
    line-height: 1.4;
    color: var(--color-ink);
  }

  .cell-text-muted {
    color: var(--color-ink-secondary);
    font-size: 12px;
  }

  .cell-tittel .cell-text {
    padding-bottom: 3px;
  }

  .case-type {
    display: block;
    padding: 0 12px 10px;
    color: var(--color-ink-muted);
    font-size: 10px;
    font-weight: 550;
  }

  .case-type.order {
    color: var(--color-vekt);
  }

  .value-label {
    display: block;
    margin-top: -6px;
    padding: 0 12px 10px;
    color: var(--color-ink-muted);
    font-size: 10px;
    text-align: right;
  }

  .cell-text-num {
    font-family: var(--font-data);
    font-size: 12px;
    font-variant-numeric: tabular-nums;
    display: block;
    text-align: right;
    padding: 10px 12px;
    color: var(--color-ink-secondary);
  }

  .cell-text-date {
    font-family: var(--font-data);
    font-size: 12px;
    color: var(--color-ink-muted);
  }

  .row-link {
    background: transparent;
    border: 0;
    font: inherit;
    cursor: pointer;
    text-align: left;
    display: block;
    padding: 10px 12px;
    color: inherit;
    text-decoration: none;
    line-height: 1.4;
  }

  .row-link:focus-visible {
    outline: 2px solid var(--color-wire-focus);
    outline-offset: -2px;
  }

  .sak-id {
    font-family: var(--font-data);
    font-size: 12px;
    color: var(--color-ink-secondary);
  }
</style>
