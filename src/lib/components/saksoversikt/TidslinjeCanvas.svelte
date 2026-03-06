<script lang="ts">
	import type { TidslinjeKlynge } from '$lib/utils/tidslinje';
	import type { SporHendelseType } from '$lib/mocks/saksoversikt';
	import NodeCluster from './NodeCluster.svelte';

	interface Props {
		klynger: TidslinjeKlynge[];
		aktivtSpor?: SporHendelseType | null;
	}

	let { klynger, aktivtSpor = null }: Props = $props();
</script>

<div class="canvas">
	<div class="wire"></div>

	<!-- Digital Ink-Flow: dashed lines between clusters -->
	{#if klynger.length > 1}
		<svg class="ink-flow" aria-hidden="true">
			{#each klynger as klynge, i}
				{#if i < klynger.length - 1}
					<line
						x1="{klynge.pos}%"
						y1="50%"
						x2="{klynger[i + 1].pos}%"
						y2="50%"
						stroke="var(--color-wire)"
						stroke-width="1"
						stroke-dasharray="2 3"
					/>
				{/if}
			{/each}
		</svg>
	{/if}

	{#each klynger as klynge (klynge.pos)}
		<NodeCluster items={klynge.items} pos={klynge.pos} {aktivtSpor} />
	{/each}
</div>

<style>
	.canvas {
		flex: 1;
		height: 100%;
		position: relative;
		display: flex;
		align-items: center;
		margin: 0 32px;
	}

	.wire {
		position: absolute;
		height: 1px;
		left: 0;
		right: 0;
		background: var(--color-wire);
		z-index: 1;
	}

	.ink-flow {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		pointer-events: none;
		z-index: 2;
	}

	@media (max-width: 1023px) {
		.canvas {
			margin: 0 8px;
		}
	}
</style>
