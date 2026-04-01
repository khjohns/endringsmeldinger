<script lang="ts">
  import { AlertTriangle, Check, X, CircleMinus } from 'lucide-svelte';
  import { beregnAlt, getDefaults } from '$lib/domain/fristDomain';
  import type { FristFormState, FristDomainConfig } from '$lib/domain/fristDomain';
  import { DD, TE } from './data.js';
  import Stamp from './Stamp.svelte';
  import CaseAnchor from './CaseAnchor.svelte';
  import { toggleChoice } from './utils.js';

  let { onclose }: { onclose: () => void } = $props();

  const d = DD.frist;

  /**
   * Mock domain config for KOE-104: TE claimed 14 days, sent as spesifisert krav.
   * In production this is derived from case state in +page.svelte.
   */
  const domainConfig: FristDomainConfig = {
    varselType: 'spesifisert',
    krevdDager: d.te.value!,
    erSvarPaForesporsel: false,
    harTidligereVarselITide: true,
    erGrunnlagSubsidiaer: true,
    erHelFristSubsidiaerPgaGrunnlag: false,
  };

  const initialDefaults = getDefaults({
    krevdDager: domainConfig.krevdDager,
    isUpdateMode: false,
  });

  let fristVarselOk = $state<boolean | undefined>(initialDefaults.fristVarselOk);
  let spesifisertKravOk = $state<boolean | undefined>(initialDefaults.spesifisertKravOk);
  let foresporselSvarOk = $state<boolean | undefined>(initialDefaults.foresporselSvarOk);
  let vilkarOppfylt = $state<boolean | undefined>(initialDefaults.vilkarOppfylt);
  let sendForesporsel = $state<boolean>(initialDefaults.sendForesporsel);
  let godkjentDager = $state<number | undefined>(initialDefaults.godkjentDager);

  const formState: FristFormState = $derived({
    fristVarselOk,
    spesifisertKravOk,
    foresporselSvarOk,
    vilkarOppfylt,
    sendForesporsel,
    godkjentDager,
    begrunnelse: '',
    begrunnelseValidationError: undefined,
  });

  const computed = $derived(beregnAlt(formState, domainConfig));

  const resultat = $derived.by(() => {
    const r = computed.prinsipaltResultat;
    if (r === 'godkjent') return { ikon: Check, label: 'Godkjent', color: 'var(--green)' };
    if (r === 'delvis_godkjent')
      return { ikon: CircleMinus, label: 'Delvis godkjent', color: 'var(--ochre)' };
    return { ikon: X, label: 'Avslått', color: 'var(--red)' };
  });

  const allAnswered = $derived.by(() => {
    if (sendForesporsel) return true;
    if (computed.visibility.showFristVarselOk && fristVarselOk === undefined) return false;
    if (computed.visibility.showSpesifisertKravOk && spesifisertKravOk === undefined) return false;
    if (computed.visibility.showForesporselSvarOk && foresporselSvarOk === undefined) return false;
    if (vilkarOppfylt === undefined) return false;
    if (computed.showGodkjentDager && godkjentDager === undefined) return false;
    return true;
  });
</script>

<div class="form-content">
  <CaseAnchor />

  <div class="te-context">
    <div class="context-header">
      <div class="context-label-row">
        <d.icon size={14} style="color: var(--ink-3)" />
        <span class="context-label">{d.label} — {TE}s krav</span>
      </div>
      <span class="font-mono context-ref">§ 33.1</span>
    </div>
    <div class="font-mono context-value">{d.te.value} dager</div>
    <p class="font-serif context-text">{d.teT}</p>
  </div>

  <div class="bh-heading">Byggherrens standpunkt</div>

  {#if domainConfig.erGrunnlagSubsidiaer}
    <div class="sub-banner">
      <Stamp variant="ochre" small flat>Subsidiært</Stamp>
      <p class="font-serif sub-banner-text">
        Grunnlaget er avslått. Vurderingen nedenfor gjelder for det tilfelle at grunnlaget likevel
        godkjennes.
      </p>
    </div>
  {/if}

  {#snippet yesNoPill(
    label: string,
    ref: string,
    text: string,
    answer: boolean | undefined,
    yesText: string,
    noText: string,
    onset: (v: boolean | undefined) => void,
    opts?: { subsidiaer?: boolean; alertHtml?: string }
  )}
    <div class="question-block">
      <div class="question-header">
        <span class="question-label">{label}</span>
        <span class="font-mono question-ref">{ref}</span>
      </div>
      <p class="question-text">{text}</p>
      {#if opts?.subsidiaer}
        <Stamp variant="ochre" small flat>Subsidiært</Stamp>
      {/if}
      <div class="pill-row">
        <button
          class="pill"
          class:yes={answer === true}
          onclick={() => onset(toggleChoice(answer, true))}>{yesText}</button
        >
        <button
          class="pill"
          class:no={answer === false}
          onclick={() => onset(toggleChoice(answer, false))}>{noText}</button
        >
      </div>
      {#if answer === false && opts?.alertHtml}
        <div class="alert-box warning">
          <AlertTriangle size={14} />
          <span>{@html opts.alertHtml}</span>
        </div>
      {/if}
    </div>
  {/snippet}

  {#if computed.visibility.showFristVarselOk}
    {@render yesNoPill(
      'Foreløpig varsel',
      '§ 33.4',
      'Ble varselet om fristforlengelse fremsatt uten ugrunnet opphold?',
      fristVarselOk,
      'Ja, i tide',
      'Nei, prekludert',
      (v) => (fristVarselOk = v),
      {
        alertHtml:
          '<strong>Preklusjon</strong> — Det foreløpige varselet vurderes som for sent. Kravet er tapt (§ 33.4).',
      }
    )}
    <div class="divider"></div>
  {/if}

  {#if computed.visibility.showSpesifisertKravOk}
    {@render yesNoPill(
      'Fremsatt krav',
      '§ 33.6.1',
      'Ble kravet fremsatt uten ugrunnet opphold?',
      spesifisertKravOk,
      'Ja, i tide',
      'Nei, for sent',
      (v) => (spesifisertKravOk = v),
      {
        subsidiaer: computed.port1bErSubsidiaer,
        alertHtml:
          '<strong>Reduksjon</strong> — Det fremsatte kravet vurderes som for sent. Fristforlengelsen reduseres til det åpenbare (§ 33.6.1).',
      }
    )}
    <div class="divider"></div>
  {/if}

  {#if computed.visibility.showForesporselSvarOk}
    {@render yesNoPill(
      'Svar på forespørsel',
      '§ 33.6.2',
      'Svarte TE på forespørsel om spesifisering uten ugrunnet opphold?',
      foresporselSvarOk,
      'Ja, i tide',
      'Nei, prekludert',
      (v) => (foresporselSvarOk = v),
      {
        alertHtml:
          '<strong>Preklusjon</strong> — Svaret vurderes som for sent. Kravet er tapt (§ 33.6.2).',
      }
    )}
    <div class="divider"></div>
  {/if}

  {@render yesNoPill(
    'Årsakssammenheng',
    '§ 33.1',
    'Foreligger det en hindring på fremdriften som følge av det påberopte kontraktsforholdet?',
    vilkarOppfylt,
    'Ja, hindring',
    'Nei, ingen hindring',
    (v) => (vilkarOppfylt = v),
    { subsidiaer: computed.port2ErSubsidiaer }
  )}

  <div class="divider"></div>

  {#if computed.visibility.showSendForesporsel}
    <div class="question-block">
      <label class="checkbox-row">
        <input
          type="checkbox"
          checked={sendForesporsel}
          onchange={(e) => (sendForesporsel = e.currentTarget.checked)}
        />
        <div>
          <span class="checkbox-label">Send forespørsel om spesifisering</span>
          <span class="font-mono question-ref" style="display: inline; margin-left: 8px"
            >§ 33.6.2</span
          >
          <p class="checkbox-desc">Be TE spesifisere kravet med antall dager og begrunnelse.</p>
        </div>
      </label>
    </div>
    <div class="divider"></div>
  {/if}

  {#if computed.showGodkjentDager && !sendForesporsel}
    <div class="question-block">
      <div class="question-header">
        <span class="question-label">Utmåling</span>
        <span class="font-mono question-ref">§ 33.5</span>
      </div>
      <p class="question-text">
        Fristforlengelsen skal svare til den virkning kontraktsforholdet har hatt på fremdriften.
      </p>
      {#if computed.port3ErSubsidiaer}
        <Stamp variant="ochre" small flat>Subsidiært</Stamp>
      {/if}
      <div class="measurement-row">
        <div>
          <div class="measurement-label">Krevd</div>
          <div class="font-mono measurement-value">{d.te.value} dager</div>
        </div>
        <div>
          <div class="measurement-input-label">Godkjent dager</div>
          <input
            type="number"
            min="0"
            max={domainConfig.krevdDager}
            value={godkjentDager ?? ''}
            oninput={(e) => {
              const v = parseInt(e.currentTarget.value);
              godkjentDager = isNaN(v) ? undefined : v;
            }}
            placeholder="dager"
            class="font-mono measurement-input"
          />
        </div>
      </div>
    </div>
  {/if}

  {#if allAnswered}
    <div class="result-box" style:border-color={resultat.color}>
      <div class="result-header" style:color={resultat.color}>
        <resultat.ikon size={18} />
        <span class="result-label">{resultat.label}</span>
      </div>
      {#if computed.prinsipaltResultat !== 'avslatt' && godkjentDager !== undefined}
        <div class="result-detail">
          <span class="font-mono result-days"
            >{godkjentDager} av {domainConfig.krevdDager} dager</span
          >
        </div>
      {/if}
      {#if computed.erRedusert}
        <p class="font-serif result-note">Kravet er redusert til det åpenbare (§ 33.6.1).</p>
      {/if}
      {#if computed.visSubsidiaertResultat}
        <div class="sub-result">
          <Stamp variant="ochre" small flat>Subsidiært</Stamp>
          <span class="font-mono sub-result-text">
            {computed.subsidiaertResultat === 'godkjent'
              ? 'Godkjent'
              : computed.subsidiaertResultat === 'delvis_godkjent'
                ? 'Delvis godkjent'
                : 'Avslått'}
            {#if computed.subsidiaertResultat !== 'avslatt' && godkjentDager !== undefined}
              — {godkjentDager} dager
            {/if}
          </span>
        </div>
      {/if}
    </div>

    {#if computed.prinsipaltResultat === 'avslatt' && !sendForesporsel}
      <div class="alert-box warning">
        <AlertTriangle size={14} />
        <span
          ><strong>§ 33.8 Forsering-risiko</strong> — Hvis avslaget er uberettiget, kan entreprenøren
          velge å anse det som et pålegg om forsering.</span
        >
      </div>
    {/if}
  {/if}
</div>

<style>
  /* Form-specific styles (shared styles in mockup.css) */
  .context-value {
    font-size: 22px;
    font-weight: 700;
    margin-bottom: 12px;
    letter-spacing: -0.02em;
  }
  .pill-row {
    display: flex;
    gap: 8px;
  }
  .measurement-row {
    display: flex;
    align-items: flex-end;
    gap: 32px;
  }
  .measurement-label {
    font-size: 12px;
    color: var(--ink-4);
    margin-bottom: 4px;
  }
  .measurement-value {
    font-size: 22px;
    font-weight: 700;
    letter-spacing: -0.02em;
  }
  .measurement-input {
    width: 140px;
  }
  .result-box {
    margin-top: 32px;
  }
  .result-detail {
    margin-top: 12px;
  }
  .result-days {
    font-size: 13px;
    font-weight: 600;
    color: var(--ink-2);
  }
  .result-note {
    font-style: italic;
    margin-top: 8px;
  }
  .checkbox-row {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    cursor: pointer;
  }
  .checkbox-row input[type='checkbox'] {
    width: 18px;
    height: 18px;
    margin-top: 2px;
    accent-color: var(--plate);
    flex-shrink: 0;
  }
  .checkbox-label {
    font-size: 13px;
    font-weight: 700;
  }
  .checkbox-desc {
    font-size: 12px;
    color: var(--ink-3);
    margin-top: 4px;
  }
</style>
