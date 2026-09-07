<script lang="ts">
  import { fmt } from './utils.js';

  let { te, sub, prin }: { te: number; sub: number; prin: number } = $props();

  const bars = $derived([
    { label: 'subs.', val: sub, color: 'var(--green)' },
    { label: 'prins.', val: prin, color: 'var(--green)' },
  ]);
</script>

<div>
  {#each bars as bar, i}
    <div class="bar-row" style:margin-bottom={i === 0 ? '4px' : '0'}>
      <span class="font-mono bar-label">{bar.label}</span>
      <div class="bar-track">
        <div
          class="bar-fill"
          style:width="{(bar.val / te) * 100}%"
          style:background={bar.color}
        ></div>
      </div>
      <span class="font-mono bar-value" style:color={bar.val === 0 ? 'var(--ink-4)' : 'var(--ink)'}
        >{fmt(bar.val)}</span
      >
    </div>
  {/each}
</div>

<style>
  .bar-row {
    display: flex;
    align-items: center;
    gap: 8px;
    justify-content: space-between;
  }
  .bar-label {
    font-size: 9px;
    width: 32px;
    text-align: right;
    color: var(--ink-3);
    font-weight: 600;
  }
  .bar-track {
    flex: 0 0 96px;
    height: 6px;
    background: rgba(242, 247, 244, 0.2);
    border-radius: 999px;
    overflow: hidden;
  }
  .bar-fill {
    height: 100%;
    min-width: 4px;
    border-radius: inherit;
  }
  .bar-value {
    font-size: 10px;
    font-weight: 600;
    min-width: 48px;
    text-align: right;
  }
</style>
