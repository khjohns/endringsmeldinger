<!--
  «Skriv brev i sporet» og «Andre brev og handlinger» (Varden, skjerm B, D og E): brevtypene
  kjernen tilbyr i sporet nå, i fast rekkefølge og uten fremheving. Brevtypene som ikke er
  bygget i Varden, står samlet under én linje, så ingen handling kjernen tilbyr, faller bort.
  Tilbyr kjernen ingenting, vises ikke menyen (MM-U25).
-->
<script lang="ts">
  import { ChevronDown } from 'lucide-svelte';
  import { BREVTYPER, MOTTATT, ukjentHandling } from './prototypetekst';

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
  const byggede = $derived(rader.filter((r) => r.bygget));
  const ikkeByggede = $derived(rader.filter((r) => !r.bygget));
  const uid = $props.id();
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

{#snippet rad(r: (typeof rader)[number])}
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
      <span class="ikke-bygget">{r.tekst}</span>
    {/if}
    {#if r.virkning}<span class="dempet virkning">{r.virkning}</span>{/if}
  </li>
{/snippet}

{#if rader.length}
  <details class="meny" bind:open={aapen} bind:this={meny}>
    <summary>{tittel}<ChevronDown size={16} aria-hidden="true" /></summary>
    <div class="liste">
      {#if byggede.length}
        <ul>
          {#each byggede as r (r.noekkel)}{@render rad(r)}{/each}
        </ul>
      {/if}
      {#if ikkeByggede.length}
        <div class="gruppe" class:skilt={byggede.length > 0}>
          <p class="dempet gruppetekst" id={`${uid}-ikke-bygget`}>{MOTTATT.ikkeIProeven}</p>
          <ul aria-labelledby={`${uid}-ikke-bygget`}>
            {#each ikkeByggede as r (r.noekkel)}{@render rad(r)}{/each}
          </ul>
        </div>
      {/if}
    </div>
  </details>
{/if}

<style>
  /* Står til høyre også når linjen brytes, så lista åpner seg innenfor arbeidet. */
  .meny {
    position: relative;
    margin-left: auto;
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
  button {
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
    display: block;
    padding: var(--spacing-1) var(--spacing-3);
    color: var(--ink-2);
  }
  .gruppe.skilt {
    margin-top: var(--spacing-2);
    padding-top: var(--spacing-2);
    border-top: var(--rule-subtle);
  }
  .gruppetekst {
    padding: var(--spacing-2) var(--spacing-3) var(--spacing-1);
  }
  .virkning {
    padding: 0 var(--spacing-3) var(--spacing-2);
  }
  .dempet {
    color: var(--ink-3);
    font-size: 13px;
  }
</style>
