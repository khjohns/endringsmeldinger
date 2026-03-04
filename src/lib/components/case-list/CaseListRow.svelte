<script lang="ts">
	import type { CaseListItem } from '$lib/types/api';
	import Badge from '$lib/components/primitives/Badge.svelte';
	import {
		formatCurrencyCompact,
		formatDaysCompact,
		formatDateShort
	} from '$lib/utils/formatters';
	import { getHovedkategoriLabel } from '$lib/constants/categories';
	import { resolve } from '$app/paths';
	import { goto } from '$app/navigation';

	interface Props {
		case_item: CaseListItem;
		prosjektId: string;
	}

	let { case_item, prosjektId }: Props = $props();

	type BadgeVariant = 'godkjent' | 'avslatt' | 'delvis' | 'uavklart' | 'na';

	function statusToBadgeVariant(status: string | null): BadgeVariant {
		switch (status) {
			case 'OMFORENT':
			case 'LUKKET':
				return 'godkjent';
			case 'LUKKET_TRUKKET':
				return 'avslatt';
			case 'SENDT':
			case 'VENTER_PAA_SVAR':
			case 'UNDER_BEHANDLING':
			case 'UNDER_FORHANDLING':
				return 'delvis';
			case 'UTKAST':
			default:
				return 'uavklart';
		}
	}

	function getStatusLabel(status: string | null): string {
		switch (status) {
			case 'UTKAST':
				return 'Utkast';
			case 'SENDT':
				return 'Sendt';
			case 'VENTER_PAA_SVAR':
				return 'Venter på svar';
			case 'UNDER_BEHANDLING':
				return 'Under behandling';
			case 'UNDER_FORHANDLING':
				return 'Under forhandling';
			case 'OMFORENT':
				return 'Omforent';
			case 'LUKKET':
				return 'Lukket';
			case 'LUKKET_TRUKKET':
				return 'Trukket';
			default:
				return status ?? '—';
		}
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	type AnyRoute = any;
	const path = $derived(`/${prosjektId}/${case_item.sak_id}` as AnyRoute);
	const tittel = $derived(case_item.cached_title ?? 'Uten tittel');
	const badgeVariant = $derived(statusToBadgeVariant(case_item.cached_status));
	const statusLabel = $derived(getStatusLabel(case_item.cached_status));
	const kategoriLabel = $derived(getHovedkategoriLabel(case_item.cached_hovedkategori));
	const belopKrevd = $derived(formatCurrencyCompact(case_item.cached_sum_krevd));
	const dagerKrevd = $derived(formatDaysCompact(case_item.cached_dager_krevd));
	const sisteAktivitet = $derived(formatDateShort(case_item.last_event_at));

	function handleRowClick() {
		goto(resolve(path));
	}
</script>

<tr class="row" onclick={handleRowClick}>
	<td class="cell cell-id">
		<a href={resolve(path)} class="row-link" aria-label="Åpne sak {case_item.sak_id}">
			<span class="sak-id">{case_item.sak_id}</span>
		</a>
	</td>
	<td class="cell cell-tittel">
		<span class="cell-text">{tittel}</span>
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
		<span class="cell-text cell-text-num">{belopKrevd}</span>
	</td>
	<td class="cell cell-num cell-dager">
		<span class="cell-text cell-text-num">{dagerKrevd}</span>
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
