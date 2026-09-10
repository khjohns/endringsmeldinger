<script lang="ts">
  import { Search, History, ArrowRight } from 'lucide-svelte';
  import type { CaseListItem } from '$lib/types/api';
  import type { Role } from '$lib/components/kontraktsbord/types';
  import { projectActivity, activityHref, activityDate } from './activity';
  let {
    cases,
    role,
    projectId,
    scenarios = {},
  }: {
    cases: CaseListItem[];
    role: Role;
    projectId: string;
    scenarios?: Record<string, string>;
  } = $props();
  let query = $state('');
  let track = $state('');
  let limit = $state(20);
  const events = $derived(projectActivity(cases, query, track));
  const labels = { K: 'Grunnlag', V: 'Vederlag', F: 'Frist' };
</script>

<section class="activity" aria-label="Prosjektets aktiviteter">
  <div class="toolbar">
    <label class="search"
      ><Search size={17} aria-hidden="true" /><input
        type="search"
        aria-label="Søk i aktivitetsloggen"
        placeholder="Søk etter sak eller hendelse"
        bind:value={query}
        oninput={() => (limit = 20)}
      /></label
    >
    <label class="track-filter"
      >Spor <select bind:value={track} onchange={() => (limit = 20)}
        ><option value="">Alle spor</option>{#each Object.entries(labels) as [value, label]}<option
            {value}>{label}</option
          >{/each}</select
      ></label
    >
  </div>
  <p class="count" role="status">
    {events.length}
    {events.length === 1 ? 'hendelse' : 'hendelser'} · nyeste først
  </p>
  <ol>
    {#each events.slice(0, limit) as event (event.key)}
      <li>
        <span
          class="actor"
          aria-label={event.rolle === 'BH'
            ? 'Byggherre'
            : event.rolle === 'TE'
              ? 'Entreprenør'
              : 'Rolle ikke oppgitt'}
          >{#if event.rolle}{event.rolle}{:else}<History size={19} aria-hidden="true" />{/if}</span
        >
        <div class="event-copy">
          <a href={activityHref(event, projectId, role, scenarios[event.caseId])}
            >{event.caseId} · {event.caseTitle}<ArrowRight size={14} aria-hidden="true" /></a
          >
          <p class="event-label">{event.label}</p>
          <div class="event-meta">
            <span>{labels[event.type]}</span><span aria-hidden="true">·</span
            >{#if event.timestamp != null}<time datetime={event.dato}
                >{activityDate(event.timestamp)}</time
              >{:else}<span>Dato ikke oppgitt</span>{/if}
          </div>
        </div>
      </li>
    {:else}
      <li class="empty">
        {query || track
          ? 'Ingen hendelser passer søket og utvalget.'
          : 'Ingen registrerte hendelser på grunnlag, vederlag eller frist ennå.'}
      </li>
    {/each}
  </ol>
  {#if events.length > limit}<footer>
      <button onclick={() => (limit += 20)}>Vis flere hendelser</button><span
        >Viser {Math.min(limit, events.length)} av {events.length}</span
      >
    </footer>{/if}
</section>

<style>
  .activity {
    background: var(--color-felt);
    border: 1px solid var(--color-wire);
    border-radius: 12px;
    overflow: hidden;
  }
  .toolbar {
    display: flex;
    align-items: center;
    gap: 24px;
    padding: 24px 28px 12px;
    flex-wrap: wrap;
  }
  .search {
    display: flex;
    align-items: center;
    gap: 10px;
    flex: 1;
    min-width: 200px;
    color: var(--color-ink-muted);
    border: 1px solid var(--color-wire-strong);
    border-radius: 7px;
    padding: 10px 12px;
  }
  input {
    width: 100%;
    min-width: 0;
    border: 0;
    background: transparent;
    color: var(--color-ink);
    font: inherit;
    font-size: 13px;
    outline: none;
  }
  .search:focus-within {
    outline: 2px solid var(--color-wire-focus);
    outline-offset: 2px;
  }
  .track-filter {
    display: flex;
    gap: 10px;
    align-items: center;
    font-size: 12px;
    color: var(--color-ink-muted);
  }
  select,
  button {
    padding: 10px 12px;
    background: var(--color-felt);
    color: var(--color-ink-secondary);
    border: 1px solid var(--color-wire-strong);
    border-radius: 7px;
    font: inherit;
    font-size: 12px;
  }
  .count {
    margin: 0;
    padding: 0 28px 20px;
    font-size: 12px;
    color: var(--color-ink-muted);
  }
  ol {
    list-style: none;
    padding: 0;
    margin: 0;
  }
  li {
    display: flex;
    align-items: flex-start;
    gap: 20px;
    padding: 26px 28px;
    border-top: 1px solid var(--color-wire);
  }
  .actor {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    flex-shrink: 0;
    border-radius: 50%;
    background: var(--color-vekt-bg);
    color: var(--color-vekt);
    font-size: 12px;
    font-weight: 650;
  }
  .event-copy {
    min-width: 0;
  }
  a {
    display: inline-flex;
    align-items: baseline;
    gap: 8px;
    color: var(--color-vekt);
    font-size: 13px;
    line-height: 1.6;
    text-underline-offset: 4px;
    overflow-wrap: anywhere;
  }
  a :global(svg) {
    flex-shrink: 0;
  }
  .event-label {
    margin: 8px 0 12px;
    font-size: 15px;
    color: var(--color-ink);
    line-height: 1.6;
  }
  .event-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    font-size: 12px;
    color: var(--color-ink-muted);
    line-height: 1.6;
  }
  .empty {
    font-size: 14px;
    color: var(--color-ink-muted);
  }
  footer {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 16px;
    padding: 20px;
    border-top: 1px solid var(--color-wire);
    color: var(--color-ink-muted);
    font-size: 12px;
  }
  button {
    cursor: pointer;
  }
  button:hover {
    background: var(--color-vekt-bg);
  }
  a:focus-visible,
  button:focus-visible,
  select:focus-visible {
    outline: 2px solid var(--color-wire-focus);
    outline-offset: 4px;
  }
  @media (max-width: 640px) {
    .toolbar {
      padding: 18px 18px 12px;
      gap: 12px;
    }
    .count {
      padding-left: 18px;
    }
    li {
      padding: 22px 18px;
      gap: 12px;
    }
    .actor {
      width: 32px;
      height: 32px;
    }
    .search {
      flex-basis: 100%;
    }
  }
</style>
