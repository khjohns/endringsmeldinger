<script lang="ts">
	import type { SakState, TimelineEvent, SporType, SporStatus } from '$lib/types/timeline';
	import { extractSpor } from '$lib/types/timeline';
	import Sporkort from './Sporkort.svelte';

	interface Props {
		state: SakState;
		timeline: TimelineEvent[];
		prosjektId: string;
		sakId: string;
		onFocusEvent?: (event: TimelineEvent | null) => void;
	}

	let { state, timeline, prosjektId, sakId, onFocusEvent }: Props = $props();

	// Group timeline events by track
	const eventsBySpor = $derived.by(() => {
		const map: Record<SporType, TimelineEvent[]> = {
			grunnlag: [],
			vederlag: [],
			frist: [],
		};
		for (const event of timeline) {
			const spor = event.spor ?? extractSpor(event.type);
			if (spor && map[spor]) {
				map[spor].push(event);
			}
		}
		return map;
	});

	// Norwegian month names (full + abbreviated)
	const MONTH_NAMES = [
		'januar', 'februar', 'mars', 'april', 'mai', 'juni',
		'juli', 'august', 'september', 'oktober', 'november', 'desember',
	];
	const MONTH_SHORT = [
		'jan', 'feb', 'mar', 'apr', 'mai', 'jun',
		'jul', 'aug', 'sep', 'okt', 'nov', 'des',
	];

	// Norwegian timezone
	const TZ = 'Europe/Oslo';

	function toLocalDate(dateStr: string): Date {
		return new Date(new Date(dateStr).toLocaleString('sv-SE', { timeZone: TZ }));
	}

	function localDateKey(dateStr: string): string {
		const d = toLocalDate(dateStr);
		return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
	}

	function formatDateLabel(dateStr: string): string {
		const d = toLocalDate(dateStr);
		const now = toLocalDate(new Date().toISOString());

		const todayKey = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
		const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

		if (key === todayKey) return `I dag, ${d.getDate()}. ${MONTH_SHORT[d.getMonth()]}`;

		// eslint-disable-next-line svelte/prefer-svelte-reactivity
		const yesterday = new Date(now);
		yesterday.setDate(yesterday.getDate() - 1);
		const yesterdayKey = `${yesterday.getFullYear()}-${yesterday.getMonth()}-${yesterday.getDate()}`;
		if (key === yesterdayKey) return 'I går';

		return `${d.getDate()}. ${MONTH_NAMES[d.getMonth()]}`;
	}

	interface TrackCard {
		spor: SporType;
		label: string;
		status: SporStatus;
		siste_oppdatert: string | undefined;
		href: string;
	}

	// Build track list from state
	const tracks = $derived<TrackCard[]>([
		{
			spor: 'grunnlag',
			label: 'Ansvarsgrunnlag',
			status: state.grunnlag.status,
			siste_oppdatert: state.grunnlag.siste_oppdatert,
			href: `/${prosjektId}/${sakId}/grunnlag`,
		},
		{
			spor: 'vederlag',
			label: 'Vederlagskrav',
			status: state.vederlag.status,
			siste_oppdatert: state.vederlag.siste_oppdatert,
			href: `/${prosjektId}/${sakId}/vederlag`,
		},
		{
			spor: 'frist',
			label: 'Fristkrav',
			status: state.frist.status,
			siste_oppdatert: state.frist.siste_oppdatert,
			href: `/${prosjektId}/${sakId}/frist`,
		},
	]);

	// Filter out irrelevant tracks and sort newest first
	const activeTracks = $derived(
		tracks
			.filter((t) => t.status !== 'ikke_relevant' && t.siste_oppdatert)
			.sort((a, b) => {
				const aTime = a.siste_oppdatert ? new Date(a.siste_oppdatert).getTime() : 0;
				const bTime = b.siste_oppdatert ? new Date(b.siste_oppdatert).getTime() : 0;
				return bTime - aTime;
			})
	);

	// Group by date
	interface DateGroup {
		label: string;
		dateKey: string;
		tracks: TrackCard[];
	}

	function buildDateGroups(tracks: TrackCard[]): DateGroup[] {
		// eslint-disable-next-line svelte/prefer-svelte-reactivity
		const groups = new Map<string, DateGroup>();
		for (const track of tracks) {
			if (!track.siste_oppdatert) continue;
			const key = localDateKey(track.siste_oppdatert);
			if (!groups.has(key)) {
				groups.set(key, {
					label: formatDateLabel(track.siste_oppdatert),
					dateKey: key,
					tracks: [],
				});
			}
			groups.get(key)!.tracks.push(track);
		}
		return Array.from(groups.values());
	}

	const dateGroups = $derived(buildDateGroups(activeTracks));
</script>

<div class="document-area" role="list">
	{#each dateGroups as group (group.dateKey)}
		<div class="date-group" role="listitem">
			<div class="date-divider">
				<span class="date-text">{group.label}</span>
			</div>

			<div class="spor-list">
				{#each group.tracks as track (track.spor)}
					<Sporkort
						sporType={track.spor}
						{state}
						events={eventsBySpor[track.spor]}
						{prosjektId}
						{sakId}
						{onFocusEvent}
					/>
				{/each}
			</div>
		</div>
	{/each}
</div>

<style>
	.document-area {
		display: flex;
		flex-direction: column;
		gap: 24px;
		width: 100%;
		max-width: 820px;
		margin: 0 auto;
		padding: 32px 32px 120px 32px;
	}

	.date-group {
		display: flex;
		flex-direction: column;
	}

	.date-divider {
		display: flex;
		align-items: center;
		gap: 16px;
		margin-bottom: 12px;
	}

	.date-divider::after {
		content: '';
		flex: 1;
		height: 1px;
		background: var(--color-wire);
	}

	.date-text {
		font-family: var(--font-data);
		font-size: 10px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--color-ink-muted);
		white-space: nowrap;
	}

	.spor-list {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	@media (max-width: 1023px) {
		.document-area {
			padding: 16px 0 80px 0;
			gap: 16px;
		}

		.spor-list {
			gap: 12px;
		}

		.date-divider {
			margin-bottom: 8px;
		}
	}
</style>
