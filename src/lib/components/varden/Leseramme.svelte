<!--
  Brevet ved siden av skjemaet. Rammen følger brevet og er høyst like høy som vinduet, med luften
  over og under. Et lengre brev ruller i den, og sendeknappen står fast i bunnen (oppdragsgiver
  29.10, #1391, #1983).
-->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import { brevhode, dato } from './tekster';
  import type { Brevet } from './lesing';

  let {
    id,
    brev,
    children,
    bunn,
  }: {
    /** ID-en lenken i `Brevlinje` viser til. */
    id: string;
    brev: Pick<Brevet, 'merking' | 'art' | 'brevtittel' | 'avsender' | 'registrert'>;
    children: Snippet;
    bunn?: Snippet;
  } = $props();
</script>

<!-- Regionen er rullefeltet, så rammen rundt er ikke en egen region med samme navn. -->
<div class="leseramme" {id}>
  <h2 class="lesetittel" id={`${id}-tittel`}>
    {brevhode(brev)}
    <span class="dempet">· {brev.avsender} · {dato(brev.registrert)}</span>
  </h2>
  <!-- Rammen ruller for seg selv, så den må kunne nås med tastaturet. -->
  <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
  <div class="brevrulle" tabindex="0" role="region" aria-labelledby={`${id}-tittel`}>
    {@render children()}
  </div>
  {#if bunn}<div class="lesebunn">{@render bunn()}</div>{/if}
</div>

<style>
  .leseramme {
    position: sticky;
    top: var(--spacing-4);
    display: flex;
    flex-direction: column;
    max-height: calc(100dvh - 2 * var(--spacing-4));
    background: var(--surface);
    border: var(--rule);
    border-radius: var(--r-kort);
    overflow: hidden;
  }
  .lesetittel {
    padding: var(--spacing-3) var(--spacing-5);
    border-bottom: var(--rule);
    font-size: 16px;
    font-weight: 600;
  }
  .dempet {
    color: var(--ink-3);
    font-size: 14px;
    font-weight: 400;
  }
  .brevrulle {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
  }
  .brevrulle:focus-visible {
    outline: 2px solid var(--control-focus);
    outline-offset: -2px;
  }
  .lesebunn {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-3);
    padding: var(--spacing-4) var(--spacing-5) var(--spacing-5);
    border-top: var(--rule);
  }
</style>
