<script lang="ts">
  /**
   * Saksbildet for en TS-sak (#665): kravene og svarene per spor, med status og
   * etiketter fra `visning`, og journalen med den låste brevteksten og
   * leveringsoppdragene. Med sakskonteksten tilbys det første vederlagskravet når
   * kjernen tilbyr det for leserens side (#667).
   */
  import { formatDateTimeNorwegian } from '$lib/utils/dateFormatters';
  import type { Saksbilde } from '$lib/kjernesak/saksbilde';
  import type { Kjernesakkontekst } from '$lib/kjernesak/kontekst.svelte';
  import { tilbyrFoersteVederlagskrav } from '$lib/kjernesak/vederlagskrav';
  import Vederlagsskjema from './Vederlagsskjema.svelte';

  let { bilde, kjernesak }: { bilde: Saksbilde; kjernesak?: Kjernesakkontekst } = $props();
  let iSkjema = $state(false);
  const tilbyrVederlagskrav = $derived(
    kjernesak ? tilbyrFoersteVederlagskrav(kjernesak.handlinger, bilde) : false
  );
  const visSkjema = $derived(iSkjema && tilbyrVederlagskrav);
</script>

{#if visSkjema && kjernesak}
  <div class="skjema">
    <Vederlagsskjema
      {kjernesak}
      sakstittel={bilde.tittel ?? 'Sak'}
      onsendt={() => (iSkjema = false)}
      onavbryt={() => (iSkjema = false)}
    />
  </div>
{/if}

<article class="saksbilde" hidden={visSkjema}>
  <header>
    <h1>{bilde.tittel ?? 'Sak'}</h1>
    <p class="status" data-testid="status">{bilde.status.tekst}</p>
    <p class="dempet">Versjon {bilde.versjon}</p>
    {#each bilde.merknader as m (m.kode)}
      <p class="merknad" role="note">{m.tekst}</p>
    {/each}
    {#if tilbyrVederlagskrav}
      <button type="button" class="handling" onclick={() => (iSkjema = true)}
        >Send krav om vederlagsjustering</button
      >
    {/if}
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
  .skjema {
    max-width: 48rem;
    margin: 0 auto;
    padding: 24px 16px;
  }
  .handling {
    justify-self: start;
    margin-top: 8px;
    border: 1px solid var(--brand);
    background: var(--brand);
    color: var(--surface);
    border-radius: 8px;
    padding: 8px 14px;
    font: inherit;
    font-size: 14px;
    cursor: pointer;
  }
  .saksbilde {
    max-width: 48rem;
    margin: 0 auto;
    padding: 24px 16px;
    color: var(--color-ink);
    display: grid;
    gap: 24px;
  }
  .saksbilde[hidden] {
    display: none;
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
