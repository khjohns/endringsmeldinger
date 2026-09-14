<script lang="ts">
  import { page } from '$app/state';
  import { loginUrl } from '$lib/api/auth';
  import '$lib/components/kontraktsbord/theme.css';
  import Button from '$lib/components/primitives/Button.svelte';

  let leaving = $state(false);
  function login() {
    leaving = true;
    window.location.assign(loginUrl(page.url.searchParams.get('return_to') || '/'));
  }
</script>

<svelte:head><title>Logg inn – Endringsmeldinger</title></svelte:head>

<main class="login-page">
  <section aria-labelledby="login-title">
    <p class="eyebrow">ENDRINGSMELDINGER</p>
    <h1 id="login-title">Logg inn</h1>
    <p>Bruk Catenda-kontoen din for å åpne prosjektene du er medlem av.</p>
    {#if page.url.searchParams.has('error')}
      <p class="error" role="alert">Innloggingen kunne ikke fullføres. Prøv igjen.</p>
    {/if}
    <Button onclick={login} loading={leaving}>Logg inn med Catenda</Button>
  </section>
</main>

<style>
  /*
   * Innloggingen følger den grønne paletten fra theme.css. Tokenene settes her
   * slik at både siden og knappen inni arver dem; knappen er skrevet mot
   * --color-vekt.
   */
  .login-page {
    --color-canvas: var(--canvas);
    --color-felt: var(--surface);
    --color-ink: var(--ink);
    --color-ink-secondary: var(--ink-2);
    --color-ink-muted: var(--ink-4);
    --color-wire: var(--rule-color);
    --color-vekt: var(--brand-contrast);
    --color-vekt-dim: var(--brand-2);
    --color-vekt-bg: var(--brand-bg);
    min-height: 100dvh;
    display: grid;
    place-items: center;
    padding: var(--spacing-6);
    background: var(--color-canvas);
    color: var(--color-ink);
  }
  section {
    width: 100%;
    max-width: 400px;
    padding: var(--spacing-8);
    border: 1px solid var(--color-wire);
    border-radius: var(--radius-md);
    background: var(--color-felt);
  }
  .eyebrow {
    font-size: 11px;
    letter-spacing: 0.12em;
    color: var(--color-ink-muted);
  }
  h1 {
    font-size: 24px;
    font-weight: 600;
    margin: var(--spacing-4) 0;
  }
  p {
    color: var(--color-ink-secondary);
    font-size: 14px;
    line-height: 1.6;
    margin-bottom: var(--spacing-6);
  }
  .error {
    color: var(--color-score-low);
  }
</style>
