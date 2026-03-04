<script lang="ts" generics="T extends string">
	interface VerdictOption {
		id: T;
		label: string;
		variant: 'godkjent' | 'delvis' | 'avslatt';
	}

	interface Props {
		value: T | null;
		options: VerdictOption[];
		onchange: (value: T) => void;
	}

	let { value, options, onchange }: Props = $props();

	const variantColors: Record<string, { color: string; bg: string }> = {
		godkjent: { color: 'var(--color-score-high)', bg: 'var(--color-score-high-bg)' },
		delvis: { color: 'var(--color-vekt)', bg: 'var(--color-vekt-bg)' },
		avslatt: { color: 'var(--color-score-low)', bg: 'var(--color-score-low-bg)' }
	};
</script>

<div class="verdict-group" role="group">
	{#each options as option, i (option.id)}
		{@const active = value === option.id}
		{@const colors = variantColors[option.variant]}
		<button
			class="verdict-btn"
			class:verdict-first={i === 0}
			class:verdict-last={i === options.length - 1}
			class:verdict-middle={i > 0 && i < options.length - 1}
			class:verdict-active={active}
			style:--verdict-color={colors.color}
			style:--verdict-bg={colors.bg}
			onclick={() => onchange(option.id)}
			aria-pressed={active}
		>
			{option.label}
		</button>
	{/each}
</div>

<style>
	.verdict-group {
		display: inline-flex;
	}

	.verdict-btn {
		height: 36px;
		min-width: 52px;
		padding: 0 var(--spacing-4);
		font-family: var(--font-ui);
		font-size: 13px;
		font-weight: 600;
		border: 1px solid var(--color-wire-strong);
		background: transparent;
		color: var(--color-ink-secondary);
		cursor: pointer;
		transition: background-color 0.12s, color 0.12s, border-color 0.12s;
	}

	.verdict-first {
		border-radius: var(--radius-sm) 0 0 var(--radius-sm);
	}

	.verdict-middle {
		border-left: none;
	}

	.verdict-last {
		border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
		border-left: none;
	}

	/* Single button (both first and last) */
	.verdict-first.verdict-last {
		border-radius: var(--radius-sm);
	}

	.verdict-btn:hover:not(.verdict-active) {
		background: var(--color-felt-hover);
		color: var(--color-ink);
	}

	.verdict-btn:focus-visible {
		outline: none;
		border-color: var(--color-wire-focus);
		box-shadow: 0 0 0 2px var(--color-vekt-bg);
		z-index: 1;
		position: relative;
	}

	.verdict-active {
		background: var(--verdict-bg);
		color: var(--verdict-color);
		border-color: var(--verdict-color);
	}

	/* Fix left border for button after active */
	.verdict-active + .verdict-btn {
		border-left-color: var(--verdict-color);
	}
</style>
