<!--
  Vederlagskravet fra saksbildet på TS-stien (#667). Bare tilbud kan sendes i
  prøven, så skjemaet viser ikke de andre metodene, de særskilte kravene, varslene
  eller vedleggene (OV-U1). Begrunnelsen er valgfri (oppdragsgiver 17.10). TE ser
  den låste teksten i brevkontrollen før kravet sendes.
-->
<script lang="ts">
  import { createLetterConfirmation } from '$lib/approval/claimReview.svelte';
  import { letterText } from '$lib/approval/letter';
  import {
    VEDERLAGSMETODE_DESCRIPTIONS,
    getVederlagsmetodeShortLabel,
  } from '$lib/constants/paymentMethods';
  import { vederlagskrav } from '$lib/kjernesak/vederlagskrav';
  import type { Kjernesakkontekst } from '$lib/kjernesak/kontekst.svelte';
  import FormPageHeader from '$lib/components/kontraktsbord/components/FormPageHeader.svelte';
  import FormSection from '$lib/components/kontraktsbord/components/FormSection.svelte';
  import NumberField from '$lib/components/kontraktsbord/components/NumberField.svelte';
  import ReasoningEditor from '$lib/components/kontraktsbord/components/ReasoningEditor.svelte';
  import Brevkontroll from './Brevkontroll.svelte';

  let {
    kjernesak,
    sakstittel,
    onsendt,
    onavbryt,
  }: {
    kjernesak: Kjernesakkontekst;
    sakstittel: string;
    onsendt: () => void;
    onavbryt: () => void;
  } = $props();

  const METODE = 'FASTPRIS_TILBUD';
  const brevkontroll = createLetterConfirmation<{ tekst: string[]; utdypning?: string }>();
  let beloep = $state<number | undefined>(undefined);
  let begrunnelse = $state('');
  const kanSende = $derived((beloep ?? 0) > 0 && !kjernesak.sender);

  async function send() {
    if (!kanSende || beloep === undefined) return;
    const kommando = vederlagskrav({
      metode: METODE,
      beloep,
      utdypning: letterText(begrunnelse),
    });
    const tekst = kjernesak.brevtekst(kommando);
    // Uten tekst godtar ikke kjernen kravet, og serveren avviser det med sin begrunnelse.
    if (tekst) {
      try {
        await brevkontroll.show({ tekst, utdypning: kommando.utdypning });
      } catch {
        return;
      }
    }
    if (await kjernesak.send(kommando)) onsendt();
  }
</script>

{#if brevkontroll.letter}
  <Brevkontroll
    tekst={brevkontroll.letter.tekst}
    utdypning={brevkontroll.letter.utdypning}
    tittel="Vederlag – {sakstittel}"
    beskrivelse="Kravet sendes først når du bekrefter."
    onbekreft={brevkontroll.confirm}
    onavbryt={brevkontroll.cancel}
  />
{/if}

<div class="vederlagsskjema" hidden={Boolean(brevkontroll.letter)}>
  <FormPageHeader
    title="Krav om vederlagsjustering"
    intro="Oppgi den faste prisen du tilbyr for endringen."
  />
  {#if kjernesak.feil}<p role="alert" class="feil">{kjernesak.feil}</p>{/if}

  <FormSection title="Beregningsmetode" paragrafRef="§ 34.2.1">
    <p class="metode">{getVederlagsmetodeShortLabel(METODE)}</p>
    <p class="helptext">{VEDERLAGSMETODE_DESCRIPTIONS[METODE]}</p>
  </FormSection>

  <FormSection title="Hovedkrav">
    <NumberField
      id="kjerne-vederlag-beloep"
      label="Fast pris"
      suffix="kr"
      value={beloep}
      onchange={(v) => (beloep = v)}
    />
  </FormSection>

  <ReasoningEditor
    paragrafRef="§ 34.2"
    helptext="Valgfri. Begrunnelsen følger kravet som utdypning under den låste teksten."
    body={begrunnelse}
    placeholder="Begrunn kravets omfang …"
    onchange={(html) => (begrunnelse = html)}
    oncharcount={() => {}}
  />

  <div class="knapper">
    <button type="button" class="sekundaer" onclick={onavbryt}>Avbryt</button>
    <button type="button" class="primaer" disabled={!kanSende} onclick={send}>
      {kjernesak.sender ? 'Sender …' : 'Se brev og send'}
    </button>
  </div>
</div>

<style>
  .vederlagsskjema {
    display: grid;
    gap: 0;
  }
  .metode {
    margin: 0 0 4px;
    font-weight: 600;
    font-size: 14px;
  }
  .feil {
    margin: 0 0 16px;
    padding: 10px 12px;
    border: 1px solid var(--color-danger, #c0392b);
    border-radius: 8px;
    font-size: 14px;
  }
  .knapper {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
  }
  .knapper button {
    border-radius: 8px;
    padding: 8px 14px;
    font: inherit;
    font-size: 14px;
    cursor: pointer;
    border: 1px solid var(--border);
    background: var(--surface);
    color: var(--ink);
  }
  .knapper .primaer {
    background: var(--brand);
    border-color: var(--brand);
    color: var(--surface);
  }
  .knapper button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>
