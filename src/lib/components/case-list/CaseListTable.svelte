<script lang="ts">
	import type { CaseListItem } from '$lib/types/api';
	import CaseListRow from './CaseListRow.svelte';

	interface Props {
		cases: CaseListItem[];
		prosjektId: string;
	}

	let { cases, prosjektId }: Props = $props();

	type SortKey = 'sak_id' | 'cached_title' | 'cached_status' | 'cached_hovedkategori' | 'cached_sum_krevd' | 'cached_dager_krevd' | 'last_event_at';
	type SortDir = 'asc' | 'desc';

	let sortKey = $state<SortKey>('last_event_at');
	let sortDir = $state<SortDir>('desc');

	function toggleSort(key: SortKey) {
		if (sortKey === key) {
			sortDir = sortDir === 'asc' ? 'desc' : 'asc';
		} else {
			sortKey = key;
			sortDir = key === 'last_event_at' ? 'desc' : 'asc';
		}
	}

	function compareValues(a: unknown, b: unknown, dir: SortDir): number {
		if (a === null || a === undefined) return dir === 'asc' ? 1 : -1;
		if (b === null || b === undefined) return dir === 'asc' ? -1 : 1;
		if (typeof a === 'number' && typeof b === 'number') {
			return dir === 'asc' ? a - b : b - a;
		}
		const aStr = String(a).toLowerCase();
		const bStr = String(b).toLowerCase();
		if (aStr < bStr) return dir === 'asc' ? -1 : 1;
		if (aStr > bStr) return dir === 'asc' ? 1 : -1;
		return 0;
	}

	const sortedCases = $derived(
		[...cases].sort((a, b) => compareValues(a[sortKey], b[sortKey], sortDir))
	);

	const columns: { key: SortKey; label: string; numeric?: boolean }[] = [
		{ key: 'sak_id', label: 'Sak-ID' },
		{ key: 'cached_title', label: 'Tittel' },
		{ key: 'cached_status', label: 'Status' },
		{ key: 'cached_hovedkategori', label: 'Kategori' },
		{ key: 'cached_sum_krevd', label: 'Krevd', numeric: true },
		{ key: 'cached_dager_krevd', label: 'Dager', numeric: true },
		{ key: 'last_event_at', label: 'Siste aktivitet' },
	];
</script>

<div class="table-wrapper">
	<table class="table">
		<thead class="thead">
			<tr>
				{#each columns as col (col.key)}
					<th
						class="th"
						class:th-active={sortKey === col.key}
						class:th-numeric={col.numeric}
						scope="col"
						aria-sort={sortKey === col.key
							? sortDir === 'asc'
								? 'ascending'
								: 'descending'
							: 'none'}
					>
						<button
							class="sort-btn"
							class:sort-btn-numeric={col.numeric}
							onclick={() => toggleSort(col.key)}
						>
							{col.label}
							<span class="sort-icon" aria-hidden="true">
								{#if sortKey === col.key}
									{sortDir === 'asc' ? '▴' : '▾'}
								{:else}
									<span class="sort-icon-ghost">▴</span>
								{/if}
							</span>
						</button>
					</th>
				{/each}
			</tr>
		</thead>
		<tbody>
			{#each sortedCases as case_item (case_item.sak_id)}
				<CaseListRow {case_item} {prosjektId} />
			{/each}
		</tbody>
	</table>
</div>

<style>
	.table-wrapper {
		width: 100%;
		overflow-x: auto;
		border: 1px solid var(--color-wire);
		border-radius: var(--radius-md);
		background: var(--color-felt);
	}

	.table {
		width: 100%;
		border-collapse: collapse;
		font-family: var(--font-ui);
	}

	.thead {
		position: sticky;
		top: 0;
		z-index: 1;
		background: var(--color-felt);
		border-bottom: 1px solid var(--color-wire-strong);
	}

	.th {
		padding: 0;
		text-align: left;
		white-space: nowrap;
	}

	.th-numeric {
		text-align: right;
	}

	.sort-btn {
		display: flex;
		align-items: center;
		gap: 4px;
		width: 100%;
		padding: 8px 12px;
		background: none;
		border: none;
		cursor: pointer;
		font-family: var(--font-ui);
		font-size: 10px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--color-ink-muted);
		white-space: nowrap;
	}

	.sort-btn:hover {
		color: var(--color-ink-secondary);
	}

	.sort-btn-numeric {
		justify-content: flex-end;
	}

	.th-active .sort-btn {
		color: var(--color-ink);
	}

	.sort-icon {
		font-size: 9px;
		color: var(--color-ink);
		line-height: 1;
	}

	.sort-icon-ghost {
		color: var(--color-ink-ghost);
	}
</style>
