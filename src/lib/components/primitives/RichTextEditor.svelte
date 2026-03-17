<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { Editor, type Extension } from '@tiptap/core';
  import StarterKit from '@tiptap/starter-kit';
  import CharacterCount from '@tiptap/extension-character-count';
  import Placeholder from '@tiptap/extension-placeholder';
  import { Bold, Italic, List, ListOrdered, TextQuote, Undo2, Redo2 } from 'lucide-svelte';

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
    if (!editor) return;
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
          <Bold size={16} strokeWidth={2} />
        </button>
        <button
          type="button"
          class:active={editor.isActive('italic')}
          onclick={() => editor?.chain().focus().toggleItalic().run()}
          aria-label="Kursiv"
        >
          <Italic size={16} strokeWidth={2} />
        </button>
        <div class="rte-toolbar-sep"></div>
        <button
          type="button"
          class:active={editor.isActive('bulletList')}
          onclick={() => editor?.chain().focus().toggleBulletList().run()}
          aria-label="Punktliste"
        >
          <List size={16} strokeWidth={2} />
        </button>
        <button
          type="button"
          class:active={editor.isActive('orderedList')}
          onclick={() => editor?.chain().focus().toggleOrderedList().run()}
          aria-label="Nummerert liste"
        >
          <ListOrdered size={16} strokeWidth={2} />
        </button>
        <button
          type="button"
          class:active={editor.isActive('blockquote')}
          onclick={() => editor?.chain().focus().toggleBlockquote().run()}
          aria-label="Sitat"
        >
          <TextQuote size={16} strokeWidth={2} />
        </button>
        <div class="rte-toolbar-sep"></div>
        <button
          type="button"
          onclick={() => editor?.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          aria-label="Angre"
        >
          <Undo2 size={16} strokeWidth={2} />
        </button>
        <button
          type="button"
          onclick={() => editor?.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          aria-label="Gjør om"
        >
          <Redo2 size={16} strokeWidth={2} />
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
    font-family: var(--font-prose);
    font-size: 15px;
    font-weight: 400;
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
