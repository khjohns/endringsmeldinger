<script lang="ts">
  import { AlertTriangle, Check, X, CircleMinus } from 'lucide-svelte';
  import {
    beregnAlt,
    getDefaults,
    erSubsidiaer as erSubsidiaerFn,
    erHelVederlagSubsidiaerPgaGrunnlag,
    erKravlinjeGyldig,
  } from '$lib/domain/vederlagDomain';
  import type {
    VederlagFormState,
    VederlagDomainConfig,
    BelopVurdering,
  } from '$lib/domain/vederlagDomain';
  import { generateVederlagResponseBegrunnelse } from '$lib/domain/begrunnelse/vederlagBegrunnelse';
  import type { VederlagResponseInput } from '$lib/domain/begrunnelse/vederlagBegrunnelse';
  import { tokensToHtml } from '$lib/editor/tokenConverter';
  import { isHtmlEmpty } from '$lib/utils/formatters';
  import {
    VEDERLAGSMETODER_OPTIONS,
    getVederlagsmetodeShortLabel,
  } from '$lib/constants/paymentMethods';
  import type { VederlagsMetode } from '$lib/types/timeline';
  import RichTextEditor from '$lib/components/primitives/RichTextEditor.svelte';
  import LockedValueNode from '$lib/editor/LockedValueNode';
  import { RefreshCw } from 'lucide-svelte';
  import { store } from './store.svelte.js';
  import { TE, BH } from './data.js';
  import { fmt } from './utils.js';
  import Stamp from './Stamp.svelte';
  import SubStripe from './SubStripe.svelte';
  import Diamond from './Diamond.svelte';
  import CaseAnchor from './CaseAnchor.svelte';
  import { toggleChoice } from './utils.js';

  let {
    onsend,
    onactions,
  }: {
    onsend: () => void;
    onactions?: (a: { canSend: boolean; send: () => void }) => void;
  } = $props();

  const d = store.tracks.vederlag;

  /**
   * Mock domain config for KOE-104:
   * TE claims 450.000,- via regningsarbeid. Grunnlag is disputed (subsidiaer).
   */
  const domainConfig: VederlagDomainConfig = {
    metode: 'REGNINGSARBEID',
    hovedkravBelop: d.te.value!,
    riggBelop: undefined,
    produktivitetBelop: undefined,
    harRiggKrav: false,
    harProduktivitetKrav: false,
    kreverJustertEp: false,
    hovedkategori: 'SVIKT',
    grunnlagVarsletForSent: false,
    grunnlagStatus: 'avslatt',
  };

  const initialDefaults = getDefaults({ isUpdateMode: false });

  // Port 1: Preklusjon
  let hovedkravVarsletITide = $state<boolean | undefined>(initialDefaults.hovedkravVarsletITide);
  let riggVarsletITide = $state<boolean | undefined>(initialDefaults.riggVarsletITide);
  let produktivitetVarsletITide = $state<boolean | undefined>(
    initialDefaults.produktivitetVarsletITide
  );

  // Port 2: Metode
  let akseptererMetode = $state<boolean | undefined>(initialDefaults.akseptererMetode);
  let oensketMetode = $state<VederlagsMetode | undefined>(initialDefaults.oensketMetode);

  // Port 3: Beløp
  let hovedkravVurdering = $state<BelopVurdering | undefined>(initialDefaults.hovedkravVurdering);
  let hovedkravGodkjentBelop = $state<number | undefined>(initialDefaults.hovedkravGodkjentBelop);
  let riggVurdering = $state<BelopVurdering | undefined>(initialDefaults.riggVurdering);
  let riggGodkjentBelop = $state<number | undefined>(initialDefaults.riggGodkjentBelop);
  let produktivitetVurdering = $state<BelopVurdering | undefined>(
    initialDefaults.produktivitetVurdering
  );
  let produktivitetGodkjentBelop = $state<number | undefined>(
    initialDefaults.produktivitetGodkjentBelop
  );

  // Begrunnelse state (declared before formState which references it)
  let begrunnelseHtml = $state('');
  let userHasEdited = $state(false);
  let editorApi: { setContent: (html: string) => void } | undefined;
  let prevHtml: string | undefined;
  let charCount = $state(0);

  const formState: VederlagFormState = $derived({
    hovedkravVarsletITide,
    riggVarsletITide,
    produktivitetVarsletITide,
    akseptererMetode,
    oensketMetode,
    holdTilbake: false,
    hovedkravVurdering,
    hovedkravGodkjentBelop,
    riggVurdering,
    riggGodkjentBelop,
    produktivitetVurdering,
    produktivitetGodkjentBelop,
    begrunnelse: begrunnelseHtml,
  });

  const computed = $derived(beregnAlt(formState, domainConfig));
  const isSubsidiaer = $derived(erSubsidiaerFn(domainConfig));

  const subsidiærGrunn = $derived.by(() => {
    if (domainConfig.grunnlagStatus === 'avslatt') return 'grunnlag_avslatt' as const;
    if (erHelVederlagSubsidiaerPgaGrunnlag(domainConfig)) return 'grunnlag_32_2' as const;
    return null;
  });

  const subsidiærNotice = $derived.by(() => {
    if (subsidiærGrunn === 'grunnlag_avslatt')
      return 'Grunnlaget er avslått. Vurderingen nedenfor gjelder for det tilfelle at grunnlaget likevel godkjennes.';
    if (subsidiærGrunn === 'grunnlag_32_2')
      return 'Grunnlaget ble varslet for sent (§32.2). Hele vederlagskravet behandles subsidiært.';
    return '';
  });

  // Count active subsidiary conditions for diamond counter (scenario 3)
  const subsidiærDiamondCount = $derived.by(() => {
    let count = 0;
    if (isSubsidiaer) count++; // Base: grunnlag bestridt
    // Each preklusjon answer = "nei" adds a condition
    if (computed.harPreklusjonsSteg) {
      for (const l of preklusjonsLinjer) {
        if (l.value === false) count++;
      }
    }
    return count;
  });

  const resultat = $derived.by(() => {
    const r = computed.prinsipaltResultat;
    if (r === 'godkjent') return { ikon: Check, label: 'Godkjent', color: 'var(--green)' };
    if (r === 'delvis_godkjent')
      return { ikon: CircleMinus, label: 'Delvis godkjent', color: 'var(--gold)' };
    return { ikon: X, label: 'Avslått', color: 'var(--red)' };
  });

  // Data-driven preklusjonslinjer (matches production BhVederlagResponse)
  const preklusjonsLinjer = $derived.by(() => {
    const linjer: Array<{ key: string; label: string; ref: string; value: boolean | undefined }> =
      [];
    if (computed.har34_1_2_Preklusjon) {
      linjer.push({
        key: 'hovedkrav',
        label: 'Varsling hovedkrav',
        ref: '§ 34.1.2',
        value: hovedkravVarsletITide,
      });
    }
    if (domainConfig.harRiggKrav) {
      linjer.push({
        key: 'rigg',
        label: 'Varsling rigg og drift',
        ref: '§ 34.1.3',
        value: riggVarsletITide,
      });
    }
    if (domainConfig.harProduktivitetKrav) {
      linjer.push({
        key: 'produktivitet',
        label: 'Varsling produktivitetstap',
        ref: '§ 34.1.3',
        value: produktivitetVarsletITide,
      });
    }
    return linjer;
  });

  function handlePreklusjon(key: string, value: boolean | undefined) {
    if (key === 'hovedkrav') hovedkravVarsletITide = value;
    else if (key === 'rigg') riggVarsletITide = value;
    else produktivitetVarsletITide = value;
  }

  // Data-driven kravlinjer (matches production BhVederlagResponse)
  interface KravlinjeItem {
    key: string;
    title: string;
    paragrafRef: string;
    krevdBelop: number | undefined;
    prekludert: boolean;
    vurdering: BelopVurdering | undefined;
    godkjentBelop: number | undefined;
  }

  const kravlinjer = $derived.by(() => {
    const linjer: KravlinjeItem[] = [
      {
        key: 'hovedkrav',
        title: 'Hovedkrav',
        paragrafRef: '§ 34.1.1–34.1.2',
        krevdBelop: domainConfig.hovedkravBelop,
        prekludert: computed.hovedkravPrekludert,
        vurdering: hovedkravVurdering,
        godkjentBelop: hovedkravGodkjentBelop,
      },
    ];
    if (domainConfig.harRiggKrav) {
      linjer.push({
        key: 'rigg',
        title: 'Rigg og drift',
        paragrafRef: '§ 34.1.3',
        krevdBelop: domainConfig.riggBelop,
        prekludert: computed.riggPrekludert,
        vurdering: riggVurdering,
        godkjentBelop: riggGodkjentBelop,
      });
    }
    if (domainConfig.harProduktivitetKrav) {
      linjer.push({
        key: 'produktivitet',
        title: 'Produktivitetstap',
        paragrafRef: '§ 34.1.3',
        krevdBelop: domainConfig.produktivitetBelop,
        prekludert: computed.produktivitetPrekludert,
        vurdering: produktivitetVurdering,
        godkjentBelop: produktivitetGodkjentBelop,
      });
    }
    return linjer;
  });

  function handleKravlinjeVurdering(key: string, v: BelopVurdering | undefined) {
    if (key === 'hovedkrav') hovedkravVurdering = v;
    else if (key === 'rigg') riggVurdering = v;
    else produktivitetVurdering = v;
  }

  function handleKravlinjeBelop(key: string, v: number | undefined) {
    if (key === 'hovedkrav') hovedkravGodkjentBelop = v;
    else if (key === 'rigg') riggGodkjentBelop = v;
    else produktivitetGodkjentBelop = v;
  }

  // Alternative metode options (ekskluderer TEs metode)
  const metodeAlternativer = $derived(
    VEDERLAGSMETODER_OPTIONS.filter(
      (o): o is { value: string; label: string } => !!o.value && o.value !== domainConfig.metode
    )
  );

  // Validation (matches production kanSende)
  const allAnswered = $derived.by(() => {
    if (computed.harPreklusjonsSteg && preklusjonsLinjer.some((l) => l.value === undefined))
      return false;
    if (akseptererMetode === undefined) return false;
    if (akseptererMetode === false && !oensketMetode) return false;
    if (kravlinjer.some((l) => !erKravlinjeGyldig(l.vurdering, l.godkjentBelop))) return false;
    if (isHtmlEmpty(begrunnelseHtml)) return false;
    return true;
  });

  const autoBegrunnelseHtml = $derived.by(() => {
    if (akseptererMetode === undefined || hovedkravVurdering === undefined) return '';
    const input: VederlagResponseInput = {
      metode: domainConfig.metode,
      hovedkravBelop: domainConfig.hovedkravBelop,
      riggBelop: domainConfig.riggBelop,
      produktivitetBelop: domainConfig.produktivitetBelop,
      harRiggKrav: domainConfig.harRiggKrav,
      harProduktivitetKrav: domainConfig.harProduktivitetKrav,
      erGrunnlagPrekludert: domainConfig.grunnlagVarsletForSent,
      erGrunnlagAvslatt: domainConfig.grunnlagStatus === 'avslatt',
      hovedkravVarsletITide,
      riggVarsletITide,
      produktivitetVarsletITide,
      akseptererMetode: akseptererMetode!,
      oensketMetode,
      kreverJustertEp: domainConfig.kreverJustertEp,
      holdTilbake: false,
      hovedkravVurdering: hovedkravVurdering!,
      hovedkravGodkjentBelop,
      riggVurdering,
      riggGodkjentBelop,
      produktivitetVurdering,
      produktivitetGodkjentBelop,
      totalKrevd: computed.totalKrevdInklPrekludert,
      totalGodkjent: computed.totalGodkjent,
      totalGodkjentSubsidiaer: computed.totalGodkjentInklPrekludert,
      harPrekludertKrav: computed.harPrekludertKrav,
    };
    const tokens = generateVederlagResponseBegrunnelse(input, { useTokens: true });
    return tokensToHtml(tokens);
  });

  $effect(() => {
    if (!userHasEdited && autoBegrunnelseHtml) {
      begrunnelseHtml = autoBegrunnelseHtml;
    }
  });

  $effect(() => {
    if (editorApi && begrunnelseHtml !== prevHtml) {
      editorApi.setContent(begrunnelseHtml);
      prevHtml = begrunnelseHtml;
    }
  });

  function handleEditorReady(api: { setContent: (html: string) => void }) {
    editorApi = api;
    if (begrunnelseHtml) {
      api.setContent(begrunnelseHtml);
      prevHtml = begrunnelseHtml;
    }
  }

  function handleEditorChange(newHtml: string) {
    prevHtml = newHtml;
    begrunnelseHtml = newHtml;
    userHasEdited = true;
  }

  function handleRegenerate() {
    if (autoBegrunnelseHtml) {
      begrunnelseHtml = autoBegrunnelseHtml;
      userHasEdited = false;
    }
  }

  $effect(() => {
    onactions?.({
      canSend: allAnswered,
      send: () => {
        store.sendVederlagSvar(computed.totalGodkjent);
        onsend();
      },
    });
  });

  const vurderingOptions: { value: BelopVurdering; label: string; cls: string }[] = [
    { value: 'godkjent', label: 'Godkjent', cls: 'yes' },
    { value: 'delvis', label: 'Delvis', cls: 'partial' },
    { value: 'avslatt', label: 'Avvist', cls: 'no' },
  ];
</script>

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
      <Stamp variant="green" small flat>Subsidiært</Stamp>
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

<div class="form-content">
  <CaseAnchor />

  <div class="te-context">
    <div class="context-header">
      <div class="context-label-row">
        <d.icon size={14} style="color: var(--ink-3)" />
        <span class="context-label">{d.label} — {TE}s krav</span>
      </div>
      <span class="font-mono context-ref">§ 34.1</span>
    </div>
    <div class="font-mono context-value">{fmt(d.te.value!)},-</div>
    <div class="context-meta">
      <span class="font-mono context-metode"
        >{getVederlagsmetodeShortLabel(domainConfig.metode)} (§ 34.4)</span
      >
    </div>
    <p class="font-serif context-text">{d.teT}</p>
  </div>

  <div class="bh-heading">Byggherrens standpunkt</div>

  {#snippet formBody()}
    <!-- Preklusjon (data-drevet) -->
    {#if computed.harPreklusjonsSteg}
      {#each preklusjonsLinjer as linje (linje.key)}
        {@render yesNoPill(
          linje.label,
          linje.ref,
          'Ble kravet varslet uten ugrunnet opphold?',
          linje.value,
          'Ja, i tide',
          'Nei, prekludert',
          (v) => handlePreklusjon(linje.key, v),
          {
            alertHtml: `<strong>Preklusjon</strong> — Kravet vurderes som for sent varslet (${linje.ref}).`,
          }
        )}
      {/each}
      <div class="divider"></div>
    {/if}

    <!-- Diamond marker for each preklusjon "nei" (scenario 3: dobbelt sub.) -->
    {#if isSubsidiaer && preklusjonsLinjer.some((l) => l.value === false)}
      <Diamond />
    {/if}

    <!-- Beregningsmetode -->
    {@render yesNoPill(
      'Beregningsmetode',
      '§ 34.2',
      `Aksepterer du ${getVederlagsmetodeShortLabel(domainConfig.metode)?.toLowerCase() ?? 'beregningsmetoden'}?`,
      akseptererMetode,
      'Ja, akseptert',
      'Nei, bestrides',
      (v) => {
        akseptererMetode = v;
        if (v === true) oensketMetode = undefined;
      }
    )}

    {#if akseptererMetode === false}
      <div class="foretrukket-metode">
        <span class="foretrukket-label">Foretrukket metode:</span>
        <div class="pill-row">
          {#each metodeAlternativer as alt}
            <button
              class="pill"
              class:yes={oensketMetode === alt.value}
              onclick={() =>
                (oensketMetode =
                  oensketMetode === alt.value ? undefined : (alt.value as VederlagsMetode))}
              >{alt.label}</button
            >
          {/each}
        </div>
      </div>
    {/if}

    <div class="divider"></div>

    <!-- Kravlinjer (data-drevet) -->
    {#each kravlinjer as linje (linje.key)}
      <div class="question-block">
        <div class="question-header">
          <span class="question-label">{linje.title}</span>
          <span class="font-mono question-ref">{linje.paragrafRef}</span>
        </div>
        {#if linje.prekludert}
          <Stamp variant="red" small flat>Prekludert</Stamp>
        {:else}
          <div class="kravlinje-header">
            <span class="font-mono kravlinje-krevd">Krevd: {fmt(linje.krevdBelop ?? 0)},-</span>
          </div>
          <div class="vurdering-row">
            {#each vurderingOptions as opt}
              <button
                class="pill"
                class:yes={opt.cls === 'yes' && linje.vurdering === opt.value}
                class:partial={opt.cls === 'partial' && linje.vurdering === opt.value}
                class:no={opt.cls === 'no' && linje.vurdering === opt.value}
                onclick={() =>
                  handleKravlinjeVurdering(
                    linje.key,
                    linje.vurdering === opt.value ? undefined : opt.value
                  )}>{opt.label}</button
              >
            {/each}
          </div>
          {#if linje.vurdering === 'delvis'}
            <div class="measurement-row">
              <div>
                <div class="measurement-input-label">Godkjent beløp</div>
                <input
                  type="number"
                  min="0"
                  max={linje.krevdBelop}
                  value={linje.godkjentBelop ?? ''}
                  oninput={(e) => {
                    const v = parseInt(e.currentTarget.value);
                    handleKravlinjeBelop(linje.key, isNaN(v) ? undefined : v);
                  }}
                  placeholder="beløp"
                  class="font-mono measurement-input"
                />
              </div>
            </div>
          {/if}
        {/if}
      </div>
    {/each}

    {#if allAnswered || (akseptererMetode !== undefined && hovedkravVurdering !== undefined)}
      <div class="divider"></div>
      <div class="result-box" style:border-color={resultat.color}>
        <div class="result-header" style:color={resultat.color}>
          <resultat.ikon size={18} />
          <span class="result-label">{resultat.label}</span>
        </div>
        {#if computed.prinsipaltResultat !== 'avslatt'}
          <div class="result-detail">
            <span class="font-mono result-amount">
              {fmt(computed.totalGodkjent)},- av {fmt(computed.totalKrevdInklPrekludert)},-
            </span>
          </div>
        {/if}
        {#if computed.visSubsidiaertResultat}
          <div class="sub-result">
            <Stamp variant="green" small flat>Subsidiært</Stamp>
            <span class="font-mono sub-result-text">
              {computed.subsidiaertResultat === 'godkjent'
                ? 'Godkjent'
                : computed.subsidiaertResultat === 'delvis_godkjent'
                  ? 'Delvis godkjent'
                  : 'Avslått'}
              {#if computed.subsidiaertResultat !== 'avslatt'}
                — {fmt(computed.totalGodkjentInklPrekludert)},-
              {/if}
            </span>
          </div>
        {/if}
      </div>

      <div class="begrunnelse-section">
        <div class="question-header">
          <span class="question-label">Begrunnelse</span>
          <div class="begrunnelse-header-right">
            {#if userHasEdited && autoBegrunnelseHtml}
              <button class="regenerate-btn" onclick={handleRegenerate}>
                <RefreshCw size={12} strokeWidth={2} /> Regenerer
              </button>
            {/if}
            <span class="font-mono char-count">{charCount} tegn</span>
          </div>
        </div>
        <div class="editor-wrapper">
          <RichTextEditor
            body={begrunnelseHtml}
            onchange={handleEditorChange}
            onready={handleEditorReady}
            extensions={[LockedValueNode]}
            maxHeight="none"
            oncharcount={(c) => (charCount = c)}
          />
        </div>
      </div>
    {/if}
  {/snippet}

  {#if isSubsidiaer}
    <SubStripe notice={subsidiærNotice} diamondCount={subsidiærDiamondCount}>
      {@render formBody()}
    </SubStripe>
  {:else}
    {@render formBody()}
  {/if}
</div>

<style>
  /* Form-specific styles (shared styles in mockup.css) */
  .context-value {
    font-size: 22px;
    font-weight: 700;
    margin-bottom: 8px;
    letter-spacing: -0.02em;
  }
  .context-meta {
    margin-bottom: 12px;
  }
  .context-metode {
    font-size: 11px;
    font-weight: 500;
    color: var(--ink-3);
  }
  .pill-row,
  .vurdering-row {
    display: flex;
    gap: 8px;
  }
  .pill.partial {
    background: var(--gold);
    color: var(--ink);
    border-color: var(--gold);
  }
  .kravlinje-header {
    margin-bottom: 12px;
  }
  .kravlinje-krevd {
    font-size: 13px;
    font-weight: 600;
    color: var(--ink-2);
  }
  .measurement-row {
    margin-top: 16px;
  }
  .result-box {
    margin-top: 8px;
  }
  .result-detail {
    margin-top: 12px;
  }
  .result-amount {
    font-size: 13px;
    font-weight: 600;
    color: var(--ink-2);
  }
  .foretrukket-metode {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-top: 12px;
  }
  .foretrukket-label {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: var(--ink-4);
  }
</style>
