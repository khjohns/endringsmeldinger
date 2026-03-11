<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		children: Snippet;
	}

	let { children }: Props = $props();
</script>

<section class="form-section">
	{@render children()}
</section>

<style>
	.form-section {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-3);
	}

	.form-section :global(.helptext) {
		font-size: 13px;
		color: var(--color-ink-secondary);
		line-height: 1.5;
		margin: 0;
	}

	.form-section :global(.field-amount) {
		max-width: 240px;
	}

	.form-section :global(.field-auto) {
		width: fit-content;
	}
</style>
