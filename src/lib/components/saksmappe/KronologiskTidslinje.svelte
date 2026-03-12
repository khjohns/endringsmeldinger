<script lang="ts">
	import type { SakState, TimelineEvent, SporType, EventType } from '$lib/types/timeline';
	import { extractEventType, extractSpor } from '$lib/types/timeline';
	import { getEventTypeLabel } from '$lib/constants/eventLabels';
	import { getPartsNavn } from '$lib/utils/partsNavn';
	import { formatCurrency } from '$lib/utils/formatters';
	import type { SporFilter } from './VisningstToggle.svelte';

	interface Props {
		sakState: SakState;
		timeline: TimelineEvent[];
		sporFilter: SporFilter;
		onFocusEvent?: (event: TimelineEvent | null) => void;
	}

	let { sakState, timeline, sporFilter, onFocusEvent }: Props = $props();

	// --- Spor-type mapping from filter keys ---
	const FILTER_TO_SPOR: Record<string, SporType> = {
		K: 'grunnlag',
		V: 'vederlag',
		F: 'frist',
	};

	const SPOR_TO_FILTER: Record<SporType, 'K' | 'V' | 'F'> = {
		grunnlag: 'K',
		vederlag: 'V',
		frist: 'F',
	};

	// --- Track colors ---
	const SPOR_COLORS: Record<SporType, string> = {
		grunnlag: 'var(--color-ink-muted)',
		vederlag: 'var(--color-vekt)',
		frist: 'var(--color-score-low)',
	};

	const SPOR_LETTERS: Record<SporType, string> = {
		grunnlag: 'K',
		vederlag: 'V',
		frist: 'F',
	};

	// --- Norwegian date formatting ---
	const TZ = 'Europe/Oslo';
	const MONTH_SHORT = ['jan', 'feb', 'mar', 'apr', 'mai', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'des'];

	function toLocalDate(dateStr: string): Date {
		return new Date(new Date(dateStr).toLocaleString('sv-SE', { timeZone: TZ }));
	}

	function localDateKey(dateStr: string): string {
		const d = toLocalDate(dateStr);
		return `${d.getFullYear()}-${String(d.getMonth()).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
	}

	function formatDateCompact(dateStr: string): string {
		const d = toLocalDate(dateStr);
		return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getFullYear()).slice(2)}`;
	}

	// --- Event data extraction ---

	interface NodeData {
		id: string;
		event: TimelineEvent;
		spor: SporType;
		sporLetter: string;
		sporColor: string;
		actor: 'TE' | 'BH';
		isBH: boolean;
		label: string;
		actorName: string;
		revision: number | null; // null = rev 0 (original), 1+ for revisions
		value: number | null; // beløp or dager
		valueLabel: string | null;
		isResponse: boolean;
		version: number | null; // for entanglement matching
		date: string;
	}

	function extractNodeData(ev: TimelineEvent): NodeData | null {
		const spor = ev.spor ?? extractSpor(ev.type);
		if (!spor) return null;

		const eventType = extractEventType(ev.type);
		const actor: 'TE' | 'BH' = (ev.actorrole as 'TE' | 'BH') ?? 'TE';
		const data = ev.data as Record<string, unknown> | undefined;

		// Revision: respondert_versjon for responses, or versjon for claims
		let revision: number | null = null;
		let version: number | null = null;
		if (data) {
			if ('respondert_versjon' in data && typeof data.respondert_versjon === 'number') {
				version = data.respondert_versjon;
				revision = data.respondert_versjon > 0 ? data.respondert_versjon : null;
			} else if ('versjon' in data && typeof data.versjon === 'number') {
				version = (data.versjon as number) - 1; // 0-indexed
				revision = version > 0 ? version : null;
			}
		}

		// Value: beløp for vederlag, dager for frist
		let value: number | null = null;
		let valueLabel: string | null = null;
		if (spor === 'vederlag' && data) {
			const belop = (data.godkjent_belop ?? data.krevd_belop ?? data.netto_belop ?? data.belop_direkte) as number | undefined;
			if (belop != null) {
				value = belop;
				valueLabel = belop > 0 ? `${formatCurrency(belop)}` : 'Avvist (0)';
			}
		}
		if (spor === 'frist' && data) {
			const dager = (data.godkjent_dager ?? data.krevd_dager) as number | undefined;
			if (dager != null) {
				value = dager;
				valueLabel = dager > 0 ? `${dager} dager` : 'Avvist (0)';
			}
		}

		const isResponse = eventType ? eventType.startsWith('respons_') : false;
		const label = ev.summary ?? getEventTypeLabel(eventType);

		return {
			id: ev.id,
			event: ev,
			spor,
			sporLetter: SPOR_LETTERS[spor],
			sporColor: SPOR_COLORS[spor],
			actor,
			isBH: actor === 'BH',
			label,
			actorName: getPartsNavn(actor, sakState.entreprenor, sakState.byggherre),
			revision,
			value,
			valueLabel,
			isResponse,
			version,
			date: ev.time ?? '',
		};
	}

	// --- Max values for proportional bar sizing ---
	const maxVederlag = $derived.by(() => {
		let max = 0;
		for (const ev of timeline) {
			const spor = ev.spor ?? extractSpor(ev.type);
			if (spor !== 'vederlag') continue;
			const d = ev.data as Record<string, unknown> | undefined;
			if (!d) continue;
			const v = (d.krevd_belop ?? d.netto_belop ?? d.belop_direkte ?? d.godkjent_belop) as number | undefined;
			if (v != null && v > max) max = v;
		}
		return max || 1;
	});

	const maxFrist = $derived.by(() => {
		let max = 0;
		for (const ev of timeline) {
			const spor = ev.spor ?? extractSpor(ev.type);
			if (spor !== 'frist') continue;
			const d = ev.data as Record<string, unknown> | undefined;
			if (!d) continue;
			const v = (d.krevd_dager ?? d.godkjent_dager) as number | undefined;
			if (v != null && v > max) max = v;
		}
		return max || 1;
	});

	function getBarWidth(spor: SporType, value: number | null): number {
		if (value == null || value <= 0) return 4;
		if (spor === 'vederlag') return Math.min(Math.max((value / maxVederlag) * 180, 4), 200);
		if (spor === 'frist') return Math.min(Math.max((value / maxFrist) * 120, 4), 150);
		return 0;
	}

	// --- Build sorted, filtered node list ---
	const allNodes = $derived.by(() => {
		const nodes: NodeData[] = [];
		for (const ev of timeline) {
			if (!ev.time) continue;
			const node = extractNodeData(ev);
			if (!node) continue;
			// Apply spor filter
			const filterKey = SPOR_TO_FILTER[node.spor];
			if (!sporFilter[filterKey]) continue;
			nodes.push(node);
		}
		// Sort oldest first (natural chronological order, scroll down = newer)
		nodes.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
		return nodes;
	});

	// --- Group by date ---
	interface DateGroup {
		dateKey: string;
		dateLabel: string;
		nodes: NodeData[];
	}

	const dateGroups = $derived.by(() => {
		const groups = new Map<string, DateGroup>();
		for (const node of allNodes) {
			const key = localDateKey(node.date);
			if (!groups.has(key)) {
				groups.set(key, {
					dateKey: key,
					dateLabel: formatDateCompact(node.date),
					nodes: [],
				});
			}
			groups.get(key)!.nodes.push(node);
		}
		return Array.from(groups.values());
	});

	// --- Future nodes ---
	interface FutureNodeData {
		id: string;
		spor: SporType;
		sporLetter: string;
		sporColor: string;
		targetId: string; // the unanswered event this is linked to
		label: string;
		actorName: string;
	}

	const futureNodes = $derived.by(() => {
		const futures: FutureNodeData[] = [];

		// For each track that's awaiting response, generate a future node
		const tracks: { spor: SporType; status: string; antall_versjoner: number }[] = [
			{ spor: 'grunnlag', ...sakState.grunnlag },
			{ spor: 'vederlag', ...sakState.vederlag },
			{ spor: 'frist', ...sakState.frist },
		];

		for (const track of tracks) {
			const filterKey = SPOR_TO_FILTER[track.spor];
			if (!sporFilter[filterKey]) continue;

			if (track.status === 'sendt' || track.status === 'under_behandling' || track.status === 'delvis_godkjent') {
				// Find the latest unanswered event for this track
				const latestEvent = allNodes.filter(n => n.spor === track.spor && n.actor === 'TE').at(-1);
				if (!latestEvent) continue;

				const rev = track.antall_versjoner > 1 ? ` (Rev ${track.antall_versjoner - 1})` : '';
				futures.push({
					id: `future-${track.spor}`,
					spor: track.spor,
					sporLetter: SPOR_LETTERS[track.spor],
					sporColor: SPOR_COLORS[track.spor],
					targetId: latestEvent.id,
					label: `på ${latestEvent.label}${rev}`,
					actorName: getPartsNavn('BH', sakState.entreprenor, sakState.byggherre),
				});
			}
		}
		return futures;
	});

	// --- Entanglement state ---
	let activeNodeId = $state<string | null>(null);
	let entangledIds = $state<Set<string>>(new Set());

	function findEntangledNodes(nodeId: string): Set<string> {
		const linked = new Set<string>();

		// Check if this is a future node
		if (nodeId.startsWith('future-')) {
			const futureNode = futureNodes.find(fn => fn.id === nodeId);
			if (futureNode) linked.add(futureNode.targetId);
			return linked;
		}

		// Check if any future node points to this
		for (const fn of futureNodes) {
			if (fn.targetId === nodeId) linked.add(fn.id);
		}

		// Find krav-svar pairs by matching spor + version
		const clickedNode = allNodes.find(n => n.id === nodeId);
		if (clickedNode && clickedNode.version != null) {
			for (const node of allNodes) {
				if (node.id === nodeId) continue;
				if (node.spor !== clickedNode.spor) continue;
				if (node.version !== clickedNode.version) continue;
				// One is TE, one is BH — they're a pair
				if (node.actor !== clickedNode.actor) {
					linked.add(node.id);
				}
			}
		}

		return linked;
	}

	function handleNodeClick(nodeId: string, event?: TimelineEvent | null) {
		activeNodeId = nodeId;
		entangledIds = new Set([nodeId, ...findEntangledNodes(nodeId)]);
		if (event) onFocusEvent?.(event);
	}

	function handleNodeHover(nodeId: string) {
		entangledIds = new Set([nodeId, ...findEntangledNodes(nodeId)]);
	}

	function handleNodeLeave() {
		if (activeNodeId) {
			entangledIds = new Set([activeNodeId, ...findEntangledNodes(activeNodeId)]);
		} else {
			entangledIds = new Set();
		}
	}

	function isEntangled(nodeId: string): boolean {
		return entangledIds.has(nodeId);
	}

	// --- Horizon ref for auto-scroll ---
	let horizonRef = $state<HTMLDivElement | null>(null);

	import { onMount } from 'svelte';
	onMount(() => {
		horizonRef?.scrollIntoView({ behavior: 'smooth', block: 'center' });
	});
</script>

<div class="tidslinje-container">
	<div class="tidslinje-akse" aria-hidden="true"></div>

	<div class="tidslinje-innhold">
		<!-- HISTORISKE HENDELSER -->
		{#each dateGroups as group (group.dateKey)}
			<div class="dato-gruppe">
				<div class="dato-label">
					<span class="dato-tekst">{group.dateLabel}</span>
				</div>

				{#each group.nodes as node (node.id)}
					{@const isRight = node.spor === 'vederlag'}
					{@const isLeft = node.spor === 'frist'}
					{@const isCenter = node.spor === 'grunnlag'}
					{@const barWidth = getBarWidth(node.spor, node.value)}
					{@const entangled = isEntangled(node.id)}
					{@const isActive = activeNodeId === node.id}

					<!-- svelte-ignore a11y_no_static_element_interactions -->
					<div
						class="node-rad"
						class:node-rad-entangled={entangled && !isActive}
						onmouseenter={() => handleNodeHover(node.id)}
						onmouseleave={handleNodeLeave}
					>
						<!-- VENSTRE SIDE (frist) -->
						<div class="node-side node-side-venstre">
							{#if isLeft}
								<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
								<div class="node-info node-info-venstre" onclick={() => handleNodeClick(node.id, node.event)}>
									<div class="info-tekst info-tekst-right">
										<span class="aktor-badge" class:aktor-bh={node.isBH}>{node.actorName}</span>
										<span class="verdi-tekst" class:verdi-aktiv={entangled || isActive}>{node.valueLabel ?? ''}</span>
										<span class="dok-ref">{node.label}{#if node.revision} (Rev {node.revision}){/if}</span>
									</div>
									<div
										class="bar bar-venstre"
										class:bar-dashed={node.isBH}
										style="width: {barWidth}px; {node.isBH ? `border-color: ${node.sporColor}` : `background-color: ${node.sporColor}`}"
									></div>
								</div>
							{/if}
						</div>

						<!-- SENTER NODE -->
						<button
							class="senter-node"
							class:senter-node-bh={node.isBH}
							class:senter-node-active={isActive || entangled}
							class:senter-node-entangled={entangled && !isActive}
							style="--spor-color: {node.sporColor}"
							onclick={() => handleNodeClick(node.id, node.event)}
						>
							{node.sporLetter}
						</button>

						<!-- HØYRE SIDE (vederlag + grunnlag label) -->
						<div class="node-side node-side-hoyre">
							{#if isRight}
								<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
								<div class="node-info node-info-hoyre" onclick={() => handleNodeClick(node.id, node.event)}>
									<div
										class="bar bar-hoyre"
										class:bar-dashed={node.isBH}
										style="width: {barWidth}px; {node.isBH ? `border-color: ${node.sporColor}` : `background-color: ${node.sporColor}`}"
									></div>
									<div class="info-tekst">
										<span class="aktor-badge" class:aktor-bh={node.isBH}>{node.actorName}</span>
										<span class="verdi-tekst" class:verdi-aktiv={entangled || isActive}>{node.valueLabel ?? ''}</span>
										<span class="dok-ref">{node.label}{#if node.revision} (Rev {node.revision}){/if}</span>
									</div>
								</div>
							{/if}
							{#if isCenter}
								<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
								<div class="node-info node-info-hoyre node-info-center" onclick={() => handleNodeClick(node.id, node.event)}>
									<div class="info-tekst">
										<span class="aktor-badge" class:aktor-bh={node.isBH}>{node.actorName}</span>
										<span class="dok-ref">{node.label}{#if node.revision} (Rev {node.revision}){/if}</span>
									</div>
								</div>
							{/if}
						</div>
					</div>
				{/each}
			</div>
		{/each}

		<!-- I DAG / HORIZON -->
		<div class="horisont" bind:this={horizonRef}>
			<div class="horisont-linje"></div>
			<div class="horisont-label">I DAG</div>
			<div class="horisont-linje horisont-linje-dashed"></div>
			<button class="ghost-node" title="Opprett ny hendelse">+</button>
		</div>

		<!-- FUTURE NODES (ACTION ZONE) -->
		{#if futureNodes.length > 0}
			<div class="future-zone">
				{#each futureNodes as fn (fn.id)}
					{@const isRight = fn.spor === 'vederlag'}
					{@const isLeft = fn.spor === 'frist'}
					{@const entangled = isEntangled(fn.id)}

					<!-- svelte-ignore a11y_no_static_element_interactions -->
					<div
						class="node-rad node-rad-future"
						class:node-rad-entangled={entangled}
						onmouseenter={() => handleNodeHover(fn.id)}
						onmouseleave={handleNodeLeave}
					>
						<!-- VENSTRE -->
						<div class="node-side node-side-venstre">
							{#if isLeft}
								<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
								<div class="node-info node-info-venstre" onclick={() => handleNodeClick(fn.id)}>
									<div class="info-tekst info-tekst-right">
										<span class="aktor-badge aktor-bh">{fn.actorName}</span>
										<span class="verdi-tekst verdi-muted" class:verdi-aktiv={entangled}>Forventet svar</span>
										<span class="dok-ref dok-ref-ghost">{fn.label}</span>
									</div>
									<div class="bar bar-venstre bar-dashed" style="width: 48px; border-color: {fn.sporColor}"></div>
								</div>
							{/if}
						</div>

						<!-- SENTER -->
						<button
							class="senter-node senter-node-future"
							class:senter-node-entangled={entangled}
							style="--spor-color: {fn.sporColor}"
							onclick={() => handleNodeClick(fn.id)}
						>
							{fn.sporLetter}
						</button>

						<!-- HØYRE -->
						<div class="node-side node-side-hoyre">
							{#if isRight}
								<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
								<div class="node-info node-info-hoyre" onclick={() => handleNodeClick(fn.id)}>
									<div class="bar bar-hoyre bar-dashed" style="width: 48px; border-color: {fn.sporColor}"></div>
									<div class="info-tekst">
										<span class="aktor-badge aktor-bh">{fn.actorName}</span>
										<span class="verdi-tekst verdi-muted" class:verdi-aktiv={entangled}>Forventet svar</span>
										<span class="dok-ref dok-ref-ghost">{fn.label}</span>
									</div>
								</div>
							{/if}
							{#if fn.spor === 'grunnlag'}
								<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
								<div class="node-info node-info-hoyre node-info-center" onclick={() => handleNodeClick(fn.id)}>
									<div class="info-tekst">
										<span class="aktor-badge aktor-bh">{fn.actorName}</span>
										<span class="verdi-tekst verdi-muted" class:verdi-aktiv={entangled}>Forventet svar</span>
										<span class="dok-ref dok-ref-ghost">{fn.label}</span>
									</div>
								</div>
							{/if}
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>
</div>

<style>
	.tidslinje-container {
		position: relative;
		width: 100%;
		max-width: 820px;
		margin: 0 auto;
		padding: 24px 32px 80px;
	}

	/* Central axis */
	.tidslinje-akse {
		position: absolute;
		top: 0;
		bottom: 0;
		left: 50%;
		width: 1px;
		background: var(--color-wire);
		transform: translateX(-0.5px);
		z-index: 0;
	}

	.tidslinje-innhold {
		position: relative;
		z-index: 1;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	/* Date group */
	.dato-gruppe {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.dato-label {
		display: flex;
		justify-content: center;
		position: relative;
	}

	.dato-tekst {
		font-family: var(--font-data);
		font-size: 9px;
		color: var(--color-ink-muted);
		background: var(--color-canvas);
		padding: 0 8px;
		z-index: 2;
	}

	/* Node row */
	.node-rad {
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 40px;
		position: relative;
		transition: opacity 150ms ease;
	}

	.node-rad:not(.node-rad-entangled):not(:hover) {
		opacity: 0.7;
	}

	.node-rad:hover,
	.node-rad-entangled {
		opacity: 1;
	}

	.node-rad-future {
		opacity: 0.8;
	}

	.node-rad-future:hover,
	.node-rad-future.node-rad-entangled {
		opacity: 1;
	}

	/* Side containers */
	.node-side {
		flex: 1;
		display: flex;
		align-items: center;
		min-width: 0;
	}

	.node-side-venstre {
		justify-content: flex-end;
		padding-right: 12px;
	}

	.node-side-hoyre {
		justify-content: flex-start;
		padding-left: 12px;
	}

	/* Center node (the square on the axis) */
	.senter-node {
		position: relative;
		z-index: 2;
		width: 24px;
		height: 24px;
		flex: none;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: var(--radius-sm);
		font-family: var(--font-data);
		font-size: 10px;
		font-weight: 700;
		background: var(--color-canvas);
		border: 1px solid var(--color-ink-muted);
		color: var(--color-ink);
		cursor: pointer;
		transition: all 150ms ease;
	}

	.senter-node-bh {
		border-style: dashed;
		color: var(--color-ink-muted);
	}

	.senter-node-active {
		border-color: var(--color-ink);
		background: var(--color-felt-raised);
		transform: scale(1.1);
		z-index: 10;
	}

	.senter-node-entangled {
		box-shadow: 0 0 0 2px var(--color-canvas), 0 0 0 4px var(--color-ink-secondary);
		z-index: 10;
	}

	.senter-node-future {
		border-style: dashed;
		border-color: var(--spor-color);
		color: var(--spor-color);
	}

	.senter-node:hover {
		border-color: var(--color-ink);
	}

	/* Node info block */
	.node-info {
		display: flex;
		align-items: center;
		gap: 8px;
		cursor: pointer;
	}

	.node-info-venstre {
		flex-direction: row-reverse;
	}

	.node-info-center {
		padding-left: 8px;
	}

	.info-tekst {
		display: flex;
		flex-direction: column;
		gap: 1px;
		min-width: 0;
	}

	.info-tekst-right {
		align-items: flex-end;
		text-align: right;
	}

	/* Actor badge */
	.aktor-badge {
		font-family: var(--font-data);
		font-size: 8px;
		padding: 1px 4px;
		border-radius: 1px;
		background: var(--color-ink-muted);
		color: var(--color-canvas);
		width: fit-content;
		line-height: 1.2;
	}

	.aktor-bh {
		background: transparent;
		border: 1px solid var(--color-ink-muted);
		color: var(--color-ink-muted);
	}

	/* Value text */
	.verdi-tekst {
		font-family: var(--font-data);
		font-size: 11px;
		color: var(--color-ink);
		white-space: nowrap;
	}

	.verdi-aktiv {
		color: var(--color-ink);
		font-weight: 700;
	}

	.verdi-muted {
		color: var(--color-ink-muted);
	}

	/* Document reference */
	.dok-ref {
		font-family: var(--font-ui);
		font-size: 10px;
		color: var(--color-ink-muted);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		max-width: 200px;
	}

	.dok-ref-ghost {
		color: var(--color-ink-ghost);
		font-size: 9px;
	}

	/* Bars */
	.bar {
		height: 14px;
		flex-shrink: 0;
		transition: width 200ms ease, opacity 150ms ease;
	}

	.bar-hoyre {
		border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
	}

	.bar-venstre {
		border-radius: var(--radius-sm) 0 0 var(--radius-sm);
	}

	.bar-dashed {
		background: transparent !important;
		border: 1px dashed;
	}

	/* Horizon */
	.horisont {
		position: relative;
		display: flex;
		flex-direction: column;
		align-items: center;
		margin: 16px 0;
		gap: 0;
	}

	.horisont-linje {
		width: 100%;
		height: 1px;
		background: var(--color-wire-focus);
	}

	.horisont-linje-dashed {
		background: none;
		border-top: 1px dashed var(--color-wire-focus);
	}

	.horisont-label {
		font-family: var(--font-data);
		font-size: 9px;
		font-weight: 700;
		color: var(--color-ink-muted);
		background: var(--color-canvas);
		border: 1px solid var(--color-wire-focus);
		padding: 2px 12px;
		border-radius: var(--radius-sm);
		z-index: 5;
		letter-spacing: 0.1em;
	}

	.ghost-node {
		position: absolute;
		right: -40px;
		top: 50%;
		transform: translateY(-50%);
		width: 24px;
		height: 24px;
		border: 1px dashed var(--color-ink-muted);
		background: var(--color-canvas);
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: var(--radius-sm);
		color: var(--color-ink-muted);
		font-size: 12px;
		cursor: pointer;
		z-index: 5;
		transition: all 150ms ease;
	}

	.ghost-node:hover {
		border-color: var(--color-ink);
		color: var(--color-ink);
	}

	/* Future zone */
	.future-zone {
		display: flex;
		flex-direction: column;
		gap: 12px;
		padding-top: 8px;
	}

	@media (max-width: 1023px) {
		.tidslinje-container {
			padding: 16px 12px 80px;
		}

		.dok-ref {
			max-width: 120px;
		}

		.ghost-node {
			display: none;
		}
	}
</style>
