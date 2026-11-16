<!--
  Linja øverst i krav- og svarskjemaet når kravet eller svaret legges til fra korrespondanse sendt
  utenfor løsningen (OV-U80): hvilken korrespondanse det er, at løsningen ikke lager brevtekst, og
  veien tilbake til korrespondansen.
-->
<script lang="ts">
  import { FileText } from 'lucide-svelte';
  import type { Part } from '$kjerne/typer';
  import Knapp from './Knapp.svelte';
  import type { Korrespondansevalg } from './korrespondansen';
  import { LEGG_TIL, omtalenAvKorrespondansen } from './tekster';

  let {
    part,
    valg,
    onendre,
  }: {
    part: Part;
    valg: Korrespondansevalg;
    onendre: () => void;
  } = $props();
</script>

<div class="lagt-til">
  <FileText size={16} aria-hidden="true" />
  <div>
    <p>
      {LEGG_TIL.fra(
        valg.type ? omtalenAvKorrespondansen(part, valg.type, valg.dato) : LEGG_TIL.tittel
      )}
    </p>
    <p class="dempet">{LEGG_TIL.fraHjelp}</p>
    <Knapp variant="lenke" kompakt onclick={onendre}>{LEGG_TIL.endre}</Knapp>
  </div>
</div>

<style>
  .lagt-til {
    display: flex;
    gap: var(--spacing-3);
    padding: var(--spacing-3) var(--spacing-6);
    background: var(--surface-inset);
    border-top: var(--rule);
    border-bottom: var(--rule);
    font-size: 14px;
  }
  .lagt-til :global(svg) {
    flex: none;
    margin-top: 3px;
  }
  .lagt-til > div {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: var(--spacing-1);
  }
  .dempet {
    color: var(--ink-3);
  }
</style>
