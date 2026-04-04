<script lang="ts">
  import type { Snippet } from 'svelte';
  import Stamp from './Stamp.svelte';

  let {
    notice,
    diamondCount = 1,
    children,
  }: {
    notice?: string;
    diamondCount?: number;
    children: Snippet;
  } = $props();
</script>

<div class="sub-stripe">
  <!-- Primary diamond (always present) -->
  <div class="diamond primary"></div>

  {#if notice}
    <div class="sub-stripe-notice">
      <Stamp variant="green" small flat>Subsidiært</Stamp>
      <p class="font-serif sub-stripe-notice-text">{notice}</p>
    </div>
  {/if}

  {@render children()}

  {#if diamondCount > 1}
    <div class="sub-stripe-counter">
      <div class="mini-diamonds">
        {#each Array(diamondCount) as _}
          <div class="mini-diamond"></div>
        {/each}
      </div>
      <span class="font-mono counter-label">{diamondCount}× subsidiært</span>
    </div>
  {/if}
</div>

<style>
  .sub-stripe {
    position: relative;
    margin-left: 20px;
    padding-left: 18px;
    border-left: 2px dashed var(--green-border);
    animation: stripe-in 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  }

  @keyframes stripe-in {
    from {
      opacity: 0;
      transform: translateY(-8px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .diamond {
    position: absolute;
    width: 11px;
    height: 11px;
    background: var(--green);
    transform: rotate(45deg);
  }

  .diamond.primary {
    left: -7px;
    top: 0;
  }

  .sub-stripe-notice {
    background: var(--green-bg);
    padding: 12px 16px;
    border: var(--rule-subtle);
    border-radius: 4px;
    margin-bottom: 24px;
  }

  .sub-stripe-notice-text {
    font-size: 13px;
    line-height: 1.55;
    color: var(--ink-2);
    font-style: italic;
    margin-top: 8px;
  }

  .sub-stripe-counter {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 16px;
    padding-top: 12px;
  }

  .mini-diamonds {
    display: flex;
    gap: 4px;
  }

  .mini-diamond {
    width: 8px;
    height: 8px;
    background: var(--green);
    transform: rotate(45deg);
  }

  .counter-label {
    font-size: 10px;
    font-weight: 600;
    color: var(--green);
  }

  @media (max-width: 640px) {
    .sub-stripe {
      margin-left: 12px;
      padding-left: 12px;
    }
  }
</style>
