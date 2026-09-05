<script lang="ts">
  import SubsidiaryBadge from './SubsidiaryBadge.svelte';

  type Props = {
    title?: string;
    subsidiary?: boolean;
  };

  let { title = 'Byggherrens standpunkt', subsidiary = false }: Props = $props();
</script>

<div class="standpoint-heading">
  <span class="standpoint-title">{title}</span>
  {#if subsidiary}
    <SubsidiaryBadge />
  {/if}
</div>

<style>
  .standpoint-heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin: 4px 0 16px;
    padding-bottom: 10px;
    border-bottom: 1px solid var(--color-wire, var(--line));
  }
  .standpoint-title {
    font-size: 12px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--ink-3, var(--color-ink-secondary));
  }
</style>
