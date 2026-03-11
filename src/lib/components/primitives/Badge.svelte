<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		variant: 'godkjent' | 'avslatt' | 'delvis' | 'uavklart' | 'na';
		children: Snippet;
	}

	let { variant, children }: Props = $props();
</script>

<span class="badge badge-{variant}" role="status">
	{@render children()}
</span>

<style>
	.badge {
		display: inline-flex;
		align-items: center;
		padding: 2px 8px;
		font-family: var(--font-ui);
		font-size: 10px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		line-height: 1.4;
		border-radius: var(--radius-sm);
		white-space: nowrap;
	}

	.badge-godkjent {
		color: var(--color-score-high);
		background: var(--color-score-high-bg);
	}

	.badge-avslatt {
		color: var(--color-score-low);
		background: var(--color-score-low-bg);
	}

	.badge-delvis {
		color: var(--color-vekt);
		background: var(--color-vekt-bg);
	}

	.badge-uavklart {
		color: var(--color-ink-muted);
		background: var(--color-felt-active);
	}

	.badge-na {
		color: var(--color-ink-muted);
		background: transparent;
	}
</style>
