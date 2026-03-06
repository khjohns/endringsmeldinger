<script lang="ts">
	interface Option {
		value: string;
		label: string;
		icon?: 'check' | 'cross' | 'undo';
		colorScheme?: 'green' | 'red' | 'gray';
	}

	interface Props {
		options: Option[];
		selected: string | undefined;
		onselect: (value: string) => void;
		size?: 'sm' | 'md';
	}

	let { options, selected, onselect, size = 'md' }: Props = $props();
</script>

<div class="segmented segmented-{size}" role="radiogroup">
	{#each options as opt}
		<button
			class="seg-btn"
			class:seg-selected={selected === opt.value}
			class:seg-green={opt.colorScheme === 'green' && selected === opt.value}
			class:seg-red={opt.colorScheme === 'red' && selected === opt.value}
			class:seg-gray={opt.colorScheme === 'gray' && selected === opt.value}
			role="radio"
			aria-checked={selected === opt.value}
			onclick={() => onselect(opt.value)}
		>
			{#if opt.icon === 'check'}
				<svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
					<path d="M3.5 7.5L5.5 9.5L10.5 4.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
				</svg>
			{:else if opt.icon === 'cross'}
				<svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
					<path d="M4 4L10 10M10 4L4 10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
				</svg>
			{:else if opt.icon === 'undo'}
				<svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
					<path d="M4 5.5H8.5C9.88 5.5 11 6.62 11 8C11 9.38 9.88 10.5 8.5 10.5H7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
					<path d="M6 3.5L4 5.5L6 7.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
				</svg>
			{/if}
			{opt.label}
		</button>
	{/each}
</div>

<style>
	.segmented {
		display: flex;
		gap: 1px;
		background: var(--color-wire);
		border: 1px solid var(--color-wire-strong);
		border-radius: var(--radius-sm);
		overflow: hidden;
	}

	.seg-btn {
		flex: 1;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: var(--spacing-1);
		font-family: var(--font-ui);
		font-weight: 600;
		border: none;
		cursor: pointer;
		background: var(--color-felt);
		color: var(--color-ink-muted);
		transition: background-color 0.12s, color 0.12s;
		white-space: nowrap;
	}

	.segmented-md .seg-btn {
		height: 36px;
		padding: 0 var(--spacing-4);
		font-size: 13px;
	}

	.segmented-sm .seg-btn {
		height: 30px;
		padding: 0 var(--spacing-3);
		font-size: 12px;
	}

	.seg-btn:hover:not(.seg-selected) {
		background: var(--color-felt-hover);
		color: var(--color-ink-secondary);
	}

	.seg-selected {
		background: var(--color-felt-raised);
		color: var(--color-ink);
	}

	.seg-green {
		background: var(--color-score-high-bg);
		color: var(--color-score-high);
	}

	.seg-red {
		background: var(--color-score-low-bg);
		color: var(--color-score-low);
	}

	.seg-gray {
		background: var(--color-felt-active);
		color: var(--color-ink-secondary);
	}
</style>
