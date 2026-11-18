<!--
  Valgkortene i Varden: ekte radioknapper i en `fieldset` med spørsmålet som `legend`, eller én
  avkrysning med samme form.
  Ingenting er forhåndsvalgt, og ingen valg har farge (prinsipp 6 og 7). Mangler svaret når
  parten går videre, står feilmeldingen under valgene (MM-U32). Et valgfritt spørsmål som er
  besvart, har «Fjern svaret» under valgene (oppdragsgiver 17.11 i #2137, U-19 i BF-14).
-->
<script lang="ts" generics="T extends string | boolean">
  import Knapp from './Knapp.svelte';
  import Valgfri from './Valgfri.svelte';
  import { fokuser } from './mangler';
  import { VALG } from './tekster';

  let {
    navn,
    spoersmaal,
    valg,
    verdi = $bindable(null),
    feil = null,
    beskrevetAv,
    stablet = false,
    lett = false,
    valgfri = false,
    avkrysning = false,
    inaktiv = false,
    hjelp,
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
    /** Spørsmålet kan stå ubesvart, og «Valgfri» står til høyre på linja. */
    valgfri?: boolean;
    /** Ett valg som en avkrysning: avkrysset gir `verdi` valget, ellers `null`. */
    avkrysning?: boolean;
    inaktiv?: boolean;
    /** Hjelpeteksten under spørsmålet, som for et felt (`system.md`). */
    hjelp?: string;
  } = $props();
  const uid = $props.id();
  let gruppe: HTMLFieldSetElement | undefined;

  // U-19 i BF-14.
  async function fjern() {
    const valgt = gruppe?.querySelector<HTMLElement>('input:checked');
    verdi = null;
    await fokuser(() => valgt);
  }
  const beskrivelse = $derived(
    [hjelp ? `${uid}-hjelp` : undefined, beskrevetAv, feil ? `${uid}-feil` : undefined]
      .filter(Boolean)
      .join(' ') || undefined
  );
</script>

<fieldset
  disabled={inaktiv}
  class="valg"
  class:ugyldig={!!feil}
  class:med-hjelp={!!hjelp}
  id={navn}
  tabindex="-1"
  aria-describedby={beskrivelse}
  bind:this={gruppe}
>
  <legend
    >{#if valgfri}<Valgfri>{spoersmaal}</Valgfri>{:else}{spoersmaal}{/if}</legend
  >
  {#if hjelp}<p class="hjelp" id={`${uid}-hjelp`}>{hjelp}</p>{/if}
  <div class="kort" class:stablet class:lett>
    {#each valg as v (String(v.verdi))}
      <label class="valgkort" class:valgt={verdi === v.verdi} class:forklart={!!v.forklaring}>
        <input
          type={avkrysning ? 'checkbox' : 'radio'}
          name={navn}
          aria-invalid={feil ? 'true' : undefined}
          aria-describedby={beskrivelse}
          value={String(v.verdi)}
          checked={verdi === v.verdi}
          onchange={(e) => (verdi = avkrysning && !e.currentTarget.checked ? null : v.verdi)}
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
  {#if valgfri && !avkrysning && verdi != null}
    <div class="fjern">
      <Knapp variant="lenke" iFlukt aria-label={VALG.fjernNavn(spoersmaal)} onclick={fjern}
        >{VALG.fjern}</Knapp
      >
    </div>
  {/if}
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
  .hjelp {
    margin: 0 0 var(--spacing-3);
    color: var(--ink-3);
    font-size: 14px;
    text-wrap: pretty;
  }
  legend {
    width: 100%;
    padding: 0;
    margin-bottom: var(--spacing-3);
    font-weight: 600;
    color: var(--ink);
  }
  .med-hjelp legend {
    margin-bottom: var(--spacing-1);
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
    font-weight: 500;
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
    border-color: var(--ink);
  }
  .valgkort:has(input:focus-visible) {
    outline: 2px solid var(--control-focus);
    outline-offset: 2px;
  }
  .valg.ugyldig .valgkort {
    border-color: var(--danger);
  }
  .valg:disabled .valgkort {
    background: var(--surface-inset);
    color: var(--ink-4);
    cursor: not-allowed;
  }
  .valgkort:has(input:focus-visible) input {
    outline: none;
  }
  .fjern {
    margin-top: var(--spacing-2);
  }
  .feilmelding {
    margin-top: var(--spacing-2);
    color: var(--danger);
    font-size: 14px;
    font-weight: 500;
  }
</style>
