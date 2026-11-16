<!--
  Et felt i skjemaene med labelen over, hjelpeteksten under labelen, feltet med enheten og
  feilmeldingen under (system.md, «Feltene står under hverandre», #1925). Et tall står til høyre
  med like brede sifre; `bredde` gir et kort felt eller et tekstfelt i full bredde.
-->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import Feltetikett from './Feltetikett.svelte';

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
    /** Tekst under feltet og feilmeldingen. */
    children?: Snippet;
  } = $props();

  const beskrevetAv = $derived(
    [...foran, hjelp ? `${id}-hjelp` : '', ...etter, feil ? `${id}-feil` : '']
      .filter(Boolean)
      .join(' ') || undefined
  );
</script>

<div class="tallfelt">
  <Feltetikett for={id} {valgfri}>{etikett}</Feltetikett>
  {#if hjelp}<span class="dempet" id={`${id}-hjelp`}>{hjelp}</span>{/if}
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
      aria-describedby={beskrevetAv}
      aria-invalid={feil ? 'true' : undefined}
      aria-required={paakrevd ? 'true' : undefined}
    />
    {#if enhet}<span class="enhet" aria-hidden="true">{enhet}</span>{/if}
  </span>
  {#if feil}<p class="feilmelding" id={`${id}-feil`}>{feil}</p>{/if}
  {@render children?.()}
</div>

<style>
  .tallfelt {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-2);
  }
  .dempet {
    color: var(--ink-3);
    font-size: 14px;
  }
  .inndata {
    display: inline-flex;
    align-items: stretch;
    width: 100%;
    max-width: 100%;
    border: var(--control-border);
    border-radius: var(--r-felt);
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
    background: var(--surface);
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
  .feilmelding {
    color: var(--danger);
    font-size: 14px;
    font-weight: 500;
  }
</style>
