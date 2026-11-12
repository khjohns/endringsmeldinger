<!--
  Valgkortene i Varden: ekte radioknapper i en `fieldset` med spørsmålet som `legend`.
  Ingenting er forhåndsvalgt, og ingen valg har farge (prinsipp 6 og 7). Mangler svaret når
  parten går videre, står feilmeldingen under valgene (MM-U32).
-->
<script lang="ts" generics="T extends string | boolean">
  let {
    navn,
    spoersmaal,
    valg,
    verdi = $bindable(null),
    feil = null,
    beskrevetAv,
    stablet = false,
    lett = false,
  }: {
    navn: string;
    spoersmaal: string;
    /** `forklaring` står under teksten, som for oppgjørsformen (`system.md`, «To vekter på et valg»). */
    valg: { verdi: T; tekst: string; forklaring?: string }[];
    verdi: T | null;
    /** Hva som mangler, når parten har prøvd å gå videre uten svaret. */
    feil?: string | null;
    /** Id-en til det spørsmålet bygger på, som forutsetningene for et subsidiært lag. */
    beskrevetAv?: string;
    /**
     * Valgene står under hverandre i kort med lik bredde, når de ville brytes ujevnt ved siden av
     * hverandre (`system.md`, #1492).
     */
    stablet?: boolean;
    /**
     * Radio og tekst uten ramme, inne i et åpent element; bare det valgte får flaten
     * (`system.md`, «To vekter på et valg»).
     */
    lett?: boolean;
  } = $props();
  const uid = $props.id();
  const beskrivelse = $derived(
    [beskrevetAv, feil ? `${uid}-feil` : undefined].filter(Boolean).join(' ') || undefined
  );
</script>

<fieldset class="valg" id={navn} tabindex="-1" aria-describedby={beskrivelse}>
  <legend>{spoersmaal}</legend>
  <div class="kort" class:stablet class:lett>
    {#each valg as v (String(v.verdi))}
      <label class="valgkort" class:valgt={verdi === v.verdi} class:forklart={!!v.forklaring}>
        <input
          type="radio"
          name={navn}
          value={String(v.verdi)}
          checked={verdi === v.verdi}
          onchange={() => (verdi = v.verdi)}
        />
        {#if v.forklaring}
          <span class="tekster">
            <span>{v.tekst}</span>
            <span class="forklaring">{v.forklaring}</span>
          </span>
        {:else}
          <span>{v.tekst}</span>
        {/if}
      </label>
    {/each}
  </div>
  {#if feil}<p class="feilmelding" id={`${uid}-feil`}>{feil}</p>{/if}
</fieldset>

<style>
  .valg {
    border: 0;
    padding: 0;
    margin: 0;
    min-width: 0;
  }
  .valg:focus {
    outline: none;
  }
  legend {
    padding: 0;
    margin-bottom: var(--spacing-3);
    font-weight: 600;
    color: var(--ink);
  }
  .kort {
    display: flex;
    flex-wrap: wrap;
    gap: var(--spacing-2);
  }
  /* Under hverandre er kortene like brede, så valgene leses som en liste. */
  .kort.stablet {
    flex-direction: column;
    flex-wrap: nowrap;
    width: fit-content;
    max-width: 100%;
  }
  .valgkort {
    display: flex;
    align-items: center;
    gap: var(--spacing-3);
    min-height: 48px;
    padding: 0 var(--spacing-4);
    border: 1px solid var(--rule-strong-color);
    border-radius: var(--r-felt);
    background: var(--surface);
    color: var(--ink);
    cursor: pointer;
  }
  /* Med en forklaring per valg er kortene like brede og fyller kolonnen (oppgjørsformen, #1663). */
  .kort.stablet:has(.forklart) {
    width: 100%;
  }
  .valgkort.forklart {
    align-items: flex-start;
    padding: var(--spacing-3) var(--spacing-4);
  }
  .valgkort.forklart input {
    flex: none;
    margin-top: 2px;
  }
  .tekster {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-1);
  }
  .forklaring {
    color: var(--ink-2);
    font-size: 14px;
    font-weight: 400;
  }
  .lett .valgkort {
    border-color: transparent;
  }
  .lett .valgkort.valgt {
    border-color: transparent;
    box-shadow: none;
  }
  .valgkort:hover {
    background: var(--surface-inset);
  }
  .valgkort.valgt {
    background: var(--surface-selected);
    border-color: var(--brand);
    box-shadow: inset 0 0 0 1px var(--brand);
    font-weight: 600;
  }
  .valgkort:has(input:focus-visible) {
    outline: 2px solid var(--control-focus);
    outline-offset: 2px;
  }
  .feilmelding {
    margin-top: var(--spacing-2);
    color: var(--danger);
    font-size: 14px;
    font-weight: 500;
  }
  input {
    width: 18px;
    height: 18px;
    margin: 0;
    accent-color: var(--ink);
  }
</style>
