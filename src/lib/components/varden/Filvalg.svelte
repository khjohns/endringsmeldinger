<!--
  Filvalget i Varden (F-7 i BF-05, #1037): nettleserens filvelger, som i skissen, med
  filene lastet opp etter hvert som de velges. Skjemaet for ny sak bruker det for vedleggene
  før saken finnes, og det skal også brukes for dokumentet med et varsel som alt er sendt
  (VS-U38, OV-U79). Grensen `lastOpp` gir vedlegget fra mellomlageret, så brevet binder det.
-->
<script lang="ts">
  import Knapp from './Knapp.svelte';
  import { NYSAK } from './tekster';
  import { STOERSTE_VEDLEGG, type Kjernevedlegg, type VedleggForNySak } from './nysak';

  let {
    id,
    etikett,
    hjelp,
    grense,
    vedlegg = $bindable([]),
    laster = $bindable(false),
    feil = null,
  }: {
    id: string;
    etikett: string;
    hjelp: string;
    grense: VedleggForNySak;
    vedlegg?: Kjernevedlegg[];
    /** Sann mens en fil lastes opp, så skjemaet kan vente med brevet. */
    laster?: boolean;
    /** Feilen skjemaet viser ved feltet. */
    feil?: string | null;
  } = $props();

  let venter = $state<string[]>([]);
  let opplastingsfeil = $state<string[]>([]);
  const feilene = $derived([...(feil ? [feil] : []), ...opplastingsfeil]);

  const stoerrelse = (b: number) =>
    b < 1024 * 1024
      ? `${Math.max(1, Math.round(b / 1024))} kB`
      : `${(b / 1024 / 1024).toLocaleString('nb-NO', { maximumFractionDigits: 1 })} MB`;

  async function velg(e: Event & { currentTarget: HTMLInputElement }) {
    const filer = [...(e.currentTarget.files ?? [])];
    e.currentTarget.value = '';
    opplastingsfeil = [];
    for (const fil of filer) {
      if (fil.size > STOERSTE_VEDLEGG) {
        opplastingsfeil = [...opplastingsfeil, NYSAK.forStorFil(fil.name)];
        continue;
      }
      venter = [...venter, fil.name];
      laster = true;
      try {
        const lastet = await grense.lastOpp(fil);
        vedlegg = [...vedlegg, lastet];
      } catch (f) {
        const melding = f instanceof Error ? f.message : String(f);
        opplastingsfeil = [...opplastingsfeil, NYSAK.vedleggFeilet(fil.name, melding)];
      } finally {
        venter = venter.filter((n, i) => i !== venter.indexOf(fil.name));
        laster = venter.length > 0;
      }
    }
  }

  async function fjern(v: Kjernevedlegg) {
    vedlegg = vedlegg.filter((x) => x.vedlegg_id !== v.vedlegg_id);
    // Et vedlegg som ikke slettes, blir liggende ubundet i mellomlageret og ved ikke brevet.
    await grense.slett(v.vedlegg_id).catch(() => {});
  }
</script>

<div class="felt">
  <label for={id}>{etikett}</label>
  <p class="hjelp" id={`${id}-hjelp`}>{hjelp}</p>
  <!-- Nettleserens tekst («Ingen fil valgt») sier ikke hva som er lastet opp, så knappen er
       bildet under den gjennomsiktige velgeren, og lista under viser filene. -->
  <div class="velger">
    <input
      {id}
      type="file"
      multiple
      aria-invalid={feilene.length ? 'true' : undefined}
      aria-describedby={`${id}-hjelp${feilene.length ? ` ${id}-feil` : ''}`}
      onchange={velg}
    />
    <span class="velg" aria-hidden="true">{NYSAK.velgFiler}</span>
  </div>
  {#if vedlegg.length || venter.length}
    <ul class="filer">
      {#each vedlegg as v (v.vedlegg_id)}
        <li>
          <span class="navn">{v.filnavn}</span>
          <span class="stoerrelse">{stoerrelse(v.stoerrelse)}</span>
          <Knapp
            variant="lenke"
            aria-label={NYSAK.fjernVedleggNavn(v.filnavn)}
            onclick={() => fjern(v)}
          >
            {NYSAK.fjernVedlegg}
          </Knapp>
        </li>
      {/each}
      {#each venter as navn, i (`${navn}-${i}`)}
        <li class="venter">{NYSAK.lasterOpp(navn)}</li>
      {/each}
    </ul>
  {/if}
  <div id={`${id}-feil`} aria-live="polite">
    {#each feilene as f, i (i)}
      <p class="feil">{f}</p>
    {/each}
  </div>
</div>

<style>
  .felt {
    display: grid;
    gap: var(--spacing-2);
  }
  label {
    font-weight: 600;
    color: var(--ink);
  }
  .hjelp {
    margin: 0;
    color: var(--ink-3);
  }
  .velger {
    position: relative;
    justify-self: start;
  }
  /* Velgeren er skjult, men tar fokus og tastetrykk; knappen under viser fokuset. */
  input {
    position: absolute;
    inset: 0;
    inline-size: 100%;
    block-size: 100%;
    opacity: 0;
    cursor: pointer;
  }
  .velg {
    display: inline-flex;
    align-items: center;
    min-height: 44px;
    padding: 0 var(--spacing-5);
    border: 1.5px solid var(--ink);
    border-radius: var(--r-knapp);
    background: var(--surface);
    color: var(--ink);
    font-weight: 500;
    transition: background-color 150ms cubic-bezier(0.23, 1, 0.32, 1);
  }
  .velger:hover .velg {
    background: var(--surface-inset);
  }
  input:focus-visible + .velg {
    outline: 2px solid var(--control-focus);
    outline-offset: 2px;
  }
  input[aria-invalid='true'] + .velg {
    border-color: var(--danger);
  }
  .filer {
    display: grid;
    margin: 0;
    padding: 0;
    list-style: none;
    border-top: var(--rule);
  }
  .filer li {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto auto;
    align-items: center;
    column-gap: var(--spacing-3);
    min-height: 44px;
    border-bottom: var(--rule);
  }
  .navn {
    color: var(--ink);
    overflow-wrap: anywhere;
  }
  .stoerrelse {
    color: var(--ink-3);
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }
  .venter {
    color: var(--ink-3);
  }
  .feil {
    margin: 0;
    color: var(--danger);
    font-size: 14px;
    font-weight: 500;
  }
</style>
