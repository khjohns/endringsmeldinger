<!--
  KONSEPT (#1331): veiene videre for TE som er uenig i svaret, gruppert etter standpunktene
  i svaret. Standpunktene og handlingene leses fra kjernen; teksten og statusen står i
  `tekst.ts`. Ingen vei kan velges her, så konseptet sender aldri noe.
-->
<script lang="ts">
  import type { Svar } from '$kjerne/typer';
  import {
    STATUSNAVN,
    UENIG,
    innsigelse,
    nyVersjon,
    protest,
    varsel,
    vente,
    type Vei,
  } from './tekst';

  let {
    svaret,
    nummer,
    handlinger,
  }: {
    svaret: Svar;
    /** Brevnummeret svaret står i. */
    nummer: number;
    /** Handlingene kjernen tilbyr i sporet, som `krav:vederlag`. */
    handlinger: string[];
  } = $props();

  const spor = $derived(svaret.spor);
  const paaberopt = $derived(
    svaret.standpunkter.find((s) => s.art === 'rettidighet' && !s.iTide) ?? null
  );
  const hjemmel = $derived(paaberopt?.art === 'rettidighet' ? paaberopt.hjemmel : null);
  const beloep = $derived(svaret.standpunkter.find((s) => s.art === 'beloep') ?? null);

  const grupper = $derived(
    [
      hjemmel && {
        tittel: UENIG.prinsipalt(hjemmel),
        veier: [protest, ...(handlinger.includes(`varsle:${spor}`) ? [varsel(nummer)] : [])],
      },
      beloep?.art === 'beloep' &&
        handlinger.includes(`krav:${spor}`) && {
          tittel: UENIG.beloep(hjemmel !== null, beloep.godkjent),
          veier: [nyVersjon(nummer, beloep.godkjent, hjemmel)],
        },
      {
        tittel: UENIG.svaret(nummer),
        veier: [...(handlinger.includes(`innsigelse:${svaret.id}`) ? [innsigelse] : []), vente],
      },
    ].filter((g): g is { tittel: string; veier: Vei[] } => !!g)
  );
</script>

<section class="uenig" aria-labelledby="uenig-tittel">
  <header>
    <h3 id="uenig-tittel">{UENIG.tittel}</h3>
    <span class="merke">{UENIG.merke}</span>
  </header>
  <p class="dempet">{UENIG.intro}</p>
  {#each grupper as g (g.tittel)}
    <div class="gruppe">
      <h4>{g.tittel}</h4>
      <ul>
        {#each g.veier as v (v.tittel)}
          <li>
            <p class="vei">
              <strong>{v.tittel}</strong>
              <span class="status status-{v.status}">{STATUSNAVN[v.status]}</span>
            </p>
            <p>{v.tekst}</p>
            <p class="dempet">{v.mangler}</p>
          </li>
        {/each}
      </ul>
    </div>
  {/each}
</section>

<style>
  .uenig {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-3);
  }
  header {
    display: flex;
    align-items: center;
    gap: var(--spacing-2);
  }
  h3 {
    font-size: 13px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--ink-2);
  }
  .merke,
  .status {
    padding: 0 var(--spacing-2);
    border: 1px dashed var(--draft-border);
    border-radius: 999px;
    background: var(--draft-bg);
    color: var(--ink-2);
    font-size: 12px;
    font-weight: 500;
    white-space: nowrap;
  }
  .status-kjernen {
    border-style: solid;
    border-color: var(--rule-color);
    background: var(--surface);
  }
  .gruppe {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-2);
    padding-top: var(--spacing-3);
    border-top: var(--rule);
  }
  h4 {
    font-size: 14px;
    font-weight: 600;
    color: var(--ink);
  }
  ul {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-3);
  }
  li {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-1);
    padding-left: var(--spacing-3);
    border-left: 2px solid var(--draft-border);
  }
  .vei {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: var(--spacing-2);
  }
  .dempet {
    color: var(--ink-3);
    font-size: 13px;
  }
</style>
