<script lang="ts">
  import { Tooltip } from 'bits-ui';
  import '../app.css';
  let { children } = $props();
</script>

<Tooltip.Provider delayDuration={300}>
  {@render children()}
</Tooltip.Provider>
