<script lang="ts">
	import type { SakState, SporType } from '$lib/types/timeline';

	interface Props {
		state: SakState;
		now?: Date;
	}

	let { state, now = new Date() }: Props = $props();

	interface FristItem {
		spor: SporType;
		label: string;
		dagerSiden: number;
		urgency: 'normal' | 'warning' | 'critical';
	}

	function dagerSiden(dato: string | undefined, referanse: Date): number {
		if (!dato) return 0;
		const d = new Date(dato);
		const diff = referanse.getTime() - d.getTime();
		return Math.floor(diff / (1000 * 60 * 60 * 24));
	}

	function beregnUrgency(dager: number, erPassivitet: boolean): 'normal' | 'warning' | 'critical' {
		if (erPassivitet) return 'critical';
		if (dager > 14) return 'warning';
		return 'normal';
	}

	const frister = $derived.by(() => {
		const items: FristItem[] = [];

		// Grunnlag — only show when pending (sendt/under_behandling)
		if (state.grunnlag.status === 'sendt' || state.grunnlag.status === 'under_behandling') {
			const dager = dagerSiden(state.grunnlag.siste_oppdatert, now);
			const erPassivitet = state.grunnlag.status === 'sendt' && dager > 14;
			const urgency = beregnUrgency(dager, erPassivitet);

			items.push({
				spor: 'grunnlag',
				label: erPassivitet ? 'Passivitet' : 'Grunnlag',
				dagerSiden: dager,
				urgency,
			});
		}

		// Frist — only show when pending
		if (state.frist.status === 'sendt' || state.frist.status === 'under_behandling') {
			const dager = dagerSiden(state.frist.siste_oppdatert, now);
			const urgency = beregnUrgency(dager, false);

			items.push({
				spor: 'frist',
				label: dager > 14 ? 'Advarsel' : 'Frist',
				dagerSiden: dager,
				urgency,
			});
		}

		// Vederlag — only show when pending
		if (state.vederlag.status === 'sendt' || state.vederlag.status === 'under_behandling') {
			const dager = dagerSiden(state.vederlag.siste_oppdatert, now);
			const urgency = beregnUrgency(dager, false);

			items.push({
				spor: 'vederlag',
				label: dager > 14 ? 'Advarsel' : 'Vederlag',
				dagerSiden: dager,
				urgency,
			});
		}

		// Sort: critical first, then warning, then normal
		const urgencyOrder = { critical: 0, warning: 1, normal: 2 };
		items.sort((a, b) => urgencyOrder[a.urgency] - urgencyOrder[b.urgency]);

		return items;
	});

	// Only show items that are warning or critical
	const visibleFrister = $derived(frister.filter((f) => f.urgency !== 'normal'));
</script>

{#if visibleFrister.length > 0}
	<section class="frister-section" aria-label="Frister">
		<h3 class="section-label">Frister</h3>
		{#each visibleFrister as frist (frist.spor)}
			<div
				class="frist-item"
				class:critical={frist.urgency === 'critical'}
				class:warning={frist.urgency === 'warning'}
			>
				<span class="frist-label">{frist.label}</span>
				<span class="frist-days">{frist.dagerSiden}d</span>
			</div>
		{/each}
	</section>
{/if}

<style>
	.frister-section {
		/* padding handled by parent sidebar-section */
	}

	.section-label {
		font-size: 10px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--color-ink-muted);
		margin: 0 0 12px 0;
	}

	.frist-item {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		margin-bottom: 8px;
		padding: 6px 8px;
		border-radius: var(--radius-sm);
	}

	.frist-item.critical {
		background: var(--color-score-low-bg);
		border: 1px solid rgba(225, 29, 72, 0.2);
	}

	.frist-item.warning {
		background: var(--color-vekt-bg);
		border: 1px solid rgba(245, 158, 11, 0.2);
	}

	.frist-label {
		font-size: 11px;
		font-weight: 600;
		text-transform: uppercase;
	}

	.frist-item.critical .frist-label {
		color: var(--color-score-low);
	}

	.frist-item.warning .frist-label {
		color: var(--color-vekt);
	}

	.frist-days {
		font-family: var(--font-data);
		font-size: 12px;
		font-variant-numeric: tabular-nums;
		font-weight: 600;
	}

	.frist-item.critical .frist-days {
		color: var(--color-score-low);
	}

	.frist-item.warning .frist-days {
		color: var(--color-vekt);
	}
</style>
