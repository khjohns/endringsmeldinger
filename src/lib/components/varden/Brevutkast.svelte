<!--
  Utkastet som et brev under arbeid (oppdragsgiver 06.11, PR 1650): et lyst gult brevhode med
  saken og brevtypen øverst, emnet som hovedlinje og mottakeren og det brevet gjelder under, og
  en hvit flate for teksten. «Utkast» står til høyre, med lås: bare teamet ser det før det er
  sendt. «Forkast utkast» ligger i menyen «Utkastvalg» på utkastet og bekreftes i en dialog.
-->
<script lang="ts">
  import { Lock, MoreHorizontal } from 'lucide-svelte';
  import { tick, type Snippet } from 'svelte';
  import Knapp from './Knapp.svelte';
  import { BREVUTKAST, SKJEMA } from './tekster';

  let {
    id,
    overlinje,
    emne,
    linje,
    forkastSpoersmaal,
    onforkast,
    onsubmit,
    children,
  }: {
    /** ID-en til emnet, som skjemaet er merket med. */
    id: string;
    /** Saken og brevtypen, som «KOE-1 · Oppdatert påberopelse». */
    overlinje: string;
    /** Det brevet gjelder, med størst skrift. */
    emne: string;
    /** Mottakeren og brevet det gjelder, under emnet. */
    linje: Snippet;
    forkastSpoersmaal: string;
    onforkast: () => void;
    onsubmit: () => void;
    children: Snippet;
  } = $props();
  const uid = $props.id();

  let menyAapen = $state(false);
  let meny = $state<HTMLElement | null>(null);
  let menyknapp = $state<HTMLButtonElement | null>(null);
  let dialog = $state<HTMLDialogElement | null>(null);

  async function veksleMeny() {
    menyAapen = !menyAapen;
    if (!menyAapen) return;
    await tick();
    meny?.querySelector<HTMLElement>('button')?.focus();
  }
  function lukkMeny(fokus = true) {
    menyAapen = false;
    if (fokus) menyknapp?.focus();
  }
  function spoerOmForkast() {
    lukkMeny(false);
    dialog?.showModal();
  }
  function behold() {
    dialog?.close();
  }
</script>

<svelte:window
  onpointerdown={(e) => {
    if (menyAapen && !meny?.parentElement?.contains(e.target as Node)) lukkMeny(false);
  }}
/>

<form
  class="brevutkast"
  aria-labelledby={`${uid}-over ${id}`}
  onsubmit={(e) => {
    e.preventDefault();
    onsubmit();
  }}
>
  <header class="hode">
    <div class="overrad">
      <p class="over" id={`${uid}-over`}>{overlinje}</p>
      <span class="merke"
        ><Lock size={12} aria-hidden="true" />{BREVUTKAST.utkast}<span class="visually-hidden"
          >, {SKJEMA.synlig.toLowerCase()}</span
        ></span
      >
      <div
        class="valg"
        role="presentation"
        onkeydown={(e) => {
          if (e.key === 'Escape' && menyAapen) {
            e.stopPropagation();
            lukkMeny();
          }
        }}
        onfocusout={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) lukkMeny(false);
        }}
      >
        <button
          type="button"
          class="menyknapp"
          aria-label={BREVUTKAST.valg}
          aria-expanded={menyAapen}
          aria-controls={`${uid}-meny`}
          bind:this={menyknapp}
          onclick={veksleMeny}><MoreHorizontal size={20} aria-hidden="true" /></button
        >
        <div class="meny" id={`${uid}-meny`} hidden={!menyAapen} bind:this={meny}>
          <p class="synlig"><Lock size={14} aria-hidden="true" />{SKJEMA.synlig}</p>
          <button type="button" class="menyvalg" onclick={spoerOmForkast}>{SKJEMA.forkast}</button>
        </div>
      </div>
    </div>
    <h2 class="emne" {id}>{emne}</h2>
    <p class="linje">{@render linje()}</p>
  </header>
  <div class="flate">{@render children()}</div>
</form>

<dialog
  class="bekreft"
  bind:this={dialog}
  aria-labelledby={`${uid}-forkast`}
  onclose={() => menyknapp?.focus()}
>
  <p id={`${uid}-forkast`}>{forkastSpoersmaal}</p>
  <div class="knapper">
    <Knapp variant="primaer" onclick={behold}>{SKJEMA.behold}</Knapp>
    <Knapp
      onclick={() => {
        dialog?.close();
        onforkast();
      }}>{BREVUTKAST.forkastJa}</Knapp
    >
  </div>
</dialog>

<style>
  .brevutkast {
    background: var(--surface);
    border: var(--rule);
    border-radius: var(--r-kort);
  }
  .hode {
    display: grid;
    gap: var(--spacing-1);
    padding: var(--spacing-4) var(--spacing-6) var(--spacing-5);
    background: var(--draft-bg);
    border-bottom: 1px solid var(--draft-border);
    border-radius: calc(var(--r-kort) - 1px) calc(var(--r-kort) - 1px) 0 0;
  }
  .overrad {
    display: flex;
    align-items: center;
    gap: var(--spacing-3);
    margin-bottom: var(--spacing-2);
  }
  .over {
    flex: 1;
    font-size: 14px;
    color: var(--ink-2);
  }
  .merke {
    display: inline-flex;
    align-items: center;
    gap: var(--spacing-1);
    padding: 0 var(--spacing-2);
    border: 1px solid var(--draft-border);
    border-radius: var(--r-merke);
    background: var(--surface);
    font-size: 12px;
    font-weight: 500;
    color: var(--ink-2);
  }
  .valg {
    position: relative;
    margin-right: calc(-1 * var(--spacing-2));
  }
  .menyknapp {
    display: grid;
    place-items: center;
    width: 44px;
    height: 44px;
    border: 0;
    border-radius: var(--r-knapp);
    background: none;
    color: var(--ink-2);
    cursor: pointer;
  }
  .menyknapp:hover,
  .menyknapp[aria-expanded='true'] {
    background: var(--surface);
    color: var(--ink);
  }
  .menyknapp:focus-visible,
  .menyvalg:focus-visible {
    outline: 2px solid var(--control-focus);
    outline-offset: 2px;
  }
  .meny {
    position: absolute;
    z-index: 2;
    top: calc(100% + var(--spacing-1));
    right: 0;
    display: grid;
    gap: var(--spacing-2);
    width: max-content;
    max-width: 18rem;
    padding: var(--spacing-3);
    background: var(--surface);
    border: var(--rule-strong);
    border-radius: var(--r-innfelt);
  }
  .meny[hidden] {
    display: none;
  }
  .synlig {
    display: flex;
    align-items: center;
    gap: var(--spacing-2);
    padding-bottom: var(--spacing-2);
    border-bottom: var(--rule);
    font-size: 12px;
    color: var(--ink-3);
  }
  .menyvalg {
    min-height: 44px;
    padding: 0 var(--spacing-2);
    border: 0;
    border-radius: var(--r-innfelt);
    background: none;
    font: inherit;
    text-align: left;
    color: var(--ink);
    cursor: pointer;
  }
  .menyvalg:hover {
    background: var(--surface-inset);
  }
  .emne {
    font-size: 24px;
    font-weight: 600;
    line-height: 1.25;
    letter-spacing: -0.015em;
    color: var(--ink);
  }
  .linje {
    font-size: 14px;
    color: var(--ink-2);
  }
  .flate {
    padding: var(--spacing-5) var(--spacing-6) var(--spacing-6);
  }
  /* Den globale nullstillingen tar bort marginen som midtstiller dialogen. */
  .bekreft {
    margin: auto;
    max-width: min(28rem, calc(100vw - 2 * var(--spacing-4)));
    padding: var(--spacing-6);
    border: var(--rule);
    border-radius: var(--r-kort);
    background: var(--surface);
    color: var(--ink);
  }
  .bekreft::backdrop {
    background: rgb(0 0 0 / 0.35);
  }
  .knapper {
    display: flex;
    flex-wrap: wrap;
    gap: var(--spacing-3);
    margin-top: var(--spacing-5);
  }
</style>
