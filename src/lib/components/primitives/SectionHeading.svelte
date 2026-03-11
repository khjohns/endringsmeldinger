<script lang="ts">
	interface Props {
		title: string;
		paragrafRef?: string;
	}

	let { title, paragrafRef = '' }: Props = $props();
</script>

<div class="section-heading">
	<span class="section-title">{title}</span>
	{#if paragrafRef}
		<span class="section-ref">{paragrafRef}</span>
	{/if}
</div>

<style>
	.section-heading {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: var(--spacing-3);
		padding-bottom: var(--spacing-2);
		border-bottom: 1px solid var(--color-wire);
	}

	.section-title {
		font-family: var(--font-ui);
		font-size: 11px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--color-ink-muted);
	}

	.section-ref {
		font-family: var(--font-ui);
		font-size: 11px;
		font-weight: 400;
		color: var(--color-ink-muted);
	}
</style>
