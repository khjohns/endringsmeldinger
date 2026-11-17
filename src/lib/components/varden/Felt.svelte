<!--
  Rammen rundt et felt i skjemaene: labelen over, hjelpeteksten under labelen, feltet og
  feilmeldingen under (system.md, «Feltene står under hverandre», #2119). `Tallfelt`,
  `Tekstomraade` og `Datofelt` legger feltet i den, og `beskrevetAv` gir feltet ID-ene til
  hjelpeteksten og feilen.
-->
<script module lang="ts">
  /** ID-ene som beskriver feltet: `foran`, hjelpeteksten, `etter` og feilen, i den rekkefølgen. */
  export function beskrevetAv(
    id: string,
    hjelp: string | null,
    feil: string | null,
    foran: readonly string[] = [],
    etter: readonly string[] = []
  ): string | undefined {
    return (
      [...foran, hjelp ? `${id}-hjelp` : '', ...etter, feil ? `${id}-feil` : '']
        .filter(Boolean)
        .join(' ') || undefined
    );
  }
</script>

<script lang="ts">
  import type { Snippet } from 'svelte';
  import Feltetikett from './Feltetikett.svelte';

  let {
    id,
    etikett,
    hjelp = null,
    feil = null,
    valgfri = false,
    underordnet = false,
    under,
    children,
  }: {
    id: string;
    /** Uten etikett står labelen et annet sted, som overskriften i `Spoersmaal`. */
    etikett?: string;
    hjelp?: string | null;
    feil?: string | null;
    /** Feltet kan stå tomt, og labelen har «Valgfri» til høyre. */
    valgfri?: boolean;
    /** Labelen for et punkt under en felles overskrift (`Feltetikett`). */
    underordnet?: boolean;
    /** Tekst under feltet og feilmeldingen. */
    under?: Snippet;
    children: Snippet;
  } = $props();
</script>

<div class="felt">
  {#if etikett}<Feltetikett for={id} {valgfri} {underordnet}>{etikett}</Feltetikett>{/if}
  {#if hjelp}<span class="dempet" id={`${id}-hjelp`}>{hjelp}</span>{/if}
  {@render children()}
  {#if feil}<p class="feilmelding" id={`${id}-feil`}>{feil}</p>{/if}
  {@render under?.()}
</div>

<style>
  .felt {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-2);
  }
  .dempet {
    color: var(--ink-3);
    font-size: 14px;
  }
  .feilmelding {
    color: var(--danger);
    font-size: 14px;
    font-weight: 500;
  }
</style>
