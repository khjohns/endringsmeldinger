<script lang="ts">
  import RichTextEditor from '$lib/components/primitives/RichTextEditor.svelte';

  interface Props {
    title?: string;
    paragrafRef?: string;
    helptext: string;
    body: string;
    placeholder: string;
    onchange: (html: string) => void;
    oncharcount: (count: number) => void;
  }

  let {
    title = 'Begrunnelse',
    paragrafRef = '',
    helptext,
    body,
    placeholder,
    onchange,
    oncharcount,
  }: Props = $props();

  let charCount = $state(0);

  function handleCharCount(count: number) {
    charCount = count;
    oncharcount(count);
  }
</script>

<section class="begrunnelse-section">
  <div class="begrunnelse-heading">
    <span class="begrunnelse-title">{title}</span>
    <div class="begrunnelse-heading-right">
      <span class="font-mono char-count">{charCount} tegn</span>
      {#if paragrafRef}
        <span class="font-mono begrunnelse-ref">{paragrafRef}</span>
      {/if}
    </div>
  </div>
  <p class="helptext begrunnelse-help">{helptext}</p>
  <div class="editor-wrapper">
    <RichTextEditor
      {body}
      {onchange}
      {placeholder}
      maxHeight="none"
      oncharcount={handleCharCount}
    />
  </div>
</section>

<style>
  .begrunnelse-section {
    margin-bottom: 16px;
    padding: 18px;
    background: var(--surface);
    border: var(--rule);
    border-radius: 12px;
  }
  .begrunnelse-heading {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 12px;
    padding-bottom: 8px;
    border-bottom: 1px solid var(--color-wire);
  }
  .begrunnelse-title {
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--ink-3);
  }
  .begrunnelse-heading-right {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .char-count,
  .begrunnelse-ref {
    font-size: 11px;
    color: var(--ink-4);
  }
  .begrunnelse-help {
    margin: 12px 0;
    font-size: 13px;
    line-height: 1.55;
    color: var(--ink-3);
  }
  .editor-wrapper {
    overflow: hidden;
    border: var(--rule-strong);
    border-radius: 8px;
  }
  .editor-wrapper:focus-within {
    border-color: var(--control-focus);
    box-shadow: var(--control-focus-ring);
  }
</style>
