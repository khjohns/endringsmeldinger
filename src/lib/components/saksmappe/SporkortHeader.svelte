<script lang="ts">
	import type { SporType, SporStatus } from '$lib/types/timeline';
	import type { VarslingItem } from '$lib/utils/varslingStatus';

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

	type StempelVariant = 'critical' | 'waiting' | 'approved' | 'action';

	const stempelVariant = $derived.by<StempelVariant>(() => {
		if (status === 'avslatt') return 'critical';
		if (status === 'godkjent' || status === 'laast') return 'approved';
		if (status === 'under_forhandling' || status === 'delvis_godkjent') return 'action';
		return 'waiting';
	});
</script>

<div class="kort-header">
	<div class="kort-identitet">
		<span class="spor-navn">{SPOR_LABELS[sporType]}</span>
		<span
			class="stempel"
			class:stempel-critical={stempelVariant === 'critical'}
			class:stempel-waiting={stempelVariant === 'waiting'}
			class:stempel-approved={stempelVariant === 'approved'}
			class:stempel-action={stempelVariant === 'action'}
		>
			{STATUS_LABELS[status]}
		</span>
	</div>

	{#if action}
		<button
			class="action-btn"
			class:action-urgent={action.urgent}
			onclick={(e: MouseEvent) => e.stopPropagation()}
		>
			{action.label} &rarr;
		</button>
	{/if}
</div>

<style>
	.kort-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 16px;
	}

	.kort-identitet {
		display: flex;
		align-items: center;
		gap: 12px;
		flex-wrap: wrap;
	}

	.spor-navn {
		font-family: var(--font-ui);
		font-size: 13px;
		font-weight: 600;
		color: var(--color-ink);
		text-transform: uppercase;
		letter-spacing: 0.02em;
	}

	.stempel {
		font-size: 10px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		padding: 2px 6px;
		border-radius: var(--radius-sm);
		border: 1px solid transparent;
	}

	.stempel-critical {
		color: var(--color-score-low);
		border-color: rgba(225, 29, 72, 0.3);
		background: rgba(225, 29, 72, 0.1);
	}

	.stempel-waiting {
		color: var(--color-ink-secondary);
		border-color: var(--color-wire-strong);
	}

	.stempel-approved {
		color: var(--color-score-high);
		border-color: rgba(16, 185, 129, 0.3);
	}

	.stempel-action {
		color: var(--color-vekt);
		border-color: rgba(245, 158, 11, 0.3);
	}

	.action-btn {
		font-family: var(--font-ui);
		font-size: 11px;
		font-weight: 600;
		padding: 6px 12px;
		border-radius: var(--radius-sm);
		border: 1px solid transparent;
		cursor: pointer;
		transition: all 150ms ease;
		white-space: nowrap;
		background: var(--color-vekt-bg);
		color: var(--color-vekt);
		border-color: rgba(245, 158, 11, 0.3);
	}

	.action-btn:hover {
		background: rgba(245, 158, 11, 0.2);
	}

	.action-urgent {
		background: var(--color-score-low);
		color: #fff;
		border-color: transparent;
	}

	.action-urgent:hover {
		background: #be123c;
	}

	@media (max-width: 1023px) {
		.kort-header {
			gap: 8px;
		}

		.kort-identitet {
			gap: 8px;
		}

		.spor-navn {
			font-size: 12px;
		}

		.action-btn {
			padding: 4px 10px;
			font-size: 10px;
		}
	}
</style>
