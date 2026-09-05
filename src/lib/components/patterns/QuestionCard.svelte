<script lang="ts">
  import type { Snippet } from 'svelte';
  import SectionHeading from '$lib/components/primitives/SectionHeading.svelte';
  import SubsidiaryBadge from './SubsidiaryBadge.svelte';

  type Props = {
    title: string;
    paragrafRef?: string;
    description?: string;
    subsidiary?: boolean;
    children: Snippet;
  };

  let { title, paragrafRef = '', description = '', subsidiary = false, children }: Props = $props();
</script>

<section class="question-card">
  <div class="question-card-heading">
    <SectionHeading {title} {paragrafRef} />
    {#if subsidiary}
      <SubsidiaryBadge />
    {/if}
  </div>

  {#if description}
    <p class="question-description">{description}</p>
  {/if}

  {@render children()}
</section>

<style>
  .question-card {
    margin: 0 0 16px;
    padding: 18px;
    background: var(--surface);
    border: var(--rule);
    border-radius: 12px;
  }
  .question-card-heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }
  .question-card-heading :global(.section-heading) {
    flex: 1;
  }
  .question-description {
    margin: 14px 0;
    font-size: 14px;
    line-height: 1.55;
    color: var(--ink-2);
  }
</style>
