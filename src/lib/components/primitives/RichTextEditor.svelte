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
		extensions?: Extension[];
		onchange?: (html: string) => void;
		oncharcount?: (count: number) => void;
	}

	let {
		body = '<p></p>',
		html = $bindable(''),
		placeholder = '',
		maxHeight = '60vh',
		label = '',
		extensions: extraExtensions = [],
		onchange,
		oncharcount,
	}: Props = $props();

	let editor: Editor | undefined = $state();
	const charCount = $derived(editor?.storage.characterCount?.characters() ?? 0);

	$effect(() => {
		oncharcount?.(charCount);
	});

	// Filter out Tipex's built-in Placeholder ("Write something ...") from defaultExtensions
	const baseExtensions = defaultExtensions.filter(
		(ext: any) => ext?.name !== 'placeholder' && ext?.config?.name !== 'placeholder'
	);

	let extensions = $derived([
		...baseExtensions,
		CharacterCount,
		...(placeholder ? [Placeholder.configure({ placeholder })] : []),
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
		min-height: 400px;
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
		min-height: 360px;
	}

	.rte-container :global(.tipex-editor-section .ProseMirror p.is-editor-empty:first-child::before) {
		display: none;
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

	/* Simplified toolbar: hide buttons not needed for contract responses */
	.rte-container :global(.tipex-controller button[aria-label="Heading 1"]),
	.rte-container :global(.tipex-controller button[aria-label="Heading 2"]),
	.rte-container :global(.tipex-controller button[aria-label="Heading 3"]),
	.rte-container :global(.tipex-controller button[aria-label="Paragraph/Normal text"]),
	.rte-container :global(.tipex-controller button[aria-label="Underline"]),
	.rte-container :global(.tipex-controller button[aria-label="Strikethrough"]),
	.rte-container :global(.tipex-controller button[aria-label="Inline Code"]),
	.rte-container :global(.tipex-controller button[aria-label="Task List"]),
	.rte-container :global(.tipex-controller button[aria-label="Code Block"]),
	.rte-container :global(.tipex-controller button[aria-label="Horizontal Rule"]),
	.rte-container :global(.tipex-controller button[aria-label="Copy Text"]),
	.rte-container :global(.tipex-controller button[aria-label="Edit link"]) {
		display: none !important;
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

</style>
