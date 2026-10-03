<script lang="ts">
  import VedleggPanel from './VedleggPanel.svelte';
  import CaseAnchor from './CaseAnchor.svelte';
  import UtkastStatus from './UtkastStatus.svelte';
  import type { UtkastStatus as UtkastStatusVerdi } from '$lib/kontraktsbord/submission.svelte';

  let {
    sender,
    feil,
    utkastStatus,
    konflikt,
    sistEndretAv,
    behold,
    hentInn,
    sakId,
    visVedlegg,
    vedleggIds = $bindable(),
    vedleggOpptatt = $bindable(),
  }: {
    sender: boolean;
    feil: string | null | undefined;
    utkastStatus: UtkastStatusVerdi;
    konflikt: { oppdatert_av: string } | null;
    sistEndretAv: string | null;
    behold: () => void;
    hentInn: () => void;
    sakId: string;
    visVedlegg: boolean;
    vedleggIds: string[];
    vedleggOpptatt: boolean;
  } = $props();
</script>

{#if sender}<p role="status">Sender …</p>{/if}
{#if feil}<p role="alert">{feil}</p>{/if}
<UtkastStatus status={utkastStatus} {konflikt} {sistEndretAv} {behold} {hentInn} />
<CaseAnchor />
{#if visVedlegg}
  <details>
    <summary>Vedlegg (valgfritt){vedleggIds.length ? ` · ${vedleggIds.length} valgt` : ''}</summary>
    <VedleggPanel
      {sakId}
      valgbare
      bind:valgte={vedleggIds}
      bind:opptatt={vedleggOpptatt}
      disabled={sender}
    />
  </details>
{/if}
