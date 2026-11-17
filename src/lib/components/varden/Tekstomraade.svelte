<!--
  Et tekstfelt over flere linjer i skjemaene, med labelen over, hjelpeteksten under labelen,
  feltet og feilmeldingen under (system.md, «Feltene står under hverandre», #2119). Feltet har
  full bredde og kan gjøres høyere; `vokser` lar det vokse med teksten i stedet. Uten `etikett`
  står labelen et annet sted, som overskriften i `Spoersmaal`, og `merketAv` peker på den.
-->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import Feltetikett from './Feltetikett.svelte';

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
    children,
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
    /** Tekst mellom labelen og feltet, etter hjelpeteksten. */
    children?: Snippet;
  } = $props();

  const beskrevetAv = $derived(
    [...foran, hjelp ? `${id}-hjelp` : '', ...etter, feil ? `${id}-feil` : '']
      .filter(Boolean)
      .join(' ') || undefined
  );

  $effect(() => {
    void verdi;
    if (!vokser || !felt) return;
    felt.style.height = 'auto';
    felt.style.height = `${felt.scrollHeight + 2}px`;
  });
</script>

<div class="tekstomraade">
  {#if etikett}<Feltetikett for={id} {valgfri} {underordnet}>{etikett}</Feltetikett>{/if}
  {#if hjelp}<span class="dempet" id={`${id}-hjelp`}>{hjelp}</span>{/if}
  {@render children?.()}
  <textarea
    {id}
    rows={rader}
    class:vokser
    bind:value={verdi}
    bind:this={felt}
    aria-labelledby={merketAv}
    aria-describedby={beskrevetAv}
    aria-invalid={feil ? 'true' : undefined}
    aria-required={paakrevd ? 'true' : undefined}
    {oninput}
  ></textarea>
  {#if feil}<p class="feilmelding" id={`${id}-feil`}>{feil}</p>{/if}
</div>

<style>
  .tekstomraade {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-2);
  }
  .dempet {
    color: var(--ink-3);
    font-size: 14px;
  }
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
  .feilmelding {
    color: var(--danger);
    font-size: 14px;
    font-weight: 500;
  }
</style>
