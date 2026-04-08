<script lang="ts">
  let {
    value,
    suffix = '',
    duration = 600,
  }: {
    value: number;
    suffix?: string;
    duration?: number;
  } = $props();

  let displayed = $state(0);
  let animFrame: number | undefined;

  $effect(() => {
    const target = value;
    // Always count up from 0 — avoids counting down from a previous track's value
    if (animFrame) cancelAnimationFrame(animFrame);
    displayed = 0;

    const startTime = performance.now();

    function tick(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      displayed = Math.round(target * eased);
      if (progress < 1) {
        animFrame = requestAnimationFrame(tick);
      } else {
        displayed = target;
      }
    }
    animFrame = requestAnimationFrame(tick);

    return () => {
      if (animFrame) cancelAnimationFrame(animFrame);
    };
  });

  const formatted = $derived(displayed.toLocaleString('nb-NO'));
</script>

<span class="count-up">{formatted}{suffix}</span>

<style>
  .count-up {
    display: inline;
    transition: letter-spacing 0.2s ease;
  }
  .count-up:hover {
    letter-spacing: 0.02em;
  }
</style>
