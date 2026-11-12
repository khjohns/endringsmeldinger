<!--
  «Andre handlinger» i kortet «Det du kan gjøre nå» (Varden, prototypen `grunnlagsoversikt.html`):
  brevtypene kjernen tilbyr i sporet nå, i fast rekkefølge og uten fremheving, som en åpen liste
  med tittel, en linje om virkningen og pil (oppdragsgiver 06.11, #1631). En brevtype som ikke er
  bygget i Varden, står i lista og sier at den ikke er bygget (#1636), så ingen handling kjernen
  tilbyr, faller bort. Tilbyr kjernen ingenting, vises ikke lista (MM-U25).
-->
<script lang="ts">
  import { ChevronRight } from 'lucide-svelte';
  import { BREVTYPER, HANDLINGENE, ukjentHandling } from './tekster';

  let {
    tittel = null,
    handlinger,
    bygget,
    tekstFor = () => null,
    beskrivelseFor = () => null,
    onvelg,
  }: {
    /** Overskriften over lista, eller ingen når lista er alt kortet har. */
    tittel?: string | null;
    /** Nøklene kjernen tilbyr, som `krav:vederlag`. */
    handlinger: string[];
    /** Nøklene Varden kan åpne, som `svare:vederlag`. */
    bygget: string[];
    /** Teksten for en bestemt nøkkel, som en innsigelse mot et bestemt brev. */
    tekstFor?: (noekkel: string) => string | null;
    /** Linja under teksten: hva handlingen gjør med saken. */
    beskrivelseFor?: (noekkel: string) => string | null;
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
          virkning: beskrivelseFor(n),
          bygget: bygget.includes(n),
        };
      })
  );
  const uid = $props.id();
  // Raden ser ut som de andre handlingene, og et klikk sier at den ikke er bygget (#1636).
  let ikkeBygget = $state<string | null>(null);
</script>

{#snippet innhold(r: (typeof rader)[number])}
  <span class="h">{r.tekst}</span>
  {#if r.virkning}<span class="b">{r.virkning}</span>{/if}
  <ChevronRight size={16} aria-hidden="true" />
{/snippet}

{#if rader.length}
  <div class="andre">
    {#if tittel}<p class="tittel" id={`${uid}-tittel`}>{tittel}</p>{/if}
    <ul aria-labelledby={tittel ? `${uid}-tittel` : undefined}>
      {#each rader as r (r.noekkel)}
        <li data-handling={r.noekkel}>
          {#if r.bygget}
            <button type="button" class="rad" onclick={() => onvelg(r.noekkel)}
              >{@render innhold(r)}</button
            >
          {:else}
            <button type="button" class="rad" onclick={() => (ikkeBygget = r.noekkel)}
              >{@render innhold(r)}</button
            >
            <!-- Den levende regionen står fra start, så teksten leses opp når den kommer. -->
            <p class="ikke-bygget" class:vist={ikkeBygget === r.noekkel} role="status">
              {ikkeBygget === r.noekkel ? HANDLINGENE.ikkeBygget : ''}
            </p>
          {/if}
        </li>
      {/each}
    </ul>
  </div>
{/if}

<style>
  .andre {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-2);
    width: 100%;
    margin-top: var(--spacing-3);
  }
  .tittel {
    color: var(--ink-3);
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }
  /* Radene står mellom skillelinjer, med tittelen, virkningen under og pila til høyre, som i
     prototypen `grunnlagsoversikt.html`. */
  ul {
    border-top: var(--rule-subtle);
  }
  li {
    border-bottom: var(--rule-subtle);
  }
  .rad {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 16px;
    gap: 2px var(--spacing-2);
    width: 100%;
    min-height: 48px;
    padding: var(--spacing-3) 0;
    background: none;
    border: 0;
    font: inherit;
    color: var(--ink);
    text-align: left;
    text-decoration: none;
  }
  button.rad {
    cursor: pointer;
  }
  .h {
    font-weight: 600;
  }
  .b {
    grid-column: 1;
    color: var(--ink-2);
    font-size: 14px;
  }
  .rad :global(svg) {
    grid-row: 1 / 3;
    grid-column: 2;
    align-self: center;
    color: var(--ink-3);
  }
  button.rad:hover .h {
    text-decoration: underline;
    text-underline-offset: 3px;
  }
  .rad:focus-visible {
    outline: 2px solid var(--control-focus);
    outline-offset: 2px;
  }
  .ikke-bygget.vist {
    padding-bottom: var(--spacing-3);
  }
  .ikke-bygget {
    color: var(--ink-2);
    font-size: 14px;
  }
</style>
