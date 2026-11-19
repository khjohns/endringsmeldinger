<!--
  Gjeldende frist for én frist i fristtabellen (D-9, KA-U77): datoen i kontrakten med forlengelsene
  partene er enige om i andre saker, med lenker til sakene, eller hvorfor den ikke kan regnes
  (MM-U2, KA-U79). Brukes i kortet «Kravet og svaret» (BF-45 U-5) og i kravskjemaet (BF-20 U-2).
-->
<script lang="ts">
  import { sakensNavn, type GjeldendeFrist } from './fristoversikt';
  import { FRISTEN } from './tekster';

  let {
    g,
    registrert,
    sakslenke,
    tillegg = null,
    id,
  }: {
    g: GjeldendeFrist;
    /** Fristen står i fristtabellen. En frist som ikke er registrert, har ingen gjeldende frist. */
    registrert: boolean;
    /** Lenken til en annen sak i prosjektet. */
    sakslenke?: (sakId: string) => string;
    /** En setning etter forlengelsene, når det finnes noen. */
    tillegg?: string | null;
    id?: string;
  } = $props();
</script>

{#if g?.art === 'kjent' && g.forlengelser.length}
  <p class="gjeldende" {id}>
    {FRISTEN.forlenget(g.dato, g.iKontrakten)}
    {#each g.forlengelser as f, i (i)}
      {FRISTEN.sak}
      <!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- kalleren gir lenken løst -->
      {#if sakslenke}<a href={sakslenke(f.sakId)}>{sakensNavn(f)}</a>{:else}{sakensNavn(f)}{/if}
      {FRISTEN.forlengelsen(f.dager)}
    {/each}{#if tillegg}
      {tillegg}{/if}
  </p>
{:else if g?.art === 'kjent'}
  <p class="gjeldende" {id}>{FRISTEN.somIKontrakten(g.dato)}</p>
{:else if g?.art === 'ukjent'}
  <p class="gjeldende" {id}>{FRISTEN.ukjent(g.iKontrakten)}</p>
{:else if !registrert}
  <p class="gjeldende" {id}>{FRISTEN.ikkeRegistrert}</p>
{/if}

<style>
  .gjeldende {
    white-space: pre-line;
    margin-top: var(--spacing-1);
    font-size: 14px;
    color: var(--ink-2);
  }
  .gjeldende a {
    color: var(--ink);
    text-underline-offset: 3px;
  }
  .gjeldende a:hover {
    text-decoration-thickness: 2px;
  }
</style>
