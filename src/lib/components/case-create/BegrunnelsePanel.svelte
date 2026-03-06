<script lang="ts">
	import RichTextEditor from '$lib/components/primitives/RichTextEditor.svelte';

	interface Props {
		placeholder: string;
		html: string;
		onclose?: () => void;
		overlay?: boolean;
	}

	let { placeholder, html = $bindable(), onclose, overlay = false }: Props = $props();
</script>

<aside class="begrunnelse-panel" class:overlay>
	{#if overlay}
		<button class="panel-tilbake" onclick={onclose}>
			<svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
				<path d="M8.5 3L4.5 7L8.5 11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
			</svg>
			Tilbake til skjema
		</button>
	{/if}

	<!-- Begrunnelse -->
	<section class="panel-section editor-section">
		<div class="panel-header">
			<h3 class="panel-label">Begrunnelse for kravet</h3>
			<span class="rolle-badge">TE</span>
		</div>
		<RichTextEditor
			{placeholder}
			bind:html
			hint="Referer til kontraktsbestemmelser med §-tegn."
			maxHeight="none"
		/>
	</section>

	<!-- Vedlegg -->
	<section class="panel-section">
		<div class="panel-header">
			<h3 class="panel-label">Vedlegg</h3>
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
</aside>

<style>
	.begrunnelse-panel {
		position: sticky;
		top: 0;
		height: 100vh;
		overflow-y: auto;
		width: 340px;
		border-left: 3px solid var(--color-vekt);
		background: var(--color-felt);
		display: flex;
		flex-direction: column;
		flex-shrink: 0;
	}

	.begrunnelse-panel.overlay {
		position: fixed;
		inset: 0;
		width: 100%;
		height: 100%;
		z-index: 30;
		border-left: none;
	}

	.panel-tilbake {
		display: flex;
		align-items: center;
		gap: var(--spacing-1);
		padding: var(--spacing-3) var(--spacing-4);
		position: sticky;
		top: 0;
		z-index: 1;
		background: var(--color-felt);
		border: none;
		border-bottom: 1px solid var(--color-wire);
		font-family: var(--font-ui);
		font-size: 13px;
		color: var(--color-ink-secondary);
		cursor: pointer;
		width: 100%;
		text-align: left;
		flex-shrink: 0;
	}

	.panel-tilbake:hover {
		color: var(--color-ink);
	}

	.panel-section {
		padding: var(--spacing-4);
		display: flex;
		flex-direction: column;
		gap: var(--spacing-3);
	}

	.editor-section {
		flex: 1;
		min-height: 0;
	}

	.panel-section + .panel-section {
		border-top: 1px solid var(--color-wire);
	}

	.panel-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding-bottom: var(--spacing-2);
		border-bottom: 1px solid var(--color-wire);
	}

	.panel-label {
		font-size: 10px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--color-ink-muted);
		margin: 0;
	}

	.rolle-badge {
		font-family: var(--font-data);
		font-size: 10px;
		font-weight: 600;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		padding: 1px 6px;
		border-radius: 9999px;
		background: var(--color-role-te-bg);
		color: var(--color-role-te-text);
	}

	/* --- Upload zone --- */
	.upload-zone {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--spacing-2);
		padding: var(--spacing-4) var(--spacing-3);
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
</style>
