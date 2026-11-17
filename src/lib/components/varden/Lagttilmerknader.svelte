<!--
  Det kjernen sier om et krav, et svar eller en aksept lagt til, før det legges til: kravet eller
  svaret blir ikke gjeldende fordi det er sendt før det siste (OV-U102, OV-U103), og brevene det er
  sendt samme dag som (OV-U104). Lest av kjernens forhåndsvisning med kommandoen, ikke av en egen
  regel i visningen.
-->
<script lang="ts">
  import { untrack } from 'svelte';
  import type { Spor } from '#kjerne/typer.ts';
  import type { Utledning } from '#kjerne/utledning/utled.ts';
  import type { Kjernesakkontekst } from '#lib/kjernesak/kontekst.svelte.ts';
  import Melding from './Melding.svelte';
  import { sendtSammeDagSom } from './lesing';
  import type { vedleggskart } from './nysak';
  import { LEGG_TIL } from './tekster';

  let {
    kjernesak,
    u,
    spor,
    kommando,
    vedlegg,
    innfelt = false,
  }: {
    kjernesak: Kjernesakkontekst;
    u: Utledning;
    spor: Spor;
    /** Kommandoen med datoen det ble sendt; uten datoen sier kjernen ingenting ennå. */
    kommando: Record<string, unknown> & { sendt?: string };
    vedlegg: ReturnType<typeof vedleggskart>;
    /** Med marg som seksjonene i krav- og svarskjemaet. */
    innfelt?: boolean;
  } = $props();

  // Beskrivelsen endrer ikke merknadene, så kjernen forhåndsviser ikke på nytt for hvert tegn i den.
  const noekkel = $derived(
    kommando.sendt ? JSON.stringify({ ...kommando, beskrivelse: undefined }) : null
  );
  const etter = $derived.by(() => {
    if (!noekkel) return null;
    void u;
    void vedlegg;
    return untrack(() => kjernesak.forhaandsvist(kommando, vedlegg));
  });
  const kravUtenfor = $derived(
    !!etter && etter.spor[spor].kravUtenforRekken.length > u.spor[spor].kravUtenforRekken.length
  );
  const svarUtenfor = $derived(
    !!etter && etter.spor[spor].svarUtenforRekken.length > u.spor[spor].svarUtenforRekken.length
  );
  const sammeDag = $derived(etter ? sendtSammeDagSom(u, etter) : []);
</script>

<!-- Merknadene kommer når datoen er oppgitt, så de leses opp (uu-sjekk, `role="status"`). -->
<div
  class="merknader"
  class:innfelt
  class:tom={!kravUtenfor && !svarUtenfor && !sammeDag.length}
  role="status"
>
  {#if kravUtenfor}<Melding art="info" levende={false}>{LEGG_TIL.kravUtenforRekken(spor)}</Melding
    >{/if}
  {#if svarUtenfor}<Melding art="info" levende={false}>{LEGG_TIL.svarUtenforRekken}</Melding>{/if}
  {#if sammeDag.length}
    <Melding art="info" levende={false}>{LEGG_TIL.sammeDag(sammeDag)}</Melding>
  {/if}
</div>

<style>
  .merknader {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-3);
  }
  /* I skjemaene med kanter på seksjonene står merknadene inne i kortet. */
  .innfelt {
    padding: var(--spacing-4) var(--spacing-6) 0;
  }
  .tom {
    display: none;
  }
</style>
