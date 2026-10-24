<script lang="ts">
  // Feilmeldingen rett under feltet den gjelder (docs/design/system.md, MM-U32, #1264).
  let { melding }: { melding: string | null } = $props();
</script>

{#if melding}<p class="feltmelding" role="alert">{melding}</p>{/if}

<style>
  .feltmelding {
    margin: 6px 0 0;
    font-size: 14px;
    line-height: 1.5;
    color: var(--danger);
  }
</style>
