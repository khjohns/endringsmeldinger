<script lang="ts">
	import type { SporType, VederlagTilstand, FristTilstand } from '$lib/types/timeline';
	import { formatCurrency } from '$lib/utils/formatters';

	interface Props {
		sporType: SporType;
		vederlag?: VederlagTilstand;
		frist?: FristTilstand;
		teNavn?: string;
		bhNavn?: string;
		/** Compact mode for sidebar ledger */
		compact?: boolean;
	}

	let { sporType, vederlag, frist, teNavn, bhNavn, compact = false }: Props = $props();

	const gap = $derived.by(() => {
		if (sporType === 'vederlag' && vederlag) {
			const krevd = vederlag.krevd_belop ?? vederlag.netto_belop;
			const godkjent = vederlag.godkjent_belop;
			if (krevd == null || godkjent == null) return null;
			return {
				krevdLabel: `${formatCurrency(krevd)}`,
				godkjentLabel: `${formatCurrency(godkjent)}`,
				gapLabel: `${formatCurrency(Math.max(0, krevd - godkjent))}`,
				gapValue: krevd - godkjent,
				unit: 'NOK',
			};
		}
		if (sporType === 'frist' && frist) {
			const krevd = frist.krevd_dager;
			const godkjent = frist.godkjent_dager;
			if (krevd == null || godkjent == null) return null;
			const diff = krevd - godkjent;
			return {
				krevdLabel: `${krevd} dager`,
				godkjentLabel: `${godkjent} dager`,
				gapLabel: `${Math.max(0, diff)} dager`,
				gapValue: diff,
				unit: 'dager',
			};
		}
		return null;
	});

	const teName = $derived(teNavn ?? 'Totalentreprenør');
	const bhName = $derived(bhNavn ?? 'Byggherre');
</script>

{#if gap}
	<div class="gap-visning" class:gap-compact={compact} data-spor={sporType}>
		<div class="gap-rad">
			<span class="gap-label">Krevd ({teName})</span>
			<span class="gap-verdi">{gap.krevdLabel}</span>
		</div>
		<div class="gap-rad">
			<span class="gap-label">Anerkjent ({bhName})</span>
			<span class="gap-verdi">− {gap.godkjentLabel}</span>
		</div>
		<div class="gap-separator"></div>
		<div class="gap-rad gap-rad-total">
			<span class="gap-label-total">Omtvistet gap</span>
			<span class="gap-verdi-total" class:spor-vederlag={sporType === 'vederlag'} class:spor-frist={sporType === 'frist'}>
				{gap.gapLabel}
			</span>
		</div>
	</div>
{/if}

<style>
	.gap-visning {
		display: flex;
		flex-direction: column;
		gap: 4px;
		font-family: var(--font-data);
		font-variant-numeric: tabular-nums;
	}

	.gap-compact {
		gap: 2px;
	}

	.gap-rad {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		font-size: 12px;
	}

	.gap-label {
		color: var(--color-ink-secondary);
		font-family: var(--font-ui);
		font-size: 12px;
	}

	.gap-verdi {
		color: var(--color-ink-muted);
		font-size: 12px;
	}

	.gap-separator {
		height: 1px;
		border-top: 1px dashed var(--color-wire);
		margin: 4px 0;
	}

	.gap-rad-total {
		margin-top: 2px;
	}

	.gap-label-total {
		font-family: var(--font-data);
		font-size: 10px;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--color-ink-muted);
	}

	.gap-verdi-total {
		font-size: 16px;
		font-weight: 700;
	}

	.gap-compact .gap-verdi-total {
		font-size: 13px;
		font-weight: 600;
	}

	.spor-vederlag {
		color: var(--color-vekt);
	}

	.spor-frist {
		color: var(--color-score-low);
	}
</style>
