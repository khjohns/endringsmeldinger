<!--
  Saken i Varden (#1414). Saken åpner i forholdet, eller i sporet `?spor=` fra
  omdirigeringene. Etter opprettelsen kommer TE hit med kvitteringen (S1 i #1414).
  Den gamle visningen står på `kjerne/` (S3).
-->
<script lang="ts">
  import { page } from '$app/state';
  import { resolve } from '$app/paths';
  import Vardensak from '$lib/components/varden/Vardensak.svelte';
  import { NYSAK } from '$lib/components/varden/tekster';
  import { lagKjernesak } from '$lib/kjernesak/kontekst.svelte';
  import type { Spor } from '$kjerne/typer';

  const prosjektId = $derived(page.params.prosjektId ?? '');
  const sakId = $derived(page.params.sakId ?? '');
  // Leserens side kommer fra serveren (#705).
  const kjernesak = $derived(lagKjernesak({ sakId, prosjektId }));

  $effect(() => {
    if (sakId) void kjernesak.last();
  });

  // Omdirigeringene skriver sporene med de gamle navnene.
  const SPORENE: Record<string, Spor> = {
    ansvar: 'forhold',
    grunnlag: 'forhold',
    forhold: 'forhold',
    vederlag: 'vederlag',
    frist: 'frist',
  };
  const spor = $derived(SPORENE[page.url.searchParams.get('spor') ?? ''] ?? 'forhold');
</script>

<svelte:head><title>{kjernesak.saksbilde?.tittel ?? 'Sak'} — Kontraktsbordet</title></svelte:head>

{#key prosjektId + ':' + sakId}
  <Vardensak
    {kjernesak}
    {spor}
    kvittering={page.state.nySakSendt ? NYSAK.kvittering : undefined}
    saksliste={resolve('/[prosjektId]', { prosjektId })}
  />
{/key}
