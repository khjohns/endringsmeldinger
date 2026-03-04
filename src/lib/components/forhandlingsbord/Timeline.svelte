<script lang="ts">
	import type { SakState, TimelineEvent, SporType, SporStatus } from '$lib/types/timeline';

	interface Props {
		state: SakState;
		timeline: TimelineEvent[];
		prosjektId: string;
		sakId: string;
	}

	let { state, prosjektId, sakId }: Props = $props();

	// Norwegian month names
	const MONTH_NAMES = [
		'januar',
		'februar',
		'mars',
		'april',
		'mai',
		'juni',
		'juli',
		'august',
		'september',
		'oktober',
		'november',
		'desember',
	];

	// Norwegian timezone
	const TZ = 'Europe/Oslo';

	function toLocalDate(dateStr: string): Date {
		// Parse to Date and shift to Norwegian local date
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

		if (key === todayKey) return 'i dag';

		// eslint-disable-next-line svelte/prefer-svelte-reactivity
		const yesterday = new Date(now);
		yesterday.setDate(yesterday.getDate() - 1);
		const yesterdayKey = `${yesterday.getFullYear()}-${yesterday.getMonth()}-${yesterday.getDate()}`;
		if (key === yesterdayKey) return 'i går';

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

	// Opprettet date
	const opprettetLabel = $derived(
		state.opprettet ? formatDateLabel(state.opprettet) : null
	);

	const opprettetFormatted = $derived(
		state.opprettet
			? (() => {
					const d = toLocalDate(state.opprettet);
					return `${d.getDate()}. ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
				})()
			: null
	);

	// Status display labels
	const STATUS_LABELS: Record<SporStatus, string> = {
		ikke_relevant: 'Ikke relevant',
		utkast: 'Utkast',
		sendt: 'Sendt',
		under_behandling: 'Under behandling',
		godkjent: 'Godkjent',
		delvis_godkjent: 'Delvis godkjent',
		avslatt: 'Avslått',
		under_forhandling: 'Under forhandling',
		trukket: 'Trukket',
		laast: 'Låst',
	};

	function statusLabel(status: SporStatus): string {
		return STATUS_LABELS[status] ?? status;
	}
</script>

<div class="timeline">
	{#each dateGroups as group (group.dateKey)}
		<div class="date-group">
			<div class="date-marker">
				<div class="spine-segment"></div>
				<span class="date-label">{group.label}</span>
				<div class="date-rule"></div>
			</div>

			<div class="cards">
				{#each group.tracks as track (track.spor)}
					<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
					<a class="sporkort-placeholder" href={track.href}>
						<div class="sporkort-header">
							<span class="spor-label">{track.label}</span>
							<span class="spor-status" data-status={track.status}>
								{statusLabel(track.status)}
							</span>
						</div>
					</a>
				{/each}
			</div>
		</div>
	{/each}

	<!-- Sak opprettet — bunn av spine -->
	{#if opprettetLabel !== null}
		<div class="opprettet-group">
			<div class="spine-tail"></div>
			<div class="opprettet-marker">
				<span class="opprettet-dot" aria-hidden="true">○</span>
				<span class="opprettet-text">
					Sak opprettet av TE
					{#if opprettetFormatted}
						<span class="opprettet-dato">{opprettetFormatted}</span>
					{/if}
				</span>
			</div>
		</div>
	{/if}
</div>

<style>
	.timeline {
		display: flex;
		flex-direction: column;
		padding: 16px 0;
	}

	/* Date group */
	.date-group {
		display: flex;
		flex-direction: column;
	}

	/* Date marker row */
	.date-marker {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 12px 0 8px 0;
		margin-left: 20px;
	}

	.spine-segment {
		width: 1px;
		background: var(--color-wire-strong);
		align-self: stretch;
		margin-right: 8px;
	}

	.date-label {
		font-family: var(--font-ui);
		font-size: 11px;
		font-weight: 600;
		color: var(--color-ink-muted);
		text-transform: uppercase;
		letter-spacing: 0.06em;
		white-space: nowrap;
		flex-shrink: 0;
	}

	.date-rule {
		flex: 1;
		height: 1px;
		background: var(--color-wire);
	}

	/* Cards container */
	.cards {
		display: flex;
		flex-direction: column;
		gap: 8px;
		padding: 0 0 16px 20px;
		border-left: 1px solid var(--color-wire-strong);
		margin-left: 20px;
	}

	/* Sporkort placeholder (Task 5 will replace this) */
	.sporkort-placeholder {
		display: flex;
		flex-direction: column;
		background: var(--color-felt);
		border: 1px solid var(--color-wire-strong);
		border-radius: 4px;
		padding: 12px 14px;
		text-decoration: none;
		transition: background 120ms ease;
	}

	.sporkort-placeholder:hover {
		background: var(--color-felt-hover);
	}

	.sporkort-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
	}

	.spor-label {
		font-family: var(--font-ui);
		font-size: 13px;
		font-weight: 500;
		color: var(--color-ink);
	}

	.spor-status {
		font-family: var(--font-ui);
		font-size: 11px;
		color: var(--color-ink-muted);
		border: 1px solid var(--color-wire-strong);
		border-radius: 2px;
		padding: 1px 6px;
		white-space: nowrap;
	}

	.spor-status[data-status='sendt'] {
		color: #e8a838;
		border-color: rgba(232, 168, 56, 0.3);
	}

	.spor-status[data-status='godkjent'] {
		color: var(--color-score-high);
		border-color: rgba(61, 154, 110, 0.3);
	}

	.spor-status[data-status='avslatt'] {
		color: var(--color-score-low);
		border-color: rgba(196, 88, 88, 0.3);
	}

	.spor-status[data-status='delvis_godkjent'] {
		color: #e8a838;
		border-color: rgba(232, 168, 56, 0.3);
	}

	/* Opprettet marker at bottom */
	.opprettet-group {
		display: flex;
		flex-direction: column;
		margin-left: 20px;
	}

	.spine-tail {
		width: 1px;
		height: 16px;
		background: var(--color-wire-strong);
		margin-left: 0;
	}

	.opprettet-marker {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 4px 0 16px 0;
	}

	.opprettet-dot {
		font-size: 14px;
		color: var(--color-ink-ghost);
		line-height: 1;
		flex-shrink: 0;
	}

	.opprettet-text {
		font-family: var(--font-ui);
		font-size: 12px;
		color: var(--color-ink-muted);
		display: flex;
		align-items: center;
		gap: 6px;
	}

	.opprettet-dato {
		color: var(--color-ink-ghost);
	}
</style>
