<script lang="ts">
	import type { VarslingItem } from '$lib/utils/varslingStatus';
	import { varslingSymbol } from '$lib/utils/varslingStatus';

	interface Props {
		items: VarslingItem[];
	}

	let { items }: Props = $props();
</script>

{#if items.length > 0}
	<section class="varsling-section" aria-label="Varslingsstatus">
		<h3 class="section-label">Varsling</h3>
		<ul class="varsling-list">
			{#each items as item (item.label)}
				<li
					class="varsling-item"
					class:ok={item.status === 'ok'}
					class:warning={item.status === 'warning'}
					class:breach={item.status === 'breach'}
					class:na={item.status === 'na'}
					title={item.paragrafRef}
				>
					<span class="varsling-symbol" aria-hidden="true">{varslingSymbol(item.status)}</span>
					<span class="varsling-label">{item.label}</span>
				</li>
			{/each}
		</ul>
	</section>
{/if}

<style>
	.varsling-section {
		padding: 12px 16px;
	}

	.section-label {
		font-size: 11px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--color-ink-muted);
		margin: 0 0 8px 0;
	}

	.varsling-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.varsling-item {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 13px;
		line-height: 1.4;
		color: var(--color-ink-secondary);
	}

	.varsling-item.ok {
		color: var(--color-score-high);
	}

	.varsling-item.warning {
		color: var(--color-vekt);
	}

	.varsling-item.breach {
		color: var(--color-score-low);
	}

	.varsling-item.na {
		color: var(--color-ink-ghost);
	}

	.varsling-symbol {
		width: 16px;
		flex-shrink: 0;
		text-align: center;
		font-size: 12px;
	}

	.varsling-label {
		flex-shrink: 0;
	}
</style>
