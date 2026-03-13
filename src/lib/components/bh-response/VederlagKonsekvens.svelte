<script lang="ts">
	import { Check, X, CircleMinus } from 'lucide-svelte';
	import type { VederlagBeregningResultat, SubsidiaerTrigger } from '$lib/types/timeline';
	import { formatCurrency } from '$lib/utils/formatters';

	interface Props {
		prinsipaltResultat?: VederlagBeregningResultat;
		totalKrevd: number;
		totalGodkjent: number;
		visSubsidiaert: boolean;
		subsidiaertResultat?: VederlagBeregningResultat;
		totalGodkjentSubsidiaert?: number;
		subsidiaerTriggers?: SubsidiaerTrigger[];
	}

	let {
		prinsipaltResultat,
		totalKrevd,
		totalGodkjent,
		visSubsidiaert,
		subsidiaertResultat,
		totalGodkjentSubsidiaert,
		subsidiaerTriggers = [],
	}: Props = $props();

	const TRIGGER_LABELS: Record<SubsidiaerTrigger, string> = {
		grunnlag_avslatt: 'Grunnlaget avslått',
		grunnlag_prekludert_32_2: 'Grunnlag varslet for sent (§32.2)',
		forseringsrett_avslatt: 'Forseringsrett avslått',
		preklusjon_hovedkrav: 'Hovedkrav prekludert (§34.1.2)',
		preklusjon_rigg: 'Rigg og drift prekludert (§34.1.3)',
		preklusjon_produktivitet: 'Produktivitetstap prekludert (§34.1.3)',
		reduksjon_ep_justering: 'EP-justering varslet for sent (§34.3.3)',
		preklusjon_varsel: 'Varsel for sent (§33.4)',
		reduksjon_spesifisert: 'Spesifisert krav for sent (§33.6)',
		ingen_hindring: 'Ingen reell fremdriftshindring',
		metode_avslatt: 'Beregningsmetode avslått',
	};

	const RESULTAT_LABELS: Record<VederlagBeregningResultat, string> = {
		godkjent: 'Godkjent',
		delvis_godkjent: 'Delvis godkjent',
		avslatt: 'Avslått',
		hold_tilbake: 'Tilbakeholdt',
	};

	const variant = $derived.by(() => {
		if (!prinsipaltResultat) return null;
		if (prinsipaltResultat === 'godkjent') return 'positive' as const;
		if (prinsipaltResultat === 'avslatt') return 'negative' as const;
		return 'mixed' as const;
	});
</script>

{#if variant && prinsipaltResultat}
	<div class="vederlag-konsekvens konsekvens-{variant}" role="status">
		<div class="konsekvens-header">
			{#if variant === 'positive'}
				<Check size={16} strokeWidth={1.5} aria-hidden="true" />
			{:else if variant === 'negative'}
				<X size={16} strokeWidth={1.5} aria-hidden="true" />
			{:else}
				<CircleMinus size={16} strokeWidth={1.5} aria-hidden="true" />
			{/if}
			<span class="konsekvens-tittel">{RESULTAT_LABELS[prinsipaltResultat]}</span>
		</div>

		<div class="belop-rad">
			<span class="belop-label">Krevd</span>
			<span class="belop-verdi">{formatCurrency(totalKrevd)}</span>
			<span class="belop-pil">→</span>
			<span class="belop-label">Godkjent</span>
			<span class="belop-verdi">{formatCurrency(totalGodkjent)}</span>
		</div>

		{#if visSubsidiaert && subsidiaertResultat}
			<div class="subsidiaert-seksjon">
				<div class="subsidiaert-header">
					<span class="subsidiaert-label">Subsidiært: {RESULTAT_LABELS[subsidiaertResultat]}</span>
					<span class="belop-verdi">{formatCurrency(totalGodkjentSubsidiaert)}</span>
				</div>
				{#if subsidiaerTriggers.length > 0}
					<ul class="trigger-liste">
						{#each subsidiaerTriggers as trigger}
							<li>{TRIGGER_LABELS[trigger]}</li>
						{/each}
					</ul>
				{/if}
			</div>
		{/if}
	</div>
{/if}

<style>
	.vederlag-konsekvens {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-2);
		padding: var(--spacing-3) var(--spacing-4);
		border-radius: var(--radius-md);
		border-left: 3px solid;
		font-size: 13px;
		line-height: 1.5;
	}

	.konsekvens-positive {
		border-left-color: var(--color-score-high);
		background: var(--color-score-high-bg);
	}

	.konsekvens-negative {
		border-left-color: var(--color-score-low);
		background: var(--color-score-low-bg);
	}

	.konsekvens-mixed {
		border-left-color: var(--color-vekt);
		background: var(--color-vekt-bg);
	}

	.konsekvens-header {
		display: flex;
		align-items: center;
		gap: var(--spacing-2);
	}

	.konsekvens-positive .konsekvens-header {
		color: var(--color-score-high);
	}

	.konsekvens-negative .konsekvens-header {
		color: var(--color-score-low);
	}

	.konsekvens-mixed .konsekvens-header {
		color: var(--color-vekt);
	}

	.konsekvens-tittel {
		font-weight: 600;
	}

	.belop-rad {
		display: flex;
		align-items: baseline;
		gap: var(--spacing-2);
		color: var(--color-ink-secondary);
		font-family: var(--font-data);
		font-variant-numeric: tabular-nums;
	}

	.belop-verdi {
		font-weight: 500;
	}

	.belop-pil {
		color: var(--color-ink-ghost);
	}

	.subsidiaert-seksjon {
		border-top: 1px dashed var(--color-wire);
		padding-top: var(--spacing-2);
		margin-top: var(--spacing-1);
	}

	.subsidiaert-header {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
	}

	.subsidiaert-label {
		font-size: 12px;
		font-weight: 500;
		color: var(--color-ink-muted);
	}

	.trigger-liste {
		margin: var(--spacing-1) 0 0;
		padding-left: var(--spacing-4);
		font-size: 11px;
		color: var(--color-ink-muted);
	}

	.trigger-liste li {
		margin-bottom: 2px;
	}
</style>
