<script lang="ts">
  /**
   * Et brukerforløp i saksvisningen (#1330): `Kjernesakrom` med en journal i minnet fra
   * kontrollpunktet. Panelet velger kontrollpunkt og side, og starter forløpet på nytt.
   * Visningen lages på nytt når siden byttes, som når en annen bruker åpner saken.
   * `visning` er dagens saksvisning eller Varden (#1331), med samme sak.
   */
  import { ChevronRight } from 'lucide-svelte';
  import Kjernesakrom from '$lib/components/kjernesak/Kjernesakrom.svelte';
  import Vardensak from '$lib/components/varden/Vardensak.svelte';
  import SegmentedControl from '$lib/components/primitives/SegmentedControl.svelte';
  import {
    DEMOPROSJEKT,
    lagDemosak,
    type Demosak,
    type Startjournal,
  } from '$lib/kjernesak/demosak';
  import { lagKjernesak } from '$lib/kjernesak/kontekst.svelte';
  import type { WorkspaceView } from '$lib/kontraktsbord/viewState';
  import type { Part } from '$kjerne/typer';

  let {
    forloep,
    punkt,
    visning = 'dagens',
    onpunkt,
    onvisning,
    onstart,
  }: {
    forloep: Startjournal;
    punkt: string;
    visning?: Visning;
    onpunkt: (punkt: string) => void;
    onvisning?: (visning: Visning) => void;
    /** Kalles med saken hver gang forløpet starter, så en test kan lese journalen. */
    onstart?: (demosak: Demosak, kjernesak: Kjernesak) => void;
  } = $props();

  const HANDLING: Record<string, string> = {
    krav: 'sender kravet',
    brev: 'svarer på kravet',
    revisjon: 'reviderer svaret',
    aksept: 'godtar svaret',
    trekk: 'trekker kravet',
  };

  const kontrollpunkt = $derived(forloep.kontrollpunkter.find((p) => p.id === punkt)!);
  const neste = $derived(kontrollpunkt.neste);
  /** Siden som handler i neste steg, så forløpet kan fortsette uten å bytte side. */
  const startside = (): Part => neste?.part ?? 'TE';

  type Kjernesak = ReturnType<typeof lagKjernesak>;
  type Visning = 'dagens' | 'varden';

  function kjernesakFor(demosak: Demosak): Kjernesak {
    const kjernesak = lagKjernesak({
      sakId: demosak.sakId,
      prosjektId: DEMOPROSJEKT,
      part: demosak.part,
      hent: demosak.hent,
      send: demosak.send,
      lastOppVedlegg: demosak.lastOppVedlegg,
    });
    void kjernesak.last();
    return kjernesak;
  }

  function aapne() {
    const demosak = lagDemosak(forloep, punkt, startside());
    const kjernesak = kjernesakFor(demosak);
    onstart?.(demosak, kjernesak);
    return { demosak, kjernesak };
  }

  let aapen = $state.raw(aapne());
  // Neste steg og forståelsen gjelder bare saken slik den er ved kontrollpunktet.
  const versjon = $derived(aapen.kjernesak.versjon);
  const vedPunktet = $derived(versjon === kontrollpunkt.versjon);
  let view = $state<WorkspaceView>({ track: 'ansvar', mode: 'read', role: startside() });
  let omstarter = $state(0);
  // På smal skjerm dekker panelet saken, så det starter lukket der.
  const smal = typeof matchMedia === 'function' && matchMedia('(max-width: 767px)').matches;

  function byttSide(part: Part) {
    if (part === aapen.demosak.part) return;
    aapen.demosak.part = part;
    aapen = { demosak: aapen.demosak, kjernesak: kjernesakFor(aapen.demosak) };
    view = { ...view, mode: 'read', role: part };
  }

  function startPaaNytt() {
    aapen = aapne();
    view = { ...view, mode: 'read', role: aapen.demosak.part };
    omstarter++;
  }
</script>

<svelte:head><title>{forloep.id} — demo av brukerforløpet</title></svelte:head>

{#key omstarter + ':' + aapen.demosak.part}
  {#if visning === 'varden'}
    <Vardensak kjernesak={aapen.kjernesak} />
  {:else if aapen.kjernesak.saksbilde}
    <Kjernesakrom
      kjernesak={aapen.kjernesak}
      projectId={DEMOPROSJEKT}
      {view}
      onviewchange={(neste) => (view = neste)}
      onnewcase={() => {}}
    />
  {:else}
    <p class="laster" role="status">Laster forløpet …</p>
  {/if}
{/key}

<aside class="demopanel" aria-label="Demo av brukerforløpet">
  <details open={!smal}>
    <summary><ChevronRight size={16} aria-hidden="true" />Demo · {forloep.id}</summary>
    <div class="innhold">
      <p class="tittel">{forloep.tittel}</p>
      <p class="merknad">Ingenting sendes. Journalen ligger i minnet i nettleseren.</p>

      <label class="felt">
        <span class="etikett">Start fra kontrollpunktet</span>
        <select value={punkt} onchange={(e) => onpunkt(e.currentTarget.value)}>
          {#each forloep.kontrollpunkter as p (p.id)}
            <option value={p.id}>{p.beskrivelse}</option>
          {/each}
        </select>
      </label>

      {#if onvisning}
        <div class="felt">
          <span class="etikett">Visning</span>
          <SegmentedControl
            value={visning}
            label="Visning"
            options={[
              { id: 'dagens', label: 'Dagens' },
              { id: 'varden', label: 'Varden' },
            ]}
            onchange={(v) => onvisning(v as Visning)}
          />
        </div>
      {/if}

      <div class="felt">
        <span class="etikett">Du handler som</span>
        <SegmentedControl
          value={aapen.demosak.part}
          label="Du handler som"
          options={[
            { id: 'TE', label: 'TE' },
            { id: 'BH', label: 'BH' },
          ]}
          onchange={byttSide}
        />
      </div>

      {#if versjon !== null && !vedPunktet}
        <p class="neste">
          Saken er endret etter kontrollpunktet. «Start på nytt» går tilbake til det.
        </p>
      {:else if vedPunktet && neste}
        <p class="neste">
          Neste steg i forløpet: {neste.part}
          {HANDLING[neste.handling] ?? neste.handling}.
        </p>
      {/if}

      {#if vedPunktet && kontrollpunkt.forstaaelse.length}
        <details class="forstaaelse">
          <summary
            ><ChevronRight size={16} aria-hidden="true" />Det brukeren skal forstå her</summary
          >
          <ul>
            {#each kontrollpunkt.forstaaelse as linje (linje)}<li>{linje}</li>{/each}
          </ul>
        </details>
      {/if}

      <button type="button" class="knapp" onclick={startPaaNytt}>Start på nytt</button>
    </div>
  </details>
</aside>

<style>
  .laster {
    padding: var(--spacing-10);
    color: var(--ink-2);
  }
  .demopanel {
    position: fixed;
    right: var(--spacing-4);
    bottom: var(--spacing-4);
    z-index: 30;
    width: min(340px, calc(100vw - 2 * var(--spacing-4)));
    background: var(--draft-bg);
    border: 1px dashed var(--draft-border);
    border-radius: var(--radius-md);
    box-shadow: var(--overlay-shadow-sm);
    color: var(--ink);
    font-family: var(--font-sans);
    font-size: 14px;
    line-height: 1.5;
  }
  .demopanel > details > summary {
    padding: var(--spacing-2) var(--spacing-3);
    min-height: 40px;
    display: flex;
    align-items: center;
    font-weight: 600;
    color: var(--ink);
    cursor: pointer;
  }
  .innhold {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-3);
    padding: 0 var(--spacing-3) var(--spacing-3);
  }
  .tittel {
    font-weight: 600;
  }
  .merknad,
  .neste {
    color: var(--ink-2);
  }
  .felt {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-1);
  }
  .etikett {
    font-weight: 500;
    color: var(--ink-2);
  }
  select {
    min-height: 40px;
    padding: 0 var(--spacing-2);
    background: var(--surface);
    color: var(--ink);
    border: var(--control-border);
    border-radius: var(--radius-sm);
    font: inherit;
  }
  .forstaaelse summary {
    min-height: 40px;
    display: flex;
    align-items: center;
    font-weight: 500;
    cursor: pointer;
  }
  summary {
    gap: var(--spacing-1);
    list-style: none;
  }
  summary::-webkit-details-marker {
    display: none;
  }
  summary :global(svg) {
    flex-shrink: 0;
    transition: transform 150ms cubic-bezier(0.23, 1, 0.32, 1);
  }
  details[open] > summary :global(svg) {
    transform: rotate(90deg);
  }
  @media (prefers-reduced-motion: reduce) {
    summary :global(svg) {
      transition: none;
    }
  }
  .forstaaelse ul {
    padding-left: var(--spacing-4);
    list-style: disc;
    color: var(--ink-2);
  }
  .knapp {
    align-self: flex-start;
    min-height: 40px;
    padding: 0 var(--spacing-3);
    background: var(--surface);
    color: var(--ink);
    border: var(--control-border);
    border-radius: var(--radius-sm);
    font: inherit;
    font-weight: 500;
    cursor: pointer;
  }
  .knapp:hover,
  select:hover {
    border-color: var(--ink-3);
  }
  .knapp:hover {
    background: var(--surface-inset);
  }
  .knapp:active {
    background: var(--surface-selected);
  }
  select:focus-visible,
  summary:focus-visible,
  .knapp:focus-visible {
    outline: 2px solid var(--control-focus);
    outline-offset: 2px;
  }
</style>
