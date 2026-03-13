<script lang="ts">
  import { Check, X, CircleMinus, Send } from 'lucide-svelte';
  import type { FristBeregningResultat } from '$lib/types/timeline';

  interface Props {
    prinsipaltResultat?: FristBeregningResultat;
    krevdDager: number;
    godkjentDager: number;
    visSubsidiaert: boolean;
    subsidiaertResultat?: FristBeregningResultat;
    subsidiaerGodkjentDager?: number;
    sendForesporsel?: boolean;
    erRedusert?: boolean;
  }

  let {
    prinsipaltResultat,
    krevdDager,
    godkjentDager,
    visSubsidiaert,
    subsidiaertResultat,
    subsidiaerGodkjentDager,
    sendForesporsel = false,
    erRedusert = false,
  }: Props = $props();

  const RESULTAT_LABELS: Record<FristBeregningResultat, string> = {
    godkjent: 'Godkjent',
    delvis_godkjent: 'Delvis godkjent',
    avslatt: 'Avslått',
  };

  const variant = $derived.by(() => {
    if (sendForesporsel) return 'neutral' as const;
    if (!prinsipaltResultat) return null;
    if (prinsipaltResultat === 'godkjent') return 'positive' as const;
    if (prinsipaltResultat === 'avslatt') return 'negative' as const;
    return 'mixed' as const;
  });
</script>

{#if sendForesporsel}
  <div class="frist-konsekvens konsekvens-neutral" role="status">
    <div class="konsekvens-header">
      <Send size={16} strokeWidth={1.5} aria-hidden="true" />
      <span class="konsekvens-tittel">Forespørsel om spesifisering</span>
    </div>
    <p class="konsekvens-beskrivelse">
      TE bes spesifisere sitt fristkrav med antall dager og begrunnelse (§ 33.6.2).
    </p>
  </div>
{:else if variant && prinsipaltResultat}
  <div class="frist-konsekvens konsekvens-{variant}" role="status">
    <div class="konsekvens-header">
      {#if variant === 'positive'}
        <Check size={16} strokeWidth={1.5} aria-hidden="true" />
      {:else if variant === 'negative'}
        <X size={16} strokeWidth={1.5} aria-hidden="true" />
      {:else}
        <CircleMinus size={16} strokeWidth={1.5} aria-hidden="true" />
      {/if}
      <span class="konsekvens-tittel">{RESULTAT_LABELS[prinsipaltResultat]}</span>
    </div>

    {#if erRedusert}
      <p class="konsekvens-beskrivelse">
        Fremsatt krav vurdert som for sent. Fristforlengelsen reduseres til det som er åpenbart (§
        33.6.1).
      </p>
    {/if}

    {#if visSubsidiaert && subsidiaertResultat}
      <div class="subsidiaert-seksjon">
        <div class="subsidiaert-header">
          <span class="subsidiaert-label">Subsidiært: {RESULTAT_LABELS[subsidiaertResultat]}</span>
          {#if subsidiaerGodkjentDager !== undefined}
            <span class="dager-verdi">{subsidiaerGodkjentDager} d</span>
          {/if}
        </div>
        <p class="subsidiaert-beskrivelse">
          {subsidiaerGodkjentDager ?? godkjentDager} dager dersom kravet var varslet i tide og vilkårene
          i § 33.1 var oppfylt.
        </p>
      </div>
    {/if}
  </div>
{/if}

<style>
  .frist-konsekvens {
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

  .konsekvens-mixed {
    border-left-color: var(--color-vekt);
    background: var(--color-vekt-bg);
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

  .konsekvens-mixed .konsekvens-header {
    color: var(--color-vekt);
  }

  .konsekvens-neutral .konsekvens-header {
    color: var(--color-ink-secondary);
  }

  .konsekvens-tittel {
    font-weight: 600;
  }

  .konsekvens-detalj {
    font-family: var(--font-data);
    font-variant-numeric: tabular-nums;
    font-weight: 400;
    color: var(--color-ink-secondary);
  }

  .konsekvens-beskrivelse {
    color: var(--color-ink-secondary);
    margin: 0;
  }

  .dager-verdi {
    font-family: var(--font-data);
    font-variant-numeric: tabular-nums;
    font-weight: 500;
  }

  .subsidiaert-seksjon {
    border-top: 1px dashed var(--color-wire);
    padding-top: var(--spacing-2);
    margin-top: var(--spacing-1);
  }

  .subsidiaert-header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
  }

  .subsidiaert-label {
    font-size: 12px;
    font-weight: 500;
    color: var(--color-ink-muted);
  }

  .subsidiaert-beskrivelse {
    font-size: 12px;
    color: var(--color-ink-muted);
    margin: var(--spacing-1) 0 0;
  }
</style>
