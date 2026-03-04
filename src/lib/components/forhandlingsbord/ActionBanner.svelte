<script lang="ts">
	import { browser } from '$app/environment';
	import type { SakState } from '$lib/types/timeline';

	interface Props {
		state: SakState;
	}

	let { state }: Props = $props();

	// Read user role from localStorage (default 'TE')
	const userRole = $derived(
		browser ? (localStorage.getItem('koe-user-role') ?? 'TE') : 'TE'
	);

	// Calculate pending actions for BH role
	const pendingActions = $derived(
		userRole === 'BH'
			? [
					state.grunnlag.status === 'sendt' ? 'Svar på ansvarsgrunnlag' : null,
					state.vederlag.status === 'sendt' ? 'Svar på vederlagskrav' : null,
					state.frist.status === 'sendt' ? 'Svar på fristkrav' : null,
				].filter((a): a is string => a !== null)
			: []
	);

	// Check passivitet: grunnlag sendt > 14 dager siden
	const harPassivitet = $derived(
		state.grunnlag.status === 'sendt' &&
			!!state.grunnlag.siste_oppdatert &&
			(Date.now() - new Date(state.grunnlag.siste_oppdatert).getTime()) / (1000 * 60 * 60 * 24) >
				14
	);

	// Determine banner variant
	const variant = $derived(
		pendingActions.length === 0
			? 'none'
			: harPassivitet
				? 'rose'
				: 'amber'
	);

	// Banner text
	const bannerText = $derived(
		pendingActions.length === 0
			? `Ingen handlinger. Venter på ${state.neste_handling.rolle ?? 'TE'}.`
			: pendingActions.length === 1
				? pendingActions[0]
				: `${pendingActions.length} handlinger venter på deg`
	);
</script>

<div class="action-banner" data-variant={variant} role="status" aria-live="polite">
	{#if variant !== 'none'}
		<span class="icon" aria-hidden="true">⚠</span>
	{/if}
	<span class="text">{bannerText}</span>
</div>

<style>
	.action-banner {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 8px 16px;
		border-bottom: 1px solid var(--color-wire-strong);
		background: var(--color-felt);
		font-family: var(--font-ui);
		font-size: 12px;
		font-weight: 600;
		position: sticky;
		top: 0;
		z-index: 10;
	}

	.action-banner[data-variant='none'] {
		color: var(--color-ink-muted);
	}

	.action-banner[data-variant='amber'] {
		color: var(--color-vekt);
		background: var(--color-vekt-bg);
		border-bottom-color: rgba(232, 168, 56, 0.2);
	}

	.action-banner[data-variant='rose'] {
		color: var(--color-score-low);
		background: var(--color-score-low-bg);
		border-bottom-color: rgba(196, 88, 88, 0.2);
	}

	.icon {
		flex-shrink: 0;
	}

	.text {
		line-height: 1;
	}
</style>
