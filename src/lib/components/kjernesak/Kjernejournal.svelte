<script lang="ts">
  /**
   * Historikken for en TS-sak i Kontrollrommet (#665, #718): merknadene fra
   * `visning` (blant dem «kan ikke utledes», MM-U2) og journalen med den låste
   * brevteksten og leveringsoppdragene (LV-U2).
   */
  import { formatDateTimeNorwegian } from '$lib/utils/dateFormatters';
  import type { Saksbilde } from '$lib/kjernesak/saksbilde';

  let { bilde }: { bilde: Saksbilde } = $props();
</script>

<section class="kjernejournal" aria-label="Journal">
  {#each bilde.merknader as m (m.kode)}
    <p class="merknad" role="note">{m.tekst}</p>
  {/each}
  <ol class="journal">
    {#each [...bilde.journal].reverse() as j (j.hendelse)}
      <li data-testid="journal-{j.versjon}">
        <p>
          <strong>{j.versjon}. {j.tittel}</strong>
          <span class="dempet">{formatDateTimeNorwegian(j.tidsstempel)}</span>
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

<style>
  .kjernejournal {
    display: grid;
    gap: 12px;
    font-size: 13px;
    color: var(--ink);
  }
  .journal {
    display: grid;
    gap: 12px;
  }
  .journal p {
    margin: 0;
  }
  .dempet {
    display: block;
    color: var(--ink-3);
    font-size: 12px;
  }
  .merknad {
    margin: 0;
    padding: 8px 10px;
    border: 1px solid var(--border);
    border-radius: 6px;
    color: var(--ink-2);
  }
  .utdypning {
    color: var(--ink-2);
    white-space: pre-line;
  }
  .brevtekst {
    border-left: 2px solid var(--border);
    padding-left: 10px;
    margin: 6px 0;
    display: grid;
    gap: 6px;
  }
</style>
