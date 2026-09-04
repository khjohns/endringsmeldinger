<script lang="ts">
  import type { Snippet } from 'svelte';
  import SectionHeading from '$lib/components/primitives/SectionHeading.svelte';

  interface Props {
    title: string;
    paragrafRef?: string;
    children: Snippet;
  }

  let { title, paragrafRef = '', children }: Props = $props();
</script>

<section class="form-section">
  <SectionHeading {title} {paragrafRef} />
  {@render children()}
</section>

<style>
  .form-section {
    margin-bottom: 16px;
    padding: 18px;
    background: var(--surface);
    border: var(--rule);
    border-radius: 12px;
  }

  .form-section :global(.helptext) {
    margin: 12px 0 0;
    font-size: 13px;
    line-height: 1.55;
    color: var(--ink-3);
  }
</style>
