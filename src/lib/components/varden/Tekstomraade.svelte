<!--
  Et tekstfelt over flere linjer i skjemaene, i rammen `Felt` (system.md, «Feltene står under
  hverandre», #2119). Feltet har full bredde og kan gjøres høyere; `vokser` lar det vokse med
  teksten i stedet. Uten `etikett` står labelen et annet sted, som overskriften i `Spoersmaal`, og
  `merketAv` peker på den.
-->
<script lang="ts">
  import Felt, { beskrevetAv } from './Felt.svelte';

  let {
    id,
    etikett,
    merketAv,
    hjelp = null,
    rader = 3,
    vokser = false,
    verdi = $bindable(),
    felt = $bindable(null),
    feil = null,
    foran = [],
    etter = [],
    paakrevd = false,
    valgfri = false,
    underordnet = false,
    oninput,
  }: {
    id: string;
    etikett?: string;
    /** ID-en til labelen når den står utenfor feltet. */
    merketAv?: string;
    hjelp?: string | null;
    rader?: number;
    /** Feltet vokser med teksten, så én setning ikke står i en stor tom boks. */
    vokser?: boolean;
    verdi: string;
    felt?: HTMLTextAreaElement | null;
    feil?: string | null;
    /** ID-ene til tekst som beskriver feltet, foran hjelpeteksten. */
    foran?: readonly string[];
    /** ID-ene til tekst som beskriver feltet, etter hjelpeteksten og før feilen. */
    etter?: readonly string[];
    paakrevd?: boolean;
    /** Feltet kan stå tomt, og labelen har «Valgfri» til høyre. */
    valgfri?: boolean;
    /** Labelen for et punkt under en felles overskrift (`Feltetikett`). */
    underordnet?: boolean;
    oninput?: () => void;
  } = $props();

  $effect(() => {
    if (!vokser || !felt) return;
    void verdi;
    felt.style.height = 'auto';
    felt.style.height = `${felt.scrollHeight + 2}px`;
  });
</script>

<Felt {id} {etikett} {hjelp} {feil} {valgfri} {underordnet}>
  <textarea
    {id}
    rows={rader}
    class:vokser
    bind:value={verdi}
    bind:this={felt}
    aria-labelledby={merketAv}
    aria-describedby={beskrevetAv(id, hjelp, feil, foran, etter)}
    aria-invalid={feil ? 'true' : undefined}
    aria-required={paakrevd ? 'true' : undefined}
    {oninput}
  ></textarea>
</Felt>

<style>
  textarea {
    padding: var(--spacing-3);
    border: var(--control-border);
    border-radius: var(--r-felt);
    font: 16px/1.6 var(--font-sans);
    color: var(--ink);
    background: var(--surface);
    resize: vertical;
  }
  textarea.vokser {
    min-height: 6lh;
    resize: none;
    overflow: hidden;
  }
  textarea:focus-visible {
    outline: 2px solid var(--control-focus);
    outline-offset: 2px;
  }
  textarea[aria-invalid='true'] {
    border-color: var(--danger);
    box-shadow: inset 0 0 0 1px var(--danger);
  }
</style>
