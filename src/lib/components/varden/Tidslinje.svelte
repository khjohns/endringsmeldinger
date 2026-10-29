<!--
  Tidslinja i sporet (Varden, valget 27.10 i #1331): datoene partene har oppgitt (ring), brev
  som er sendt (fylt prikk) og brev som er registrert (firkant), med kilden for hver. Ingen
  dager mellom oppføringene: avstanden mellom to tilfeldige oppføringer kan se ut som et
  varslingsintervall. Står åpen fra starten og kan legges sammen (oppdragsgiver 29.10, #1391).
-->
<script lang="ts">
  import { ChevronRight } from 'lucide-svelte';
  import type { Brevet, OppgittDato } from './lesing';
  import { OPPGITT, TIDSLINJE, brevtittel, dato, klokke } from './prototypetekst';

  let {
    brev,
    datoer,
    aapen = true,
  }: { brev: Brevet[]; datoer: OppgittDato[]; aapen?: boolean } = $props();

  type Oppfoering = {
    noekkel: string;
    naar: string;
    merke: 'oppgitt' | 'sendt' | 'registrert';
    hva: string;
    kilde: string;
  };

  const oppfoeringer = $derived<Oppfoering[]>(
    [
      ...datoer.map(
        (d): Oppfoering => ({
          noekkel: `${d.hva}-${d.brev}-${d.dato}`,
          naar: d.dato,
          merke: 'oppgitt',
          hva: OPPGITT[d.hva],
          kilde: TIDSLINJE.oppgitt(d.oppgittAv, d.brev),
        })
      ),
      ...brev.map(
        (b): Oppfoering => ({
          noekkel: b.id,
          naar: b.registrert,
          merke: b.art === 'registrert' ? 'registrert' : 'sendt',
          hva: `Brev ${b.nummer} · ${brevtittel(b)}`,
          kilde:
            b.art === 'registrert'
              ? TIDSLINJE.registrert(b.avsender)
              : `${TIDSLINJE.sendt(b.avsender)} kl. ${klokke(b.registrert)}`,
        })
      ),
    ].sort((a, b) => a.naar.localeCompare(b.naar))
  );
</script>

<section class="kort" aria-label={TIDSLINJE.tittel}>
  <details open={aapen}>
    <summary>
      <span class="tittel">{TIDSLINJE.tittel}</span>
      <span class="antall">{TIDSLINJE.oppfoeringer(oppfoeringer.length)}</span>
      <ChevronRight size={16} aria-hidden="true" />
    </summary>
    {#if oppfoeringer.length}
      <ol class="liste">
        {#each oppfoeringer as o (o.noekkel)}
          <li class="rad">
            <span class="merke merke-{o.merke}" aria-hidden="true"></span>
            <div>
              <p class="naar">{dato(o.naar)}</p>
              <p class="hva">{o.hva}</p>
              <p class="kilde">{o.kilde}</p>
            </div>
          </li>
        {/each}
      </ol>
    {:else}
      <p class="tom">{TIDSLINJE.tom}</p>
    {/if}
  </details>
</section>

<style>
  .kort {
    background: var(--surface);
    border: var(--rule);
    border-radius: 12px;
  }
  summary {
    display: flex;
    align-items: center;
    gap: var(--spacing-2);
    min-height: 48px;
    padding: var(--spacing-3) var(--spacing-5);
    cursor: pointer;
    list-style: none;
    border-radius: 12px;
  }
  summary:hover {
    background: var(--surface-inset);
  }
  summary::-webkit-details-marker {
    display: none;
  }
  summary:focus-visible {
    outline: 2px solid var(--control-focus);
    outline-offset: 2px;
  }
  summary :global(svg) {
    color: var(--ink-3);
    transition: transform 150ms cubic-bezier(0.23, 1, 0.32, 1);
  }
  details[open] summary :global(svg) {
    transform: rotate(90deg);
  }
  @media (prefers-reduced-motion: reduce) {
    summary :global(svg) {
      transition: none;
    }
  }
  .tittel {
    font-size: 16px;
    font-weight: 600;
    margin-right: auto;
  }
  .antall {
    color: var(--ink-3);
    font-size: 13px;
  }
  .liste {
    padding: 0 var(--spacing-5) var(--spacing-5);
    display: flex;
    flex-direction: column;
    gap: var(--spacing-4);
  }
  .rad {
    display: grid;
    grid-template-columns: 12px 1fr;
    gap: var(--spacing-3);
    align-items: start;
  }
  .merke {
    width: 10px;
    height: 10px;
    margin-top: 6px;
    border: 2px solid var(--ink-2);
  }
  .merke-oppgitt {
    border-radius: 50%;
    background: var(--surface);
  }
  .merke-sendt {
    border-radius: 50%;
    background: var(--ink-2);
  }
  .merke-registrert {
    background: var(--surface);
  }
  .naar {
    font-weight: 600;
    font-size: 14px;
  }
  .hva {
    font-size: 14px;
  }
  .kilde,
  .tom {
    color: var(--ink-3);
    font-size: 13px;
  }
  .tom {
    padding: 0 var(--spacing-5) var(--spacing-5);
  }
</style>
