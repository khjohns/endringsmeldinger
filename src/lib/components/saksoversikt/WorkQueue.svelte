<script lang="ts">
  import { ArrowRight } from 'lucide-svelte';
  import type { Sakslinje } from '$lib/types/api';
  import type { Role } from '$lib/components/kontraktsbord/types';
  import { foreliggerISaken, SPORNAVN } from '$lib/domain/followUp';
  import { taskHref } from './overview';
  let {
    saker,
    role,
    projectId,
    scenarios = {},
  }: {
    saker: Sakslinje[];
    role: Role;
    projectId: string;
    scenarios?: Record<string, string>;
  } = $props();
  let showAll = $state(false);
  const tasks = $derived(saker.flatMap(foreliggerISaken).filter((task) => task.role === role));
  const caseCount = $derived(new Set(tasks.map((task) => task.caseId)).size);
</script>

<section class="work-queue" aria-labelledby="queue-title">
  <header>
    <div>
      <p class="eyebrow">{role === 'BH' ? 'Byggherrens' : 'Entreprenørens'} arbeidsliste</p>
      <h2 id="queue-title">Det som foreligger i sakene</h2>
      <p class="queue-count" role="status">
        {tasks.length}
        krav i {caseCount}
        {caseCount === 1 ? 'sak' : 'saker'}
      </p>
    </div>
    {#if tasks.length > 3}<button
        class="show-all"
        onclick={() => (showAll = !showAll)}
        aria-expanded={showAll}
        >{showAll ? 'Vis færre' : `Se alle ${tasks.length}`}<ArrowRight size={14} /></button
      >{/if}
  </header>
  {#each showAll ? tasks : tasks.slice(0, 3) as task (task.id)}
    <div class="task-row">
      <div class="task-copy">
        <p class="case-label">{task.caseId} · {task.caseTitle}</p>
        <h3>{task.title}</h3>
        <p class="detail">{task.detail}</p>
      </div>
      <div class="task-actions">
        <span class="track-label">{SPORNAVN[task.track]}</span
        ><!-- taskHref bygger stien i domenelaget, som holdes fritt for $app-avhengigheter. --><!-- eslint-disable-next-line svelte/no-navigation-without-resolve --><a
          href={taskHref(task, projectId, scenarios[task.caseId])}
          aria-label={`${task.title} – ${SPORNAVN[task.track]} – ${task.caseId}`}
          >Åpne kravet <ArrowRight size={15} /></a
        >
      </div>
    </div>
  {:else}<p class="empty">
      {role === 'BH'
        ? 'Ingen krav venter på byggherrens svar.'
        : 'Ingen svar fra byggherren står uten enighet.'}
    </p>{/each}
</section>

<style>
  .work-queue {
    border: 1px solid var(--color-wire);
    border-radius: 12px;
    background: var(--color-felt);
    margin-bottom: 28px;
    overflow: hidden;
  }
  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 20px;
    padding: 24px;
  }
  .eyebrow {
    margin: 0 0 6px;
    font-size: 10px;
    font-weight: 650;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--color-ink-muted);
  }
  h2 {
    margin: 0;
    font-size: 18px;
    font-weight: 650;
  }
  .queue-count {
    margin: 8px 0 0;
    color: var(--color-ink-muted);
    font-size: 12px;
  }
  .show-all {
    display: flex;
    align-items: center;
    gap: 6px;
    border: 0;
    background: transparent;
    color: var(--color-vekt);
    font: inherit;
    font-size: 12px;
    cursor: pointer;
    white-space: nowrap;
  }
  .task-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 24px;
    padding: 20px 24px;
    border-top: 1px solid var(--color-wire);
  }
  .task-copy {
    min-width: 0;
  }
  .case-label {
    margin: 0 0 5px;
    color: var(--color-ink-muted);
    font-size: 11px;
    line-height: 1.5;
  }
  h3 {
    margin: 0;
    font-size: 14px;
    font-weight: 600;
    line-height: 1.5;
  }
  .detail {
    margin: 5px 0 0;
    font-size: 12px;
    line-height: 1.5;
    color: var(--color-ink-secondary);
  }
  .task-actions {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-shrink: 0;
  }
  .track-label {
    padding: 5px 7px;
    border-radius: 5px;
    background: var(--color-canvas);
    color: var(--color-ink-muted);
    font-size: 10px;
  }
  a {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 12px;
    border: 1px solid var(--color-wire-strong);
    border-radius: 6px;
    color: var(--color-ink-secondary);
    text-decoration: none;
    font-size: 12px;
    font-weight: 600;
  }
  a:hover {
    background: var(--color-vekt-bg);
  }
  a:focus-visible,
  button:focus-visible {
    outline: 2px solid var(--color-wire-focus);
    outline-offset: 3px;
  }
  .empty {
    padding: 16px 24px;
    margin: 0;
    color: var(--color-ink-muted);
    font-size: 12px;
    line-height: 1.6;
  }
  @media (max-width: 700px) {
    header {
      padding: 18px;
    }
    .task-row {
      flex-wrap: wrap;
      gap: 12px;
      padding: 18px;
    }
    .task-actions {
      width: 100%;
      justify-content: space-between;
    }
  }
</style>
