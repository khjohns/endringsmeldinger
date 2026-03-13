<script lang="ts">
  import { browser } from '$app/environment';

  let userRole = $state<'TE' | 'BH'>(
    browser ? ((localStorage.getItem('koe-user-role') as 'TE' | 'BH') ?? 'TE') : 'TE'
  );

  function toggle() {
    userRole = userRole === 'TE' ? 'BH' : 'TE';
    if (browser) {
      localStorage.setItem('koe-user-role', userRole);
      window.dispatchEvent(
        new StorageEvent('storage', { key: 'koe-user-role', newValue: userRole })
      );
    }
  }
</script>

<button
  class="role-toggle"
  onclick={toggle}
  title="Bytt rolle (dev)"
  aria-label="Rolle: {userRole}"
>
  <span class="role-option" class:role-active={userRole === 'BH'}>BH</span>
  <span class="role-option" class:role-active={userRole === 'TE'}>TE</span>
  <span class="role-label">{userRole}</span>
</button>

<style>
  .role-toggle {
    display: inline-flex;
    align-items: center;
    gap: 0;
    padding: 0;
    border: 1px solid var(--color-wire-strong);
    border-radius: var(--radius-sm);
    background: var(--color-felt);
    cursor: pointer;
    overflow: hidden;
    transition: border-color 150ms ease;
    line-height: 1;
  }

  .role-toggle:hover {
    border-color: var(--color-wire-focus);
  }

  .role-option {
    font-family: var(--font-ui);
    font-size: 10px;
    font-weight: 600;
    padding: 4px 8px;
    color: var(--color-ink-muted);
    transition: all 120ms ease;
    user-select: none;
  }

  .role-active {
    background: var(--color-felt-raised);
    color: var(--color-ink);
  }

  .role-label {
    display: none;
  }
</style>
