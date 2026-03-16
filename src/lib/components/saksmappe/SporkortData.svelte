<script lang="ts">
  import type {
    SporType,
    GrunnlagTilstand,
    VederlagTilstand,
    FristTilstand,
  } from '$lib/types/timeline';
  import { formatDateShort, formatCurrency } from '$lib/utils/formatters';
  import { getKontraktsforholdLabel, getHjemmelLabel } from '$lib/constants/categories';
  import StatusQuoGap from './StatusQuoGap.svelte';

  interface Props {
    sporType: SporType;
    grunnlag?: GrunnlagTilstand;
    vederlag?: VederlagTilstand;
    frist?: FristTilstand;
    teNavn?: string;
    bhNavn?: string;
  }

  let { sporType, grunnlag, vederlag, frist, teNavn, bhNavn }: Props = $props();

  // Show gap when BH has responded with a value
  const showGap = $derived(
    (sporType === 'vederlag' && vederlag?.godkjent_belop != null) ||
      (sporType === 'frist' && frist?.godkjent_dager != null)
  );

  // Single-line segments: label · label · label (all mono, dot-separated)
  const segments = $derived.by(() => {
    const parts: string[] = [];

    if (sporType === 'grunnlag' && grunnlag) {
      if (grunnlag.hovedkategori) {
        const label = getKontraktsforholdLabel(grunnlag.hovedkategori);
        if (label) parts.push(label);
      }
      if (grunnlag.underkategori) {
        const hjemmel = getHjemmelLabel(grunnlag.underkategori);
        if (hjemmel) parts.push(hjemmel);
      }
    }

    if (sporType === 'frist' && frist) {
      if (frist.frist_varsel?.dato_sendt) {
        parts.push(`Varslet ${formatDateShort(frist.frist_varsel.dato_sendt)}`);
      }
      if (frist.krevd_dager != null) {
        parts.push(`Krevd ${frist.krevd_dager} dager`);
      }
      if (frist.spesifisert_varsel?.dato_sendt) {
        parts.push(`Krav fremsatt ${formatDateShort(frist.spesifisert_varsel.dato_sendt)}`);
      }
    }

    if (sporType === 'vederlag' && vederlag) {
      const hovedbelop = vederlag.krevd_belop ?? vederlag.netto_belop ?? vederlag.kostnads_overslag;
      if (hovedbelop != null) parts.push(`Hovedkrav ${formatCurrency(hovedbelop)}`);
      if (vederlag.saerskilt_krav?.rigg_drift?.belop != null) {
        parts.push(`R&D ${formatCurrency(vederlag.saerskilt_krav.rigg_drift.belop)}`);
      }
      if (vederlag.saerskilt_krav?.produktivitet?.belop != null) {
        parts.push(`Prod. ${formatCurrency(vederlag.saerskilt_krav.produktivitet.belop)}`);
      }
    }

    return parts;
  });
</script>

{#if segments.length > 0}
  <div class="meta-sti">
    {#each segments as segment, i (i)}
      {#if i > 0}<span class="dot-sep" aria-hidden="true">·</span>{/if}
      <span>{segment}</span>
    {/each}
  </div>
{/if}

{#if showGap}
  <StatusQuoGap {sporType} {vederlag} {frist} {teNavn} {bhNavn} compact />
{/if}

<style>
  .meta-sti {
    font-family: var(--font-data);
    font-size: 11px;
    font-variant-numeric: tabular-nums;
    color: var(--color-ink-muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .dot-sep {
    color: var(--color-ink-ghost);
    margin: 0 4px;
  }
</style>
