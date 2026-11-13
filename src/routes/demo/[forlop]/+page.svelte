<script lang="ts">
  /**
   * Et brukerforløp i Varden (#1330, #1331), fra kontrollpunktet i `?punkt=`, ellers fra
   * det første. Ingenting sendes; journalen ligger i minnet.
   */
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import Demoforloep from '$lib/components/brukerforlop/Demoforloep.svelte';
  import { finnForloep } from '$lib/kjernesak/demosak';

  const forloep = $derived(finnForloep(page.params.forlop ?? ''));
  // `?brukertest` viser saken uten demopanelet; tilstanden settes med lenken.
  const brukertest = $derived(page.url.searchParams.has('brukertest'));
  function gaaTil(id: string, punkt: string) {
    const href = `${resolve('/demo/[forlop]', { forlop: id })}?punkt=${encodeURIComponent(punkt)}`;
    // href er ruta fra resolve() med kontrollpunktet i query.
    // eslint-disable-next-line svelte/no-navigation-without-resolve
    void goto(href);
  }

  const punkt = $derived.by(() => {
    const valgt = page.url.searchParams.get('punkt');
    const punkter = forloep?.kontrollpunkter ?? [];
    return punkter.find((p) => p.id === valgt)?.id ?? (valgt ? null : (punkter[0]?.id ?? null));
  });
</script>

{#if forloep && punkt}
  {#key forloep.id + ':' + punkt}
    <Demoforloep
      {forloep}
      {punkt}
      panel={!brukertest}
      onpunkt={(neste) => gaaTil(forloep.id, neste)}
      nySakLenke={resolve('/demo/[forlop]', { forlop: 'BF-05' })}
    />
  {/key}
{:else}
  <main class="melding" role="alert">
    <h1>Fant ikke forløpet</h1>
    <p>Forløpet eller kontrollpunktet finnes ikke.</p>
    <a href={resolve('/demo')}>Til brukerforløpene</a>
  </main>
{/if}

<style>
  .melding {
    padding: var(--spacing-10);
    color: var(--ink);
  }
  h1 {
    font-size: 22px;
    margin-bottom: var(--spacing-3);
  }
  p {
    margin-bottom: var(--spacing-4);
  }
</style>
