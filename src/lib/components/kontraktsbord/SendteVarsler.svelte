<script lang="ts">
  import { VARSEL_LABELS, type SendtKonsekvensVarsel } from '$lib/domain/konsekvensVarsler';
  import { formatDateTimeNorwegian } from '$lib/utils/dateFormatters';
  let { varsler = [] }: { varsler?: SendtKonsekvensVarsel[] } = $props();
</script>

{#each varsler as varsel (varsel.event_id)}
  <article>
    <strong>{VARSEL_LABELS[varsel.type]}</strong>
    <time datetime={varsel.tidsstempel}>{formatDateTimeNorwegian(varsel.tidsstempel)}</time>
    <p>{varsel.tekst}</p>
  </article>
{/each}

<style>
  article {
    margin-bottom: 16px;
    padding: 18px;
    border: var(--rule);
    border-radius: 12px;
    background: var(--surface);
  }
  strong {
    display: block;
    font-size: 13px;
    color: var(--ink);
  }
  time {
    display: block;
    margin-top: 6px;
    font-size: 11px;
    color: var(--ink-4);
  }
  p {
    font-size: 13px;
    line-height: 1.6;
    color: var(--ink-2);
    white-space: pre-wrap;
  }
</style>
