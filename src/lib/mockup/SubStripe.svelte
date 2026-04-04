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

{#if notice}
  <div class="sub-notice-section">
    <div class="diamond"></div>
    <div class="sub-notice">
      <Stamp variant="green" small flat>Subsidiært</Stamp>
      <p class="font-serif sub-notice-text">{notice}</p>
    </div>
  </div>
{/if}

<div class="sub-stripe">
  <div class="diamond"></div>

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
  /*
   * Shared geometry: both notice and stripe use identical left offset
   * so the dashed line + diamonds form one continuous visual axis.
   *
   * Diamond centering: 11px diamond on 2px border.
   * Border center from padding edge = -1px.
   * Diamond left = -1 - 5.5 = -6.5 → round to -7px.
   */
  .sub-notice-section,
  .sub-stripe {
    position: relative;
    margin-left: -20px;
    padding-left: 18px;
    border-left: 2px dashed var(--green-border);
  }

  .sub-notice-section {
    padding-top: 4px;
    padding-bottom: 4px;
    margin-bottom: 0;
  }

  .sub-notice-section .diamond,
  .sub-stripe > .diamond {
    left: -7px;
    top: 0;
  }

  .sub-notice-section .diamond {
    top: 4px;
  }

  .sub-stripe {
    animation: stripe-in 0.15s ease-out;
  }

  @keyframes stripe-in {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
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

  .counter-label {
    font-size: 10px;
    font-weight: 600;
    color: var(--green);
  }

  @media (max-width: 640px) {
    .sub-notice-section,
    .sub-stripe {
      margin-left: -12px;
      padding-left: 10px;
    }
  }
</style>
