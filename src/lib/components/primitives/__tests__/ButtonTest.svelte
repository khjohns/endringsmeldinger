<script lang="ts">
  import Button from '../Button.svelte';

  interface Props {
    text?: string;
    variant?: 'primary' | 'secondary' | 'destructive' | 'accept';
    disabled?: boolean;
    loading?: boolean;
    onclick?: (e: MouseEvent) => void;
  }

  let {
    text = 'Klikk',
    variant = 'primary',
    disabled = false,
    loading = false,
    onclick,
  }: Props = $props();
</script>

<Button {variant} {disabled} {loading} {onclick}>
  {text}
</Button>
