<script lang="ts">
	import type { SaksoversiktItem } from '$lib/mocks/saksoversikt';
	import type { SporHendelseType } from '$lib/mocks/saksoversikt';
	import type { TidslinjeKlynge } from '$lib/utils/tidslinje';
	import TidslinjeCanvas from './TidslinjeCanvas.svelte';

	interface Props {
		sak: SaksoversiktItem;
		klynger: TidslinjeKlynge[];
		erAktiv: boolean;
		onclick: () => void;
		aktivtSpor?: SporHendelseType | null;
	}

	let { sak, klynger, erAktiv, onclick, aktivtSpor = null }: Props = $props();

	const tittel = $derived(sak.cached_title ?? 'Uten tittel');
</script>

<button
	class="rad"
	class:rad-aktiv={erAktiv}
	{onclick}
	type="button"
	aria-pressed={erAktiv}
>
	<div class="meta">
		<span class="sak-id">{sak.sak_id}</span>
		<span class="sak-tittel">{tittel}</span>
	</div>
	<TidslinjeCanvas {klynger} {aktivtSpor} />
</button>

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
		cursor: pointer;
		position: relative;
		width: 100%;
		text-align: left;
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

	.rad:focus-visible {
		outline: 2px solid var(--color-wire-focus);
		outline-offset: -2px;
	}

	.meta {
		width: 260px;
		flex-shrink: 0;
		display: flex;
		flex-direction: column;
		gap: 2px;
		min-width: 0;
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

	.rad:hover .sak-tittel,
	.rad-aktiv .sak-tittel {
		color: var(--color-ink);
	}
</style>
