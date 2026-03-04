<script lang="ts">
	import { Tipex, defaultExtensions } from '@friendofsvelte/tipex';
	import '@friendofsvelte/tipex/styles/index.css';
	import '@friendofsvelte/tipex/styles/theme.css';
	import CharacterCount from '@tiptap/extension-character-count';
	import Placeholder from '@tiptap/extension-placeholder';
	import type { Editor, Extension } from '@tiptap/core';

	interface Props {
		body?: string;
		html?: string;
		placeholder?: string;
		maxHeight?: string;
		label?: string;
		hint?: string;
		extensions?: Extension[];
		onchange?: (html: string) => void;
	}

	let {
		body = '<p></p>',
		html = $bindable(''),
		placeholder = 'Skriv her...',
		maxHeight = '60vh',
		label = '',
		hint = '',
		extensions: extraExtensions = [],
		onchange
	}: Props = $props();

	let editor: Editor | undefined = $state();
	let charCount = $derived(editor?.storage.characterCount?.characters() ?? 0);

	let extensions = $derived([
		...defaultExtensions,
		CharacterCount,
		Placeholder.configure({ placeholder }),
		...extraExtensions
	]);

	function handleUpdate() {
		if (!editor) return;
		const newHtml = editor.getHTML();
		html = newHtml;
		onchange?.(newHtml);
	}
</script>

<div class="rte-wrap">
	{#if label}
		<div class="rte-label">{label}</div>
	{/if}
	<div class="rte-container" style="--rte-max-height: {maxHeight}">
		<Tipex
			{body}
			{extensions}
			bind:tipex={editor}
			floating
			focal
			onupdate={handleUpdate}
			class="rte-editor"
		/>
	</div>
	<div class="rte-footer">
		<span class="rte-char-count">{charCount} tegn</span>
		{#if hint}
			<span class="rte-hint">{hint}</span>
		{/if}
	</div>
</div>

<style>
	.rte-wrap {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-2);
	}

	.rte-label {
		font-size: 11px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--color-ink-muted);
	}

	.rte-container {
		background: var(--color-canvas);
		border: 1px solid var(--color-wire);
		border-radius: var(--radius-sm);
		overflow: hidden;
		transition: border-color 0.12s;
	}

	.rte-container:focus-within {
		border-color: var(--color-wire-focus);
	}

	.rte-container :global(.tipex-editor) {
		background: transparent;
		border: none;
		border-radius: 0;
		backdrop-filter: none;
	}

	.rte-container :global(.tipex-editor-section) {
		min-height: 200px;
		max-height: var(--rte-max-height, 60vh);
		overflow-y: auto;
		padding: var(--spacing-4);
		font-family: var(--font-ui);
		font-size: 14px;
		line-height: 1.6;
		color: var(--color-ink);
	}

	.rte-container :global(.tipex-editor-section .ProseMirror) {
		outline: none;
		min-height: 160px;
	}

	.rte-container :global(.tipex-editor-section .ProseMirror p.is-editor-empty:first-child::before) {
		color: var(--color-ink-ghost);
		font-style: italic;
		content: attr(data-placeholder);
		float: left;
		height: 0;
		pointer-events: none;
	}

	.rte-container :global(.tipex-controller) {
		background: var(--color-felt-raised) !important;
		border-top: 1px solid var(--color-wire-strong) !important;
		border-radius: 0 !important;
		backdrop-filter: none;
	}

	.rte-container :global(.tipex-controller button) {
		color: var(--color-ink-secondary) !important;
	}

	.rte-container :global(.tipex-controller button:hover) {
		color: var(--color-ink) !important;
		background: var(--color-felt-hover) !important;
	}

	.rte-container :global(.tipex-controller button.active) {
		color: var(--color-vekt) !important;
		background: var(--color-vekt-bg) !important;
	}

	.rte-container :global(.tiptap h2) {
		font-size: 16px;
		font-weight: 700;
		margin: 1em 0 0.5em;
		color: var(--color-ink);
	}

	.rte-container :global(.tiptap h3) {
		font-size: 14px;
		font-weight: 600;
		margin: 0.8em 0 0.4em;
		color: var(--color-ink);
	}

	.rte-container :global(.tiptap ul),
	.rte-container :global(.tiptap ol) {
		padding-left: 1.5em;
		margin: 0.5em 0;
	}

	.rte-container :global(.tiptap li) {
		margin-bottom: 0.25em;
	}

	.rte-container :global(.tiptap blockquote) {
		border-left: 3px solid var(--color-wire-strong);
		padding-left: var(--spacing-4);
		color: var(--color-ink-secondary);
		margin: 0.5em 0;
	}

	.rte-footer {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: var(--spacing-3);
	}

	.rte-char-count {
		font-size: 11px;
		font-family: var(--font-data);
		color: var(--color-ink-muted);
		font-variant-numeric: tabular-nums;
	}

	.rte-hint {
		font-size: 11px;
		color: var(--color-ink-muted);
		text-align: right;
	}
</style>
