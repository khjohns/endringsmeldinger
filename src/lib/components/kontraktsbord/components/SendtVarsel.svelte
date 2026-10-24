<script lang="ts">
  // Varselet TE sendte utenfor appen: datoen og brevet som vedlegg (MM-U1, OV-U4, OV-U5).
  import type { Kjernevedlegg } from '$lib/api/kjerne';
  import { dagensDato, varselhindring } from '$lib/kjernesak/skjemadata';
  import FormSection from './FormSection.svelte';

  interface Props {
    id: string;
    paragrafRef: string;
    hjelpetekst?: string;
    lastOpp: (fil: File) => Promise<Kjernevedlegg>;
    sendt: string;
    vedlegg: Kjernevedlegg[];
    opptatt: boolean;
  }

  let {
    id,
    paragrafRef,
    hjelpetekst,
    lastOpp,
    sendt = $bindable(),
    vedlegg = $bindable(),
    opptatt = $bindable(),
  }: Props = $props();

  let opplastingsfeil = $state<string | null>(null);
  // Leser dagens dato hver gang feltene endres, ikke én gang når skjemaet åpnes.
  const hindring = $derived(varselhindring({ sendt, vedlegg }, dagensDato()));

  async function lastOppFiler(filer: FileList | null) {
    if (!filer?.length) return;
    opptatt = true;
    opplastingsfeil = null;
    try {
      for (const fil of Array.from(filer)) vedlegg = [...vedlegg, await lastOpp(fil)];
    } catch (e) {
      opplastingsfeil = e instanceof Error ? e.message : 'Filen ble ikke lastet opp.';
    } finally {
      opptatt = false;
    }
  }
</script>

<FormSection title="Varselet som er sendt" {paragrafRef}>
  {#if hjelpetekst}<p class="helptext">{hjelpetekst}</p>{/if}
  <label class="field-label" for="{id}-sendt">Datoen varselet ble sendt</label>
  <input id="{id}-sendt" class="field-input" type="date" max={dagensDato()} bind:value={sendt} />
  {#if sendt && hindring}
    <p class="helptext" role="status">{hindring}</p>
  {/if}
  <label class="field-label" for="{id}-brev">Brevet med varselet</label>
  <input
    id="{id}-brev"
    type="file"
    multiple
    disabled={opptatt}
    onchange={(e) => {
      const felt = e.currentTarget;
      void lastOppFiler(felt.files).then(() => (felt.value = ''));
    }}
  />
  {#if opptatt}<p class="helptext" role="status">Laster opp …</p>{/if}
  {#if opplastingsfeil}<p role="alert">{opplastingsfeil}</p>{/if}
  {#if vedlegg.length}
    <ul class="vedleggsliste">
      {#each vedlegg as v (v.vedlegg_id)}
        <li>
          {v.filnavn}
          <button
            type="button"
            class="btn btn-secondary"
            onclick={() => (vedlegg = vedlegg.filter((x) => x !== v))}>Fjern</button
          >
        </li>
      {/each}
    </ul>
  {:else if !sendt}
    <p class="helptext">Brevet som ble sendt, må ligge ved.</p>
  {/if}
</FormSection>

<style>
  .field-label {
    display: block;
    font-size: 13px;
    font-weight: 600;
    margin: 12px 0 6px;
  }
  .field-input {
    padding: 6px 8px;
    border: var(--control-border);
    border-radius: 6px;
    background: var(--surface);
    color: var(--ink);
  }
  .vedleggsliste {
    list-style: none;
    padding: 0;
    margin: 8px 0 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .vedleggsliste li {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }
</style>
