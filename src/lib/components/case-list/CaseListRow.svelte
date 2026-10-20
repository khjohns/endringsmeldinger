<script lang="ts">
  import type { Sakslinje } from '$lib/types/api';
  import Badge from '$lib/components/primitives/Badge.svelte';
  import { formatDateShort } from '$lib/utils/formatters';
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import {
    betegnelsesmerke,
    fristtall,
    kategoritekst,
    sporetiketter,
    vederlagstall,
  } from './presentation';

  interface Props {
    linje: Sakslinje;
    prosjektId: string;
    href?: string;
  }

  let { linje, prosjektId, href }: Props = $props();

  const path = $derived(
    href ??
      resolve('/[prosjektId]/[sakId]', {
        prosjektId: encodeURIComponent(prosjektId),
        sakId: encodeURIComponent(linje.sak_id),
      })
  );
  const tittel = $derived(linje.sakstittel ?? 'Uten tittel');
  const merke = $derived(betegnelsesmerke(linje));
  const etiketter = $derived(merke ? [] : sporetiketter(linje));
  const vederlag = $derived(vederlagstall(linje));
  const frist = $derived(fristtall(linje));
  const sisteAktivitet = $derived(formatDateShort(linje.siste_hendelse));

  function handleRowClick(event: MouseEvent) {
    // Let native links handle keyboard activation and opening a new tab.
    if (event.target instanceof Element && event.target.closest('a, button')) return;
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
      return;
    if (window.getSelection()?.toString()) return;
    // Allerede resolvet der verdien bygges.
    // eslint-disable-next-line svelte/no-navigation-without-resolve
    goto(path);
  }
</script>

<tr class="row" onclick={handleRowClick}>
  <td class="cell cell-id">
    <!-- Allerede resolvet der verdien bygges. -->
    <!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
    <a href={path} class="row-link" aria-label="Åpne sak {linje.sak_id}">
      <span class="sak-id">{linje.sak_id}</span>
    </a>
  </td>
  <td class="cell cell-tittel">
    <span class="cell-text">{tittel}</span>
    <span class="case-type">KOE-krav</span>
  </td>
  <td class="cell cell-status">
    <div class="cell-inner">
      {#if merke}<Badge variant={merke.variant}>{merke.label}</Badge>
      {:else if etiketter.length}<ul class="spor-etiketter">
          {#each etiketter as e (e.spor)}<li><strong>{e.spor}:</strong> {e.tekst}</li>{/each}
        </ul>
      {:else}<span class="cell-text cell-text-muted">—</span>{/if}
    </div>
  </td>
  <td class="cell cell-kategori">
    <span class="cell-text cell-text-muted">{kategoritekst(linje) || '—'}</span>
  </td>
  <td class="cell cell-num cell-belop">
    <span class="cell-text cell-text-num" aria-label={`Krevd vederlag: ${vederlag.kravtekst}`}
      >{vederlag.kravtekst}</span
    >
    {#if vederlag.under}<span class="value-label">{vederlag.under}</span>{/if}
  </td>
  <td class="cell cell-num cell-dager">
    <span class="cell-text cell-text-num" aria-label={`Krevd frist: ${frist.kravtekst}`}
      >{frist.kravtekst}</span
    >
    {#if frist.under}<span class="value-label">{frist.under}</span>{/if}
  </td>
  <td class="cell cell-date">
    <span class="cell-text cell-text-date">{sisteAktivitet}</span>
  </td>
</tr>

<style>
  .row {
    border-bottom: 1px solid var(--color-wire);
    cursor: pointer;
  }

  .row:hover {
    background: var(--color-felt-hover);
  }

  .row:last-child {
    border-bottom: none;
  }

  .cell {
    padding: 0;
  }

  .cell-inner {
    display: flex;
    align-items: center;
    padding: 10px 12px;
  }

  .cell-text {
    display: block;
    padding: 10px 12px;
    font-size: 13px;
    line-height: 1.4;
    color: var(--color-ink);
  }

  .cell-text-muted {
    color: var(--color-ink-secondary);
    font-size: 12px;
  }

  .cell-tittel .cell-text {
    padding-bottom: 3px;
  }

  .case-type {
    display: block;
    padding: 0 12px 10px;
    color: var(--color-ink-muted);
    font-size: 10px;
    font-weight: 550;
  }

  .spor-etiketter {
    margin: 0;
    padding: 0;
    list-style: none;
    color: var(--color-ink-secondary);
    font-size: 11px;
    line-height: 1.45;
  }

  .spor-etiketter strong {
    color: var(--color-ink);
    font-weight: 600;
  }

  .value-label {
    display: block;
    margin-top: -6px;
    padding: 0 12px 10px;
    color: var(--color-ink-muted);
    font-size: 10px;
    text-align: right;
  }

  .cell-text-num {
    font-family: var(--font-data);
    font-size: 12px;
    font-variant-numeric: tabular-nums;
    display: block;
    text-align: right;
    padding: 10px 12px;
    color: var(--color-ink-secondary);
  }

  .cell-text-date {
    font-family: var(--font-data);
    font-size: 12px;
    color: var(--color-ink-muted);
  }

  .row-link {
    background: transparent;
    border: 0;
    font: inherit;
    cursor: pointer;
    text-align: left;
    display: block;
    padding: 10px 12px;
    color: inherit;
    text-decoration: none;
    line-height: 1.4;
  }

  .row-link:focus-visible {
    outline: 2px solid var(--color-wire-focus);
    outline-offset: -2px;
  }

  .sak-id {
    font-family: var(--font-data);
    font-size: 12px;
    color: var(--color-ink-secondary);
  }
</style>
