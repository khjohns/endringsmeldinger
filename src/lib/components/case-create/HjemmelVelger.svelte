<script lang="ts">
	import { KRAV_STRUKTUR_NS8407, type Kontraktshjemmel, type Kontraktsforhold } from '$lib/constants/categories';
	import type { ValgtHjemmel } from '$lib/types/hjemmel';
	import KontraktsregelInline from './KontraktsregelInline.svelte';

	interface Props {
		valgt: ValgtHjemmel | null;
		onvelg: (valg: ValgtHjemmel) => void;
	}

	let { valgt, onvelg }: Props = $props();

	function erValgt(forholdKode: string, hjemmelKode: string | null): boolean {
		if (!valgt) return false;
		return valgt.kontraktsforhold.kode === forholdKode && (valgt.hjemmel?.kode ?? null) === hjemmelKode;
	}

	const grupper = KRAV_STRUKTUR_NS8407;

	const valgtRef = $derived(
		valgt?.hjemmel?.hjemmel_basis ?? valgt?.kontraktsforhold.hjemmel_frist ?? null
	);
	const valgtTittel = $derived(valgt?.hjemmel?.label ?? valgt?.kontraktsforhold.label ?? '');
	const valgtBeskrivelse = $derived(valgt?.hjemmel?.beskrivelse ?? valgt?.kontraktsforhold.beskrivelse ?? '');
</script>

<div class="hjemmel-velger">
	<div class="hjemmel-liste" role="listbox" aria-label="Velg kontraktshjemmel">
		{#each grupper as gruppe, gi (gruppe.kode)}
			{#if gi > 0}
				<div class="gruppe-separator" role="separator"></div>
			{/if}

			{#if gruppe.hjemler.length === 0}
				<button
					class="hjemmel-rad hjemmel-standalone"
					class:hjemmel-valgt={erValgt(gruppe.kode, null)}
					role="option"
					aria-selected={erValgt(gruppe.kode, null)}
					onclick={() => onvelg({ kontraktsforhold: gruppe, hjemmel: null })}
				>
					<span class="hjemmel-label">{gruppe.label}</span>
					<span class="hjemmel-ref">§{gruppe.hjemmel_frist}</span>
				</button>
			{:else}
				<div class="gruppe-header">
					<span class="gruppe-navn">{gruppe.label}</span>
					<span class="gruppe-ref">§{gruppe.hjemmel_frist}</span>
				</div>

				{#each gruppe.hjemler as hjemmel (hjemmel.kode)}
					<button
						class="hjemmel-rad"
						class:hjemmel-valgt={erValgt(gruppe.kode, hjemmel.kode)}
						role="option"
						aria-selected={erValgt(gruppe.kode, hjemmel.kode)}
						onclick={() => onvelg({ kontraktsforhold: gruppe, hjemmel })}
					>
						<span class="hjemmel-label">{hjemmel.label}</span>
						<span class="hjemmel-ref">§{hjemmel.hjemmel_basis}</span>
					</button>
				{/each}
			{/if}
		{/each}
	</div>

	{#if valgtRef}
		<KontraktsregelInline
			hjemmelRef={valgtRef}
			tittel={valgtTittel}
			beskrivelse={valgtBeskrivelse}
		/>
	{/if}
</div>

<style>
	.hjemmel-velger {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-3);
	}

	.hjemmel-liste {
		background: var(--color-canvas);
		border: 1px solid var(--color-wire);
		border-radius: var(--radius-sm);
		overflow: hidden;
	}

	.gruppe-header {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		padding: var(--spacing-2) var(--spacing-4);
		background: var(--color-canvas);
		border-bottom: 1px solid var(--color-wire);
	}

	.gruppe-navn {
		font-size: 10px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--color-ink-muted);
	}

	.gruppe-ref {
		font-family: var(--font-data);
		font-size: 10px;
		font-weight: 500;
		color: var(--color-ink-ghost);
		font-variant-numeric: tabular-nums;
	}

	.gruppe-separator {
		height: 1px;
		background: var(--color-wire-strong);
	}

	.hjemmel-rad {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		width: 100%;
		padding: var(--spacing-2) var(--spacing-4);
		background: transparent;
		border: none;
		border-bottom: 1px solid var(--color-wire);
		font-family: var(--font-ui);
		font-size: 13px;
		font-weight: 500;
		color: var(--color-ink-secondary);
		cursor: pointer;
		transition: background-color 0.1s, color 0.1s;
		text-align: left;
	}

	.hjemmel-rad:last-child {
		border-bottom: none;
	}

	.hjemmel-rad:hover:not(.hjemmel-valgt) {
		background: var(--color-felt-hover);
		color: var(--color-ink);
	}

	.hjemmel-valgt {
		background: var(--color-vekt-bg-strong);
		color: var(--color-ink);
		border-left: 2px solid var(--color-vekt);
	}

	.hjemmel-valgt .hjemmel-ref {
		color: var(--color-vekt);
	}

	.hjemmel-standalone {
		font-weight: 600;
	}

	.hjemmel-label {
		flex: 1;
		min-width: 0;
	}

	.hjemmel-ref {
		font-family: var(--font-data);
		font-size: 11px;
		font-weight: 500;
		color: var(--color-ink-ghost);
		font-variant-numeric: tabular-nums;
		flex-shrink: 0;
		margin-left: var(--spacing-3);
	}

</style>
