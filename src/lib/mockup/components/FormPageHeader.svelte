<script lang="ts">
  interface Props {
    title: string;
    intro: string;
  }

  let { title, intro }: Props = $props();
</script>

<div class="form-title-row">
  <h1>{title}</h1>
</div>
<p class="form-intro">{intro}</p>

<style>
  .form-title-row {
    display: flex;
    align-items: center;
    margin-bottom: 8px;
  }
  h1 {
    font-size: 30px;
    font-weight: 700;
    line-height: 1.2;
    letter-spacing: -0.02em;
    color: var(--ink);
  }
  .form-intro {
    max-width: 620px;
    margin: 0 0 28px;
    font-size: 14px;
    line-height: 1.6;
    color: var(--ink-3);
  }
</style>
