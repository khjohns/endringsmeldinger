<script lang="ts">
	import type { SporType, SporStatus } from '$lib/types/timeline';
	import type { VarslingItem } from '$lib/utils/varslingStatus';
	import { varslingSymbol } from '$lib/utils/varslingStatus';
	import { browser } from '$app/environment';
	import Badge from '$lib/components/primitives/Badge.svelte';

	interface Props {
		sporType: SporType;
		status: SporStatus;
		varsling: VarslingItem[];
		action: { label: string; urgent: boolean } | null;
		prosjektId: string;
		sakId: string;
	}

	let { sporType, status, varsling, action }: Props = $props();

	const SPOR_LABELS: Record<SporType, string> = {
		grunnlag: 'ANSVARSGRUNNLAG',
		vederlag: 'VEDERLAG',
		frist: 'FRISTFORLENGELSE',
	};

	const STATUS_TO_BADGE: Record<SporStatus, 'godkjent' | 'avslatt' | 'delvis' | 'uavklart' | 'na'> = {
		ikke_relevant: 'na',
		utkast: 'na',
		sendt: 'uavklart',
		under_behandling: 'uavklart',
		godkjent: 'godkjent',
		delvis_godkjent: 'delvis',
		avslatt: 'avslatt',
		under_forhandling: 'delvis',
		trukket: 'na',
		laast: 'godkjent',
	};

	const STATUS_LABELS: Record<SporStatus, string> = {
		ikke_relevant: 'Ikke relevant',
		utkast: 'Utkast',
		sendt: 'Sendt',
		under_behandling: 'Under behandling',
		godkjent: 'Godkjent',
		delvis_godkjent: 'Delvis godkjent',
		avslatt: 'Avslatt',
		under_forhandling: 'Under forhandling',
		trukket: 'Trukket',
		laast: 'Last',
	};

	// Read role from localStorage for action button visibility
	const userRole = $derived.by(() => {
		if (!browser) return null;
		return localStorage.getItem('koe-user-role') as 'TE' | 'BH' | null;
	});

	// Only show action button for correct role
	const showAction = $derived.by(() => {
		if (!action || !userRole) return false;
		// BH responds, TE sends
		// If action says "Svar" it's for BH, if "Send" it's for TE
		// Simplified: just show the action if there is one (role filtering is handled at Sporkort level)
		return true;
	});

	// Filter varsling items for this track
	const trackVarsling = $derived(varsling.filter((v) => v.spor === sporType));
</script>

<div class="header">
	<span class="spor-label">{SPOR_LABELS[sporType]}</span>

	<Badge variant={STATUS_TO_BADGE[status]}>{STATUS_LABELS[status]}</Badge>

	{#each trackVarsling as item (item.paragrafRef)}
		<span
			class="varsling-flag"
			class:varsling-ok={item.status === 'ok'}
			class:varsling-warning={item.status === 'warning'}
			class:varsling-breach={item.status === 'breach'}
			title={item.paragrafRef}
		>
			{varslingSymbol(item.status)} {item.label}
		</span>
	{/each}

	{#if showAction && action}
		<button
			class="action-btn"
			class:action-urgent={action.urgent}
			onclick={(e: MouseEvent) => e.stopPropagation()}
		>
			{action.label}
		</button>
	{/if}
</div>

<style>
	.header {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.spor-label {
		font-family: var(--font-ui);
		font-size: 12px;
		font-weight: 600;
		color: var(--color-ink);
	}

	.varsling-flag {
		font-family: var(--font-ui);
		font-size: 10px;
		color: var(--color-ink-muted);
		white-space: nowrap;
	}

	.varsling-ok {
		color: var(--color-score-high);
	}

	.varsling-warning {
		color: var(--color-vekt);
	}

	.varsling-breach {
		color: var(--color-score-low);
	}

	.action-btn {
		margin-left: auto;
		font-family: var(--font-ui);
		font-size: 11px;
		font-weight: 600;
		color: var(--color-vekt);
		background: var(--color-vekt-bg);
		border: none;
		border-radius: var(--radius-sm);
		padding: 4px 12px;
		cursor: pointer;
		white-space: nowrap;
		transition: background 120ms ease;
	}

	.action-btn:hover {
		background: rgba(232, 168, 56, 0.16);
	}

	.action-urgent {
		color: var(--color-score-low);
		background: var(--color-score-low-bg);
	}

	.action-urgent:hover {
		background: rgba(196, 88, 88, 0.16);
	}
</style>
