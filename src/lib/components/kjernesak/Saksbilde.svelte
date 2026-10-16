<script lang="ts">
  /**
   * Saksbildet for en TS-sak (#665): kravene og svarene per spor, med status og
   * etiketter fra `visning`, og journalen med den låste brevteksten og
   * leveringsoppdragene. Komponenten leser bare saksbildet fra konteksten (#313).
   */
  import { formatDateTimeNorwegian } from '$lib/utils/dateFormatters';
  import type { Saksbilde } from '$lib/kjernesak/saksbilde';

  let { bilde }: { bilde: Saksbilde } = $props();
</script>

<article class="saksbilde">
  <header>
    <h1>{bilde.tittel ?? 'Sak'}</h1>
    <p class="status" data-testid="status">{bilde.status.tekst}</p>
    <p class="dempet">Versjon {bilde.versjon}</p>
    {#each bilde.merknader as m (m.kode)}
      <p class="merknad" role="note">{m.tekst}</p>
    {/each}
  </header>

  {#each bilde.spor as s (s.spor)}
    <section aria-labelledby="spor-{s.spor}" data-testid="spor-{s.spor}">
      <h2 id="spor-{s.spor}">{s.navn}</h2>
      {#if s.etiketter.length}
        <ul class="etiketter">
          {#each s.etiketter as e (e.kode)}<li>{e.tekst}</li>{/each}
        </ul>
      {/if}
      {#if s.poster.length}
        <ul class="poster">
          {#each s.poster as p (p.id)}
            <li>{p.tekst}</li>
          {/each}
        </ul>
      {:else}
        <p class="dempet">Ingen krav eller svar i sporet.</p>
      {/if}
    </section>
  {/each}

  <section aria-labelledby="journal">
    <h2 id="journal">Journal</h2>
    <ol class="journal">
      {#each bilde.journal as j (j.hendelse)}
        <li data-testid="journal-{j.versjon}">
          <p>
            <strong>{j.versjon}. {j.tittel}</strong>, {formatDateTimeNorwegian(j.tidsstempel)}
            {#if !j.tolket}<span class="merknad">Ikke tolket</span>{/if}
          </p>
          {#if j.tekst}
            <div class="brevtekst">
              {#each j.tekst as avsnitt, i (i)}
                <p>{avsnitt.laast}</p>
                {#if avsnitt.utdypning}<p class="utdypning">{avsnitt.utdypning}</p>{/if}
              {/each}
            </div>
          {/if}
          {#each j.oppdrag as o (o.id)}
            <p class="dempet">
              Leveringsoppdrag {o.filnavn ?? o.dokumentnoekkel}: frosset {formatDateTimeNorwegian(
                o.opprettet
              )}, ikke levert
            </p>
          {/each}
        </li>
      {/each}
    </ol>
  </section>
</article>

<style>
  .saksbilde {
    max-width: 48rem;
    margin: 0 auto;
    padding: 24px 16px;
    color: var(--color-ink);
    display: grid;
    gap: 24px;
  }
  h1 {
    font-size: 22px;
    font-weight: 600;
  }
  h2 {
    font-size: 17px;
    font-weight: 600;
    margin-bottom: 8px;
  }
  .status {
    font-weight: 600;
  }
  .dempet {
    color: var(--color-ink-muted);
    font-size: 14px;
  }
  .merknad {
    color: var(--color-ink-secondary);
    font-size: 14px;
  }
  .etiketter {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-bottom: 8px;
  }
  .etiketter li {
    border: 1px solid var(--color-wire);
    border-radius: 4px;
    padding: 2px 8px;
    font-size: 13px;
  }
  .poster,
  .journal {
    display: grid;
    gap: 8px;
    font-size: 14px;
  }
  .utdypning {
    color: var(--color-ink-secondary);
    white-space: pre-line;
  }
  .brevtekst {
    border-left: 2px solid var(--color-wire-strong);
    padding-left: 12px;
    margin: 6px 0;
    display: grid;
    gap: 6px;
  }
</style>
