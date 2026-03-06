<script lang="ts">
	import type { SaksoversiktItem } from '$lib/mocks/saksoversikt';
	import { formatCurrencyCompact, formatDaysCompact, formatDateDayMonth } from '$lib/utils/formatters';
	import { getOverordnetStatusLabel } from '$lib/constants/statusLabels';
	import type { OverordnetStatus } from '$lib/types/timeline';

	interface Props {
		sak: SaksoversiktItem | null;
		erAapen: boolean;
		onclose: () => void;
		prosjektId: string;
	}

	let { sak, erAapen, onclose, prosjektId }: Props = $props();

	const statusLabel = $derived(
		sak?.cached_status
			? getOverordnetStatusLabel(sak.cached_status as OverordnetStatus)
			: null
	);

	// Alle hendelser kronologisk (eldst først)
	const hendelser = $derived(
		[...(sak?.hendelser ?? [])].sort(
			(a, b) => new Date(a.dato).getTime() - new Date(b.dato).getTime()
		)
	);

	// Kategori-label
	const kategoriLabel = $derived.by(() => {
		if (!sak?.cached_hovedkategori) return null;
		const hk = sak.cached_hovedkategori === 'SVIKT' ? 'Svikt i BH ytelse' : 'Endring';
		const uk = sak.cached_underkategori;
		if (!uk) return hk;
		const ukLabel: Record<string, string> = {
			GRUNNFORHOLD: 'Grunnforhold',
			PROSJEKTERING: 'Prosjektering',
			TILLEGG: 'Tilleggsarbeid',
			DOKUMENTASJON: 'Dokumentasjon',
		};
		return `${hk} — ${ukLabel[uk] ?? uk}`;
	});

	// Forsering
	const erForsering = $derived(
		(sak?.cached_forsering_paalopt ?? 0) > 0 || (sak?.cached_forsering_maks ?? 0) > 0
	);

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && erAapen) onclose();
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<aside
	class="panel"
	class:panel-aapen={erAapen}
	aria-label="Saksdetalj"
	aria-hidden={!erAapen}
>
	{#if sak}
		<div class="panel-innhold">
			<!-- Mobile: Tilbake-knapp -->
			<button class="mobil-tilbake" onclick={onclose}>
				<span aria-hidden="true">&larr;</span> Tilbake
			</button>

			<!-- Header -->
			<div class="panel-header">
				<div class="panel-id">{sak.sak_id}</div>
				<h2 class="panel-tittel">{sak.cached_title ?? 'Uten tittel'}</h2>
				{#if statusLabel}
					<div class="panel-status">{statusLabel}</div>
				{/if}
				<button class="panel-lukk" onclick={onclose} aria-label="Lukk panel">
					<span aria-hidden="true">&#x2715;</span>
				</button>
			</div>

			<div class="panel-body">
				<!-- Kontraktsforhold -->
				<div class="seksjon">
					<div class="seksjon-label">Kontraktsforhold</div>

					{#if kategoriLabel}
						<div class="kategori-badge">{kategoriLabel}</div>
					{/if}

					{#if sak.cached_begrunnelse}
						<p class="begrunnelse">{sak.cached_begrunnelse}</p>
					{/if}
				</div>

				<!-- Hendelsesforløp -->
				{#if hendelser.length > 0}
					<div class="seksjon">
						<div class="seksjon-label">Hendelsesforløp</div>

						<div class="forloep">
							{#each hendelser as h, i (h.dato + h.label)}
								{@const erSiste = i === hendelser.length - 1}
								<div
									class="forloep-linje"
									class:forloep-besvart={h.besvart}
									class:forloep-siste={erSiste}
								>
									<span class="forloep-dato">{formatDateDayMonth(h.dato)}</span>
									<div class="forloep-strek" class:forloep-strek-siste={erSiste}></div>
									<span
										class="forloep-node forloep-node-{h.type.toLowerCase()}"
										class:forloep-node-besvart={h.besvart}
									>{h.type}</span>
									<span class="forloep-tekst">{h.label}</span>
								</div>
							{/each}
						</div>
					</div>
				{/if}

				<!-- Krav (kompakt) -->
				<div class="seksjon">
					<div class="seksjon-label">Krav</div>

					<div class="krav-grid">
						<div class="krav-rad">
							<span class="krav-spor krav-spor-v">V</span>
							<span class="krav-navn">Vederlag</span>
							<span class="krav-verdi">
								{#if sak.cached_sum_krevd != null}
									{formatCurrencyCompact(sak.cached_sum_krevd)}
									{#if sak.cached_sum_godkjent != null}
										<span class="krav-godkjent">
											/ {formatCurrencyCompact(sak.cached_sum_godkjent)}
										</span>
									{/if}
								{:else}
									<span class="krav-tom">—</span>
								{/if}
							</span>
						</div>

						<div class="krav-rad">
							<span class="krav-spor krav-spor-f">F</span>
							<span class="krav-navn">Frist</span>
							<span class="krav-verdi">
								{#if sak.cached_dager_krevd != null}
									{formatDaysCompact(sak.cached_dager_krevd)}
									{#if sak.cached_dager_godkjent != null}
										<span class="krav-godkjent">
											/ {formatDaysCompact(sak.cached_dager_godkjent)}
										</span>
									{/if}
								{:else}
									<span class="krav-tom">—</span>
								{/if}
							</span>
						</div>

						{#if erForsering}
							<div class="krav-rad">
								<span class="krav-spor krav-spor-f">!</span>
								<span class="krav-navn">Forsering</span>
								<span class="krav-verdi">
									{formatCurrencyCompact(sak.cached_forsering_paalopt)} påløpt
									{#if sak.cached_forsering_maks != null}
										<span class="krav-maks">
											av {formatCurrencyCompact(sak.cached_forsering_maks)}
										</span>
									{/if}
								</span>
							</div>
						{/if}
					</div>
				</div>

				<!-- Lenke -->
				<a href="/{prosjektId}/{sak.sak_id}" class="panel-lenke">
					Åpne saksmappe
					<span aria-hidden="true">&rarr;</span>
				</a>
			</div>
		</div>
	{/if}
</aside>

<style>
	.panel {
		width: 460px;
		background: var(--color-felt);
		border-left: 1px solid var(--color-wire-strong);
		position: absolute;
		right: 0;
		top: 0;
		bottom: 0;
		transform: translateX(100%);
		transition: transform 300ms cubic-bezier(0.05, 0.7, 0.1, 1);
		z-index: 100;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.panel::before {
		content: '';
		position: absolute;
		top: 0;
		left: 0;
		bottom: 0;
		width: 1px;
		background: rgba(255, 255, 255, 0.04);
		z-index: 1;
	}

	.panel-aapen {
		transform: translateX(0);
	}

	.panel-innhold {
		flex: 1;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.panel-header {
		padding: 24px;
		border-bottom: 1px solid var(--color-wire-strong);
		position: relative;
		flex-shrink: 0;
	}

	.panel-id {
		font-family: var(--font-data);
		font-size: 10px;
		color: var(--color-ink-muted);
		margin-bottom: 4px;
	}

	.panel-tittel {
		font-size: 16px;
		font-weight: 600;
		color: var(--color-ink);
		line-height: 1.3;
		padding-right: 32px;
		margin: 0;
	}

	.panel-status {
		margin-top: 8px;
		font-size: 11px;
		font-weight: 500;
		color: var(--color-ink-secondary);
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	.panel-lukk {
		position: absolute;
		top: 24px;
		right: 24px;
		background: none;
		border: none;
		color: var(--color-ink-ghost);
		cursor: pointer;
		font-size: 16px;
		padding: 4px;
		line-height: 1;
		transition: color 150ms;
	}
	.panel-lukk:hover {
		color: var(--color-ink);
	}

	.panel-body {
		flex: 1;
		overflow-y: auto;
		padding: 24px;
		display: flex;
		flex-direction: column;
		gap: 24px;
	}

	/* Seksjoner */
	.seksjon {
		display: flex;
		flex-direction: column;
	}

	.seksjon-label {
		font-size: 10px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--color-ink-muted);
		margin-bottom: 12px;
	}

	/* Kontraktsforhold */
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

	/* Hendelsesforløp */
	.forloep {
		display: flex;
		flex-direction: column;
	}

	.forloep-linje {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 6px 0;
		position: relative;
	}

	.forloep-dato {
		font-family: var(--font-data);
		font-size: 10px;
		font-variant-numeric: tabular-nums;
		color: var(--color-ink-ghost);
		width: 48px;
		flex-shrink: 0;
		text-align: right;
	}

	.forloep-besvart .forloep-dato {
		opacity: 0.6;
	}

	.forloep-strek {
		width: 1px;
		align-self: stretch;
		background: var(--color-wire);
		flex-shrink: 0;
		position: relative;
	}

	/* Extend line above and below to connect nodes */
	.forloep-strek::before {
		content: '';
		position: absolute;
		top: -6px;
		left: 0;
		width: 1px;
		height: calc(100% + 12px);
		background: var(--color-wire);
	}

	.forloep-linje:first-child .forloep-strek::before {
		top: 50%;
		height: 50%;
	}

	.forloep-strek-siste::before {
		height: 50%;
		top: -6px;
	}

	.forloep-node {
		width: 16px;
		height: 16px;
		border-radius: 1px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-family: var(--font-data);
		font-size: 8px;
		font-weight: 600;
		flex-shrink: 0;
	}

	/* Ubesvart: filled */
	.forloep-node-k {
		background: var(--color-ink-ghost);
		border: 1px solid var(--color-ink-ghost);
		color: var(--color-canvas);
	}
	.forloep-node-v {
		background: var(--color-vekt);
		border: 1px solid var(--color-vekt);
		color: var(--color-canvas);
	}
	.forloep-node-f {
		background: var(--color-score-low);
		border: 1px solid var(--color-score-low);
		color: var(--color-canvas);
	}

	/* Besvart: outline */
	.forloep-node-besvart.forloep-node-k {
		background: transparent;
		color: var(--color-ink-muted);
		opacity: 0.6;
	}
	.forloep-node-besvart.forloep-node-v {
		background: transparent;
		color: var(--color-vekt-dim);
		opacity: 0.6;
	}
	.forloep-node-besvart.forloep-node-f {
		background: transparent;
		color: var(--color-score-low);
		opacity: 0.6;
	}

	.forloep-tekst {
		font-size: 12px;
		color: var(--color-ink-secondary);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.forloep-besvart .forloep-tekst {
		color: var(--color-ink-muted);
	}

	/* Siste ubesvarte hendelse — fremhevet */
	.forloep-siste:not(.forloep-besvart) .forloep-tekst {
		color: var(--color-ink);
		font-weight: 500;
	}

	/* Krav-grid */
	.krav-grid {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.krav-rad {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 8px 12px;
		background: rgba(255, 255, 255, 0.01);
		border: 1px solid var(--color-wire);
		border-radius: var(--radius-sm);
	}

	.krav-spor {
		width: 16px;
		height: 16px;
		border-radius: 1px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-family: var(--font-data);
		font-size: 8px;
		font-weight: 600;
		flex-shrink: 0;
	}

	.krav-spor-v {
		border: 1px solid var(--color-vekt);
		color: var(--color-vekt);
	}

	.krav-spor-f {
		border: 1px solid var(--color-score-low);
		color: var(--color-score-low);
	}

	.krav-navn {
		font-size: 13px;
		color: var(--color-ink-secondary);
		flex: 1;
	}

	.krav-verdi {
		font-family: var(--font-data);
		font-size: 13px;
		font-weight: 500;
		font-variant-numeric: tabular-nums;
		color: var(--color-ink);
		text-align: right;
	}

	.krav-godkjent {
		color: var(--color-score-high);
		font-size: 12px;
		font-weight: 400;
	}

	.krav-maks {
		color: var(--color-ink-muted);
		font-size: 12px;
		font-weight: 400;
	}

	.krav-tom {
		color: var(--color-ink-ghost);
	}

	/* Lenke */
	.panel-lenke {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: 6px;
		margin-top: auto;
		padding-top: 16px;
		border-top: 1px solid var(--color-wire);
		font-size: 12px;
		font-weight: 500;
		color: var(--color-ink-muted);
		text-decoration: none;
		transition: color 150ms;
	}

	.panel-lenke:hover {
		color: var(--color-vekt);
	}

	/* Mobile: hidden by default */
	.mobil-tilbake {
		display: none;
	}

	@media (max-width: 1023px) {
		.panel {
			width: 100%;
			position: fixed;
			inset: 0;
			border-left: none;
			background: var(--color-canvas);
			z-index: 25;
		}

		.panel::before {
			display: none;
		}

		.panel-lukk {
			display: none;
		}

		.mobil-tilbake {
			display: flex;
			align-items: center;
			gap: 6px;
			position: sticky;
			top: 0;
			z-index: 1;
			padding: 12px 16px;
			background: var(--color-canvas);
			border: none;
			border-bottom: 1px solid var(--color-wire);
			font-family: var(--font-ui);
			font-size: 13px;
			font-weight: 500;
			color: var(--color-ink-secondary);
			cursor: pointer;
		}

		.mobil-tilbake:hover {
			color: var(--color-ink);
		}

		.panel-header {
			padding: 16px;
		}

		.panel-body {
			padding: 16px;
		}
	}
</style>
