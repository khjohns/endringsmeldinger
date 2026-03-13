<script lang="ts">
  import { Check, X, CircleMinus, TriangleAlert } from 'lucide-svelte';

  interface Props {
    resultat: string | undefined;
    erPrekludert: boolean;
    erPaalegg: boolean;
    erSnuoperasjon: boolean;
  }

  let { resultat, erPrekludert, erPaalegg, erSnuoperasjon }: Props = $props();

  const konsekvens = $derived.by(() => {
    if (!resultat) return null;

    if (resultat === 'godkjent') {
      return {
        variant: 'positive' as const,
        tittel: 'Godkjenning',
        beskrivelse: erPrekludert
          ? 'Selv om varselet vurderes som for sent (§32.2), godkjennes grunnlaget subsidiært. EO kan utstedes når vederlag og frist er avklart.'
          : 'Kontraktsforholdet godkjennes. Endringsordre (EO) kan utstedes når vederlag og frist også er avklart.',
      };
    }

    if (resultat === 'avslatt') {
      return {
        variant: 'negative' as const,
        tittel: 'Avslag',
        beskrivelse: erPrekludert
          ? 'Varselet vurderes som for sent (§32.2). Grunnlaget avslås. Vederlag og frist vurderes subsidiært.'
          : 'Kontraktsforholdet avslås. Vederlag og frist vurderes subsidiært (hva som ville blitt godkjent hvis grunnlaget var anerkjent).',
      };
    }

    if (resultat === 'frafalt' && erPaalegg) {
      return {
        variant: 'neutral' as const,
        tittel: 'Frafall',
        beskrivelse:
          'Pålegget frafalles (§32.3 c). TE trenger ikke utføre arbeidet. Eventuelt vederlag for arbeid allerede utført avklares separat.',
      };
    }

    return null;
  });
</script>

{#if konsekvens}
  <div class="konsekvens konsekvens-{konsekvens.variant}" role="status">
    {#if erSnuoperasjon}
      <div class="snuoperasjon-alert">
        <TriangleAlert size={14} strokeWidth={1.5} aria-hidden="true" />
        <span>Snuoperasjon — du endrer fra avslag til godkjenning</span>
      </div>
    {/if}
    <div class="konsekvens-header">
      {#if konsekvens.variant === 'positive'}
        <Check size={16} strokeWidth={1.5} aria-hidden="true" />
      {:else if konsekvens.variant === 'negative'}
        <X size={16} strokeWidth={1.5} aria-hidden="true" />
      {:else}
        <CircleMinus size={16} strokeWidth={1.5} aria-hidden="true" />
      {/if}
      <span class="konsekvens-tittel">{konsekvens.tittel}</span>
    </div>
    <p class="konsekvens-beskrivelse">{konsekvens.beskrivelse}</p>
  </div>
{/if}

<style>
  .konsekvens {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-2);
    padding: var(--spacing-3) var(--spacing-4);
    border-radius: var(--radius-md);
    border-left: 3px solid;
    font-size: 13px;
    line-height: 1.5;
  }

  .konsekvens-positive {
    border-left-color: var(--color-score-high);
    background: var(--color-score-high-bg);
  }

  .konsekvens-negative {
    border-left-color: var(--color-score-low);
    background: var(--color-score-low-bg);
  }

  .konsekvens-neutral {
    border-left-color: var(--color-wire-strong);
    background: var(--color-felt);
  }

  .konsekvens-header {
    display: flex;
    align-items: center;
    gap: var(--spacing-2);
  }

  .konsekvens-positive .konsekvens-header {
    color: var(--color-score-high);
  }

  .konsekvens-negative .konsekvens-header {
    color: var(--color-score-low);
  }

  .konsekvens-neutral .konsekvens-header {
    color: var(--color-ink-secondary);
  }

  .konsekvens-tittel {
    font-weight: 600;
  }

  .konsekvens-beskrivelse {
    color: var(--color-ink-secondary);
    margin: 0;
  }

  .snuoperasjon-alert {
    display: flex;
    align-items: center;
    gap: var(--spacing-2);
    padding: var(--spacing-2) var(--spacing-3);
    background: var(--color-vekt-bg);
    border: 1px solid var(--color-vekt-bg-strong);
    border-radius: var(--radius-sm);
    font-size: 12px;
    font-weight: 500;
    color: var(--color-vekt);
  }
</style>
