<script lang="ts">
	import { getKombinertKategoriLabel } from '$lib/constants/categories';
	import { formatDateShortNorwegian } from '$lib/utils/dateFormatters';

	interface Props {
		sakId?: string;
		tittel: string;
		status?: string;
		hovedkategori: string;
		underkategori?: string;
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
	<div class="section-label">Kontraktsforhold</div>

	<div class="kategori-badge">{kombinertKategori}</div>

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

	{#if formatDato}
		<div class="dato-linje">
			<span class="dato-label">Varslet</span>
			<span class="dato-verdi">{formatDato}</span>
		</div>
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
		font-size: 16px;
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

	.section-label {
		margin-bottom: 12px;
	}

	.kategori-badge {
		font-family: var(--font-data);
		font-size: 11px;
		font-weight: 500;
		color: var(--color-ink-secondary);
		background: var(--color-felt-active);
		border: 1px solid var(--color-wire);
		border-radius: var(--radius-sm);
		padding: 4px 8px;
		align-self: flex-start;
		margin-bottom: 12px;
	}

	.begrunnelse {
		font-size: 13px;
		color: var(--color-ink-secondary);
		line-height: 1.6;
		margin: 0;
	}

	.begrunnelse-avkortet {
		max-height: calc(1.6em * 4);
		overflow: hidden;
		-webkit-mask-image: linear-gradient(to bottom, black 70%, transparent 100%);
		mask-image: linear-gradient(to bottom, black 70%, transparent 100%);
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

	.dato-linje {
		display: flex;
		align-items: center;
		gap: 8px;
		margin-top: 12px;
		padding-top: 12px;
		border-top: 1px solid var(--color-wire);
	}

	.dato-label {
		font-family: var(--font-data);
		font-size: 11px;
		color: var(--color-ink-muted);
	}

	.dato-verdi {
		font-family: var(--font-data);
		font-size: 12px;
		font-weight: 500;
		color: var(--color-ink-secondary);
	}
</style>
