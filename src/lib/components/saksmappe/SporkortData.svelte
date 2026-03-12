<script lang="ts">
	import type {
		SporType,
		GrunnlagTilstand,
		VederlagTilstand,
		FristTilstand,
	} from '$lib/types/timeline';
	import { formatCurrencyCompact, formatDateShort } from '$lib/utils/formatters';
	import { getKontraktsforholdLabel, getHjemmelLabel } from '$lib/constants/categories';
	import StatusQuoGap from './StatusQuoGap.svelte';

	interface Props {
		sporType: SporType;
		grunnlag?: GrunnlagTilstand;
		vederlag?: VederlagTilstand;
		frist?: FristTilstand;
		teNavn?: string;
		bhNavn?: string;
	}

	let { sporType, grunnlag, vederlag, frist, teNavn, bhNavn }: Props = $props();

	// Show gap when BH has responded with a value
	const showGap = $derived(
		(sporType === 'vederlag' && vederlag?.godkjent_belop != null) ||
		(sporType === 'frist' && frist?.godkjent_dager != null)
	);

	// Left-side descriptive segments (method, category, revision)
	const leftSegments = $derived.by(() => {
		const parts: string[] = [];

		if (sporType === 'grunnlag' && grunnlag) {
			if (grunnlag.hovedkategori) {
				const label = getKontraktsforholdLabel(grunnlag.hovedkategori);
				if (label) parts.push(label);
			}
			if (grunnlag.underkategori) {
				const hjemmel = getHjemmelLabel(grunnlag.underkategori);
				if (hjemmel) parts.push(hjemmel);
			}
			if (grunnlag.grunnlag_varsel?.dato_sendt) {
				parts.push(formatDateShort(grunnlag.grunnlag_varsel.dato_sendt));
			}
		}

		if (sporType === 'vederlag' && vederlag) {
			if (vederlag.saerskilt_krav?.rigg_drift?.belop) {
				parts.push(`rigg ${formatCurrencyCompact(vederlag.saerskilt_krav.rigg_drift.belop)}`);
			}
			if (vederlag.saerskilt_krav?.produktivitet?.belop) {
				parts.push(`prod. ${formatCurrencyCompact(vederlag.saerskilt_krav.produktivitet.belop)}`);
			}
		}

		if (sporType === 'frist' && frist) {
			if (frist.ny_sluttdato) {
				parts.push(`Ny dato ${formatDateShort(frist.ny_sluttdato)}`);
			}
		}

		return parts;
	});

	const hasContent = $derived(leftSegments.length > 0);
</script>

{#if hasContent}
	<div class="kort-data">
		<div class="meta-sti">
			{#each leftSegments as segment, i (i)}
				{#if i > 0}
					<span class="dot-sep" aria-hidden="true">&middot;</span>
				{/if}
				<span>{segment}</span>
			{/each}
		</div>
	</div>
{/if}

{#if showGap}
	<StatusQuoGap {sporType} {vederlag} {frist} {teNavn} {bhNavn} compact />
{/if}

<style>
	.kort-data {
		display: flex;
		align-items: baseline;
		min-width: 0;
	}

	.meta-sti {
		font-size: 11px;
		color: var(--color-ink-muted);
		display: flex;
		align-items: center;
		gap: 6px;
		min-width: 0;
		overflow: hidden;
		flex-wrap: wrap;
	}

	.dot-sep {
		color: var(--color-ink-ghost);
	}
</style>
