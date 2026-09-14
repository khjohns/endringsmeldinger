import type { TimelineEvent } from '$lib/types/timeline';

/** Server streams carry commit order; legacy/demo streams only have timestamps. */
export function orderTimeline(events: TimelineEvent[]): TimelineEvent[] {
  const hasPositions = events.every((event) => Number.isFinite(event.streamposition));
  return [...events].sort((a, b) =>
    hasPositions
      ? a.streamposition! - b.streamposition!
      : (Date.parse(a.time ?? '') || 0) - (Date.parse(b.time ?? '') || 0)
  );
}
