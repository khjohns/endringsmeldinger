<script lang="ts">
  import CaseAnchor from './CaseAnchor.svelte';

  let {
    sender,
    feil,
  }: {
    sender: boolean;
    feil: string | null | undefined;
  } = $props();
</script>

{#if sender}<p role="status">Sender …</p>{/if}
{#if feil}<p role="alert">{feil}</p>{/if}
<CaseAnchor />
