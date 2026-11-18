<!--
  Et datofelt i skjemaene, i rammen `Felt` (system.md, «Feltene står under hverandre», #2119).
  Feltet er om lag så bredt som en dato med kalenderikonet («Bredden på feltet følger svaret det
  venter»).
-->
<script lang="ts">
  import Felt, { beskrevetAv } from './Felt.svelte';

  let {
    id,
    etikett,
    hjelp = null,
    maks,
    verdi = $bindable(),
    feil = null,
    paakrevd = false,
    inaktiv = false,
    oninput,
  }: {
    id: string;
    etikett: string;
    hjelp?: string | null;
    /** Den seneste datoen som kan velges, som `YYYY-MM-DD`. */
    maks?: string;
    verdi: string;
    feil?: string | null;
    paakrevd?: boolean;
    inaktiv?: boolean;
    oninput?: () => void;
  } = $props();
</script>

<Felt {id} {etikett} {hjelp} {feil}>
  <input
    {id}
    type="date"
    max={maks}
    bind:value={verdi}
    aria-describedby={beskrevetAv(id, hjelp, feil)}
    aria-invalid={feil ? 'true' : undefined}
    aria-required={paakrevd ? 'true' : undefined}
    disabled={inaktiv}
    {oninput}
  />
</Felt>

<style>
  input {
    align-self: flex-start;
    inline-size: 12rem;
    max-inline-size: 100%;
    min-height: 44px;
    padding: 0 var(--spacing-3);
    border: var(--control-border);
    border-radius: var(--r-felt);
    font: 16px var(--font-sans);
    color: var(--ink);
    background: var(--surface);
  }
  input:hover {
    border-color: var(--ink-3);
  }
  input:disabled {
    background: var(--surface-inset);
    color: var(--ink-4);
    cursor: not-allowed;
  }
  input:focus-visible {
    outline: 2px solid var(--control-focus);
    outline-offset: 2px;
  }
  input[aria-invalid='true'] {
    border-color: var(--danger);
    box-shadow: inset 0 0 0 1px var(--danger);
  }
</style>
