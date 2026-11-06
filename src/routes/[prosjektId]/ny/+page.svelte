<!--
  Skjemaet for ny sak i Varden (BF-05, #1414). Saken og påberopelsen sendes i én handling
  (KT-U11). Etter sendingen kommer TE til saken med kvitteringen (S1), og «Avbryt» fører til
  sakslisten uten melding (S2). Serveren avgjør siden med kontraktsteamet; skjemaet er TEs.
-->
<script lang="ts">
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import NySak from '$lib/components/varden/NySak.svelte';
  import Vardensak from '$lib/components/varden/Vardensak.svelte';
  import {
    fjernVentende,
    lagreVentende,
    lesVentende,
    type SendNySak,
    type VedleggForNySak,
  } from '$lib/components/varden/nysak';
  import {
    hentSaksmerkingForNySak,
    lastOppVedleggForNySak,
    nyKommandoId,
    sendNySak,
    slettVedleggForNySak,
  } from '$lib/api/kjerne';
  import { lagKjernesak } from '$lib/kjernesak/kontekst.svelte';

  const prosjektId = $derived(page.params.prosjektId ?? '');
  // Brevteksten har saksnummeret (LV-U4), så ID-en er bestemt før sendingen. Saks-ID-en og
  // kommando-ID-en gjelder handlingen, også etter ny innlasting når utfallet var usikkert
  // (#418, #1526 punkt 1).
  const ventende = $derived(lesVentende(prosjektId));
  const sakId = $derived(ventende?.sakId ?? crypto.randomUUID());
  const kommandoId = $derived(ventende?.kommandoId ?? nyKommandoId());
  const send: SendNySak = $derived(async (nySak) => {
    lagreVentende(prosjektId, { sakId, kommandoId, utkast: nySak.utkast });
    const svar = await sendNySak(prosjektId, kommandoId)(nySak);
    fjernVentende(prosjektId);
    return svar;
  });
  const vedleggForNySak: VedleggForNySak = $derived({
    lastOpp: (fil) => lastOppVedleggForNySak(fil, prosjektId),
    slett: (vedleggId) => slettVedleggForNySak(vedleggId, prosjektId),
  });
  // Saken finnes ikke før sendingen, så den lastes ikke. Den gir skallet og siden.
  const kjernesak = $derived(lagKjernesak({ sakId, prosjektId, part: 'TE' }));
</script>

<svelte:head><title>Ny sak — Kontraktsbordet</title></svelte:head>

{#key prosjektId}
  <Vardensak
    {kjernesak}
    saksliste={resolve('/[prosjektId]', { prosjektId })}
    prosjekter={resolve('/')}
    bruker={page.data.user}
  >
    {#snippet nySak()}
      <NySak
        {sakId}
        {send}
        hentMerking={() => hentSaksmerkingForNySak(prosjektId)}
        {vedleggForNySak}
        utkast={ventende?.utkast ?? null}
        onsendt={(s) =>
          goto(resolve('/[prosjektId]/[sakId]', { prosjektId, sakId: s }), {
            state: { nySakSendt: true },
          })}
        onavbrutt={() => {
          fjernVentende(prosjektId);
          goto(resolve('/[prosjektId]', { prosjektId }));
        }}
      />
    {/snippet}
  </Vardensak>
{/key}
