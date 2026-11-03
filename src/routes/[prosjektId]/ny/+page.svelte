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
  import { sendNySak } from '$lib/api/kjerne';
  import { lagKjernesak } from '$lib/kjernesak/kontekst.svelte';

  const prosjektId = $derived(page.params.prosjektId ?? '');
  // Brevteksten har saksnummeret (LV-U4), så ID-en er bestemt før sendingen. Kommando-ID-en i
  // `sendNySak` gjelder handlingen, så et nytt forsøk sender samme ID (#418).
  const sakId = crypto.randomUUID();
  const send = $derived(sendNySak(prosjektId));
  // Saken finnes ikke før sendingen, så den lastes ikke. Den gir skallet og siden.
  const kjernesak = $derived(lagKjernesak({ sakId, prosjektId, part: 'TE' }));
</script>

<svelte:head><title>Ny sak — Kontraktsbordet</title></svelte:head>

{#key prosjektId}
  <Vardensak {kjernesak} saksliste={resolve('/[prosjektId]', { prosjektId })}>
    {#snippet nySak()}
      <NySak
        {sakId}
        {send}
        onsendt={(s) =>
          goto(resolve('/[prosjektId]/[sakId]', { prosjektId, sakId: s }), {
            state: { nySakSendt: true },
          })}
        onavbrutt={() => goto(resolve('/[prosjektId]', { prosjektId }))}
      />
    {/snippet}
  </Vardensak>
{/key}
