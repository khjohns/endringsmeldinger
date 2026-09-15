<script lang="ts">
  import { Tooltip } from 'bits-ui';
  import '$lib/components/kontraktsbord/theme.css';
  import '../app.css';
  import { logout } from '$lib/api/auth';
  let { children, data } = $props();
  let logoutError = $state('');
  let loggingOut = $state(false);
  async function signOut() {
    loggingOut = true;
    try {
      await logout();
    } catch {
      logoutError = 'Kunne ikke logge ut. Prøv igjen.';
      loggingOut = false;
    }
  }
</script>

<Tooltip.Provider delayDuration={300}>
  {@render children()}
  {#if data.user}
    <div class="session-control">
      {#if logoutError}<span role="alert">{logoutError}</span>{/if}
      <button onclick={signOut} disabled={loggingOut}>Logg ut</button>
    </div>
  {/if}
</Tooltip.Provider>

<style>
  .session-control {
    position: fixed;
    bottom: 8px;
    right: 12px;
    z-index: 20;
    display: flex;
    gap: 8px;
    align-items: center;
    font-size: 12px;
  }
  .session-control button {
    color: var(--color-ink-secondary);
    background: var(--color-canvas);
    border: 1px solid var(--color-wire);
    border-radius: var(--radius-sm);
    padding: 4px 10px;
    cursor: pointer;
  }
  .session-control span {
    background: var(--color-canvas);
    color: var(--color-score-low);
  }
</style>
