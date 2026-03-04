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

	// Build dot-separated data segments per track type
	const segments = $derived.by(() => {
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
			if (vederlag.krevd_belop !== undefined && vederlag.krevd_belop !== null) {
				parts.push(formatCurrencyCompact(vederlag.krevd_belop));
			} else if (vederlag.netto_belop !== undefined && vederlag.netto_belop !== null) {
				parts.push(formatCurrencyCompact(vederlag.netto_belop));
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
				parts.push(`${formatDaysCompact(frist.krevd_dager)} krevd`);
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

	// Deadline info (shown muted at end)
	const deadlineText = $derived.by(() => {
		if (sporType === 'vederlag' && vederlag?.siste_oppdatert) {
			// Could show time since submission, but spec says "frist Xd"
			// For now we only show deadline if there's a frist_for_spesifikasjon or similar
			return null;
		}
		if (sporType === 'frist' && frist?.frist_for_spesifisering) {
			return formatDateShort(frist.frist_for_spesifisering);
		}
		return null;
	});
</script>

{#if segments.length > 0}
	<div class="data-line">
		{#each segments as segment, i (i)}
			{#if i > 0}
				<span class="dot-sep" aria-hidden="true">&middot;</span>
			{/if}
			<span class="data-segment">{segment}</span>
		{/each}
		{#if deadlineText}
			<span class="dot-sep" aria-hidden="true">&middot;</span>
			<span class="data-segment deadline">frist {deadlineText}</span>
		{/if}
	</div>
{/if}

<style>
	.data-line {
		display: flex;
		align-items: center;
		gap: 4px;
		flex-wrap: wrap;
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

	.deadline {
		color: var(--color-ink-muted);
	}
</style>
