<script lang="ts">
  import SharedSegmentedControl from '$lib/components/primitives/SegmentedControl.svelte';
  interface Props {
    options: { value: string; label: string }[];
    value: string;
    onchange: (value: string) => void;
    label: string;
  }
  let { options, value, onchange, label }: Props = $props();
</script>

<div class="segment-spacing">
  <SharedSegmentedControl
    variant="mockup"
    {value}
    {onchange}
    {label}
    options={options.map((option) => ({ id: option.value, label: option.label }))}
  />
</div>

<style>
  .segment-spacing {
    margin-top: 14px;
  }
</style>
