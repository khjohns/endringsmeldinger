<script lang="ts">
	export type Visning = 'kort' | 'tidslinje';
	export type SporFilter = { K: boolean; V: boolean; F: boolean };

	interface Props {
		visning: Visning;
		sporFilter: SporFilter;
		onVisningChange: (v: Visning) => void;
		onFilterChange: (f: SporFilter) => void;
	}

	let { visning, sporFilter, onVisningChange, onFilterChange }: Props = $props();

	function toggleFilter(key: 'K' | 'V' | 'F') {
		// Prevent disabling the last active filter
		const activeCount = Object.values(sporFilter).filter(Boolean).length;
		if (sporFilter[key] && activeCount <= 1) return;

		onFilterChange({ ...sporFilter, [key]: !sporFilter[key] });
	}
</script>

<div class="visning-bar">
	<div class="visning-toggle">
		<button
			class="visning-btn"
			class:visning-btn-active={visning === 'kort'}
			onclick={() => onVisningChange('kort')}
			aria-pressed={visning === 'kort'}
		>
			≡ Kort
		</button>
		<button
			class="visning-btn"
			class:visning-btn-active={visning === 'tidslinje'}
			onclick={() => onVisningChange('tidslinje')}
			aria-pressed={visning === 'tidslinje'}
		>
			⏐ Tidslinje
		</button>
	</div>

	{#if visning === 'tidslinje'}
		<div class="sporfiltre">
			<button
				class="filter-btn filter-K"
				class:filter-active={sporFilter.K}
				onclick={() => toggleFilter('K')}
				aria-pressed={sporFilter.K}
			>K</button>
			<button
				class="filter-btn filter-V"
				class:filter-active={sporFilter.V}
				onclick={() => toggleFilter('V')}
				aria-pressed={sporFilter.V}
			>V</button>
			<button
				class="filter-btn filter-F"
				class:filter-active={sporFilter.F}
				onclick={() => toggleFilter('F')}
				aria-pressed={sporFilter.F}
			>F</button>
		</div>
	{/if}
</div>

<style>
	.visning-bar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 8px 32px;
		border-bottom: 1px solid var(--color-wire);
		background: var(--color-canvas);
		position: sticky;
		top: 0;
		z-index: 10;
	}

	.visning-toggle {
		display: flex;
		gap: 2px;
	}

	.visning-btn {
		font-family: var(--font-data);
		font-size: 10px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--color-ink-muted);
		background: var(--color-felt);
		border: 1px solid var(--color-wire);
		border-radius: var(--radius-sm);
		padding: 4px 8px;
		cursor: pointer;
		transition: all 150ms ease;
	}

	.visning-btn:hover {
		color: var(--color-ink);
		border-color: var(--color-wire-strong);
	}

	.visning-btn-active {
		color: var(--color-ink);
		background: var(--color-felt-raised);
		border-color: var(--color-wire-strong);
	}

	.sporfiltre {
		display: flex;
		gap: 4px;
	}

	.filter-btn {
		font-family: var(--font-data);
		font-size: 10px;
		font-weight: 700;
		color: var(--color-ink-ghost);
		background: transparent;
		border: 1px solid var(--color-wire);
		border-radius: var(--radius-sm);
		padding: 4px 8px;
		cursor: pointer;
		transition: all 150ms ease;
	}

	.filter-K.filter-active {
		color: var(--color-ink);
		background: var(--color-felt-hover);
		border-color: var(--color-ink-muted);
	}

	.filter-V.filter-active {
		color: var(--color-vekt);
		background: var(--color-vekt-bg);
		border-color: var(--color-vekt-dim);
	}

	.filter-F.filter-active {
		color: var(--color-score-low);
		background: var(--color-score-low-bg);
		border-color: var(--color-score-low);
	}

	@media (max-width: 1023px) {
		.visning-bar {
			padding: 8px 16px;
		}
	}
</style>
