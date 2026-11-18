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
    inaktiv = false,
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
    inaktiv?: boolean;
    /** Feltet kan stå tomt, og labelen har «Valgfri» til høyre. */
    valgfri?: boolean;
    /** Labelen for et punkt under en felles overskrift (`Feltetikett`). */
    underordnet?: boolean;
    oninput?: () => void;
  } = $props();

  function tilpassHoeyden(el: HTMLTextAreaElement) {
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight + 2}px`;
  }

  $effect(() => {
    if (!vokser || !felt) return;
    void verdi;
    tilpassHoeyden(felt);
  });

  // Ny bredde bryter linjene på nytt, så høyden måles igjen (WCAG 1.4.10, #2138). Høyden settes
  // her selv, så bare en endret bredde utløser målingen, og den settes i neste bilde, så
  // observatøren ikke endrer elementet den observerer mens den varsles.
  $effect(() => {
    if (!vokser || !felt || typeof ResizeObserver === 'undefined') return;
    const el = felt;
    let bredde = el.clientWidth;
    let bilde = 0;
    const observator = new ResizeObserver(([e]) => {
      if (e.contentRect.width === bredde) return;
      bredde = e.contentRect.width;
      cancelAnimationFrame(bilde);
      bilde = requestAnimationFrame(() => tilpassHoeyden(el));
    });
    observator.observe(el);
    return () => {
      cancelAnimationFrame(bilde);
      observator.disconnect();
    };
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
    disabled={inaktiv}
    {oninput}
  ></textarea>
</Felt>

<style>
  textarea {
    min-height: 44px;
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
  textarea:hover:where(:enabled) {
    border-color: var(--ink-3);
  }
  textarea:disabled {
    background: var(--surface-inset);
    color: var(--ink-4);
    cursor: not-allowed;
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
