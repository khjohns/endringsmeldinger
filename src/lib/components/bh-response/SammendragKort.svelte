<script lang="ts">
	import { getKombinertKategoriLabel } from '$lib/constants/categories';
	import { formatDateShortNorwegian } from '$lib/utils/dateFormatters';

	import SectionHeading from '$lib/components/primitives/SectionHeading.svelte';

	interface Props {
		sakId?: string;
		tittel: string;
		status?: string;
		hovedkategori: string;
		underkategori?: string;
		hjemmelRef?: string;
		datoVarslet?: string;
		begrunnelseHtml?: string;
		versjon: number;
		hideHeader?: boolean;
	}

	let {
		sakId,
		tittel,
		status,
		hovedkategori,
		underkategori,
		hjemmelRef,
		datoVarslet,
		begrunnelseHtml,
		versjon,
		hideHeader = false,
	}: Props = $props();

	const kombinertKategori = $derived(getKombinertKategoriLabel(hovedkategori, underkategori));
	const formatDato = $derived(datoVarslet ? formatDateShortNorwegian(datoVarslet) : null);

	let utvidet = $state(false);
	let begrunnelseEl = $state<HTMLElement | null>(null);
	const erAvkortet = $derived(
		begrunnelseEl ? begrunnelseEl.scrollHeight > begrunnelseEl.clientHeight : false
	);
</script>

{#if !hideHeader}
<!-- Header: sak-id / tittel / status -->
<div class="sammendrag-header">
	{#if sakId}
		<div class="sak-id">
			{sakId}
			{#if versjon > 1}
				<span class="versjon-badge">Rev. {versjon - 1}</span>
			{/if}
		</div>
	{/if}
	<h2 class="sak-tittel">{tittel}</h2>
	{#if status}
		<div class="sak-status">{status}</div>
	{/if}
</div>
{/if}

<!-- Kontraktsforhold-seksjon -->
<div class="seksjon">
	<SectionHeading title="Kontraktsforhold" paragrafRef={hjemmelRef} />

	<div class="kategori-linje">
		<div class="kategori-badge">{kombinertKategori}</div>
		{#if formatDato}
			<span class="dato-verdi">Varslet {formatDato}</span>
		{/if}
	</div>

	{#if begrunnelseHtml}
		<div
			class="begrunnelse"
			class:begrunnelse-avkortet={!utvidet}
			bind:this={begrunnelseEl}
		>
			{@html begrunnelseHtml}
		</div>
		{#if erAvkortet || utvidet}
			<button class="vis-mer" onclick={() => utvidet = !utvidet}>
				{utvidet ? 'Vis mindre' : 'Vis mer'}
				<svg class="vis-mer-chevron" class:vis-mer-chevron-opp={utvidet} width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
					<path d="M2.5 4L5 6.5L7.5 4" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"/>
				</svg>
			</button>
		{/if}
	{/if}

</div>

<style>
	/* Header — arvet fra SakPanel */
	.sammendrag-header {
		padding-bottom: 16px;
		border-bottom: 1px solid var(--color-wire-strong);
		margin-bottom: 20px;
	}

	.sak-id {
		font-family: var(--font-data);
		font-size: 10px;
		color: var(--color-ink-muted);
		margin-bottom: 4px;
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.versjon-badge {
		font-family: var(--font-data);
		font-size: 10px;
		font-weight: 600;
		padding: 1px 6px;
		border-radius: var(--radius-sm);
		background: var(--color-felt-active);
		border: 1px solid var(--color-wire);
		color: var(--color-ink-muted);
	}

	.sak-tittel {
		font-family: var(--font-prose);
		font-size: 17px;
		font-weight: 600;
		color: var(--color-ink);
		line-height: 1.3;
		margin: 0;
	}

	.sak-status {
		margin-top: 8px;
		font-size: 11px;
		font-weight: 500;
		color: var(--color-ink-secondary);
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	/* Seksjon — arvet fra SakPanel */
	.seksjon {
		display: flex;
		flex-direction: column;
	}

	.kategori-linje {
		display: flex;
		align-items: baseline;
		flex-wrap: wrap;
		gap: 8px;
		margin-top: var(--spacing-3);
		margin-bottom: 12px;
	}

	.kategori-badge {
		font-family: var(--font-data);
		font-size: 11px;
		font-weight: 500;
		color: var(--color-ink-secondary);
	}

	.begrunnelse {
		font-family: var(--font-prose);
		font-size: 14px;
		font-weight: 450;
		color: var(--color-ink-secondary);
		line-height: 1.6;
		margin: 0;
	}

	.begrunnelse-avkortet {
		max-height: calc(1.6em * 10);
		overflow: hidden;
	}

	.begrunnelse :global(p) {
		margin: 0 0 8px;
	}
	.begrunnelse :global(p:last-child) {
		margin-bottom: 0;
	}

	.vis-mer {
		align-self: flex-start;
		margin-top: 4px;
		padding: 0;
		background: none;
		border: none;
		font-family: var(--font-ui);
		font-size: 11px;
		color: var(--color-ink-muted);
		cursor: pointer;
		transition: color 150ms;
		display: flex;
		align-items: center;
		gap: 2px;
	}
	.vis-mer:hover {
		color: var(--color-ink);
	}

	.vis-mer-chevron {
		transition: transform 150ms;
	}

	.vis-mer-chevron-opp {
		transform: rotate(180deg);
	}

	.dato-verdi {
		font-family: var(--font-data);
		font-size: 11px;
		color: var(--color-ink-muted);
		margin-left: auto;
	}
</style>
