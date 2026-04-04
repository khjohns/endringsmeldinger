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
  <div class="sub-notice-wrapper">
    <div class="diamond notice-diamond"></div>
    <div class="sub-notice">
      <Stamp variant="green" small flat>Subsidiært</Stamp>
      <p class="font-serif sub-notice-text">{notice}</p>
    </div>
  </div>
{/if}

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
  .sub-notice-wrapper {
    position: relative;
    margin-left: 20px;
    padding-left: 18px;
    margin-bottom: 24px;
  }

  .notice-diamond {
    left: -6px;
    top: 4px;
  }

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

  .stripe-diamond {
    left: -7px;
    top: 0;
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
