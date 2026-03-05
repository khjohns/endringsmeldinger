<script lang="ts">
	import { browser } from '$app/environment';
	import type { SakState } from '$lib/types/timeline';

	interface Props {
		sakState: SakState;
	}

	let { sakState }: Props = $props();

	// Reactive role state — reads from localStorage, writes back on toggle
	let userRole: 'TE' | 'BH' = $state(
		browser ? (localStorage.getItem('koe-user-role') as 'TE' | 'BH') ?? 'TE' : 'TE'
	);

	function toggleRole() {
		userRole = userRole === 'TE' ? 'BH' : 'TE';
		if (browser) {
			localStorage.setItem('koe-user-role', userRole);
			// Notify other components (Sporkort reads role independently)
			window.dispatchEvent(new StorageEvent('storage', { key: 'koe-user-role', newValue: userRole }));
		}
	}

	// Calculate pending actions for BH role
	const pendingActions = $derived(
		userRole === 'BH'
			? [
					sakState.grunnlag.status === 'sendt' ? 'Svar på ansvarsgrunnlag' : null,
					sakState.vederlag.status === 'sendt' ? 'Svar på vederlagskrav' : null,
					sakState.frist.status === 'sendt' ? 'Svar på fristkrav' : null,
				].filter((a): a is string => a !== null)
			: []
	);

	// Check passivitet: grunnlag sendt > 14 dager siden
	const harPassivitet = $derived(
		sakState.grunnlag.status === 'sendt' &&
			!!sakState.grunnlag.siste_oppdatert &&
			(Date.now() - new Date(sakState.grunnlag.siste_oppdatert).getTime()) / (1000 * 60 * 60 * 24) >
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
			? `Ingen handlinger. Venter på ${sakState.neste_handling.rolle ?? 'TE'}.`
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

	<button class="role-toggle" onclick={toggleRole} title="Bytt rolle (dev)">
		<span class="role-option" class:role-active={userRole === 'BH'}>BH</span>
		<span class="role-option" class:role-active={userRole === 'TE'}>TE</span>
	</button>
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
		border-bottom-color: rgba(245, 158, 11, 0.2);
	}

	.action-banner[data-variant='rose'] {
		color: var(--color-score-low);
		background: var(--color-score-low-bg);
		border-bottom-color: rgba(225, 29, 72, 0.2);
	}

	.icon {
		flex-shrink: 0;
	}

	.text {
		line-height: 1;
	}

	.role-toggle {
		margin-left: auto;
		display: flex;
		gap: 0;
		background: var(--color-canvas);
		border: 1px solid var(--color-wire);
		border-radius: var(--radius-sm);
		padding: 0;
		cursor: pointer;
		overflow: hidden;
	}

	.role-option {
		font-family: var(--font-ui);
		font-size: 10px;
		font-weight: 600;
		padding: 2px 8px;
		color: var(--color-ink-muted);
		transition: all 120ms ease;
	}

	.role-active {
		background: var(--color-felt-raised);
		color: var(--color-ink);
	}
</style>
