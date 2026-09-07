<script lang="ts">
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import { ChevronLeft } from 'lucide-svelte';
  import '$lib/components/kontraktsbord/mockup.css';
  import NewCaseForm from '$lib/components/kontraktsbord/NewCaseForm.svelte';
  import NewCaseActionBar from '$lib/components/kontraktsbord/NewCaseActionBar.svelte';

  const prosjektId = $derived(page.params.prosjektId ?? '');
  let actions = $state<{ canSend: boolean; sendLabel: string; send: () => void } | null>(null);

  $effect(() => {
    localStorage.setItem('koe-user-role', 'TE');
  });
</script>

<svelte:head><title>Nytt ansvarsgrunnlag — Kontraktsbordet</title></svelte:head>

<div class="mockup">
  <div class="new-case-shell">
    <header>
      <a href="/{prosjektId}"><ChevronLeft size={16} /> Saksoversikt</a>
      <span>Nytt ansvarsgrunnlag</span>
    </header>
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
  header {
    min-height: 64px;
    display: flex;
    align-items: center;
    gap: 24px;
    padding: 0 24px;
    border-bottom: var(--rule);
    background: var(--surface);
  }
  header a {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    color: var(--ink-2);
    text-decoration: none;
  }
  header span {
    font-weight: 600;
  }
  main {
    flex: 1;
    overflow-y: auto;
  }
</style>
