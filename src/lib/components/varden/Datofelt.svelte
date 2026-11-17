<!--
  Et datofelt i skjemaene, med labelen over, hjelpeteksten under labelen, feltet og
  feilmeldingen under (system.md, «Feltene står under hverandre», #2119). Feltet er om lag så
  bredt som en dato med kalenderikonet («Bredden på feltet følger svaret det venter»).
-->
<script lang="ts">
  import Feltetikett from './Feltetikett.svelte';

  let {
    id,
    etikett,
    hjelp = null,
    maks,
    verdi = $bindable(),
    feil = null,
    foran = [],
    paakrevd = false,
    valgfri = false,
    oninput,
  }: {
    id: string;
    etikett: string;
    hjelp?: string | null;
    /** Den seneste datoen som kan velges, som `YYYY-MM-DD`. */
    maks?: string;
    verdi: string;
    feil?: string | null;
    /** ID-ene til tekst som beskriver feltet, foran hjelpeteksten. */
    foran?: readonly string[];
    paakrevd?: boolean;
    /** Feltet kan stå tomt, og labelen har «Valgfri» til høyre. */
    valgfri?: boolean;
    oninput?: () => void;
  } = $props();

  const beskrevetAv = $derived(
    [...foran, hjelp ? `${id}-hjelp` : '', feil ? `${id}-feil` : ''].filter(Boolean).join(' ') ||
      undefined
  );
</script>

<div class="datofelt">
  <Feltetikett for={id} {valgfri}>{etikett}</Feltetikett>
  {#if hjelp}<span class="dempet" id={`${id}-hjelp`}>{hjelp}</span>{/if}
  <input
    {id}
    type="date"
    max={maks}
    bind:value={verdi}
    aria-describedby={beskrevetAv}
    aria-invalid={feil ? 'true' : undefined}
    aria-required={paakrevd ? 'true' : undefined}
    {oninput}
  />
  {#if feil}<p class="feilmelding" id={`${id}-feil`}>{feil}</p>{/if}
</div>

<style>
  .datofelt {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: var(--spacing-2);
  }
  .dempet {
    color: var(--ink-3);
    font-size: 14px;
  }
  input {
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
  input:focus-visible {
    outline: 2px solid var(--control-focus);
    outline-offset: 2px;
  }
  input[aria-invalid='true'] {
    border-color: var(--danger);
    box-shadow: inset 0 0 0 1px var(--danger);
  }
  .feilmelding {
    color: var(--danger);
    font-size: 14px;
    font-weight: 500;
  }
</style>
