<!--
  Et felt i skjemaene med labelen over, hjelpeteksten under labelen, feltet med enheten og
  feilmeldingen under (system.md, «Feltene står under hverandre», #1925). Et tall står til høyre
  med like brede sifre; `bredde` gir et kort felt eller et tekstfelt i full bredde.
-->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import Felt, { beskrevetAv } from './Felt.svelte';

  let {
    id,
    etikett,
    hjelp = null,
    enhet,
    bredde = 'tall',
    inputmode,
    verdi = $bindable(),
    feil = null,
    foran = [],
    etter = [],
    paakrevd = false,
    valgfri = false,
    oninput,
    children,
  }: {
    id: string;
    etikett: string;
    hjelp?: string | null;
    /** Enheten etter tallet, som «dager» eller «kr». */
    enhet?: string;
    bredde?: 'tall' | 'kort' | 'tekst';
    inputmode?: 'numeric' | 'decimal';
    verdi: string;
    feil?: string | null;
    /** ID-ene til tekst som beskriver feltet, foran hjelpeteksten. */
    foran?: readonly string[];
    /** ID-ene til tekst som beskriver feltet, etter hjelpeteksten og før feilen. */
    etter?: readonly string[];
    paakrevd?: boolean;
    /** Feltet kan stå tomt, og labelen har «Valgfri» til høyre. */
    valgfri?: boolean;
    oninput?: () => void;
    /** Tekst under feltet og feilmeldingen. */
    children?: Snippet;
  } = $props();
</script>

<Felt {id} {etikett} {hjelp} {feil} {valgfri} under={children}>
  <span
    class="inndata"
    class:ugyldig={feil}
    class:tall={bredde === 'tall'}
    class:kort={bredde === 'kort'}
  >
    <input
      {id}
      {inputmode}
      bind:value={verdi}
      aria-describedby={beskrevetAv(id, hjelp, feil, foran, etter)}
      aria-invalid={feil ? 'true' : undefined}
      aria-required={paakrevd ? 'true' : undefined}
      {oninput}
    />
    {#if enhet}<span class="enhet" aria-hidden="true">{enhet}</span>{/if}
  </span>
</Felt>

<style>
  .inndata {
    display: inline-flex;
    align-items: stretch;
    width: 100%;
    max-width: 100%;
    border: var(--control-border);
    border-radius: var(--r-felt);
    background: var(--surface);
    /* Feltet og enheten holder seg innenfor de runde hjørnene. */
    overflow: hidden;
  }
  .inndata.tall {
    width: 220px;
  }
  .inndata.kort {
    width: 140px;
  }
  .inndata:focus-within {
    outline: 2px solid var(--control-focus);
    outline-offset: 2px;
  }
  input {
    flex: 1;
    min-width: 0;
    min-height: 44px;
    padding: 0 var(--spacing-3);
    border: 0;
    font: 16px var(--font-sans);
    color: var(--ink);
    background: transparent;
    outline: none;
  }
  .tall input {
    text-align: right;
    font-variant-numeric: tabular-nums;
  }
  .enhet {
    display: flex;
    align-items: center;
    padding: 0 var(--spacing-3);
    border-left: var(--rule);
    color: var(--ink-3);
  }
  .inndata.ugyldig {
    border-color: var(--danger);
    box-shadow: inset 0 0 0 1px var(--danger);
  }
</style>
