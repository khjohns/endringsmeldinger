<!--
  Datoen TE ble klar over at utgiftene etter punkt 34.1.3 annet ledd ville påløpe, under et brev i
  tråden på siden for vederlaget (U-4, U-7 og U-8 i BF-48): datoen i brevet med den, med datoen den
  endrer og brevet som endret den, at datoen ikke er oppgitt ved varselet, og ved byggherrens svar
  TEs siste opplysning da svaret ble sendt, når TE har oppgitt en ny dato etter svaret. Handlingen
  står ved den siste opplysningen, eller ved varselet når datoen ikke er oppgitt, som
  korrigeringen av datoen i påberopelsen (U-1 i BF-02A).
-->
<script lang="ts">
  import Knapp from './Knapp.svelte';
  import Melding from './Melding.svelte';
  import type { Brevet, Kunnskapsdatoen } from './lesing';
  import { KUNNSKAPSDATO } from './tekster';

  let {
    b,
    traad,
    opplysningene,
    varselbrev,
    vedSvaret,
    lukketVed,
    onkunnskapsdato,
  }: {
    b: Brevet;
    /** Brevene i tråden i rekkefølgen i journalen. */
    traad: Brevet[];
    /** TEs opplysninger om datoen (`kunnskapsdatoene`). */
    opplysningene: Kunnskapsdatoen[];
    /** Brevet med det første varselet etter § 34.1.3, eller `null`. */
    varselbrev: string | null;
    /**
     * Ved byggherrens svar: TEs siste opplysning da svaret ble sendt (`Svarberegning.kunnskapsdato`),
     * `null` når TE ikke hadde oppgitt datoen, og `undefined` for et brev uten svar i vederlaget.
     */
    vedSvaret: string | null | undefined;
    /** Saken var lukket da brevet ble sendt (MM-U50, GR-U27). */
    lukketVed: (brev: string) => boolean;
    /** TE oppgir eller endrer datoen, når kjernen tilbyr det (`oppgi_kunnskapsdato`). */
    onkunnskapsdato?: () => void;
  } = $props();

  const plass = (id: string) => traad.findIndex((x) => x.id === id);
  const iBrevet = $derived(opplysningene.findLast((o) => o.brev.id === b.id) ?? null);
  const siste = $derived(opplysningene.find((o) => o.siste) ?? null);
  const ingen = $derived(siste === null);
  const handling = $derived(
    !!onkunnskapsdato && (iBrevet?.siste || (ingen && varselbrev === b.id))
  );
  // U-8: bare når TE har sendt et eget brev med datoen etter svaret.
  const svaretsOpplysning = $derived.by(() => {
    if (vedSvaret === undefined) return undefined;
    const senere = opplysningene.some((o) => o.egen && plass(o.brev.id) > plass(b.id));
    if (!senere) return undefined;
    return opplysningene.find((o) => o.id === vedSvaret) ?? null;
  });
  // Ved det siste egne brevet, så meldingen ikke gjentas ved hvert brev.
  const staar = $derived(
    iBrevet?.egen && iBrevet.siste
      ? KUNNSKAPSDATO.staar(
          lukketVed(b.id),
          traad
            .slice(0, plass(b.id))
            .findLast((x) => x.art === 'svar' && x.spor.includes('vederlag')) ?? null
        )
      : null
  );
</script>

{#if iBrevet || varselbrev === b.id}
  <div class="datolinje">
    <p>
      {#if iBrevet}
        {KUNNSKAPSDATO.oppgitt(iBrevet.dato)}
        {#if iBrevet.egen}{KUNNSKAPSDATO.endrer(iBrevet.forrige)}{/if}
        {#if iBrevet.endretI}{KUNNSKAPSDATO.endretI(iBrevet.endretI)}{/if}
      {:else if siste}
        {KUNNSKAPSDATO.oppgittSenere(siste)}
      {:else}
        {KUNNSKAPSDATO.ikkeOppgitt}
      {/if}
    </p>
    {#if handling}
      <Knapp
        variant="lenke"
        aria-label={KUNNSKAPSDATO.handlingNavn(!ingen)}
        onclick={() => onkunnskapsdato?.()}
        >{ingen ? KUNNSKAPSDATO.oppgi : KUNNSKAPSDATO.endre}</Knapp
      >
    {/if}
  </div>
{/if}
{#if staar}<Melding art="info" levende={false}>{staar}</Melding>{/if}
{#if svaretsOpplysning !== undefined}
  <Melding art="info" levende={false}>{KUNNSKAPSDATO.vedSvaret(svaretsOpplysning)}</Melding>
{/if}

<style>
  .datolinje {
    font-size: 14px;
    color: var(--ink-2);
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    column-gap: var(--spacing-3);
  }
  .datolinje :global(.knapp) {
    margin-left: calc(-1 * var(--spacing-2));
  }
</style>
