<script lang="ts">
	interface Props {
		value: number;
		label?: string;
	}

	let { value, label = '' }: Props = $props();

	let clamped = $derived(Math.max(0, Math.min(100, value)));
	let tier = $derived(clamped >= 70 ? 'high' : clamped >= 40 ? 'mid' : 'low');
</script>

<div class="progress" role="progressbar" aria-valuenow={clamped} aria-valuemin={0} aria-valuemax={100} aria-label={label || undefined}>
	{#if label}
		<div class="progress-header">
			<span class="progress-label">{label}</span>
			<span class="progress-value">{clamped}%</span>
		</div>
	{/if}
	<div class="progress-track">
		<div class="progress-fill progress-{tier}" style="width: {clamped}%"></div>
	</div>
</div>

<style>
	.progress {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-1);
	}

	.progress-header {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
	}

	.progress-label {
		font-family: var(--font-ui);
		font-size: 11px;
		font-weight: 500;
		color: var(--color-ink-secondary);
	}

	.progress-value {
		font-family: var(--font-data);
		font-size: 11px;
		font-variant-numeric: tabular-nums;
		color: var(--color-ink-muted);
	}

	.progress-track {
		height: 6px;
		background: var(--color-felt-active);
		border-radius: 999px;
		overflow: hidden;
	}

	.progress-fill {
		height: 100%;
		border-radius: 999px;
		transition: width 300ms ease-out;
	}

	.progress-high {
		background: var(--color-score-high);
	}

	.progress-mid {
		background: var(--color-vekt);
	}

	.progress-low {
		background: var(--color-score-low);
	}
</style>
