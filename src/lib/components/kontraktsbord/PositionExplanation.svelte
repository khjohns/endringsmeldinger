<script lang="ts">
  import type { SubsidiaerTrigger } from '$lib/types/timeline';
  let {
    subsidiary,
    value,
    rejected,
    triggers = [],
  }: {
    subsidiary: boolean;
    value: string;
    rejected: boolean;
    triggers?: SubsidiaerTrigger[];
  } = $props();
  const labels: Record<SubsidiaerTrigger, string> = {
    grunnlag_avslatt: 'bestridt ansvarsgrunnlag',
    grunnlag_prekludert_32_2: 'for sen varsling av grunnlaget',
    forseringsrett_avslatt: 'bestridt rett til forsering',
    preklusjon_hovedkrav: 'for sen varsling av hovedkravet',
    preklusjon_rigg: 'for sen varsling av rigg og drift',
    preklusjon_produktivitet: 'for sen varsling av produktivitetstap',
    reduksjon_ep_justering: 'for sen varsling av justerte enhetspriser',
    preklusjon_varsel: 'for sen varsling av fristkravet',
    reduksjon_spesifisert: 'for sent spesifisert fristkrav',
    ingen_hindring: 'manglende årsakssammenheng',
    metode_avslatt: 'bestridt beregningsmetode',
  };
  const reasons = $derived([...new Set(triggers)].map((trigger) => labels[trigger]));
</script>

<div class="position-explanation">
  {#if subsidiary}
    <p>Subsidiært vurderes {value}, dersom innsigelsene ikke fører frem.</p>
  {/if}
  {#if reasons.length}
    <p>
      <strong>{rejected ? 'Prinsipalt avslag bygger på' : 'Innsigelser'}:</strong>
      {reasons.join(', ')}.
    </p>
  {:else if rejected}
    <p>Se BHs begrunnelse for årsaken til det prinsipale avslaget.</p>
  {/if}
</div>

<style>
  .position-explanation {
    padding: 12px 20px;
    color: var(--ink-2);
    font-size: 13px;
    line-height: 1.6;
  }
  p {
    margin: 0;
  }
  p + p {
    margin-top: 6px;
  }
</style>
