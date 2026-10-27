<script lang="ts">
  /** Brukerforløpene som kan kjøres i demoruta (#1330), fra startjournalene. */
  import { resolve } from '$app/paths';
  import { FORLOEP } from '$lib/brukerforlop/demosak';
</script>

<svelte:head><title>Brukerforløp — demo</title></svelte:head>

<main class="oversikt">
  <h1>Brukerforløp</h1>
  <p class="merknad">
    Forløpene kjøres mot en journal i minnet i nettleseren. Ingenting sendes. Dekningen står i
    <code>docs/domenetabell/brukerforlop/dekning.md</code>.
  </p>
  <ul>
    {#each FORLOEP as f (f.id)}
      <li>
        <a href={resolve('/demo/[forlop]', { forlop: f.id })}>{f.id} · {f.tittel}</a>
        <p>{f.brukerhistorie}</p>
      </li>
    {/each}
  </ul>
</main>

<style>
  .oversikt {
    max-width: 720px;
    padding: var(--spacing-10) var(--spacing-4);
    margin: 0 auto;
    color: var(--ink);
    font-family: var(--font-sans);
  }
  h1 {
    font-size: 22px;
    font-weight: 600;
    margin-bottom: var(--spacing-2);
  }
  .merknad {
    color: var(--ink-2);
    margin-bottom: var(--spacing-6);
  }
  ul {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-4);
  }
  a {
    font-weight: 600;
    color: var(--brand);
  }
  li p {
    color: var(--ink-2);
  }
</style>
