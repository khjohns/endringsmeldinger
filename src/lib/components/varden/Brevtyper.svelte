<!--
  «Skriv brev i sporet» og «Andre brev og handlinger» (Varden, skjerm B, D og E): brevtypene
  kjernen tilbyr i sporet nå, i fast rekkefølge og uten fremheving. En brevtype som ikke er
  bygget i Varden, står med det, så ingen handling kjernen tilbyr, faller bort.
-->
<script lang="ts">
  import { ChevronDown } from 'lucide-svelte';
  import { BREVMENY, BREVTYPER, MOTTATT, ukjentHandling } from './prototypetekst';

  let {
    tittel,
    handlinger,
    bygget,
    tekstFor = () => null,
    onvelg,
  }: {
    tittel: string;
    /** Nøklene kjernen tilbyr, som `krav:vederlag`. */
    handlinger: string[];
    /** Typene Varden kan åpne i denne prøven. */
    bygget: string[];
    /** Teksten for en bestemt nøkkel, som en innsigelse mot et bestemt brev. */
    tekstFor?: (noekkel: string) => string | null;
    onvelg: (noekkel: string) => void;
  } = $props();

  const rekkefoelge = (n: string) => {
    const i = BREVTYPER.findIndex((b) => b.type === n.split(':')[0]);
    return i < 0 ? BREVTYPER.length : i;
  };
  const rader = $derived(
    [...handlinger]
      .sort((a, b) => rekkefoelge(a) - rekkefoelge(b))
      .map((n) => {
        const type = BREVTYPER.find((b) => b.type === n.split(':')[0]);
        return {
          noekkel: n,
          tekst: tekstFor(n) ?? type?.tekst ?? ukjentHandling(n),
          virkning: type?.virkning,
          bygget: bygget.includes(n.split(':')[0]),
        };
      })
  );
  let aapen = $state(false);
  let meny = $state<HTMLDetailsElement | null>(null);
</script>

<svelte:window
  onkeydown={(e) => {
    if (e.key !== 'Escape' || !aapen || !meny?.contains(document.activeElement)) return;
    aapen = false;
    meny.querySelector('summary')?.focus();
  }}
/>

<details class="meny" bind:open={aapen} bind:this={meny}>
  <summary>{tittel}<ChevronDown size={16} aria-hidden="true" /></summary>
  <div class="liste">
    {#if rader.length}
      <ul>
        {#each rader as r (r.noekkel)}
          <li data-handling={r.noekkel}>
            {#if r.bygget}
              <button
                type="button"
                onclick={() => {
                  aapen = false;
                  onvelg(r.noekkel);
                }}>{r.tekst}</button
              >
            {:else}
              <span class="ikke-bygget">
                <span>{r.tekst}</span>
                <span class="dempet">{MOTTATT.ikkeIProeven}</span>
              </span>
            {/if}
            {#if r.virkning}<span class="dempet virkning">{r.virkning}</span>{/if}
          </li>
        {/each}
      </ul>
    {:else}
      <p class="dempet tom">{BREVMENY.ingen}</p>
    {/if}
  </div>
</details>

<style>
  .meny {
    position: relative;
  }
  summary {
    display: inline-flex;
    align-items: center;
    gap: var(--spacing-2);
    min-height: 44px;
    padding: 0 var(--spacing-5);
    border: 1.5px solid var(--ink);
    border-radius: 999px;
    background: var(--surface);
    color: var(--ink);
    font-weight: 500;
    cursor: pointer;
    list-style: none;
  }
  summary::-webkit-details-marker {
    display: none;
  }
  summary:hover {
    background: var(--surface-inset);
  }
  summary:focus-visible {
    outline: 2px solid var(--control-focus);
    outline-offset: 2px;
  }
  .liste {
    position: absolute;
    right: 0;
    z-index: 10;
    margin-top: var(--spacing-2);
    width: 340px;
    padding: var(--spacing-2);
    background: var(--surface);
    border: var(--rule-strong);
    border-radius: 12px;
    box-shadow: var(--overlay-shadow-sm);
  }
  li {
    display: flex;
    flex-direction: column;
    padding: var(--spacing-1) 0;
  }
  button,
  .ikke-bygget {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    width: 100%;
    min-height: 44px;
    justify-content: center;
    padding: var(--spacing-2) var(--spacing-3);
    border-radius: 4px;
    text-align: left;
  }
  button {
    background: none;
    border: 0;
    font: inherit;
    color: var(--ink);
    cursor: pointer;
  }
  button:hover {
    background: var(--surface-inset);
  }
  button:focus-visible {
    outline: 2px solid var(--control-focus);
    outline-offset: -2px;
  }
  .ikke-bygget {
    color: var(--ink-2);
  }
  .virkning {
    padding: 0 var(--spacing-3) var(--spacing-2);
  }
  .dempet {
    color: var(--ink-3);
    font-size: 13px;
  }
  .tom {
    padding: var(--spacing-3);
  }
</style>
