<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { Editor, type Extension } from '@tiptap/core';
	import StarterKit from '@tiptap/starter-kit';
	import CharacterCount from '@tiptap/extension-character-count';
	import Placeholder from '@tiptap/extension-placeholder';

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
		placeholder: placeholderText = '',
		maxHeight = '60vh',
		label = '',
		extensions: extraExtensions = [],
		onchange,
		oncharcount,
	}: Props = $props();

	let element = $state<HTMLDivElement>();
	let editor = $state<Editor>();
	const charCount = $derived(editor?.storage.characterCount?.characters() ?? 0);

	$effect(() => {
		oncharcount?.(charCount);
	});

	onMount(() => {
		editor = new Editor({
			element: element!,
			extensions: [
				StarterKit,
				CharacterCount,
				...(placeholderText ? [Placeholder.configure({ placeholder: placeholderText })] : []),
				...extraExtensions,
			],
			content: body,
			onTransaction: () => {
				editor = editor;
			},
			onUpdate: ({ editor: e }) => {
				const newHtml = e.getHTML();
				html = newHtml;
				onchange?.(newHtml);
			},
		});
	});

	onDestroy(() => {
		editor?.destroy();
	});
</script>

<div class="rte-wrap">
	{#if label}
		<div class="rte-label">{label}</div>
	{/if}
	<div class="rte-container" style="--rte-max-height: {maxHeight}">
		<div class="rte-editor" bind:this={element}></div>
		{#if editor}
			<div class="rte-toolbar">
				<button
					type="button"
					class:active={editor.isActive('bold')}
					onclick={() => editor?.chain().focus().toggleBold().run()}
					aria-label="Fet"
				>
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
						<path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/><path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/>
					</svg>
				</button>
				<button
					type="button"
					class:active={editor.isActive('italic')}
					onclick={() => editor?.chain().focus().toggleItalic().run()}
					aria-label="Kursiv"
				>
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<line x1="19" y1="4" x2="10" y2="4"/><line x1="14" y1="20" x2="5" y2="20"/><line x1="15" y1="4" x2="9" y2="20"/>
					</svg>
				</button>
				<div class="rte-toolbar-sep"></div>
				<button
					type="button"
					class:active={editor.isActive('bulletList')}
					onclick={() => editor?.chain().focus().toggleBulletList().run()}
					aria-label="Punktliste"
				>
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<line x1="9" y1="6" x2="20" y2="6"/><line x1="9" y1="12" x2="20" y2="12"/><line x1="9" y1="18" x2="20" y2="18"/>
						<circle cx="4" cy="6" r="1" fill="currentColor" stroke="none"/><circle cx="4" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="4" cy="18" r="1" fill="currentColor" stroke="none"/>
					</svg>
				</button>
				<button
					type="button"
					class:active={editor.isActive('orderedList')}
					onclick={() => editor?.chain().focus().toggleOrderedList().run()}
					aria-label="Nummerert liste"
				>
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<line x1="10" y1="6" x2="21" y2="6"/><line x1="10" y1="12" x2="21" y2="12"/><line x1="10" y1="18" x2="21" y2="18"/>
						<text x="2" y="8" font-size="8" fill="currentColor" stroke="none" font-family="sans-serif">1</text>
						<text x="2" y="14" font-size="8" fill="currentColor" stroke="none" font-family="sans-serif">2</text>
						<text x="2" y="20" font-size="8" fill="currentColor" stroke="none" font-family="sans-serif">3</text>
					</svg>
				</button>
				<button
					type="button"
					class:active={editor.isActive('blockquote')}
					onclick={() => editor?.chain().focus().toggleBlockquote().run()}
					aria-label="Sitat"
				>
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<path d="M3 6v5h5V6H3zm0 5c0 4 2 6 5 7"/><path d="M14 6v5h5V6h-5zm0 5c0 4 2 6 5 7"/>
					</svg>
				</button>
				<div class="rte-toolbar-sep"></div>
				<button
					type="button"
					onclick={() => editor?.chain().focus().undo().run()}
					disabled={!editor.can().undo()}
					aria-label="Angre"
				>
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>
					</svg>
				</button>
				<button
					type="button"
					onclick={() => editor?.chain().focus().redo().run()}
					disabled={!editor.can().redo()}
					aria-label="Gjør om"
				>
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.13-9.36L23 10"/>
					</svg>
				</button>
			</div>
		{/if}
	</div>
</div>

<style>
	.rte-wrap {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-2);
		flex: 1;
		min-height: 0;
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
		flex: 1;
		min-height: 0;
		display: flex;
		flex-direction: column;
	}

	.rte-container:focus-within {
		border-color: var(--color-wire-focus);
	}

	/* Editor area */
	.rte-editor {
		flex: 1;
		min-height: 120px;
		max-height: var(--rte-max-height, 60vh);
		overflow-y: auto;
		display: flex;
		flex-direction: column;
	}

	.rte-editor :global(.tiptap) {
		outline: none;
		flex: 1;
		padding: var(--spacing-4);
		font-family: var(--font-ui);
		font-size: 14px;
		line-height: 1.6;
		color: var(--color-ink);
		min-height: 100px;
	}

	.rte-editor :global(.tiptap p.is-editor-empty:first-child::before) {
		content: attr(data-placeholder);
		color: var(--color-ink-muted);
		pointer-events: none;
		float: left;
		height: 0;
	}

	/* Toolbar */
	.rte-toolbar {
		background: var(--color-felt-raised);
		border-top: 1px solid var(--color-wire-strong);
		flex-shrink: 0;
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--spacing-1);
		padding: var(--spacing-1) var(--spacing-2);
	}

	.rte-toolbar-sep {
		width: 1px;
		height: 16px;
		background: var(--color-wire);
		margin: 0 var(--spacing-1);
	}

	.rte-toolbar button {
		width: 28px;
		height: 28px;
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--color-ink-secondary);
		background: transparent;
		border: none;
		border-radius: var(--radius-sm);
		cursor: pointer;
		padding: 0;
	}

	.rte-toolbar button:hover:not(:disabled) {
		color: var(--color-ink);
		background: var(--color-felt-hover);
	}

	.rte-toolbar button.active {
		color: var(--color-vekt);
		background: var(--color-vekt-bg);
	}

	.rte-toolbar button:disabled {
		opacity: 0.3;
		cursor: default;
	}

	.rte-toolbar button svg {
		width: 16px;
		height: 16px;
	}

	/* Content styles */
	.rte-editor :global(.tiptap h2) {
		font-size: 16px;
		font-weight: 700;
		margin: 1em 0 0.5em;
		color: var(--color-ink);
	}

	.rte-editor :global(.tiptap h3) {
		font-size: 14px;
		font-weight: 600;
		margin: 0.8em 0 0.4em;
		color: var(--color-ink);
	}

	.rte-editor :global(.tiptap ul),
	.rte-editor :global(.tiptap ol) {
		padding-left: 1.5em;
		margin: 0.5em 0;
	}

	.rte-editor :global(.tiptap li) {
		margin-bottom: 0.25em;
	}

	.rte-editor :global(.tiptap blockquote) {
		border-left: 3px solid var(--color-wire-strong);
		padding-left: var(--spacing-4);
		color: var(--color-ink-secondary);
		margin: 0.5em 0;
	}
</style>
