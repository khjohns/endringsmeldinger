<script lang="ts">
	import type {
		SporType,
		GrunnlagTilstand,
		VederlagTilstand,
		FristTilstand,
	} from '$lib/types/timeline';
	import { formatCurrencyCompact, formatDaysCompact, formatDateShort } from '$lib/utils/formatters';
	import { formatVederlagsmetode } from '$lib/utils/formatters';
	import { getHovedkategoriLabel } from '$lib/constants/categories';

	interface Props {
		sporType: SporType;
		grunnlag?: GrunnlagTilstand;
		vederlag?: VederlagTilstand;
		frist?: FristTilstand;
	}

	let { sporType, grunnlag, vederlag, frist }: Props = $props();

	// Left-side descriptive segments (method, category, revision)
	const leftSegments = $derived.by(() => {
		const parts: string[] = [];

		if (sporType === 'grunnlag' && grunnlag) {
			if (grunnlag.tittel) parts.push(grunnlag.tittel);
			if (grunnlag.hovedkategori) {
				const label = getHovedkategoriLabel(grunnlag.hovedkategori);
				if (label) parts.push(label);
			}
			if (grunnlag.grunnlag_varsel?.dato_sendt) {
				parts.push(formatDateShort(grunnlag.grunnlag_varsel.dato_sendt));
			}
		}

		if (sporType === 'vederlag' && vederlag) {
			if (vederlag.metode) parts.push(formatVederlagsmetode(vederlag.metode));
			if (vederlag.antall_versjoner > 1) {
				parts.push(`Rev. ${vederlag.antall_versjoner - 1}`);
			}
			if (vederlag.saerskilt_krav?.rigg_drift?.belop) {
				parts.push(`rigg ${formatCurrencyCompact(vederlag.saerskilt_krav.rigg_drift.belop)}`);
			}
			if (vederlag.saerskilt_krav?.produktivitet?.belop) {
				parts.push(`prod. ${formatCurrencyCompact(vederlag.saerskilt_krav.produktivitet.belop)}`);
			}
		}

		if (sporType === 'frist' && frist) {
			if (frist.krevd_dager !== undefined && frist.krevd_dager !== null) {
				parts.push('Dager krevd');
			}
			if (frist.antall_versjoner > 1) {
				parts.push(`Rev. ${frist.antall_versjoner - 1}`);
			}
			if (frist.ny_sluttdato) {
				parts.push(`Ny dato ${formatDateShort(frist.ny_sluttdato)}`);
			}
		}

		return parts;
	});

	// Right-side key metric
	const keyMetric = $derived.by(() => {
		if (sporType === 'vederlag' && vederlag) {
			if (vederlag.krevd_belop !== undefined && vederlag.krevd_belop !== null) {
				return formatCurrencyCompact(vederlag.krevd_belop) + ' NOK';
			}
			if (vederlag.netto_belop !== undefined && vederlag.netto_belop !== null) {
				return formatCurrencyCompact(vederlag.netto_belop) + ' NOK';
			}
		}
		if (sporType === 'frist' && frist) {
			if (frist.krevd_dager !== undefined && frist.krevd_dager !== null) {
				return `${frist.krevd_dager} dager`;
			}
		}
		return null;
	});

	// Milepael warning for significant frist claims
	const showMilepael = $derived(
		sporType === 'frist' && frist?.krevd_dager !== undefined && frist.krevd_dager !== null && frist.krevd_dager > 14
	);

	const hasContent = $derived(leftSegments.length > 0 || keyMetric !== null);
</script>

{#if hasContent}
	<div class="kort-data">
		{#if leftSegments.length > 0}
			<div class="meta-sti">
				{#each leftSegments as segment, i (i)}
					{#if i > 0}
						<span class="dot-sep" aria-hidden="true">&middot;</span>
					{/if}
					<span>{segment}</span>
				{/each}
			</div>
		{/if}
		{#if keyMetric}
			<div class="verdi-container">
				<div class="verdi-metrikk">{keyMetric}</div>
				{#if showMilepael}
					<div class="milepael-tag">Pavirker milepael</div>
				{/if}
			</div>
		{:else}
			<div class="verdi-container">
				<div class="verdi-metrikk">--</div>
			</div>
		{/if}
	</div>
{/if}

<style>
	.kort-data {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
	}

	.meta-sti {
		font-size: 12px;
		color: var(--color-ink-secondary);
		display: flex;
		align-items: center;
		gap: 6px;
	}

	.dot-sep {
		color: var(--color-ink-ghost);
	}

	.verdi-container {
		text-align: right;
		flex-shrink: 0;
	}

	.verdi-metrikk {
		font-family: var(--font-data);
		font-size: 15px;
		font-weight: 600;
		color: var(--color-ink);
		font-variant-numeric: tabular-nums;
	}

	.milepael-tag {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		font-size: 9px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--color-score-low);
		background: var(--color-canvas);
		border: 1px solid rgba(225, 29, 72, 0.3);
		padding: 2px 6px;
		border-radius: var(--radius-sm);
		margin-top: 6px;
	}
</style>
