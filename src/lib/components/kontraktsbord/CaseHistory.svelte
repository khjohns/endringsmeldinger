<script lang="ts">
  import { FileText, History } from 'lucide-svelte';
  import { getEventTypeLabel } from '$lib/constants/eventTypeLabels';
  import { activityDate } from '$lib/components/saksoversikt/activity';
  import type { TimelineEvent } from '$lib/types/timeline';
  import type { SporKey } from './types';
  let {
    events,
    sel,
    activeEvent = null,
    oneventclick,
    onletterclick,
  }: {
    events: TimelineEvent[];
    sel: SporKey;
    activeEvent?: TimelineEvent | null;
    oneventclick?: (event: TimelineEvent) => void;
    onletterclick?: (event: TimelineEvent) => void;
  } = $props();
  let scope = $state<'track' | 'case'>('track');
  const selectedTrack = $derived(sel === 'ansvar' ? 'grunnlag' : sel);
  const labels: Record<string, string> = {
    grunnlag: 'Grunnlag',
    vederlag: 'Vederlag',
    frist: 'Frist',
  };
  function trackOf(event: TimelineEvent) {
    if (event.spor) return event.spor;
    const type = event.type.replace('no.oslo.koe.', '');
    return Object.keys(labels).find(
      (track) => type.startsWith(track + '_') || type.startsWith('respons_' + track)
    );
  }
  const items = $derived(
    events
      .map((event, index) => {
        const parsed = event.time ? Date.parse(event.time) : NaN;
        const title = getEventTypeLabel(event.type.replace('no.oslo.koe.', ''));
        const summary = event.summary?.trim();
        const normalized = (text: string) =>
          text
            .toLocaleLowerCase('nb-NO')
            .replace(/\s+av (te|bh)\.?$/i, '')
            .replace(/[.!]$/, '')
            .trim();
        const responseVersion =
          event.data && 'respondert_versjon' in event.data
            ? event.data.respondert_versjon
            : undefined;
        return {
          event,
          index,
          track: trackOf(event),
          timestamp: Number.isFinite(parsed) ? parsed : null,
          title,
          detail: summary && normalized(summary) !== normalized(title) ? summary : null,
          version:
            typeof responseVersion === 'number' &&
            Number.isInteger(responseVersion) &&
            responseVersion >= 0
              ? responseVersion + 1
              : null,
        };
      })
      .filter((item) => scope === 'case' || item.track === selectedTrack)
      .sort((a, b) => (b.timestamp ?? -Infinity) - (a.timestamp ?? -Infinity) || b.index - a.index)
  );
</script>

<section class="case-history" aria-label="Sakshistorikk">
  <div class="scope" role="group" aria-label="Vis historikk for">
    <button aria-pressed={scope === 'track'} onclick={() => (scope = 'track')}>Dette sporet</button>
    <button aria-pressed={scope === 'case'} onclick={() => (scope = 'case')}>Hele saken</button>
  </div>
  <p class="history-caption" role="status">
    {scope === 'track' ? labels[selectedTrack] : 'Hele saken'} · nyeste først
  </p>
  <ol>
    {#each items as item (item.event.id)}
      <li class:active={activeEvent?.id === item.event.id}>
        <span
          class="marker"
          aria-label={item.event.actorrole === 'TE'
            ? 'Entreprenør'
            : item.event.actorrole === 'BH'
              ? 'Byggherre'
              : 'Rolle ikke oppgitt'}
          >{#if item.event.actorrole}{item.event.actorrole}{:else}<History
              size={15}
              aria-hidden="true"
            />{/if}</span
        >
        <div class="event-copy">
          <div class="event-meta">
            {#if item.timestamp != null}<time datetime={item.event.time}
                >{activityDate(item.timestamp)}</time
              >{:else}<span>Dato ikke oppgitt</span>{/if}
          </div>
          {#if oneventclick}<button
              class="event-title"
              aria-pressed={activeEvent?.id === item.event.id}
              onclick={() => oneventclick?.(item.event)}>{item.title}</button
            >{:else}<h3>{item.title}</h3>{/if}
          {#if scope === 'case'}<span
              class="track"
              class:current-track={item.track === selectedTrack}
              >{item.track ? labels[item.track] : 'Sak'}</span
            >{/if}
          {#if item.version != null}<p class="version">Svar på versjon {item.version}</p>{/if}
          {#if item.detail}<p class="event-detail">{item.detail}</p>{/if}
          {#if onletterclick}<button
              class="letter"
              aria-label={`Vis brev: ${item.title}`}
              onclick={() => onletterclick?.(item.event)}
              ><FileText size={13} aria-hidden="true" /> Vis brev</button
            >{/if}
        </div>
      </li>
    {:else}<li class="empty">
        {scope === 'track'
          ? 'Ingen registrerte hendelser på dette sporet ennå.'
          : 'Ingen registrerte hendelser i saken ennå.'}
      </li>{/each}
  </ol>
</section>

<style>
  .case-history {
    font-family: var(--font-ui, var(--font-sans));
    color: var(--ink);
  }
  .scope {
    display: flex;
    gap: 3px;
    padding: 3px;
    background: var(--surface-inset);
    border: var(--rule);
    border-radius: 8px;
  }
  .scope button {
    flex: 1;
    padding: 9px 8px;
    border: 0;
    border-radius: 5px;
    background: transparent;
    color: var(--ink-3);
    font: inherit;
    font-size: 12px;
    font-weight: 550;
    cursor: pointer;
  }
  .scope button[aria-pressed='true'] {
    background: var(--surface);
    color: var(--ink);
    box-shadow: 0 1px 3px #0000000d;
  }
  .history-caption {
    color: var(--ink-3);
    margin: 14px 0 24px;
    font-size: 11px;
  }
  ol {
    list-style: none;
    padding: 0;
    margin: 0;
  }
  li {
    position: relative;
    display: flex;
    gap: 12px;
    padding: 0 0 24px;
  }
  li:not(:last-child)::before {
    content: '';
    position: absolute;
    left: 15px;
    top: 30px;
    bottom: 0;
    width: 1px;
    background: var(--wire, var(--color-wire, #dce3dd));
  }
  .marker {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 30px;
    height: 30px;
    flex: 0 0 30px;
    border-radius: 50%;
    background: var(--surface-inset);
    color: var(--ink-2);
    font-size: 10px;
    font-weight: 650;
  }
  .event-copy {
    flex: 1;
    min-width: 0;
    border-radius: 6px;
  }
  .active .event-copy {
    background: var(--surface-inset);
    box-shadow: -3px 0 0 var(--brand);
    padding: 10px;
  }
  .event-meta {
    color: var(--ink-3);
    font-size: 11px;
    line-height: 1.5;
    margin-bottom: 5px;
  }
  .event-title,
  h3 {
    margin: 0;
    padding: 0;
    font: inherit;
    font-size: 13px;
    font-weight: 600;
    line-height: 1.5;
    color: var(--ink);
    text-align: left;
  }
  .event-title {
    background: transparent;
    border: 0;
    cursor: pointer;
  }
  .event-title:hover {
    text-decoration: underline;
    text-underline-offset: 3px;
  }
  .track {
    display: table;
    font-size: 10px;
    color: var(--ink-3);
    margin-top: 6px;
    padding: 2px 6px;
    border-radius: 4px;
    border: var(--rule-subtle);
  }
  .current-track {
    background: var(--surface-inset);
    color: var(--ink-2);
  }
  .version {
    margin: 6px 0 0;
    color: var(--ink-3);
    font-size: 11px;
  }
  .event-detail {
    margin: 7px 0 0;
    font-size: 12px;
    line-height: 1.65;
    color: var(--ink-2);
    overflow-wrap: anywhere;
  }
  .letter {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    margin-top: 10px;
    padding: 5px 8px;
    border: var(--rule);
    border-radius: 5px;
    background: var(--surface);
    color: var(--ink-2);
    font: inherit;
    font-size: 11px;
    cursor: pointer;
  }
  .letter:hover {
    background: var(--surface-inset);
  }
  button:focus-visible {
    outline: 2px solid var(--control-focus);
    outline-offset: 3px;
  }
  .empty {
    font-size: 12px;
    color: var(--ink-3);
    line-height: 1.6;
  }
</style>
