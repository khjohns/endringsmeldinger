<!--
  Meldingen om en feil fra serveren, en kvittering eller en melding om prøven: ikon og en kant
  i blekk på `--surface-inset`, ikke rosa eller grønt (`innlogging.html:306`, system.md, «En
  melding om prøven» og «Hver farge betyr én ting»). Feilen ved et felt bruker `--danger` og
  står ikke her (MM-U32).
-->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import { CircleAlert, CircleCheck, Info } from 'lucide-svelte';

  let {
    art,
    levende = true,
    children,
    ...rest
  }: {
    /** `feil` leses opp straks (role="alert"); de andre er status. */
    art: 'feil' | 'kvittering' | 'info';
    /** `false` når meldingen står i en levende region som finnes fra før, så den ikke leses to ganger. */
    levende?: boolean;
    children: Snippet;
    [k: string]: unknown;
  } = $props();
  const Ikon = $derived(art === 'feil' ? CircleAlert : art === 'kvittering' ? CircleCheck : Info);
</script>

<div
  class="melding"
  role={levende ? (art === 'feil' ? 'alert' : 'status') : undefined}
  data-art={art}
  {...rest}
>
  <Ikon size={18} aria-hidden="true" />
  <div class="tekst">{@render children()}</div>
</div>

<style>
  .melding {
    display: flex;
    gap: var(--spacing-3);
    padding: var(--spacing-3) var(--spacing-4);
    border-left: 3px solid var(--ink);
    background: var(--surface-inset);
    color: var(--ink);
    font-size: 14px;
  }
  .melding :global(svg) {
    flex: none;
    margin-top: 1px;
  }
  .tekst {
    min-width: 0;
  }
</style>
