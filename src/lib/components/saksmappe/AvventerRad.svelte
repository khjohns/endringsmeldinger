<script lang="ts">
	import type { SporType, SakState } from '$lib/types/timeline';
	import { getPartsNavn } from '$lib/utils/partsNavn';
	import { isAwaitingResponse } from '$lib/utils/sporStatus';

	interface Props {
		sporType: SporType;
		state: SakState;
		onAction?: () => void;
	}

	let { sporType, state, onAction }: Props = $props();

	const trackState = $derived(state[sporType]);

	// Show when the track is awaiting a response (BH must act)
	const isAwaiting = $derived(isAwaitingResponse(trackState.status));

	const expectedActorName = $derived(
		getPartsNavn('BH', state.entreprenor, state.byggherre)
	);

	// Revision label
	const revLabel = $derived.by(() => {
		const v = trackState.antall_versjoner;
		if (v <= 1) return '';
		return ` (Rev ${v - 1})`;
	});

	// Document reference
	const docRef = $derived.by(() => {
		if (sporType === 'grunnlag') return `grunnlag${revLabel}`;
		if (sporType === 'vederlag') return `vederlagskrav${revLabel}`;
		if (sporType === 'frist') return `fristkrav${revLabel}`;
		return '';
	});

	// Action label
	const actionLabel = $derived.by(() => {
		if (sporType === 'grunnlag') return 'Svar på grunnlag';
		if (sporType === 'vederlag') return 'Svar på krav';
		if (sporType === 'frist') return 'Svar på fristkrav';
		return 'Svar';
	});

	function handleClick(e: MouseEvent) {
		e.stopPropagation();
		onAction?.();
	}
</script>

{#if isAwaiting}
	<div class="avventer-rad" data-spor={sporType}>
		<div class="avventer-tekst">
			<span class="avventer-ikon" aria-hidden="true">◇</span>
			<span class="avventer-label">Forventet: {expectedActorName} svarer på {docRef}</span>
		</div>
		<button class="avventer-action" onclick={handleClick}>
			{actionLabel} →
		</button>
	</div>
{/if}

<style>
	.avventer-rad {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 8px;
		margin-top: 4px;
		padding-top: 8px;
		border-top: 1px dashed var(--color-wire);
	}

	.avventer-tekst {
		display: flex;
		align-items: baseline;
		gap: 6px;
		min-width: 0;
	}

	.avventer-ikon {
		color: var(--color-ink-muted);
		font-size: 10px;
		flex-shrink: 0;
		line-height: 1;
	}

	.avventer-label {
		font-family: var(--font-ui);
		font-size: 11px;
		color: var(--color-ink-muted);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.avventer-action {
		font-family: var(--font-data);
		font-size: 10px;
		color: var(--color-ink-muted);
		background: none;
		border: none;
		cursor: pointer;
		white-space: nowrap;
		flex-shrink: 0;
		padding: 0;
		transition: color 150ms ease;
	}

	.avventer-action:hover {
		color: var(--color-vekt);
	}

	.avventer-action:active {
		color: var(--color-vekt-dim);
	}

	[data-spor='frist'] .avventer-action:hover {
		color: var(--color-score-low);
	}
</style>
