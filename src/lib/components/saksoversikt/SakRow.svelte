<script lang="ts">
	import type { SaksoversiktItem, SporHendelseType } from '$lib/mocks/saksoversikt';
	import type { TidslinjeKlynge } from '$lib/utils/tidslinje';
	import TidslinjeCanvas from './TidslinjeCanvas.svelte';

	interface Props {
		sak: SaksoversiktItem;
		klynger: TidslinjeKlynge[];
		erAktiv: boolean;
		onpanel: () => void;
		prosjektId: string;
		aktivtSpor?: SporHendelseType | null;
	}

	let { sak, klynger, erAktiv, onpanel, prosjektId, aktivtSpor = null }: Props = $props();

	const tittel = $derived(sak.cached_title ?? 'Uten tittel');
</script>

<div
	class="rad"
	class:rad-aktiv={erAktiv}
>
	<a class="meta" href="/{prosjektId}/{sak.sak_id}">
		<span class="sak-id">{sak.sak_id}</span>
		<span class="sak-tittel">{tittel}</span>
	</a>
	<button class="tidslinje-knapp" type="button" onclick={onpanel} aria-pressed={erAktiv} aria-label="Vis forhåndsvisning av {sak.sak_id}">
		<TidslinjeCanvas {klynger} {aktivtSpor} />
	</button>
</div>

<style>
	.rad {
		display: flex;
		height: 52px;
		align-items: center;
		padding: 0 16px;
		background: transparent;
		border: 1px solid transparent;
		border-radius: var(--radius-sm);
		transition: background 150ms, border-color 150ms;
		position: relative;
		font-family: var(--font-ui);
	}

	.rad:hover {
		background: var(--color-felt);
		border-color: var(--color-wire);
	}

	.rad-aktiv {
		background: var(--color-felt);
		border-color: var(--color-wire);
		border-left: 2px solid var(--color-vekt);
	}

	.meta {
		width: 260px;
		flex-shrink: 0;
		display: flex;
		flex-direction: column;
		gap: 2px;
		min-width: 0;
		text-decoration: none;
		padding: 8px 0;
		align-self: stretch;
		justify-content: center;
	}

	.meta:focus-visible {
		outline: 2px solid var(--color-wire-focus);
		outline-offset: -2px;
		border-radius: var(--radius-sm);
	}

	.sak-id {
		font-family: var(--font-data);
		font-size: 10px;
		color: var(--color-ink-muted);
		line-height: 1;
	}

	.sak-tittel {
		font-size: 13px;
		font-weight: 500;
		color: var(--color-ink-secondary);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		line-height: 1.3;
	}

	.meta:hover .sak-tittel,
	.rad-aktiv .sak-tittel {
		color: var(--color-ink);
	}

	.tidslinje-knapp {
		flex: 1;
		height: 100%;
		background: none;
		border: none;
		padding: 0;
		cursor: pointer;
		display: flex;
		align-items: center;
	}

	.tidslinje-knapp:focus-visible {
		outline: 2px solid var(--color-wire-focus);
		outline-offset: -2px;
		border-radius: var(--radius-sm);
	}

	@media (max-width: 1023px) {
		.rad {
			flex-direction: column;
			height: auto;
			padding: 8px 12px;
			gap: 4px;
		}

		.meta {
			width: 100%;
			padding: 0;
		}

		.tidslinje-knapp {
			width: 100%;
			height: 32px;
		}
	}
</style>
