<script lang="ts">
	import RichTextEditor from '$lib/components/primitives/RichTextEditor.svelte';
	import { formatDateShortNorwegian } from '$lib/utils/dateFormatters';
	import { getPartsNavn } from '$lib/utils/partsNavn';
	import { GRUNNLAG_RESULTAT_LABELS } from '$lib/constants/responseOptions';

	interface BegrunnelseEntry {
		rolle: 'TE' | 'BH';
		versjon: number;
		html: string;
		dato?: string;
		resultat?: string;
	}

	interface Props {
		entries: BegrunnelseEntry[];
		bhBegrunnelseHtml: string;
		editorPlaceholder: string;
		editorRolle?: 'TE' | 'BH';
		teNavn?: string;
		bhNavn?: string;
		activeTab?: 'begrunnelse' | 'historikk' | 'filer';
		ontabchange?: (tab: 'begrunnelse' | 'historikk' | 'filer') => void;
	}

	let {
		entries,
		bhBegrunnelseHtml = $bindable(''),
		editorPlaceholder,
		editorRolle = 'BH',
		teNavn,
		bhNavn,
		activeTab = 'begrunnelse',
		ontabchange,
	}: Props = $props();

	const editorLabel = $derived(editorRolle === 'TE' ? 'Din reviderte begrunnelse' : 'Ditt svar');

	let collapsedEntries = $state<Set<number>>(new Set());

	function toggleEntry(index: number) {
		const next = new Set(collapsedEntries);
		if (next.has(index)) {
			next.delete(index);
		} else {
			next.add(index);
		}
		collapsedEntries = next;
	}

	const tabs = [
		{ id: 'begrunnelse' as const, label: 'Begrunnelse' },
		{ id: 'historikk' as const, label: 'Historikk' },
		{ id: 'filer' as const, label: 'Filer' },
	];

</script>

<aside class="begrunnelse-thread">
	<!-- Tabs -->
	<div class="thread-tabs" role="tablist">
		{#each tabs as tab}
			<button
				class="tab-btn"
				class:tab-active={activeTab === tab.id}
				role="tab"
				aria-selected={activeTab === tab.id}
				onclick={() => ontabchange?.(tab.id)}
			>
				{tab.label}
			</button>
		{/each}
	</div>

	{#if activeTab === 'begrunnelse'}
		<div class="thread-content">
			<!-- Editor (ren skriveflate) -->
			<section class="editor-section">
				<div class="editor-header">
					<h3 class="section-label">{editorLabel}</h3>
				</div>
				<RichTextEditor
					placeholder={editorPlaceholder}
					bind:html={bhBegrunnelseHtml}
					hint="Referer til kontraktsbestemmelser med §-tegn."
					maxHeight="none"
				/>
			</section>

			<!-- Vedlegg -->
			<section class="vedlegg-section">
				<div class="vedlegg-header">
					<h3 class="section-label">Vedlegg</h3>
				</div>
				<div class="upload-zone">
					<svg class="upload-icon" width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
						<path d="M10 4V14M10 4L6 8M10 4L14 8" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"/>
						<path d="M3 14V15C3 16.1046 3.89543 17 5 17H15C16.1046 17 17 16.1046 17 15V14" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"/>
					</svg>
					<span class="upload-tekst">Dra filer hit eller klikk for å laste opp</span>
					<span class="upload-format">PDF, DOCX, XLSX, JPG</span>
				</div>
			</section>
		</div>

	{:else if activeTab === 'historikk'}
		<div class="thread-content">
			{#if entries.length > 0}
				{#each entries as entry, i}
					<div class="entry">
						<button
							class="entry-header"
							onclick={() => toggleEntry(i)}
							aria-expanded={!collapsedEntries.has(i)}
						>
							<div class="entry-header-left">
								<span class="entry-partsnavn">{getPartsNavn(entry.rolle, teNavn, bhNavn)}</span>
								<span class="entry-versjon">v{entry.versjon}</span>
								{#if entry.resultat}
									<span class="entry-resultat resultat-{entry.resultat}">{GRUNNLAG_RESULTAT_LABELS[entry.resultat] ?? entry.resultat}</span>
								{/if}
								{#if entry.dato}
									<span class="entry-dato">{formatDateShortNorwegian(entry.dato)}</span>
								{/if}
							</div>
							<svg
								class="chevron"
								class:chevron-collapsed={collapsedEntries.has(i)}
								width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"
							>
								<path d="M4 5.5L7 8.5L10 5.5" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"/>
							</svg>
						</button>
						{#if !collapsedEntries.has(i)}
							<div class="entry-body">
								{@html entry.html}
							</div>
						{/if}
					</div>
				{/each}
			{:else}
				<div class="placeholder-content">
					<p class="placeholder-text">Ingen tidligere hendelser.</p>
				</div>
			{/if}
		</div>

	{:else if activeTab === 'filer'}
		<div class="thread-content placeholder-content">
			<p class="placeholder-text">Filoversikt kommer i neste fase.</p>
		</div>
	{/if}
</aside>

<style>
	.begrunnelse-thread {
		height: 100%;
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		background: var(--color-canvas);
		border-left: 1px solid var(--color-wire-strong);
	}

	/* --- Tabs --- */
	.thread-tabs {
		display: flex;
		border-bottom: 1px solid var(--color-wire-strong);
		background: var(--color-canvas);
		position: sticky;
		top: 0;
		z-index: 1;
		flex-shrink: 0;
	}

	.tab-btn {
		flex: 1;
		padding: var(--spacing-3) var(--spacing-3);
		font-family: var(--font-ui);
		font-size: 12px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		border: none;
		background: transparent;
		color: var(--color-ink-muted);
		cursor: pointer;
		transition: color 0.12s, border-color 0.12s;
		border-bottom: 2px solid transparent;
	}

	.tab-btn:hover {
		color: var(--color-ink-secondary);
	}

	.tab-active {
		color: var(--color-ink);
		border-bottom-color: var(--color-vekt);
	}

	/* --- Thread content --- */
	.thread-content {
		flex: 1;
		display: flex;
		flex-direction: column;
		overflow-y: auto;
	}

	/* --- Entry (read-only begrunnelse block) --- */
	.entry {
		border-bottom: 1px solid var(--color-wire);
	}

	.entry-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		width: 100%;
		padding: var(--spacing-3) var(--spacing-4);
		background: transparent;
		border: none;
		cursor: pointer;
		font-family: var(--font-ui);
	}

	.entry-header:hover {
		background: var(--color-felt-hover);
	}

	.entry-header-left {
		display: flex;
		align-items: center;
		gap: var(--spacing-2);
	}

	.entry-partsnavn {
		font-family: var(--font-ui);
		font-size: 12px;
		font-weight: 600;
		color: var(--color-ink-secondary);
	}

	.entry-versjon {
		font-family: var(--font-data);
		font-size: 11px;
		font-weight: 500;
		color: var(--color-ink-muted);
	}

	.entry-dato {
		font-size: 11px;
		color: var(--color-ink-ghost);
	}

	.entry-resultat {
		font-family: var(--font-data);
		font-size: 10px;
		font-weight: 600;
		padding: 1px var(--spacing-1);
		border-radius: var(--radius-sm);
	}

	.resultat-godkjent {
		color: var(--color-score-high);
		background: var(--color-score-high-bg);
	}

	.resultat-avslatt {
		color: var(--color-score-low);
		background: var(--color-score-low-bg);
	}

	.resultat-frafalt {
		color: var(--color-ink-muted);
		background: var(--color-felt-raised);
	}

	.chevron {
		color: var(--color-ink-ghost);
		transition: transform 0.15s;
		flex-shrink: 0;
	}

	.chevron-collapsed {
		transform: rotate(-90deg);
	}

	.entry-body {
		padding: 0 var(--spacing-4) var(--spacing-4);
		font-size: 14px;
		line-height: 1.6;
		color: var(--color-ink-secondary);
	}

	.entry-body :global(p) {
		margin: 0 0 0.5em;
	}

	.entry-body :global(p:last-child) {
		margin-bottom: 0;
	}

	/* --- Editor section --- */
	.editor-section {
		padding: var(--spacing-4);
		display: flex;
		flex-direction: column;
		gap: var(--spacing-3);
		flex: 1;
		min-height: 0;
	}

	.editor-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding-bottom: var(--spacing-2);
		border-bottom: 1px solid var(--color-wire);
	}

	/* --- Vedlegg --- */
	.vedlegg-section {
		padding: var(--spacing-4);
		border-top: 1px solid var(--color-wire);
		display: flex;
		flex-direction: column;
		gap: var(--spacing-3);
	}

	.vedlegg-header {
		padding-bottom: var(--spacing-2);
		border-bottom: 1px solid var(--color-wire);
	}

	.upload-zone {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--spacing-2);
		padding: var(--spacing-3);
		border: 1px dashed var(--color-wire-strong);
		border-radius: var(--radius-md);
		color: var(--color-ink-secondary);
		cursor: pointer;
		transition: border-color 0.15s, background-color 0.15s;
	}

	.upload-zone:hover {
		border-color: var(--color-vekt-dim);
		background: var(--color-vekt-bg);
	}

	.upload-icon { color: var(--color-ink-ghost); }
	.upload-tekst { font-size: 13px; }
	.upload-format { font-size: 11px; color: var(--color-ink-ghost); }

	/* --- Placeholder tabs --- */
	.placeholder-content {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: var(--spacing-8);
	}

	.placeholder-text {
		font-size: 13px;
		color: var(--color-ink-ghost);
	}
</style>
