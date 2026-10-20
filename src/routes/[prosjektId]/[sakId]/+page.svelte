<script lang="ts">
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import Kjernesakrom from '$lib/components/kjernesak/Kjernesakrom.svelte';
  import { lagKjernesak } from '$lib/kjernesak/kontekst.svelte';
  import {
    readWorkspaceView,
    workspaceViewUrl,
    type WorkspaceView,
  } from '$lib/kontraktsbord/viewState';

  const prosjektId = $derived(page.params.prosjektId ?? '');
  const sakId = $derived(page.params.sakId ?? '');
  // Leserens side kommer fra serveren (#705). Uten side viser Kontrollrommet ingen handling.
  const kjernesak = $derived(lagKjernesak({ sakId, prosjektId }));

  $effect(() => {
    if (sakId) void kjernesak.last();
  });
  const storedRole =
    typeof localStorage !== 'undefined' && localStorage.getItem('koe-user-role') === 'TE'
      ? 'TE'
      : 'BH';
  const view = $derived(readWorkspaceView(page.url.searchParams, storedRole));

  $effect(() => {
    localStorage.setItem('koe-user-role', view.role);
  });

  function changeView(next: WorkspaceView) {
    const href = workspaceViewUrl(page.url, next);
    if (href !== page.url.pathname + page.url.search + page.url.hash)
      // href er utledet av gjeldende URL (bare query endres), ikke en ny rute.
      // eslint-disable-next-line svelte/no-navigation-without-resolve
      void goto(href, { noScroll: true, keepFocus: true });
  }
</script>

<svelte:head><title>{kjernesak.saksbilde?.tittel ?? 'Sak'} — Kontraktsbordet</title></svelte:head>

{#if kjernesak.saksbilde}
  {#key prosjektId + ':' + sakId}
    <Kjernesakrom
      {kjernesak}
      projectId={prosjektId}
      {view}
      onviewchange={changeView}
      onnewcase={() => goto(resolve('/[prosjektId]/ny', { prosjektId }))}
    />
  {/key}
{:else if kjernesak.finnes === false}
  <div class="case-message" role="alert">
    <h1>Fant ikke saken</h1>
    <p>Saken finnes ikke i prosjektet.</p>
    <a href={resolve('/[prosjektId]', { prosjektId })}>Til saksoversikten</a>
  </div>
{:else if kjernesak.feil}
  <div class="case-message" role="alert">
    <h1>Kunne ikke laste saken</h1>
    <p>{kjernesak.feil}</p>
    <button onclick={() => kjernesak.last()}>Prøv igjen</button>
    <a href={resolve('/[prosjektId]', { prosjektId })}>Til saksoversikten</a>
  </div>
{:else}
  <div class="case-message" role="status">Laster sak …</div>
{/if}

<style>
  .case-message {
    padding: 40px;
    color: var(--color-ink);
  }
  .case-message h1 {
    font-size: 22px;
    margin-bottom: 12px;
  }
  .case-message p {
    margin-bottom: 16px;
  }
  .case-message button {
    margin-right: 16px;
    cursor: pointer;
  }
</style>
