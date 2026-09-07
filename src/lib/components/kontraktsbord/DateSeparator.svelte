<script lang="ts">
  let { date }: { date: string } = $props();
</script>

<div class="sep">
  <div class="line"></div>
  <span class="font-mono date">{date}</span>
  <div class="line"></div>
</div>

<style>
  .sep {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 16px 0 12px;
  }
  .line {
    flex: 1;
    height: 1px;
    background: var(--gold-border);
  }
  .date {
    font-size: 10px;
    font-weight: 600;
    color: var(--ink-3);
  }
</style>
