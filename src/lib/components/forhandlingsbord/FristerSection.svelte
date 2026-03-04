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
		tekst: string;
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

		// Grunnlag
		if (state.grunnlag.status !== 'ikke_relevant') {
			const dager = dagerSiden(state.grunnlag.siste_oppdatert, now);
			const erPassivitet = state.grunnlag.status === 'sendt' && dager > 14;
			const urgency = beregnUrgency(dager, erPassivitet);

			items.push({
				spor: 'grunnlag',
				label: 'Grunnlag',
				dagerSiden: dager,
				urgency,
				tekst: erPassivitet ? 'passivitet!' : `${dager}d siden`,
			});
		}

		// Frist
		if (state.frist.status !== 'ikke_relevant') {
			const dager = dagerSiden(state.frist.siste_oppdatert, now);
			const urgency = beregnUrgency(dager, false);

			items.push({
				spor: 'frist',
				label: 'Frist',
				dagerSiden: dager,
				urgency,
				tekst: `${dager}d siden`,
			});
		}

		// Vederlag
		if (state.vederlag.status !== 'ikke_relevant') {
			const dager = dagerSiden(state.vederlag.siste_oppdatert, now);
			const urgency = beregnUrgency(dager, false);

			items.push({
				spor: 'vederlag',
				label: 'Vederlag',
				dagerSiden: dager,
				urgency,
				tekst: `${dager}d siden`,
			});
		}

		// Sorter etter urgency (critical først, deretter warning, deretter normal)
		const urgencyOrder = { critical: 0, warning: 1, normal: 2 };
		items.sort((a, b) => urgencyOrder[a.urgency] - urgencyOrder[b.urgency]);

		return items;
	});
</script>

{#if frister.length > 0}
	<section class="frister-section" aria-label="Frister">
		<h3 class="section-label">Frister</h3>
		<ul class="frister-list">
			{#each frister as frist (frist.spor)}
				<li class="frist-item" class:critical={frist.urgency === 'critical'} class:warning={frist.urgency === 'warning'}>
					<span class="frist-icon" aria-hidden="true">
						{#if frist.urgency === 'critical'}⚠{:else if frist.urgency === 'warning'}⚠{/if}
					</span>
					<span class="frist-label">{frist.label}</span>
					<span class="frist-value">{frist.tekst}</span>
				</li>
			{/each}
		</ul>
	</section>
{/if}

<style>
	.frister-section {
		padding: 12px 16px;
	}

	.section-label {
		font-size: 11px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--color-ink-muted);
		margin: 0 0 8px 0;
	}

	.frister-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.frist-item {
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 13px;
		line-height: 1.4;
		color: var(--color-ink-secondary);
	}

	.frist-item.warning {
		color: var(--color-vekt);
	}

	.frist-item.critical {
		color: var(--color-score-low);
	}

	.frist-icon {
		width: 14px;
		flex-shrink: 0;
		text-align: center;
		font-size: 12px;
	}

	.frist-label {
		flex-shrink: 0;
	}

	.frist-value {
		margin-left: auto;
		font-family: var(--font-data);
		font-size: 12px;
		font-variant-numeric: tabular-nums;
	}
</style>
