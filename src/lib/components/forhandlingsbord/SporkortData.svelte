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
			if (vederlag.saerskilt_krav?.rigg_drift?.belop) {
				parts.push(`rigg ${formatCurrencyCompact(vederlag.saerskilt_krav.rigg_drift.belop)}`);
			}
			if (vederlag.saerskilt_krav?.produktivitet?.belop) {
				parts.push(`prod. ${formatCurrencyCompact(vederlag.saerskilt_krav.produktivitet.belop)}`);
			}
		}

		if (sporType === 'frist' && frist) {
			if (frist.antall_versjoner > 1) {
				parts.push(`Rev. ${frist.antall_versjoner - 1}`);
			}
			if (frist.ny_sluttdato) {
				parts.push(`Ny dato ${formatDateShort(frist.ny_sluttdato)}`);
			}
		}

		return parts;
	});

	// Right-side key metric — the number the administrator scans for
	const keyMetric = $derived.by(() => {
		if (sporType === 'vederlag' && vederlag) {
			if (vederlag.krevd_belop !== undefined && vederlag.krevd_belop !== null) {
				return formatCurrencyCompact(vederlag.krevd_belop);
			}
			if (vederlag.netto_belop !== undefined && vederlag.netto_belop !== null) {
				return formatCurrencyCompact(vederlag.netto_belop);
			}
		}
		if (sporType === 'frist' && frist) {
			if (frist.krevd_dager !== undefined && frist.krevd_dager !== null) {
				return formatDaysCompact(frist.krevd_dager);
			}
		}
		return null;
	});

	const hasContent = $derived(leftSegments.length > 0 || keyMetric !== null);
</script>

{#if hasContent}
	<div class="data-line">
		{#if leftSegments.length > 0}
			<div class="data-left">
				{#each leftSegments as segment, i (i)}
					{#if i > 0}
						<span class="dot-sep" aria-hidden="true">&middot;</span>
					{/if}
					<span class="data-segment">{segment}</span>
				{/each}
			</div>
		{/if}
		{#if keyMetric}
			<div class="data-right">
				<span class="key-metric">{keyMetric}</span>
			</div>
		{/if}
	</div>
{/if}

<style>
	.data-line {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 12px;
	}

	.data-left {
		display: flex;
		align-items: center;
		gap: 4px;
		flex-wrap: wrap;
		min-width: 0;
	}

	.data-segment {
		font-family: var(--font-data);
		font-size: 12px;
		color: var(--color-ink);
		white-space: nowrap;
	}

	.dot-sep {
		font-family: var(--font-data);
		font-size: 12px;
		color: var(--color-ink-muted);
	}

	.data-right {
		flex-shrink: 0;
	}

	.key-metric {
		font-family: var(--font-data);
		font-size: 15px;
		font-weight: 600;
		color: var(--color-ink);
		letter-spacing: -0.01em;
		line-height: 1;
		font-variant-numeric: tabular-nums;
	}

</style>
