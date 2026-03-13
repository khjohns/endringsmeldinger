<script lang="ts">
  import Alert from '../Alert.svelte';

  interface Props {
    text?: string;
    variant?: 'warning' | 'danger' | 'info';
  }

  let { text = 'Melding', variant = 'info' }: Props = $props();
</script>

<Alert {variant}>
  {text}
</Alert>
