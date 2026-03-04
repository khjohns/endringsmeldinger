<script lang="ts">
	import { Tooltip } from 'bits-ui';
	import type { Snippet } from 'svelte';

	interface Props {
		content: string;
		children: Snippet;
	}

	let { content, children }: Props = $props();
</script>

<Tooltip.Root delayDuration={300}>
	<Tooltip.Trigger class="tooltip-trigger">
		{@render children()}
	</Tooltip.Trigger>
	<Tooltip.Portal>
		<Tooltip.Content sideOffset={6} class="tooltip-content">
			{content}
		</Tooltip.Content>
	</Tooltip.Portal>
</Tooltip.Root>

<style>
	:global(.tooltip-trigger) {
		display: inline-flex;
		background: none;
		border: none;
		padding: 0;
		cursor: inherit;
		color: inherit;
		font: inherit;
	}

	:global(.tooltip-content) {
		z-index: 50;
		padding: var(--spacing-2) var(--spacing-3);
		background: var(--color-felt-raised);
		border: 1px solid var(--color-wire-strong);
		border-radius: var(--radius-sm);
		font-family: var(--font-ui);
		font-size: 12px;
		color: var(--color-ink);
		max-width: 240px;
		line-height: 1.4;
		animation: tooltip-in 0.12s ease-out;
	}

	@keyframes tooltip-in {
		from {
			opacity: 0;
			transform: translateY(2px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}
</style>
