<script lang="ts">
  import YesNoButtons from '../YesNoButtons.svelte';

  interface Props {
    value?: boolean | null;
    label?: string;
    paragrafRef?: string;
    onchange?: (value: boolean) => void;
  }

  let { value = null, label = '', paragrafRef = '', onchange = () => {} }: Props = $props();
</script>

<YesNoButtons {value} {label} {paragrafRef} {onchange} />
