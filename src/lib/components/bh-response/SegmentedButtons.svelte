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

<div class="verdict-group verdict-{size}" role="radiogroup">
	{#each options as opt}
		<button
			class="verdict-btn"
			class:verdict-selected={selected === opt.value}
			class:verdict-green={opt.colorScheme === 'green' && selected === opt.value}
			class:verdict-red={opt.colorScheme === 'red' && selected === opt.value}
			class:verdict-gray={opt.colorScheme === 'gray' && selected === opt.value}
			role="radio"
			aria-checked={selected === opt.value}
			onclick={() => onselect(opt.value)}
		>
			{#if opt.icon === 'check'}
				<svg width="12" height="12" viewBox="0 0 14 14" fill="none" aria-hidden="true">
					<path d="M3.5 7.5L5.5 9.5L10.5 4.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
				</svg>
			{:else if opt.icon === 'cross'}
				<svg width="12" height="12" viewBox="0 0 14 14" fill="none" aria-hidden="true">
					<path d="M4 4L10 10M10 4L4 10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
				</svg>
			{:else if opt.icon === 'undo'}
				<svg width="12" height="12" viewBox="0 0 14 14" fill="none" aria-hidden="true">
					<path d="M4 5.5H8.5C9.88 5.5 11 6.62 11 8C11 9.38 9.88 10.5 8.5 10.5H7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
					<path d="M6 3.5L4 5.5L6 7.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
				</svg>
			{/if}
			{opt.label}
		</button>
	{/each}
</div>

<style>
	.verdict-group {
		display: flex;
		gap: var(--spacing-2);
	}

	.verdict-btn {
		display: inline-flex;
		align-items: center;
		gap: var(--spacing-1);
		font-family: var(--font-ui);
		font-weight: 500;
		border: 1px solid var(--color-wire);
		border-radius: var(--radius-sm);
		cursor: pointer;
		background: transparent;
		color: var(--color-ink-muted);
		transition: background-color 0.12s, color 0.12s, border-color 0.12s;
		white-space: nowrap;
	}

	.verdict-md .verdict-btn {
		height: 32px;
		padding: 0 var(--spacing-3);
		font-size: 12px;
	}

	.verdict-sm .verdict-btn {
		height: 28px;
		padding: 0 var(--spacing-2);
		font-size: 11px;
	}

	.verdict-btn:hover:not(.verdict-selected) {
		background: var(--color-felt);
		color: var(--color-ink-secondary);
		border-color: var(--color-wire-strong);
	}

	.verdict-selected {
		font-weight: 500;
		color: var(--color-ink);
		background: var(--color-felt);
		border-color: var(--color-wire-strong);
	}

	.verdict-green {
		color: var(--color-score-high);
		background: var(--color-score-high-bg);
		border-color: rgba(16, 185, 129, 0.25);
	}

	.verdict-red {
		color: var(--color-score-low);
		background: var(--color-score-low-bg);
		border-color: rgba(225, 29, 72, 0.20);
	}

	.verdict-gray {
		color: var(--color-ink-secondary);
		background: var(--color-felt-active);
		border-color: var(--color-wire-strong);
	}
</style>
