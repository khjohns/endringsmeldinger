<script lang="ts">
  import { Clock3 } from 'lucide-svelte';

  type Props = {
    partyName: string;
    description: string;
    eyebrow?: string;
  };

  let { partyName, description, eyebrow = 'Byggherrens standpunkt' }: Props = $props();
</script>

<section class="pending-response-card">
  <span class="pending-icon" aria-hidden="true"><Clock3 size={16} /></span>
  <div>
    <span class="eyebrow">{eyebrow}</span>
    <h3>Avventer svar fra {partyName}</h3>
    <p>{description}</p>
  </div>
</section>

<style>
  .pending-response-card {
    display: flex;
    align-items: flex-start;
    gap: 13px;
    padding: 18px 20px;
    background: var(--surface, var(--color-canvas));
    border: var(--rule, 1px solid var(--color-wire));
    border-radius: 12px;
  }
  .pending-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 30px;
    height: 30px;
    flex: none;
    color: var(--ink-3, var(--color-ink-secondary));
    background: var(--surface-inset, var(--color-felt));
    border-radius: 999px;
  }
  .eyebrow {
    display: block;
    font-size: 10px;
    font-weight: 700;
    line-height: 1.35;
    letter-spacing: 0.07em;
    text-transform: uppercase;
    color: var(--ink-4, var(--color-ink-muted));
  }
  h3 {
    margin: 3px 0 0;
    font-family: var(--font-sans, var(--font-ui));
    font-size: 14px;
    line-height: 1.4;
    color: var(--ink, var(--color-ink));
  }
  p {
    margin: 4px 0 0;
    font-size: 12px;
    line-height: 1.5;
    color: var(--ink-3, var(--color-ink-secondary));
  }
</style>
