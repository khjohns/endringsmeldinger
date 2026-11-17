<!-- Prøveskjemaet for `sendeflyt.test.ts`: et felt, knappen og hindringen. -->
<script lang="ts">
  import type { Kjernesakkontekst } from '#lib/kjernesak/kontekst.svelte.ts';
  import { sendeflyt, type Sendesteg } from '../sendeflyt.svelte';

  let {
    kjernesak,
    steg,
  }: {
    kjernesak: Kjernesakkontekst;
    /** Steget for hvert forsøk, med feltet som får fokus når noe mangler. */
    steg: (felt: () => HTMLElement | null) => Sendesteg;
  } = $props();
  const flyt = sendeflyt(() => kjernesak, 'prove-hindring');
  let felt = $state<HTMLElement | null>(null);
</script>

<input aria-label="Feltet" bind:this={felt} />
<p data-testid="feil">{flyt.feil({ felt: 'felt', post: null, tekst: 'Fyll ut feltet.' }) ?? ''}</p>
<button
  type="button"
  aria-describedby={flyt.hindring ? flyt.hindringId : undefined}
  onclick={() => flyt.send(steg(() => felt))}>Se brevet</button
>
{#if flyt.hindring}<p id={flyt.hindringId} tabindex="-1">{flyt.hindring}</p>{/if}
