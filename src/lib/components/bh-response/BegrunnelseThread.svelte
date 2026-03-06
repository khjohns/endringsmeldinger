<script lang="ts">
	import RichTextEditor from '$lib/components/primitives/RichTextEditor.svelte';

	interface BegrunnelseEntry {
		rolle: 'TE' | 'BH';
		versjon: number;
		html: string;
		dato?: string;
		readonly: boolean;
	}

	interface Props {
		entries: BegrunnelseEntry[];
		bhBegrunnelseHtml: string;
		editorPlaceholder: string;
		activeTab?: 'begrunnelse' | 'historikk' | 'filer';
		ontabchange?: (tab: 'begrunnelse' | 'historikk' | 'filer') => void;
	}

	let {
		entries,
		bhBegrunnelseHtml = $bindable(''),
		editorPlaceholder,
		activeTab = 'begrunnelse',
		ontabchange,
	}: Props = $props();

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

	function formatDato(dato?: string): string {
		if (!dato) return '';
		try {
			return new Intl.DateTimeFormat('nb-NO', {
				day: 'numeric',
				month: 'short',
				year: 'numeric',
			}).format(new Date(dato));
		} catch {
			return dato;
		}
	}
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
			<!-- Read-only entries (TE begrunnelser + previous BH responses) -->
			{#each entries as entry, i}
				<div class="entry entry-{entry.rolle.toLowerCase()}">
					<button
						class="entry-header"
						onclick={() => toggleEntry(i)}
						aria-expanded={!collapsedEntries.has(i)}
					>
						<div class="entry-header-left">
							<span class="rolle-badge rolle-{entry.rolle.toLowerCase()}">{entry.rolle}</span>
							<span class="entry-versjon">v{entry.versjon}</span>
							{#if entry.dato}
								<span class="entry-dato">{formatDato(entry.dato)}</span>
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

			<!-- BH editor (active response) -->
			<section class="editor-section">
				<div class="editor-header">
					<h3 class="editor-label">Ditt svar</h3>
					<span class="rolle-badge rolle-bh">BH</span>
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
					<h3 class="vedlegg-label">Vedlegg</h3>
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
		<div class="thread-content placeholder-content">
			<p class="placeholder-text">Historikk over hendelser kommer i neste fase.</p>
		</div>

	{:else if activeTab === 'filer'}
		<div class="thread-content placeholder-content">
			<p class="placeholder-text">Filoversikt kommer i neste fase.</p>
		</div>
	{/if}
</aside>

<style>
	.begrunnelse-thread {
		position: sticky;
		top: 0;
		height: 100vh;
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		background: var(--color-felt);
		border-left: 1px solid var(--color-wire-strong);
	}

	/* --- Tabs --- */
	.thread-tabs {
		display: flex;
		border-bottom: 1px solid var(--color-wire-strong);
		background: var(--color-felt);
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

	.entry-te {
		border-left: 3px solid var(--color-role-te-text);
	}

	.entry-bh {
		border-left: 3px solid var(--color-role-bh-text);
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

	.rolle-badge {
		font-family: var(--font-data);
		font-size: 10px;
		font-weight: 600;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		padding: 2px var(--spacing-2);
		border-radius: 9999px;
	}

	.rolle-te {
		background: var(--color-role-te-bg);
		color: var(--color-role-te-text);
	}

	.rolle-bh {
		background: var(--color-role-bh-bg);
		color: var(--color-role-bh-text);
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

	.editor-label {
		font-size: 10px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--color-ink-muted);
		margin: 0;
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

	.vedlegg-label {
		font-size: 10px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--color-ink-muted);
		margin: 0;
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
