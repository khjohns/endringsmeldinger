<script lang="ts">
  import { ArrowRight } from 'lucide-svelte';
  import { caseFollowUp, taskHref } from '$lib/domain/followUp';
  import type { CaseListItem } from '$lib/types/api';
  import type { Role } from '$lib/components/kontraktsbord/types';
  import { caseStatus, formalizedClaims } from './overview';
  let {
    cases,
    role,
    projectId,
    scenarios = {},
    demo = false,
  }: {
    cases: CaseListItem[];
    role: Role;
    projectId: string;
    scenarios?: Record<string, string>;
    demo?: boolean;
  } = $props();
  let showAll = $state(false);
  const formalized = $derived(formalizedClaims(cases));
  const claimCases = $derived(
    cases.filter((item) => item.sakstype === 'standard' && !formalized.has(item.sak_id))
  );
  const orderTasks = $derived(
    cases
      .filter((item) => item.sakstype === 'endringsordre')
      .flatMap((item) => {
        const status = caseStatus(item);
        const needsResponse = status === 'utstedt' || status === 'revidert';
        if (!needsResponse && status !== 'bestridt') return [];
        return [
          {
            id: `${item.sak_id}:endringsordre`,
            caseId: item.sak_id,
            caseTitle: item.cached_title ?? 'Uten tittel',
            track: 'endringsordre' as const,
            role: needsResponse ? ('TE' as const) : ('BH' as const),
            title: needsResponse ? 'Les endringsordren' : 'Følg opp bestridt endringsordre',
            detail: needsResponse
              ? item.endringsordre_data?.relaterte_koe_saker.length
                ? 'Åpne endringsordren for å se enigheten som er formalisert, vederlaget og fristen.'
                : 'Åpne endringsordren for å se pålegget, vederlaget og fristen.'
              : 'Entreprenøren har bestridt endringsordren. Les merknadene og vurder videre oppfølging.',
          },
        ];
      })
  );
  const tasks = $derived(
    [...claimCases.flatMap(caseFollowUp), ...orderTasks].filter((task) => task.role === role)
  );
  const missing = $derived(claimCases.filter((item) => !item.oppfolging).length);
  const caseCount = $derived(new Set(tasks.map((task) => task.caseId)).size);
  const labels = {
    ansvar: 'Grunnlag',
    vederlag: 'Vederlag',
    frist: 'Frist',
    endringsordre: 'Endringsordre',
  };
</script>

<section class="work-queue" aria-labelledby="queue-title">
  <header>
    <div>
      <p class="eyebrow">{role === 'BH' ? 'Byggherrens' : 'Entreprenørens'} arbeidsliste</p>
      <h2 id="queue-title">Dette trenger din oppfølging</h2>
      <p class="queue-count" role="status">
        {tasks.length}
        {tasks.length === 1 ? 'handling' : 'handlinger'} i {caseCount}
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
  {#if missing}<p class="incomplete" role="status">
      Oppfølgingsgrunnlaget mangler for {missing}
      {missing === 1 ? 'sak' : 'saker'}. Listen kan være ufullstendig.
    </p>{/if}
  {#each showAll ? tasks : tasks.slice(0, 3) as task (task.id)}
    <div class="task-row">
      <div class="task-copy">
        <p class="case-label">{task.caseId} · {task.caseTitle}</p>
        <h3>{task.title}</h3>
        <p class="detail">{task.detail}</p>
      </div>
      <div class="task-actions">
        <span class="track-label">{labels[task.track]}</span><a
          href={task.track === 'endringsordre'
            ? `${demo ? '/mockup/endringsordre' : `/${encodeURIComponent(projectId)}`}/${encodeURIComponent(task.caseId)}?rolle=${role}`
            : taskHref(task, projectId, scenarios[task.caseId])}
          aria-label={`${task.title} – ${task.caseId}`}>Følg opp <ArrowRight size={15} /></a
        >
      </div>
    </div>
  {:else}<p class="empty">
      {missing
        ? 'Ingen handlinger funnet i sakene som kunne leses.'
        : 'Ingen registrerte oppfølgingsbehov for denne rollen.'}
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
  .empty,
  .incomplete {
    padding: 16px 24px;
    margin: 0;
    color: var(--color-ink-muted);
    font-size: 12px;
    line-height: 1.6;
  }
  .incomplete {
    background: var(--color-canvas);
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
