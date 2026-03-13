<script lang="ts">
  import ConsequenceCallout from '../ConsequenceCallout.svelte';

  interface Props {
    text?: string;
    variant?: 'godkjent' | 'advarsel' | 'kritisk' | 'info';
  }

  let { text = 'Konsekvens', variant = 'info' }: Props = $props();
</script>

<ConsequenceCallout {variant}>
  {text}
</ConsequenceCallout>
