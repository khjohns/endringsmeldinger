<script lang="ts">
	import type { Snippet } from 'svelte';
	import BegrunnelseThread from '$lib/components/bh-response/BegrunnelseThread.svelte';

	interface BegrunnelseEntry {
		rolle: 'TE' | 'BH';
		versjon: number;
		html: string;
		dato?: string;
		resultat?: string;
	}

	interface Props {
		// Left panel content
		children: Snippet;

		// BegrunnelseThread props (passed through)
		entries: BegrunnelseEntry[];
		bhBegrunnelseHtml: string;
		editorRolle?: 'TE' | 'BH';
		teNavn?: string;
		bhNavn?: string;
		availableTags?: string[];
		submitLabel?: string;
		submitDisabled?: boolean;
		submitLoading?: boolean;
		submitError?: string | null;
		onsubmit?: () => void;
		onavbryt?: () => void;
	}

	let {
		children,
		entries,
		bhBegrunnelseHtml = $bindable(''),
		editorRolle = 'BH',
		teNavn,
		bhNavn,
		availableTags = [],
		submitLabel = 'Send svar',
		submitDisabled = false,
		submitLoading = false,
		submitError = null,
		onsubmit,
		onavbryt,
	}: Props = $props();

	let mobilPanelOpen = $state(false);
	let activeTab = $state<'begrunnelse' | 'historikk' | 'filer'>('begrunnelse');

	const harBegrunnelse = $derived(bhBegrunnelseHtml.replace(/<[^>]*>/g, '').trim().length > 0);
</script>

<div class="form-layout">
	<div class="form-panels">
		<!-- Left panel -->
		<main class="midtpanel">
			<div class="midtpanel-scroll">
				{@render children()}
			</div>
		</main>

		<!-- Right panel: desktop -->
		<div class="desktop-panel">
			<BegrunnelseThread
				{entries}
				bind:bhBegrunnelseHtml
				{editorRolle}
				{teNavn}
				{bhNavn}
				{activeTab}
				ontabchange={(tab) => (activeTab = tab)}
				{availableTags}
				{submitLabel}
				{submitDisabled}
				{submitLoading}
				{submitError}
				{onsubmit}
				{onavbryt}
			/>
		</div>
	</div>
</div>

<!-- Mobile: FAB -->
<button class="begrunnelse-fab" onclick={() => (mobilPanelOpen = true)}>
	<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
		<path d="M2 3h12M2 7h8M2 11h10" stroke="currentColor" stroke-width="1.25" stroke-linecap="round"/>
	</svg>
	Begrunnelse
	{#if harBegrunnelse}
		<span class="fab-badge"></span>
	{/if}
</button>

<!-- Mobile: fullscreen overlay -->
{#if mobilPanelOpen}
	<div class="mobil-panel-overlay">
		<button class="panel-tilbake" onclick={() => (mobilPanelOpen = false)}>
			<svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
				<path d="M8.5 3L4.5 7L8.5 11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
			</svg>
			Tilbake til skjema
		</button>
		<BegrunnelseThread
			{entries}
			bind:bhBegrunnelseHtml
			{editorRolle}
			{teNavn}
			{bhNavn}
			{activeTab}
			ontabchange={(tab) => (activeTab = tab)}
			{availableTags}
			{submitLabel}
			{submitDisabled}
			{submitLoading}
			{submitError}
			{onsubmit}
			{onavbryt}
		/>
	</div>
{/if}

<style>
	.form-layout {
		display: flex;
		flex-direction: column;
		height: 100%;
		background: var(--color-canvas);
	}

	.form-panels {
		display: grid;
		grid-template-columns: 3fr 2fr;
		flex: 1;
		min-height: 0;
		overflow: hidden;
	}

	.desktop-panel {
		overflow-y: auto;
	}

	.midtpanel {
		overflow-y: auto;
	}

	.midtpanel-scroll {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-5);
		padding: var(--spacing-6);
		max-width: 640px;
		margin: 0 auto;
	}

	/* FAB + mobile overlay: hidden on desktop */
	.begrunnelse-fab { display: none; }
	.mobil-panel-overlay { display: none; }

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

	.panel-tilbake:hover { color: var(--color-ink); }

	@media (max-width: 767px) {
		.form-panels { grid-template-columns: 1fr; }
		.desktop-panel { display: none; }
		.midtpanel-scroll {
			max-width: none;
			padding: var(--spacing-5) var(--spacing-4);
			padding-bottom: 72px;
		}

		.begrunnelse-fab {
			display: flex;
			align-items: center;
			gap: var(--spacing-2);
			position: fixed;
			bottom: var(--spacing-5);
			right: var(--spacing-4);
			z-index: 20;
			padding: var(--spacing-2) var(--spacing-4);
			background: var(--color-felt-raised);
			border: 1px solid var(--color-vekt-dim);
			border-radius: 9999px;
			font-family: var(--font-ui);
			font-size: 13px;
			font-weight: 500;
			color: var(--color-vekt);
			cursor: pointer;
			transition: background 0.12s, border-color 0.12s;
		}

		.begrunnelse-fab:hover {
			background: var(--color-vekt-bg);
			border-color: var(--color-vekt);
		}

		.fab-badge {
			width: 6px;
			height: 6px;
			border-radius: 9999px;
			background: var(--color-vekt);
		}

		.mobil-panel-overlay {
			display: flex;
			flex-direction: column;
			position: fixed;
			inset: 0;
			z-index: 30;
			background: var(--color-canvas);
			overflow-y: auto;
		}

		.mobil-panel-overlay :global(.begrunnelse-thread) {
			position: static;
			height: auto;
			border-left: none;
		}
	}
</style>
