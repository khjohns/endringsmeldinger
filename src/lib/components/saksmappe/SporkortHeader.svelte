<script lang="ts">
	import type { SporType, SporStatus } from '$lib/types/timeline';

	interface Props {
		sporType: SporType;
		status: SporStatus;
	}

	let { sporType, status }: Props = $props();

	const SPOR_LABELS: Record<SporType, string> = {
		grunnlag: 'KONTRAKTSFORHOLD',
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
		avslatt: 'Avslått',
		under_forhandling: 'Under forhandling',
		trukket: 'Trukket',
		laast: 'Låst',
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

<style>
	.kort-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 8px;
	}

	.spor-navn {
		font-family: var(--font-ui);
		font-size: 12px;
		font-weight: 600;
		color: var(--color-ink);
		text-transform: uppercase;
		letter-spacing: 0.04em;
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

	@media (max-width: 1023px) {
		.spor-navn {
			font-size: 12px;
		}
	}
</style>
