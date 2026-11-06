<!--
  «Andre handlinger» i kortet «Det du kan gjøre nå» (Varden, prototypen `grunnlagsoversikt.html`):
  brevtypene kjernen tilbyr i sporet nå, i fast rekkefølge og uten fremheving, som en åpen liste.
  Brevtypene som ikke er bygget i Varden, står samlet under én linje, så ingen handling kjernen
  tilbyr, faller bort. Tilbyr kjernen ingenting, vises ikke lista (MM-U25).
-->
<script lang="ts">
  import { ChevronRight } from 'lucide-svelte';
  import { BREVTYPER, MOTTATT, ukjentHandling } from './tekster';

  let {
    tittel = null,
    handlinger,
    bygget,
    tekstFor = () => null,
    onvelg,
  }: {
    /** Overskriften over lista, eller ingen når lista er alt kortet har. */
    tittel?: string | null;
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
          bygget: bygget.includes(n.split(':')[0]),
        };
      })
  );
  const byggede = $derived(rader.filter((r) => r.bygget));
  const ikkeByggede = $derived(rader.filter((r) => !r.bygget));
  const uid = $props.id();
</script>

{#if rader.length}
  <div class="andre">
    {#if tittel}<p class="tittel" id={`${uid}-tittel`}>{tittel}</p>{/if}
    {#if byggede.length}
      <ul aria-labelledby={tittel ? `${uid}-tittel` : undefined}>
        {#each byggede as r (r.noekkel)}
          <li data-handling={r.noekkel}>
            <button type="button" onclick={() => onvelg(r.noekkel)}
              ><span>{r.tekst}</span><ChevronRight size={16} aria-hidden="true" /></button
            >
          </li>
        {/each}
      </ul>
    {/if}
    {#if ikkeByggede.length}
      <p class="dempet gruppetekst" id={`${uid}-ikke-bygget`}>{MOTTATT.ikkeIProeven}</p>
      <ul aria-labelledby={`${uid}-ikke-bygget`}>
        {#each ikkeByggede as r (r.noekkel)}
          <li data-handling={r.noekkel}><span class="ikke-bygget">{r.tekst}</span></li>
        {/each}
      </ul>
    {/if}
  </div>
{/if}

<style>
  .andre {
    display: flex;
    flex-direction: column;
    width: 100%;
  }
  .tittel {
    margin-bottom: var(--spacing-1);
    color: var(--ink-3);
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }
  /* Radene med en handling Varden kan åpne, har skillelinjer; de andre er en dempet liste. */
  li:has(button) {
    border-top: var(--rule-subtle);
  }
  li:has(button):last-child {
    border-bottom: var(--rule-subtle);
  }
  button {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--spacing-3);
    width: 100%;
    min-height: 48px;
    padding: var(--spacing-3) 0;
    background: none;
    border: 0;
    font: inherit;
    color: var(--ink);
    text-align: left;
    cursor: pointer;
  }
  button :global(svg) {
    flex: none;
    color: var(--ink-3);
  }
  button:hover span {
    text-decoration: underline;
    text-underline-offset: 3px;
  }
  button:focus-visible {
    outline: 2px solid var(--control-focus);
    outline-offset: 2px;
  }
  .ikke-bygget {
    display: block;
    padding: var(--spacing-1) 0;
    color: var(--ink-3);
    font-size: 14px;
  }
  .gruppetekst {
    padding: var(--spacing-3) 0 var(--spacing-1);
  }
  .gruppetekst:first-child {
    padding-top: 0;
  }
  .dempet {
    color: var(--ink-3);
    font-size: 14px;
  }
</style>
