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
  }: {
    navn: string;
    spoersmaal: string;
    valg: { verdi: T; tekst: string }[];
    verdi: T | null;
    /** Hva som mangler, når parten har prøvd å gå videre uten svaret. */
    feil?: string | null;
    /** Id-en til det spørsmålet bygger på, som forutsetningene for et subsidiært lag. */
    beskrevetAv?: string;
  } = $props();
  const uid = $props.id();
  const beskrivelse = $derived(
    [beskrevetAv, feil ? `${uid}-feil` : undefined].filter(Boolean).join(' ') || undefined
  );
</script>

<fieldset class="valg" id={navn} tabindex="-1" aria-describedby={beskrivelse}>
  <legend>{spoersmaal}</legend>
  <div class="kort">
    {#each valg as v (String(v.verdi))}
      <label class="valgkort" class:valgt={verdi === v.verdi}>
        <input
          type="radio"
          name={navn}
          value={String(v.verdi)}
          checked={verdi === v.verdi}
          onchange={() => (verdi = v.verdi)}
        />
        <span>{v.tekst}</span>
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
    color: var(--ink-2);
  }
  .kort {
    display: flex;
    flex-wrap: wrap;
    gap: var(--spacing-2);
  }
  .valgkort {
    display: flex;
    align-items: center;
    gap: var(--spacing-3);
    min-height: 48px;
    padding: 0 var(--spacing-4);
    border: 1px solid var(--rule-strong-color);
    border-radius: 4px;
    background: var(--surface);
    color: var(--ink);
    cursor: pointer;
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
