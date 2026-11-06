<!--
  Arbeidsraden over utkastet (oppdragsgiver 06.11, PR 1650): saken og brevtypen, «Utkast» med lås
  og menyen «Utkastvalg» til venstre, og primærhandlingen ytterst til høyre. Raden følger
  rullingen, så handlingen står ved brevet den gjelder. Menyen åpner på linja i raden, med
  synligheten og «Forkast utkast», som bekreftes i en dialog.
-->
<script lang="ts">
  import { Lock, MoreHorizontal } from 'lucide-svelte';
  import { tick, type Snippet } from 'svelte';
  import Knapp from './Knapp.svelte';
  import { BREVUTKAST, SKJEMA } from './tekster';

  let {
    overlinje,
    forkastSpoersmaal,
    onforkast,
    handling,
  }: {
    /** Saken og brevtypen, som «KOE-1 · Oppdatert påberopelse». */
    overlinje: string;
    forkastSpoersmaal: string;
    onforkast: () => void;
    /** Primærhandlingen, ytterst til høyre. */
    handling: Snippet;
  } = $props();
  const uid = $props.id();

  let menyAapen = $state(false);
  let valg = $state<HTMLElement | null>(null);
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
</script>

<svelte:window
  onpointerdown={(e) => {
    if (menyAapen && !valg?.contains(e.target as Node)) lukkMeny(false);
  }}
/>

<div class="utkastrad">
  <div class="status">
    <p class="over">{overlinje}</p>
    <span class="merke"
      ><Lock size={12} aria-hidden="true" />{BREVUTKAST.utkast}<span class="visually-hidden"
        >, {SKJEMA.synlig.toLowerCase()}</span
      ></span
    >
    <div
      class="valg"
      role="presentation"
      bind:this={valg}
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
  <div class="handling">{@render handling()}</div>
</div>

<dialog
  class="bekreft"
  bind:this={dialog}
  aria-labelledby={`${uid}-forkast`}
  onclose={() => menyknapp?.focus()}
>
  <p id={`${uid}-forkast`}>{forkastSpoersmaal}</p>
  <div class="knapper">
    <Knapp variant="primaer" onclick={() => dialog?.close()}>{SKJEMA.behold}</Knapp>
    <Knapp
      onclick={() => {
        dialog?.close();
        onforkast();
      }}>{BREVUTKAST.forkastJa}</Knapp
    >
  </div>
</dialog>

<style>
  .utkastrad {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: var(--spacing-3) var(--spacing-5);
  }
  .status {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--spacing-3);
    min-width: 0;
  }
  .over {
    font-size: 16px;
    font-weight: 600;
    color: var(--ink);
  }
  .merke {
    display: inline-flex;
    align-items: center;
    gap: var(--spacing-1);
    padding: 0 var(--spacing-2);
    border: 1px solid var(--draft-border);
    border-radius: var(--r-merke);
    background: var(--draft-bg);
    font-size: 12px;
    font-weight: 500;
    color: var(--ink-2);
  }
  .valg {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--spacing-1) var(--spacing-3);
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
  /* Menyen åpner på linja i raden, så den ikke dekker brevet under. */
  .meny {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--spacing-1) var(--spacing-3);
    padding-left: var(--spacing-3);
    border-left: var(--rule-strong);
  }
  .meny[hidden] {
    display: none;
  }
  .synlig {
    display: flex;
    align-items: center;
    gap: var(--spacing-1);
    font-size: 12px;
    color: var(--ink-3);
  }
  .menyvalg {
    min-height: 44px;
    padding: 0 var(--spacing-2);
    border: 0;
    background: none;
    font: inherit;
    font-size: 14px;
    color: var(--ink);
    text-decoration: underline;
    text-underline-offset: 3px;
    cursor: pointer;
  }
  .menyvalg:hover {
    text-decoration-thickness: 2px;
  }
  .handling {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: var(--spacing-2);
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
