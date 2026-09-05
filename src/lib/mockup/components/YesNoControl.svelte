<script lang="ts">
  import SegmentedControl from '$lib/components/primitives/SegmentedControl.svelte';

  interface Props {
    value: boolean | undefined;
    label: string;
    yesText: string;
    noText: string;
    onchange: (value: boolean | undefined) => void;
  }

  let { value, label, yesText, noText, onchange }: Props = $props();
</script>

<SegmentedControl
  variant="mockup"
  {value}
  {label}
  options={[
    { id: true, label: yesText, tone: 'success' },
    { id: false, label: noText, tone: 'danger' },
  ]}
  {onchange}
  onclear={() => onchange(undefined)}
/>
