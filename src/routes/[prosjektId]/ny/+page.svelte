<script lang="ts">
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import AppTopbar from '$lib/components/navigation/AppTopbar.svelte';
  import { projectStore } from '$lib/stores/project.svelte';
  import { savePreferredRole } from '$lib/utils/rolePreference';
  import { ChevronLeft } from 'lucide-svelte';
  import '$lib/components/kontraktsbord/theme.css';
  import NewCaseForm from '$lib/components/kontraktsbord/NewCaseForm.svelte';
  import NewCaseActionBar from '$lib/components/kontraktsbord/NewCaseActionBar.svelte';

  const prosjektId = $derived(page.params.prosjektId ?? '');
  let actions = $state<{ canSend: boolean; sendLabel: string; send: () => void } | null>(null);

  $effect(() => {
    savePreferredRole('TE');
  });
</script>

<svelte:head><title>Nytt ansvarsgrunnlag — Kontraktsbordet</title></svelte:head>

<div class="mockup">
  <div class="new-case-shell">
    <AppTopbar
      projectName={projectStore.current?.name ?? prosjektId}
      projectHref={`/${prosjektId}`}
      caseLabel="Ny sak"
      role="TE"
      lockedRole
      onrolechange={() => {}}
    >
      {#snippet leading()}<a class="back-link" href={`/${prosjektId}`} aria-label="Til saksoversikt"
          ><ChevronLeft size={17} /></a
        >{/snippet}
    </AppTopbar>
    <main>
      {#key prosjektId}
        <NewCaseForm
          {prosjektId}
          onsend={() => {}}
          oncreated={(sakId) =>
            goto('/' + prosjektId + '/' + encodeURIComponent(sakId) + '?spor=ansvar&rolle=TE')}
          onactions={(next) => (actions = next)}
        />
      {/key}
    </main>
    <NewCaseActionBar
      canSend={actions?.canSend ?? false}
      sendLabel={actions?.sendLabel ?? 'Send ansvarsgrunnlag'}
      oncancel={() => goto('/' + prosjektId)}
      onsend={() => actions?.send()}
    />
  </div>
</div>

<style>
  .new-case-shell {
    height: 100dvh;
    display: flex;
    flex-direction: column;
    background: var(--canvas);
  }
  .back-link {
    display: inline-flex;
    align-items: center;
    padding: 6px;
    color: var(--ink-2);
    border-radius: 5px;
  }
  .back-link:focus-visible {
    outline: 2px solid var(--brand);
    outline-offset: 3px;
  }
  main {
    flex: 1;
    overflow-y: auto;
  }
</style>
