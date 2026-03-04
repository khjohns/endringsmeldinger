<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		variant?: 'warning' | 'danger' | 'info';
		children: Snippet;
	}

	let { variant = 'info', children }: Props = $props();
</script>

<div class="alert alert-{variant}" role="alert">
	<svg class="alert-icon" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
		{#if variant === 'warning'}
			<path d="M8 2L14.5 13H1.5L8 2Z" stroke="currentColor" stroke-width="1.25" stroke-linejoin="round"/>
			<path d="M8 6.5V9" stroke="currentColor" stroke-width="1.25" stroke-linecap="round"/>
			<circle cx="8" cy="11" r="0.75" fill="currentColor"/>
		{:else if variant === 'danger'}
			<circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.25"/>
			<path d="M6 6L10 10M10 6L6 10" stroke="currentColor" stroke-width="1.25" stroke-linecap="round"/>
		{:else}
			<circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.25"/>
			<path d="M8 7V11" stroke="currentColor" stroke-width="1.25" stroke-linecap="round"/>
			<circle cx="8" cy="5" r="0.75" fill="currentColor"/>
		{/if}
	</svg>
	<div class="alert-content">
		{@render children()}
	</div>
</div>

<style>
	.alert {
		display: flex;
		align-items: flex-start;
		gap: var(--spacing-3);
		padding: var(--spacing-3) var(--spacing-4);
		border-radius: var(--radius-md);
		border-left: 3px solid;
		font-family: var(--font-ui);
		font-size: 13px;
		line-height: 1.5;
	}

	.alert-warning {
		border-left-color: var(--color-vekt);
		background: var(--color-vekt-bg);
		color: var(--color-ink);
	}

	.alert-warning .alert-icon {
		color: var(--color-vekt);
	}

	.alert-danger {
		border-left-color: var(--color-score-low);
		background: var(--color-score-low-bg);
		color: var(--color-ink);
	}

	.alert-danger .alert-icon {
		color: var(--color-score-low);
	}

	.alert-info {
		border-left-color: var(--color-wire-strong);
		background: var(--color-felt);
		color: var(--color-ink-secondary);
	}

	.alert-info .alert-icon {
		color: var(--color-ink-muted);
	}

	.alert-icon {
		flex-shrink: 0;
		margin-top: 1px;
	}

	.alert-content {
		flex: 1;
		min-width: 0;
	}
</style>
