<script lang="ts">
  import { Building2 } from 'lucide-svelte';
  import type { Snippet } from 'svelte';
  import type { Role } from '$lib/components/kontraktsbord/types';
  let {
    projectName,
    projectHref,
    caseLabel,
    role,
    onrolechange,
    leading,
    actions,
    lockedRole = false,
  }: {
    projectName: string;
    projectHref?: string;
    caseLabel?: string;
    role: Role;
    onrolechange: (role: Role) => void;
    leading?: Snippet;
    actions?: Snippet;
    lockedRole?: boolean;
  } = $props();
</script>

<header class="app-topbar">
  <div class="left">
    {#if leading}{@render leading()}{/if}
    <nav class="breadcrumbs" aria-label="Brødsmuler">
      <!-- TODO: Tilpass prosjektlisten på / til det nye designet. Enkel prosjektvelger finnes allerede. -->
      <a class="projects-link" href="/" aria-label="Prosjekter">
        <Building2 size={19} strokeWidth={1.6} aria-hidden="true" />
        <span>Prosjekter</span>
      </a>
      <span class="separator" aria-hidden="true">/</span>
      {#if projectHref}<a class="project-link" href={projectHref} title={projectName}
          >{projectName}</a
        >
      {:else}<span class="current" title={projectName}>{projectName}</span>{/if}
      {#if caseLabel}<span class="separator" aria-hidden="true">/</span><span
          class="current case-label"
          title={caseLabel}>{caseLabel}</span
        >{/if}
    </nav>
  </div>
  <div class="actions">
    {#if actions}{@render actions()}{/if}
    {#if lockedRole}<span class="locked-role"
        >{role === 'BH' ? 'Byggherre BH' : 'Entreprenør TE'}</span
      >
    {:else}
      <div class="role-control">
        <span class="role-caption">Vis som</span>
        <div class="role-switch" role="group" aria-label="Vis som">
          {#each [{ id: 'TE' as const, label: 'Entreprenør' }, { id: 'BH' as const, label: 'Byggherre' }] as item}
            <button
              type="button"
              class:active={role === item.id}
              aria-pressed={role === item.id}
              aria-label={`${item.label} ${item.id}`}
              onclick={() => onrolechange(item.id)}
              ><span class="role-name">{item.label}</span>
              <span class="role-code">{item.id}</span></button
            >
          {/each}
        </div>
      </div>
    {/if}
  </div>
</header>

<style>
  .app-topbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 20px;
    min-height: 64px;
    padding: 10px 24px;
    box-sizing: border-box;
    background: var(--surface, var(--color-felt, #fff));
    border-bottom: 1px solid var(--color-wire, #e1e5de);
    font-family: var(--font-ui, sans-serif);
    color: var(--ink-2, var(--color-ink-secondary, #34423b));
    position: relative;
    z-index: 30;
    flex-shrink: 0;
  }
  .left,
  .breadcrumbs,
  .actions,
  .role-control {
    display: flex;
    align-items: center;
  }
  .left {
    min-width: 0;
    gap: 12px;
  }
  .breadcrumbs {
    min-width: 0;
    gap: 14px;
    font-size: 13px;
  }
  .breadcrumbs :global(svg) {
    color: var(--ink-3, var(--color-ink-muted, #68756d));
    flex-shrink: 0;
  }
  .breadcrumbs a,
  .current {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .breadcrumbs a {
    color: var(--ink-3, var(--color-ink-muted, #68756d));
    text-decoration: none;
  }
  .breadcrumbs .projects-link {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    flex-shrink: 0;
    color: var(--ink-4, var(--color-ink-muted, #68756d));
  }
  .breadcrumbs .project-link {
    color: inherit;
    font-weight: 600;
  }
  .breadcrumbs a:hover {
    color: inherit;
    text-decoration: underline;
    text-underline-offset: 3px;
  }
  .current {
    font-weight: 600;
  }
  .separator {
    color: var(--ink-4, var(--color-ink-muted, #68756d));
  }
  .actions {
    gap: 14px;
    flex-shrink: 0;
  }
  .role-control {
    gap: 14px;
  }
  .role-caption {
    color: var(--ink-3, var(--color-ink-muted, #68756d));
    font-size: 12px;
    white-space: nowrap;
  }
  .role-switch {
    display: flex;
    padding: 4px;
    gap: 4px;
    border: 1px solid var(--color-wire, #e1e5de);
    border-radius: 8px;
    background: var(--surface-inset, var(--color-canvas, #f0f2ed));
  }
  .role-switch button {
    border: 0;
    border-radius: 5px;
    background: transparent;
    color: var(--ink-3, var(--color-ink-muted, #68756d));
    padding: 8px 11px;
    font: inherit;
    font-size: 12px;
    cursor: pointer;
    white-space: nowrap;
  }
  .role-switch button.active {
    background: var(--surface, var(--color-felt, #fff));
    color: var(--ink-2, var(--color-ink-secondary, #34423b));
    font-weight: 650;
    box-shadow: 0 1px 4px #0000000a;
  }
  .role-code {
    opacity: 0.8;
  }
  .locked-role {
    font-size: 12px;
    color: var(--ink-3, var(--color-ink-muted, #68756d));
  }
  a:focus-visible,
  button:focus-visible {
    outline: 2px solid var(--brand, #2d4a3b);
    outline-offset: 3px;
  }
  @media (max-width: 1100px) {
    .role-caption {
      display: none;
    }
    .breadcrumbs {
      gap: 9px;
    }
    .app-topbar {
      padding-inline: 16px;
    }
  }
  @media (max-width: 640px) {
    .projects-link span {
      display: none;
    }
    .app-topbar {
      gap: 10px;
      min-height: 56px;
      padding: 8px 12px;
      flex-wrap: wrap;
    }
    .left {
      flex: 1;
    }
    .actions {
      gap: 8px;
      margin-left: auto;
    }
    .role-name {
      display: none;
    }
    .role-switch button {
      padding: 7px 9px;
    }
    .case-label {
      max-width: 145px;
    }
  }
</style>
