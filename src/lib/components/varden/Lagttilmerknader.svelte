<!--
  Det kjernen sier om et krav, et svar eller en aksept lagt til, før det legges til: kravet eller
  svaret blir ikke gjeldende fordi det er sendt før det siste (OV-U102, OV-U103), og brevene det er
  sendt samme dag som (OV-U104). Lest av kjernens forhåndsvisning med kommandoen, ikke av en egen
  regel i visningen.
-->
<script lang="ts">
  import type { Spor } from '$kjerne/typer';
  import type { Utledning } from '$kjerne/utledning/utled';
  import type { Kjernesakkontekst } from '$lib/kjernesak/kontekst.svelte';
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
  }: {
    kjernesak: Kjernesakkontekst;
    u: Utledning;
    spor: Spor;
    /** Kommandoen med datoen det ble sendt; uten datoen sier kjernen ingenting ennå. */
    kommando: Record<string, unknown> & { sendt?: string };
    vedlegg: ReturnType<typeof vedleggskart>;
  } = $props();

  const etter = $derived(kommando.sendt ? kjernesak.forhaandsvist(kommando, vedlegg) : null);
  const kravUtenfor = $derived(
    !!etter && etter.spor[spor].kravUtenforRekken.length > u.spor[spor].kravUtenforRekken.length
  );
  const svarUtenfor = $derived(
    !!etter && etter.spor[spor].svarUtenforRekken.length > u.spor[spor].svarUtenforRekken.length
  );
  const sammeDag = $derived(etter ? sendtSammeDagSom(u, etter) : []);
</script>

{#if kravUtenfor}<Melding art="info" levende={false}>{LEGG_TIL.kravUtenforRekken}</Melding>{/if}
{#if svarUtenfor}<Melding art="info" levende={false}>{LEGG_TIL.svarUtenforRekken}</Melding>{/if}
{#if sammeDag.length}
  <Melding art="info" levende={false}>{LEGG_TIL.sammeDag(sammeDag)}</Melding>
{/if}
