<!--
  Infotips (OV-U81): en forklaring av hvordan løsningen virker, bak en knapp med ikonet «i» ved
  overskriften, ikke ved feltet. Knappen har et tilgjengelig navn og åpner teksten under seg
  med mus, tastatur og berøring. Escape lukker den og gir fokus tilbake til knappen.
-->
<script lang="ts">
  import { Info } from 'lucide-svelte';
  import { tick } from 'svelte';

  let { navn, tekst }: { navn: string; tekst: string } = $props();
  const uid = $props.id();
  let aapen = $state(false);
  let knappen = $state<HTMLButtonElement | null>(null);
  let tipset = $state<HTMLElement | null>(null);
  let rot = $state<HTMLElement | null>(null);
  let forskyvning = $state(0);

  // Tipset står under knappen og flyttes til venstre når det ellers går utenfor vinduet.
  async function veksle() {
    aapen = !aapen;
    await plasser();
  }
  async function plasser() {
    forskyvning = 0;
    if (!aapen) return;
    await tick();
    const r = tipset?.getBoundingClientRect();
    if (!r) return;
    const kant = 16;
    const over = r.right - (document.documentElement.clientWidth - kant);
    if (over > 0) forskyvning = -Math.min(over, Math.max(0, r.left - kant));
  }

  function tast(e: KeyboardEvent) {
    if (e.key === 'Escape' && aapen) {
      e.stopPropagation();
      aapen = false;
      knappen?.focus();
    }
  }
</script>

<!-- Et klikk utenfor lukker, også der knappen ikke får fokus av et klikk (Safari). -->
<svelte:window
  onpointerdown={(e) => {
    if (aapen && !rot?.contains(e.target as Node)) aapen = false;
  }}
  onresize={plasser}
/>

<span
  class="infotips"
  role="presentation"
  bind:this={rot}
  onkeydown={tast}
  onfocusout={(e) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) aapen = false;
  }}
>
  <button
    type="button"
    class="info"
    aria-label={navn}
    aria-expanded={aapen}
    aria-controls={`${uid}-tips`}
    bind:this={knappen}
    onclick={veksle}><Info size={20} aria-hidden="true" /></button
  >
  <span
    class="tips"
    id={`${uid}-tips`}
    role="note"
    hidden={!aapen}
    bind:this={tipset}
    style:translate={forskyvning ? `${forskyvning}px 0` : undefined}>{tekst}</span
  >
</span>

<style>
  .infotips {
    position: relative;
    display: inline-block;
    margin-left: var(--spacing-2);
    vertical-align: 1px;
    font-family: var(--font-sans);
  }
  .info {
    position: relative;
    display: inline-grid;
    place-items: center;
    width: 24px;
    height: 24px;
    padding: 0;
    border: 0;
    border-radius: 50%;
    background: transparent;
    color: var(--ink-2);
    cursor: help;
  }
  /* Treffflaten er 40 px, som minstemålet i interface-design-skillen; ikonet er 24 px. */
  .info::after {
    content: '';
    position: absolute;
    inset: calc(-1 * var(--spacing-2));
  }
  .info:hover,
  .info[aria-expanded='true'] {
    color: var(--ink);
  }
  .info:focus-visible {
    outline: 2px solid var(--control-focus);
    outline-offset: 2px;
  }
  .tips {
    position: absolute;
    z-index: 5;
    top: calc(100% + var(--spacing-2));
    left: 0;
    width: max-content;
    max-width: min(20rem, 80vw);
    padding: var(--spacing-3) var(--spacing-4);
    border: var(--rule-strong);
    border-radius: var(--r-innfelt);
    background: var(--surface);
    box-shadow: var(--meny-skygge);
    color: var(--ink);
    font-size: 14px;
    font-weight: 400;
    line-height: 1.5;
    letter-spacing: normal;
    text-transform: none;
    white-space: normal;
  }
  .tips[hidden] {
    display: none;
  }
</style>
