<script lang="ts">
  import { LockKeyhole } from 'lucide-svelte';
  import RichTextEditor from '$lib/components/primitives/RichTextEditor.svelte';
  import { letterText } from '$lib/approval/letter';
  let {
    generated,
    additional,
    onchange,
  }: { generated: string; additional: string; onchange: (html: string) => void } = $props();
</script>

<div class="generated-reasoning">
  <p class="source-label"><LockKeyhole size={13} /> Hentet fra vurderingen</p>
  <p class="reasoning-text">{letterText(generated)}</p>
  <p class="source-help">
    Beløp, dager og konklusjoner endres i valgene over. Teksten oppdateres automatisk.
  </p>
</div>
<div class="additional-reasoning">
  <RichTextEditor
    body={additional}
    label="Utdypende begrunnelse (valgfritt)"
    {onchange}
    maxHeight="none"
    placeholder="Forklar vurderingen nærmere …"
  />
</div>

<style>
  .generated-reasoning {
    background: var(--paper-inset);
    padding: 18px 20px;
    border: var(--rule);
    border-radius: 8px;
  }
  .source-label {
    display: flex;
    gap: 7px;
    align-items: center;
    color: var(--ink-3);
    font-size: 11px;
    font-weight: 600;
    margin: 0 0 12px;
  }
  .reasoning-text {
    white-space: pre-wrap;
    line-height: 1.8;
    font-size: 14px;
    margin: 0;
  }
  .source-help {
    color: var(--ink-3);
    font-size: 11px;
    line-height: 1.6;
    margin: 16px 0 0;
  }
  .additional-reasoning {
    margin-top: 20px;
  }
</style>
