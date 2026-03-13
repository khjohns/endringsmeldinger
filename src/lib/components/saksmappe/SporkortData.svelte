<script lang="ts">
  import type {
    SporType,
    GrunnlagTilstand,
    VederlagTilstand,
    FristTilstand,
  } from '$lib/types/timeline';
  import { formatDateShort } from '$lib/utils/formatters';
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

  // Left-side descriptive segments (method, category, revision)
  const leftSegments = $derived.by(() => {
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
      if (frist.ny_sluttdato) {
        parts.push(`Ny dato ${formatDateShort(frist.ny_sluttdato)}`);
      }
    }

    return parts;
  });

  const hasContent = $derived(leftSegments.length > 0);
</script>

{#if hasContent}
  <div class="kort-data">
    <div class="meta-sti">
      {#each leftSegments as segment, i (i)}
        {#if i > 0}
          <span class="dot-sep" aria-hidden="true">&middot;</span>
        {/if}
        <span>{segment}</span>
      {/each}
    </div>
  </div>
{/if}

{#if showGap}
  <StatusQuoGap {sporType} {vederlag} {frist} {teNavn} {bhNavn} compact />
{/if}

<style>
  .kort-data {
    display: flex;
    align-items: baseline;
    min-width: 0;
  }

  .meta-sti {
    font-family: var(--font-data);
    font-size: 11px;
    font-variant-numeric: tabular-nums;
    color: var(--color-ink-muted);
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
    overflow: hidden;
    flex-wrap: wrap;
  }

  .dot-sep {
    color: var(--color-ink-ghost);
  }
</style>
