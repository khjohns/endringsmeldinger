<script lang="ts">
	import type { Snippet } from 'svelte';
	import { fly } from 'svelte/transition';

	interface Props {
		variant?: 'godkjent' | 'advarsel' | 'kritisk' | 'info';
		children: Snippet;
	}

	let { variant = 'info', children }: Props = $props();
</script>

<div class="callout callout-{variant}" in:fly={{ y: -4, duration: 200 }}>
	<svg class="callout-icon" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
		{#if variant === 'godkjent'}
			<circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.25"/>
			<path d="M5.5 8L7 9.5L10.5 6" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"/>
		{:else if variant === 'advarsel'}
			<path d="M8 2L14.5 13H1.5L8 2Z" stroke="currentColor" stroke-width="1.25" stroke-linejoin="round"/>
			<path d="M8 6.5V9" stroke="currentColor" stroke-width="1.25" stroke-linecap="round"/>
			<circle cx="8" cy="11" r="0.75" fill="currentColor"/>
		{:else if variant === 'kritisk'}
			<circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.25"/>
			<path d="M6 6L10 10M10 6L6 10" stroke="currentColor" stroke-width="1.25" stroke-linecap="round"/>
		{:else}
			<circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.25"/>
			<path d="M8 7V11" stroke="currentColor" stroke-width="1.25" stroke-linecap="round"/>
			<circle cx="8" cy="5" r="0.75" fill="currentColor"/>
		{/if}
	</svg>
	<div class="callout-content">
		{@render children()}
	</div>
</div>

<style>
	.callout {
		display: flex;
		align-items: flex-start;
		gap: var(--spacing-3);
		padding: var(--spacing-3) var(--spacing-4);
		border-left: 3px solid;
		border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
		font-family: var(--font-ui);
		font-size: 13px;
		line-height: 1.5;
	}

	.callout-godkjent {
		border-left-color: var(--color-score-high);
		background: var(--color-score-high-bg);
		color: var(--color-ink);
	}

	.callout-godkjent .callout-icon {
		color: var(--color-score-high);
	}

	.callout-advarsel {
		border-left-color: var(--color-vekt);
		background: var(--color-vekt-bg);
		color: var(--color-ink);
	}

	.callout-advarsel .callout-icon {
		color: var(--color-vekt);
	}

	.callout-kritisk {
		border-left-color: var(--color-score-low);
		background: var(--color-score-low-bg);
		color: var(--color-ink);
	}

	.callout-kritisk .callout-icon {
		color: var(--color-score-low);
	}

	.callout-info {
		border-left-color: var(--color-wire-strong);
		background: var(--color-felt);
		color: var(--color-ink-secondary);
	}

	.callout-info .callout-icon {
		color: var(--color-ink-muted);
	}

	.callout-icon {
		flex-shrink: 0;
		margin-top: 1px;
	}

	.callout-content {
		flex: 1;
		min-width: 0;
	}

</style>
