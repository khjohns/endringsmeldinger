<script lang="ts">
  /**
   * Historikken for en TS-sak i Kontrollrommet (#665, #718): merknadene fra
   * `visning` (blant dem «kan ikke utledes», MM-U2) og journalen med den låste
   * brevteksten og leveringsoppdragene (LV-U2). Et sendt brev med dokument fra appen
   * kan lastes ned som PDF (#1054); sak og prosjekt er de i ruta (#743). Et brev
   * registrert som dokumentasjon vises med beskrivelsen, sporene og datoen (OV-U16), og
   * motpartens registrerte brev vises ved kravet som venter på svar (#1045).
   */
  import { Download } from 'lucide-svelte';
  import { page } from '$app/state';
  import type { Leveringsoppdrag } from '$lib/api/kjerne';
  import { lastNedBrevPdf } from '$lib/kjernesak/brevpdf';
  import { formatDateTimeNorwegian } from '$lib/utils/dateFormatters';
  import { leveringstekst, type Saksbilde } from '$lib/kjernesak/saksbilde';

  let { bilde }: { bilde: Saksbilde } = $props();

  let lasterNed = $state<string | null>(null);
  let feil = $state<{ oppdrag: string; melding: string } | null>(null);

  async function lastNed(o: Leveringsoppdrag) {
    lasterNed = o.id;
    feil = null;
    try {
      await lastNedBrevPdf(
        page.params.sakId!,
        o.event_id,
        page.params.prosjektId!,
        o.filnavn ?? `${o.dokumentnoekkel}.pdf`
      );
    } catch (e) {
      feil = { oppdrag: o.id, melding: e instanceof Error ? e.message : 'Nedlasting feilet.' };
    } finally {
      lasterNed = null;
    }
  }
</script>

<section class="kjernejournal" aria-label="Journal">
  {#each bilde.merknader as m (m.kode)}
    <p class="merknad" role="note">{m.tekst}</p>
  {/each}
  {#each bilde.spor.filter((s) => s.registrerteBrev.length) as s (s.spor)}
    <div class="merknad" role="note" data-testid="brev-ved-kravet-{s.spor}">
      <p>{s.navn}: kravet venter på svar, og motparten har registrert brev.</p>
      <ul class="opplysninger">
        {#each s.registrerteBrev as b, i (i)}<li>{b}</li>{/each}
      </ul>
    </div>
  {/each}
  <ol class="journal">
    {#each [...bilde.journal].reverse() as j (j.hendelse)}
      <li data-testid="journal-{j.versjon}">
        <p>
          <strong>{j.versjon}. {j.tittel}</strong>
          <span class="dempet">{formatDateTimeNorwegian(j.tidsstempel)}</span>
          {#if !j.tolket}<span class="merknad">Ikke tolket</span>{/if}
          {#if j.hendelseskode}<span class="dempet">{j.hendelseskode}</span>{/if}
        </p>
        {#if j.tekst}
          <div class="brevtekst">
            {#each j.tekst as avsnitt, i (i)}
              <p>{avsnitt.laast}</p>
              {#if avsnitt.utdypning}<p class="utdypning">{avsnitt.utdypning}</p>{/if}
            {/each}
          </div>
        {/if}
        {#if j.registrertBrev}
          <div class="brevtekst" data-testid="registrert-brev-{j.versjon}">
            {#each j.registrertBrev as linje, i (i)}<p>{linje}</p>{/each}
          </div>
        {:else if j.opplysninger.length}
          <ul class="opplysninger" aria-label="Opplysninger i brevet">
            {#each j.opplysninger as o (o.id)}<li>{o.tekst}</li>{/each}
          </ul>
        {/if}
        {#each j.oppdrag as o (o.id)}
          <p class="dempet">
            Leveringsoppdrag {leveringstekst(o)}
          </p>
          {#if o.filnavn !== null}
            <button
              class="btn btn-secondary"
              onclick={() => lastNed(o)}
              disabled={lasterNed !== null}
              ><Download size={14} />{lasterNed === o.id ? 'Laster ned …' : 'Last ned PDF'}</button
            >
            {#if feil?.oppdrag === o.id}<p role="alert">{feil.melding}</p>{/if}
          {/if}
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
    border: var(--rule);
    border-radius: 6px;
    color: var(--ink-2);
  }
  .opplysninger {
    margin: 4px 0;
    color: var(--ink-2);
  }
  .utdypning {
    color: var(--ink-2);
    white-space: pre-line;
  }
  .brevtekst {
    border-left: 2px solid var(--rule-color);
    padding-left: 10px;
    margin: 6px 0;
    display: grid;
    gap: 6px;
  }
</style>
