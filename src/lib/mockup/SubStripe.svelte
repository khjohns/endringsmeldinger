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

<!-- Notice sits ABOVE the stripe, sharing the diamond visually -->
{#if notice}
  <div class="sub-notice-wrapper">
    <div class="diamond notice-diamond"></div>
    <div class="sub-notice">
      <Stamp variant="green" small flat>Subsidiært</Stamp>
      <p class="font-serif sub-notice-text">{notice}</p>
    </div>
  </div>
{/if}

<!-- Stripe starts here — wraps only BH content -->
<div class="sub-stripe">
  <div class="diamond stripe-diamond"></div>

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
  /* Notice — above the stripe, with its own diamond */
  .sub-notice-wrapper {
    position: relative;
    margin-left: 20px;
    padding-left: 18px;
    margin-bottom: 24px;
  }

  .sub-notice {
    background: var(--green-bg);
    padding: 12px 16px;
    border: var(--rule-subtle);
    border-radius: 4px;
  }

  .sub-notice-text {
    font-size: 13px;
    line-height: 1.55;
    color: var(--ink-2);
    font-style: italic;
    margin-top: 8px;
  }

  /* Stripe — wraps BH content only */
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

  /* Shared diamond style */
  .diamond {
    position: absolute;
    width: 11px;
    height: 11px;
    background: var(--green);
    transform: rotate(45deg);
  }

  .notice-diamond {
    left: -6px;
    top: 4px;
  }

  .stripe-diamond {
    left: -7px;
    top: 0;
  }

  /* Counter at bottom */
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
    .sub-notice-wrapper {
      margin-left: 12px;
      padding-left: 12px;
    }

    .sub-stripe {
      margin-left: 12px;
      padding-left: 12px;
    }
  }
</style>
