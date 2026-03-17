<script lang="ts">
  import type { TidslinjeNode } from '$lib/utils/tidslinje';
  import { klyngePrioritet, sporFordeling, gruppertTooltip } from '$lib/utils/tidslinje';
  import type { SporHendelseType } from '$lib/mocks/saksoversikt';

  interface Props {
    items: TidslinjeNode[];
    pos: number;
    aktivtSpor?: SporHendelseType | null;
  }

  let { items, pos, aktivtSpor = null }: Props = $props();

  const tagType = $derived(klyngePrioritet(items));
  const harFlere = $derived(items.length > 1);
  const fordeling = $derived(sporFordeling(items));
  const tooltip = $derived(gruppertTooltip(items));

  // Dim cluster if a spor filter is active and no items match it
  const erDimmet = $derived(aktivtSpor !== null && !items.some((i) => i.type === aktivtSpor));
</script>

<div
  class="klynge"
  class:klynge-fler={harFlere}
  class:klynge-dim={erDimmet}
  style:left="{pos}%"
  title={tooltip}
>
  {#each items as item, idx (idx)}
    <div
      class="node node-{item.type.toLowerCase()}"
      class:node-besvart={item.besvart}
      class:node-ubesvart={!item.besvart}
      class:node-spor-dim={aktivtSpor !== null && item.type !== aktivtSpor}
    >
      {item.type}
    </div>
  {/each}
  {#if harFlere}
    <div class="klynge-tag tag-{tagType.toLowerCase()}">{fordeling}</div>
  {/if}
</div>

<style>
  .klynge {
    position: absolute;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10;
    width: 28px;
    height: 28px;
    transform: translateX(-50%);
    transition: opacity 200ms ease;
  }

  .klynge-dim {
    opacity: 0.15;
  }

  .node {
    width: 16px;
    height: 16px;
    border: 1px solid var(--color-wire-strong);
    border-radius: 1px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: var(--font-data);
    font-size: 8px;
    font-weight: 600;
    color: var(--color-ink-secondary);
    transition:
      transform 200ms cubic-bezier(0.19, 1, 0.22, 1),
      opacity 200ms ease;
    position: absolute;
  }

  /* Ubesvart: filled background, strong border — demands attention */
  .node-ubesvart.node-k {
    background: var(--color-ink-ghost);
    border-color: var(--color-ink-ghost);
    color: var(--color-canvas);
  }
  .node-ubesvart.node-v {
    background: var(--color-vekt);
    border-color: var(--color-vekt);
    color: var(--color-canvas);
  }
  .node-ubesvart.node-f {
    background: var(--color-score-low);
    border-color: var(--color-score-low);
    color: var(--color-canvas);
  }

  /* Besvart: outline only, dimmed — resolved, lower priority */
  .node-besvart.node-k {
    background: var(--color-canvas);
    border-color: var(--color-ink-ghost);
    color: var(--color-ink-muted);
    opacity: 0.6;
  }
  .node-besvart.node-v {
    background: var(--color-canvas);
    border-color: var(--color-vekt-dim);
    color: var(--color-vekt-dim);
    opacity: 0.6;
  }
  .node-besvart.node-f {
    background: var(--color-canvas);
    border-color: var(--color-score-low);
    color: var(--color-score-low);
    opacity: 0.6;
  }

  /* Per-node dimming when spor filter is active */
  .node-spor-dim {
    opacity: 0.12 !important;
  }

  /* Explosion on hover — only for multi-node clusters */
  .klynge-fler:hover {
    z-index: 50;
  }
  .klynge-fler:hover .node:nth-child(1) {
    transform: translate(-8px, -8px);
  }
  .klynge-fler:hover .node:nth-child(2) {
    transform: translate(8px, -8px);
  }
  .klynge-fler:hover .node:nth-child(3) {
    transform: translate(0px, 8px);
  }

  .klynge-tag {
    position: absolute;
    top: -3px;
    right: -3px;
    height: 12px;
    padding: 0 3px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: var(--font-data);
    font-size: 7px;
    font-weight: 800;
    color: var(--color-canvas);
    z-index: 30;
    border-radius: 1px;
    transform: translate(25%, -25%);
    white-space: nowrap;
    letter-spacing: 0.02em;
  }

  .tag-k {
    background: var(--color-ink-ghost);
  }
  .tag-v {
    background: var(--color-vekt);
  }
  .tag-f {
    background: var(--color-score-low);
  }
</style>
