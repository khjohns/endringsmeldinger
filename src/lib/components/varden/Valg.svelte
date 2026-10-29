<!--
  Valgkortene i Varden: ekte radioknapper i en `fieldset` med spørsmålet som `legend`.
  Ingenting er forhåndsvalgt, og ingen valg har farge (prinsipp 6 og 7).
-->
<script lang="ts" generics="T extends string | boolean">
  let {
    navn,
    spoersmaal,
    valg,
    verdi = $bindable(null),
  }: {
    navn: string;
    spoersmaal: string;
    valg: { verdi: T; tekst: string }[];
    verdi: T | null;
  } = $props();
</script>

<fieldset class="valg">
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
</fieldset>

<style>
  .valg {
    border: 0;
    padding: 0;
    margin: 0;
    min-width: 0;
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
    border-color: var(--ink);
    box-shadow: inset 0 0 0 1px var(--ink);
    font-weight: 600;
  }
  .valgkort:has(input:focus-visible) {
    outline: 2px solid var(--control-focus);
    outline-offset: 2px;
  }
  input {
    width: 18px;
    height: 18px;
    margin: 0;
    accent-color: var(--ink);
  }
</style>
