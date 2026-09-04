<script lang="ts">
  import { Check, X, CircleMinus } from 'lucide-svelte';
  import {
    beregnAlt,
    beregnGodkjentBelop,
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
  import { formatDateShortNorwegian } from '$lib/utils/dateFormatters';
  import {
    VEDERLAGSMETODER_OPTIONS,
    getVederlagsmetodeLabel,
    getVederlagsmetodeShortLabel,
  } from '$lib/constants/paymentMethods';
  import type { VederlagsMetode } from '$lib/types/timeline';
  import RichTextEditor from '$lib/components/primitives/RichTextEditor.svelte';
  import SectionHeading from '$lib/components/primitives/SectionHeading.svelte';
  import LockedValueNode from '$lib/editor/LockedValueNode';
  import { RefreshCw } from 'lucide-svelte';
  import { store } from './store.svelte.js';
  import { fmt, sporResultatLabel } from './utils.js';
  import Stamp from './Stamp.svelte';
  import CaseAnchor from './CaseAnchor.svelte';
  import { toggleChoice } from './utils.js';

  let {
    domainConfig,
    onsend,
    onactions,
  }: {
    domainConfig: VederlagDomainConfig;
    onsend: () => void;
    onactions?: (a: { canSend: boolean; send: () => void }) => void;
  } = $props();

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
  const submissionMeta = $derived.by(() => {
    const events = store.timeline.filter(
      (event) =>
        event.spor === 'vederlag' &&
        event.actorrole === 'TE' &&
        (event.type.endsWith('.vederlag_krav_sendt') ||
          event.type.endsWith('.vederlag_krav_oppdatert'))
    );
    const labelFor = (date: string | undefined, fallbackIndex = 0) => {
      if (!date) return undefined;
      const dateOnly = date.slice(0, 10);
      const matchingIndex = events.findIndex((event) => event.time?.slice(0, 10) === dateOnly);
      const revision = matchingIndex >= 0 ? matchingIndex : fallbackIndex;
      return `Sendt ${formatDateShortNorwegian(date)} · ${revision === 0 ? 'opprinnelig krav' : `rev. ${revision}`}`;
    };

    return {
      hovedkrav: labelFor(events[0]?.time, 0),
      rigg: labelFor(store.sak.vederlag.rigg_drift_varsel?.dato_sendt, 1),
      produktivitet: labelFor(store.sak.vederlag.produktivitetstap_varsel?.dato_sendt, 1),
    };
  });

  // TE's sammendrag data
  const sammendragKravlinjer = $derived.by(() => {
    const linjer: Array<{ label: string; belop: number }> = [];
    linjer.push({ label: 'Hovedkrav', belop: domainConfig.hovedkravBelop });
    if (domainConfig.harRiggKrav && domainConfig.riggBelop) {
      linjer.push({ label: 'Rigg og drift', belop: domainConfig.riggBelop });
    }
    if (domainConfig.harProduktivitetKrav && domainConfig.produktivitetBelop) {
      linjer.push({ label: 'Produktivitetstap', belop: domainConfig.produktivitetBelop });
    }
    return linjer;
  });
  const sammendragTotalKrevd = $derived(sammendragKravlinjer.reduce((sum, l) => sum + l.belop, 0));

  // Begrunnelse expand/collapse
  let begrunnelseUtvidet = $state(false);
  let begrunnelseEl = $state<HTMLElement | null>(null);
  const erBegrunnelseAvkortet = $derived(
    begrunnelseEl ? begrunnelseEl.scrollHeight > begrunnelseEl.clientHeight : false
  );

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

  const resultat = $derived.by(() => {
    const r = computed.prinsipaltResultat;
    const label = sporResultatLabel(r);
    const konklusjon = `Kravet er ${label.toLocaleLowerCase('nb-NO')}`;
    if (r === 'godkjent') return { ikon: Check, konklusjon, variant: 'positive' as const };
    if (r === 'delvis_godkjent')
      return { ikon: CircleMinus, konklusjon, variant: 'mixed' as const };
    return { ikon: X, konklusjon, variant: 'negative' as const };
  });

  // Granulær resultat-rad per kostnadselement (kravlinje).
  interface ResultatRad {
    key: string;
    title: string;
    paragrafRef: string;
    krevdBelop: number | undefined;
    prekludert: boolean;
    vurdering: BelopVurdering | undefined;
    prinsipaltGodkjent: number;
    subsidiaertGodkjent: number;
  }

  const resultatRader = $derived.by(() => {
    const rader: ResultatRad[] = [];
    const preklusjon = {
      hovedkrav: computed.hovedkravPrekludert,
      rigg: computed.riggPrekludert,
      produktivitet: computed.produktivitetPrekludert,
    };
    const kravMap: Record<
      string,
      {
        title: string;
        ref: string;
        belop: number;
        vurdering: BelopVurdering | undefined;
        godkjentBelop: number | undefined;
      }
    > = {
      hovedkrav: {
        title: 'Hovedkrav',
        ref: '§34.1.1–34.1.2',
        belop: domainConfig.hovedkravBelop,
        vurdering: hovedkravVurdering,
        godkjentBelop: hovedkravGodkjentBelop,
      },
    };
    if (domainConfig.harRiggKrav) {
      kravMap.rigg = {
        title: 'Rigg og drift',
        ref: '§34.1.3',
        belop: domainConfig.riggBelop ?? 0,
        vurdering: riggVurdering,
        godkjentBelop: riggGodkjentBelop,
      };
    }
    if (domainConfig.harProduktivitetKrav) {
      kravMap.produktivitet = {
        title: 'Produktivitetstap',
        ref: '§34.1.3',
        belop: domainConfig.produktivitetBelop ?? 0,
        vurdering: produktivitetVurdering,
        godkjentBelop: produktivitetGodkjentBelop,
      };
    }
    for (const key of Object.keys(kravMap)) {
      const k = kravMap[key];
      if (k.belop == null) continue;
      const prekl = preklusjon[key as keyof typeof preklusjon];
      const prinsipalt = prekl
        ? 0
        : beregnGodkjentBelop(k.vurdering, k.belop, k.godkjentBelop, false);
      const subsidiaert = beregnGodkjentBelop(k.vurdering, k.belop, k.godkjentBelop, false);
      rader.push({
        key,
        title: k.title,
        paragrafRef: k.ref,
        krevdBelop: k.belop,
        prekludert: prekl,
        vurdering: k.vurdering,
        prinsipaltGodkjent: prinsipalt,
        subsidiaertGodkjent: subsidiaert,
      });
    }
    return rader;
  });

  // Data-driven preklusjonslinjer (matches production BhVederlagResponse)
  const preklusjonsLinjer = $derived.by(() => {
    const linjer: Array<{
      key: string;
      label: string;
      ref: string;
      value: boolean | undefined;
      submissionMeta?: string;
    }> = [];
    if (computed.har34_1_2_Preklusjon) {
      linjer.push({
        key: 'hovedkrav',
        label: 'Varsling hovedkrav',
        ref: '§ 34.1.2',
        value: hovedkravVarsletITide,
        submissionMeta: submissionMeta.hovedkrav,
      });
    }
    if (domainConfig.harRiggKrav) {
      linjer.push({
        key: 'rigg',
        label: 'Varsling rigg og drift',
        ref: '§ 34.1.3',
        value: riggVarsletITide,
        submissionMeta: submissionMeta.rigg,
      });
    }
    if (domainConfig.harProduktivitetKrav) {
      linjer.push({
        key: 'produktivitet',
        label: 'Varsling produktivitetstap',
        ref: '§ 34.1.3',
        value: produktivitetVarsletITide,
        submissionMeta: submissionMeta.produktivitet,
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

  function formatNumberInput(n: number | undefined): string {
    return n != null ? n.toLocaleString('nb-NO') : '';
  }

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
    // Read begrunnelseHtml unconditionally to always track as dependency.
    // Without this, the && short-circuit prevents Svelte from tracking the
    // dependency when editorApi is not yet set, and the effect never re-runs.
    const html = begrunnelseHtml;
    if (editorApi && html !== prevHtml) {
      editorApi.setContent(html);
      prevHtml = html;
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
        store.sendVederlagSvar(computed.totalGodkjent, {
          hovedkravVarsletITide,
          riggVarsletITide,
          produktivitetVarsletITide,
          akseptererMetode,
          oensketMetode,
          hovedkravVurdering,
          hovedkravGodkjentBelop,
          riggVurdering,
          riggGodkjentBelop,
          produktivitetVurdering,
          produktivitetGodkjentBelop,
          subsidiaerGodkjentBelop: isSubsidiaer ? computed.totalGodkjentInklPrekludert : undefined,
          begrunnelse: begrunnelseHtml,
        });
        onsend();
      },
    });
  });

  const vurderingOptions: {
    value: BelopVurdering;
    label: string;
    cls: string;
    icon?: typeof Check;
  }[] = [
    { value: 'godkjent', label: sporResultatLabel('godkjent'), cls: 'yes', icon: Check },
    { value: 'delvis', label: sporResultatLabel('delvis_godkjent'), cls: 'partial' },
    { value: 'avslatt', label: sporResultatLabel('avslatt'), cls: 'no', icon: X },
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
  opts?: { alertText?: string }
)}
  <div class="question-block">
    <SectionHeading title={label} paragrafRef={ref} />
    <p class="question-text">{text}</p>
    <div class="segment-row">
      <button
        class="segment-btn"
        class:segment-active={answer === true}
        class:seg-yes={answer === true}
        onclick={() => onset(toggleChoice(answer, true))}>{yesText}</button
      >
      <button
        class="segment-btn"
        class:segment-active={answer === false}
        class:seg-no={answer === false}
        onclick={() => onset(toggleChoice(answer, false))}>{noText}</button
      >
    </div>
    {#if answer === false && opts?.alertText}
      <p class="font-serif consequence-text">{opts.alertText}</p>
    {/if}
  </div>
{/snippet}

<div class="form-content">
  <CaseAnchor />

  <div class="form-title-row">
    <h1>Krav om vederlagsjustering</h1>
    {#if isSubsidiaer}
      <span class="subsidiaer-chip">Subsidiært</span>
    {/if}
  </div>

  <div class="sammendrag">
    <div class="sammendrag-header">
      <div>
        <span class="sammendrag-eyebrow">Entreprenørens krav</span>
        <h2>{store.teNavn}</h2>
      </div>
      <span class="font-mono sammendrag-ref">§ 34.1</span>
    </div>

    <div class="sammendrag-okonomi">
      {#if domainConfig.metode}
        <div class="sammendrag-metode">
          <span class="sammendrag-metode-label">Beregningsmetode</span>
          <span class="sammendrag-metode-verdi">{getVederlagsmetodeLabel(domainConfig.metode)}</span
          >
        </div>
      {/if}

      <div class="sammendrag-kravlinjer">
        <div class="sammendrag-kravlinje">
          <span class="sammendrag-kravlinje-label">Hovedkrav</span>
          <span class="font-mono sammendrag-kravlinje-belop"
            >{fmt(domainConfig.hovedkravBelop)},-</span
          >
        </div>
        {#if domainConfig.harRiggKrav && domainConfig.riggBelop}
          <div class="sammendrag-kravlinje">
            <span class="sammendrag-kravlinje-label">Rigg og drift</span>
            <span class="font-mono sammendrag-kravlinje-belop">{fmt(domainConfig.riggBelop)},-</span
            >
          </div>
        {/if}
        {#if domainConfig.harProduktivitetKrav && domainConfig.produktivitetBelop}
          <div class="sammendrag-kravlinje">
            <span class="sammendrag-kravlinje-label">Produktivitetstap</span>
            <span class="font-mono sammendrag-kravlinje-belop"
              >{fmt(domainConfig.produktivitetBelop)},-</span
            >
          </div>
        {/if}
        {#if sammendragKravlinjer.length > 1}
          <div class="sammendrag-kravlinje sammendrag-sum">
            <span class="sammendrag-kravlinje-label">Sum krevd</span>
            <span class="font-mono sammendrag-kravlinje-belop">{fmt(sammendragTotalKrevd)},-</span>
          </div>
        {/if}
      </div>
    </div>

    {#if store.display('vederlag').teText}
      <div class="sammendrag-begrunnelse-panel">
        <span class="sammendrag-begrunnelse-label">Entreprenørens begrunnelse</span>
        <div
          class="sammendrag-begrunnelse"
          class:avkortet={!begrunnelseUtvidet}
          bind:this={begrunnelseEl}
        >
          <p>{store.display('vederlag').teText}</p>
        </div>
        {#if erBegrunnelseAvkortet || begrunnelseUtvidet}
          <button
            class="vis-mer-btn"
            aria-expanded={begrunnelseUtvidet}
            onclick={() => (begrunnelseUtvidet = !begrunnelseUtvidet)}
          >
            {begrunnelseUtvidet ? 'Vis mindre' : 'Vis hele begrunnelsen'}
          </button>
        {/if}
      </div>
    {/if}
  </div>

  {#snippet formBodyBelow()}
    <!-- Beregningsmetode -->
    {@render yesNoPill(
      'Beregningsmetode',
      '§ 34.2',
      `TE krever ${getVederlagsmetodeShortLabel(domainConfig.metode)?.toLowerCase() ?? 'ukjent metode'}. Aksepterer du beregningsmetoden?`,
      akseptererMetode,
      'Ja',
      'Nei',
      (v) => {
        akseptererMetode = v;
        if (v === true) oensketMetode = undefined;
      }
    )}

    {#if akseptererMetode === false}
      <div class="foretrukket-metode">
        <span class="foretrukket-label">Foretrukket metode:</span>
        <div class="segment-row">
          {#each metodeAlternativer as alt (alt.value)}
            <button
              class="segment-btn"
              class:segment-active={oensketMetode === alt.value}
              onclick={() =>
                (oensketMetode =
                  oensketMetode === alt.value ? undefined : (alt.value as VederlagsMetode))}
              >{alt.label}</button
            >
          {/each}
        </div>
      </div>
    {/if}

    <!-- Kravlinjer (data-drevet) -->
    {#each kravlinjer as linje (linje.key)}
      <div class="question-block krav-linje-block">
        <SectionHeading title={linje.title} paragrafRef={linje.paragrafRef} />
        {#snippet kravlinjeContent()}
          <div class="kravlinje-header">
            <span class="font-mono kravlinje-krevd"
              >Krevd: <strong>{fmt(linje.krevdBelop ?? 0)}</strong> kr</span
            >
          </div>
          <div class="segment-row">
            {#each vurderingOptions as opt (opt.value)}
              {@const Icon = opt.icon}
              <button
                class="segment-btn"
                class:segment-active={linje.vurdering === opt.value}
                class:seg-yes={opt.cls === 'yes' && linje.vurdering === opt.value}
                class:seg-partial={opt.cls === 'partial' && linje.vurdering === opt.value}
                class:seg-no={opt.cls === 'no' && linje.vurdering === opt.value}
                onclick={() =>
                  handleKravlinjeVurdering(
                    linje.key,
                    linje.vurdering === opt.value ? undefined : opt.value
                  )}
              >
                {#if Icon}
                  <Icon size={12} strokeWidth={2.5} />
                {/if}
                {opt.label}</button
              >
            {/each}
          </div>
          {#if linje.vurdering === 'delvis'}
            <div class="number-field">
              <div class="number-input-label">Godkjent beløp</div>
              <div class="number-input-wrap">
                <input
                  type="text"
                  inputmode="numeric"
                  value={formatNumberInput(linje.godkjentBelop)}
                  oninput={(e) => {
                    const input = e.currentTarget;
                    const raw = input.value.replace(/[^\d]/g, '');
                    if (raw === '') {
                      handleKravlinjeBelop(linje.key, undefined);
                      input.value = '';
                      return;
                    }
                    const num = parseInt(raw);
                    if (isNaN(num)) return;
                    const clamped = Math.min(num, linje.krevdBelop ?? Infinity);
                    handleKravlinjeBelop(linje.key, clamped);

                    // Formater under inntasting med cursor-justering
                    const formatted = clamped.toLocaleString('nb-NO');
                    const oldLen = input.value.length;
                    const newLen = formatted.length;
                    const cursorFromEnd = oldLen - input.selectionStart!;
                    input.value = formatted;
                    const newPos = Math.max(0, newLen - cursorFromEnd);
                    input.setSelectionRange(newPos, newPos);
                  }}
                  onfocus={(e) => {
                    if (linje.godkjentBelop != null) {
                      e.currentTarget.value = String(linje.godkjentBelop);
                    }
                  }}
                  onblur={(e) => {
                    if (linje.godkjentBelop != null) {
                      e.currentTarget.value = linje.godkjentBelop.toLocaleString('nb-NO');
                    }
                  }}
                  placeholder="0"
                  class="font-mono measurement-input"
                />
                <span class="number-input-suffix">kr</span>
              </div>
              {#if linje.krevdBelop}
                <div class="number-input-ref">Av {fmt(linje.krevdBelop)} kr krevd</div>
              {/if}
            </div>
          {/if}
        {/snippet}

        {#if linje.prekludert}
          <span class="subsidiaer-chip kravlinje-subsidiaer-chip">Subsidiært</span>
        {/if}
        {@render kravlinjeContent()}
      </div>
    {/each}

    {#if allAnswered || (akseptererMetode !== undefined && hovedkravVurdering !== undefined)}
      <div class="result-box konsekvens-{resultat.variant}">
        <div class="result-header">
          <resultat.ikon size={18} />
          <span class="result-label">{resultat.konklusjon}</span>
        </div>

        <div class="result-tabell">
          <div class="tr tr-head">
            <span class="td td-krav">Krav</span>
            <span class="td td-tal">Krevd</span>
            <span class="td td-tal">Prinsipalt godkjent</span>
            {#if computed.visSubsidiaertResultat}
              <span class="td td-tal">Subsidiært godkjent</span>
            {/if}
          </div>
          {#each resultatRader as rad (rad.key)}
            <div class="tr">
              <span class="td td-krav">
                {rad.title}
                <span class="td-ref">{rad.paragrafRef}</span>
              </span>
              <span class="td td-tal font-mono">{fmt(rad.krevdBelop ?? 0)} kr</span>
              <span class="td td-tal font-mono">
                {#if rad.prekludert}
                  <Stamp variant="avslag" small flat>Prekludert</Stamp>
                {:else if rad.vurdering === 'avslatt'}
                  <span class="td-avslag">{fmt(rad.prinsipaltGodkjent)} kr</span>
                {:else if rad.vurdering === 'delvis' && rad.prinsipaltGodkjent > 0}
                  <span class="td-delvis">{fmt(rad.prinsipaltGodkjent)} kr</span>
                {:else}
                  <span>{fmt(rad.prinsipaltGodkjent)} kr</span>
                {/if}
              </span>
              {#if computed.visSubsidiaertResultat}
                <span class="td td-tal font-mono">
                  {#if rad.prekludert && rad.vurdering === 'avslatt'}
                    <span class="td-avslag">{fmt(rad.subsidiaertGodkjent)} kr</span>
                  {:else if rad.prekludert && rad.vurdering === 'delvis'}
                    <span class="td-delvis">{fmt(rad.subsidiaertGodkjent)} kr</span>
                  {:else if rad.prekludert}
                    <span>{fmt(rad.subsidiaertGodkjent)} kr</span>
                  {:else}
                    <span class="td-emo">—</span>
                  {/if}
                </span>
              {/if}
            </div>
          {/each}
          <div class="tr tr-total">
            <span class="td td-krav">Totalt</span>
            <span class="td td-tal font-mono">{fmt(computed.totalKrevdInklPrekludert)} kr</span>
            <span class="td td-tal font-mono">{fmt(computed.totalGodkjent)} kr</span>
            {#if computed.visSubsidiaertResultat}
              <span class="td td-tal font-mono">{fmt(computed.totalGodkjentInklPrekludert)} kr</span
              >
            {/if}
          </div>
        </div>
      </div>

      <div class="begrunnelse-section">
        <div class="sh-heading">
          <span class="sh-title">Begrunnelse</span>
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

  {#snippet formBody()}
    <div class="standpunkt-heading">
      <span class="standpunkt-title">Byggherrens standpunkt</span>
      {#if isSubsidiaer}
        <span class="subsidiaer-chip">Subsidiært</span>
      {/if}
    </div>

    <!-- Preklusjon (data-drevet, segment buttons) -->
    {#if computed.harPreklusjonsSteg}
      <div class="preklusjon-section">
        <SectionHeading title="Preklusjon" paragrafRef="§34.1.2 / §34.1.3" />
        <p class="question-text">Er kravene varslet innen kontraktens varslingsfrister?</p>
        {#each preklusjonsLinjer as linje (linje.key)}
          <div class="preklusjons-rad">
            <span class="preklusjons-copy">
              <span class="preklusjons-label">{linje.label} ({linje.ref})</span>
              {#if linje.submissionMeta}
                <span class="preklusjons-meta">{linje.submissionMeta}</span>
              {/if}
            </span>
            <div class="segment-row">
              <button
                class="segment-btn"
                class:segment-active={linje.value === true}
                class:seg-yes={linje.value === true}
                onclick={() => handlePreklusjon(linje.key, toggleChoice(linje.value, true))}
                >Ja, i tide</button
              >
              <button
                class="segment-btn"
                class:segment-active={linje.value === false}
                class:seg-no={linje.value === false}
                onclick={() => handlePreklusjon(linje.key, toggleChoice(linje.value, false))}
                >Nei, prekludert</button
              >
            </div>
          </div>
        {/each}
      </div>
    {/if}

    {@render formBodyBelow()}
  {/snippet}

  {#if isSubsidiaer && subsidiærNotice}
    <div class="subsidiaer-notice">
      <span class="subsidiaer-notice-mark" aria-hidden="true"></span>
      <p>{subsidiærNotice}</p>
    </div>
  {/if}
  {@render formBody()}
</div>

<style>
  /* Form-specific styles (shared styles in mockup.css) */

  .form-title-row {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 20px;
  }
  .form-title-row h1 {
    font-size: 30px;
    font-weight: 700;
    line-height: 36px;
    letter-spacing: -0.02em;
    color: var(--ink);
  }

  .subsidiaer-notice {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 14px 16px;
    margin-bottom: 24px;
    color: var(--ink-2);
    background: var(--info-bg);
    border: var(--rule-strong);
    border-radius: 12px;
    font-size: 13px;
    line-height: 1.6;
  }
  .subsidiaer-notice p {
    margin: 0;
  }
  .subsidiaer-notice-mark {
    flex: none;
    width: 10px;
    height: 10px;
    margin-top: 5px;
    background: var(--brand);
    border-radius: 1px;
    transform: rotate(45deg);
  }

  .standpunkt-heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin: 4px 0 16px;
    padding-bottom: 10px;
    border-bottom: 1px solid var(--color-wire);
  }
  .standpunkt-title {
    font-size: 12px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--ink-3);
  }

  /* ── TE's vederlagskrav-sammendrag ── */
  .sammendrag {
    margin-bottom: 32px;
    overflow: hidden;
    background: var(--surface);
    border: var(--rule);
    border-radius: 12px;
    box-shadow: var(--overlay-shadow-sm);
  }
  .sammendrag-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    padding: 14px 16px;
    border-bottom: var(--rule);
  }
  .sammendrag-header > div {
    display: flex;
    flex-direction: column;
    gap: 3px;
    min-width: 0;
  }
  .sammendrag-eyebrow,
  .sammendrag-begrunnelse-label,
  .sammendrag-metode-label {
    font-size: 10px;
    font-weight: 600;
    line-height: 1.2;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--ink-4);
  }
  .sammendrag-header h2 {
    margin: 0;
    font-size: 13px;
    font-weight: 700;
    line-height: 1.35;
    text-transform: uppercase;
    letter-spacing: 0.02em;
    color: var(--ink);
  }
  .sammendrag-ref {
    flex: none;
    font-size: 11px;
    color: var(--ink-4);
  }
  .sammendrag-okonomi {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 16px;
    background: var(--surface-warm);
  }

  /* ── Lokal overskrift for begrunnelse (har ekstra kontroller; ellers identisk med SectionHeading) ── */
  .sh-heading {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 12px;
    padding-bottom: 8px;
    border-bottom: 1px solid var(--color-wire);
  }
  .sh-title {
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--ink-3);
  }

  /* ── Byggherrens beslutningsseksjoner ── */
  .form-content .question-block,
  .preklusjon-section {
    margin: 0 0 16px;
    padding: 18px;
    background: var(--surface);
    border: var(--rule);
    border-radius: 12px;
  }
  .question-block .question-text {
    margin: 14px 0;
    font-size: 14px;
    line-height: 1.55;
    color: var(--ink-2);
  }

  .sammendrag-metode {
    display: flex;
    align-items: baseline;
    gap: 12px;
    padding-bottom: 12px;
    border-bottom: var(--rule);
  }
  .sammendrag-metode-verdi {
    font-size: 13px;
    font-weight: 600;
    line-height: 1.4;
    color: var(--ink-2);
  }
  .sammendrag-kravlinjer {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .sammendrag-kravlinje {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    padding: 1px 0;
  }
  .sammendrag-kravlinje-label {
    font-size: 13px;
    color: var(--ink-2);
  }
  .sammendrag-kravlinje-belop {
    font-size: 13px;
    font-weight: 500;
    color: var(--ink);
  }
  .sammendrag-sum {
    border-top: var(--rule);
    padding-top: 7px;
    margin-top: 3px;
  }
  .sammendrag-sum .sammendrag-kravlinje-label {
    font-weight: 600;
    color: var(--ink);
  }
  .sammendrag-sum .sammendrag-kravlinje-belop {
    font-size: 14px;
    font-weight: 700;
  }
  .sammendrag-begrunnelse-panel {
    display: flex;
    flex-direction: column;
    gap: 9px;
    padding: 16px;
    border-top: var(--rule);
  }
  .sammendrag-begrunnelse {
    font-size: 14px;
    line-height: 1.65;
    color: var(--ink-2);
    overflow: hidden;
  }
  .sammendrag-begrunnelse p {
    margin: 0;
  }
  .sammendrag-begrunnelse.avkortet {
    max-height: calc(1.65em * 8);
  }
  .vis-mer-btn {
    width: fit-content;
    background: none;
    border: none;
    font-size: 12px;
    font-weight: 600;
    color: var(--green);
    cursor: pointer;
    padding: 0;
  }
  .vis-mer-btn:hover {
    color: var(--ink);
  }

  .subsidiaer-chip {
    display: inline-flex;
    align-items: center;
    width: fit-content;
    font-family: var(--font-mono);
    font-size: 10px;
    font-weight: 600;
    line-height: 1;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--green);
    padding: 5px 8px;
    background: color-mix(in srgb, var(--green-bg) 55%, transparent);
    border: 1px dashed var(--green);
    border-radius: 6px;
  }
  .kravlinje-subsidiaer-chip {
    margin-top: 12px;
    margin-bottom: 14px;
  }

  .kravlinje-header {
    margin: 14px 0 12px;
  }
  .kravlinje-krevd {
    font-size: 14px;
    font-weight: 600;
    color: var(--ink-2);
  }

  /* ── NumberInput ── */
  .number-field {
    display: flex;
    flex-direction: column;
    gap: 6px;
    max-width: 240px;
    margin-top: 14px;
  }
  .number-input-label {
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: var(--ink-3);
  }
  .number-input-wrap {
    display: flex;
    align-items: center;
    gap: 0;
  }
  .number-input-wrap .font-mono.measurement-input {
    border-radius: 4px 0 0 4px;
    flex: 1;
    text-align: right;
    font-variant-numeric: tabular-nums;
  }
  .number-input-suffix {
    font-family: var(--font-mono);
    font-size: 13px;
    font-weight: 500;
    color: var(--ink-3);
    padding: 8px 12px;
    background: var(--surface-inset);
    border: var(--control-border);
    border-left: none;
    border-radius: 0 4px 4px 0;
    white-space: nowrap;
  }
  .number-input-ref {
    font-size: 12px;
    color: var(--ink-4);
    margin-top: 2px;
  }
  .result-box {
    margin-top: 24px;
    padding: 16px;
    background: var(--surface);
    border: var(--rule-strong);
    border-radius: 12px;
  }
  .result-box.konsekvens-positive {
    background: var(--surface);
  }
  .result-box.konsekvens-negative {
    background: var(--surface);
  }
  .result-box.konsekvens-mixed {
    background: var(--surface);
  }
  .result-header {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 15px;
    font-weight: 700;
    letter-spacing: 0.01em;
    line-height: 1;
  }
  .konsekvens-positive .result-header {
    color: var(--success);
  }
  .konsekvens-negative .result-header {
    color: var(--danger);
  }
  .konsekvens-mixed .result-header {
    color: color-mix(in srgb, var(--warning) 78%, var(--ink));
  }

  /* ── Granulær resultat-tabell ── */
  .result-tabell {
    margin-top: 14px;
    border: var(--rule);
    border-radius: 8px;
    overflow: hidden;
  }
  .tr {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .tr + .tr {
    border-top: var(--rule);
  }
  .tr-head {
    background: var(--surface-inset);
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: var(--ink-4);
  }
  .td {
    padding: 8px 12px;
    min-width: 0;
  }
  .td-krav {
    flex: 1.4;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 2px;
    font-size: 13px;
    font-weight: 500;
    color: var(--ink-2);
  }
  .tr-head .td-krav {
    flex-direction: row;
  }
  .td-ref {
    font-family: var(--font-mono);
    font-size: 11px;
    font-weight: 400;
    color: var(--ink-4);
  }
  .td-tal {
    flex: 1;
    text-align: right;
    font-size: 13px;
    font-variant-numeric: tabular-nums;
    color: var(--ink-2);
  }
  .tr-total {
    background: var(--surface-inset);
    font-weight: 600;
  }
  .tr-total .td-krav {
    color: var(--ink);
    font-weight: 700;
  }
  .tr-total .td-tal {
    color: var(--ink);
    font-weight: 600;
  }
  .td-avslag {
    color: var(--danger);
  }
  .td-delvis {
    color: var(--ink-2);
  }
  .td-emo {
    color: var(--ink-4);
  }

  .foretrukket-metode {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-top: 14px;
    padding: 12px;
    background: var(--surface-inset);
    border-radius: 8px;
  }
  .foretrukket-label {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: var(--ink-4);
  }

  .begrunnelse-section {
    margin-top: 16px;
    padding: 18px;
    background: var(--surface);
    border: var(--rule);
    border-radius: 12px;
  }
  .begrunnelse-section .editor-wrapper {
    margin-top: 12px;
    overflow: hidden;
    border: var(--rule-strong);
    border-radius: 8px;
  }
  .begrunnelse-section .editor-wrapper:focus-within {
    border-color: var(--control-focus);
    box-shadow: var(--control-focus-ring);
  }
  .begrunnelse-section .regenerate-btn {
    padding: 5px 10px;
    background: var(--surface);
    border: var(--control-border);
    border-radius: 999px;
    color: var(--ink-3);
  }
  .begrunnelse-section .regenerate-btn:hover {
    color: var(--ink);
    background: var(--surface-inset);
    border-color: var(--ink-3);
  }

  .preklusjon-section {
    display: flex;
    flex-direction: column;
    gap: 0;
  }
  .preklusjon-section .question-text {
    margin: 14px 0 8px;
    font-size: 14px;
    line-height: 1.55;
  }
  .preklusjons-rad {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 10px 0;
    border-top: var(--rule-subtle);
  }
  .preklusjons-label {
    display: block;
    font-size: 13px;
    font-weight: 500;
    color: var(--ink-2);
  }
  .preklusjons-copy {
    min-width: 0;
  }
  .preklusjons-meta {
    display: block;
    margin-top: 3px;
    font-size: 11px;
    color: var(--ink-4);
  }

  /* ── Segment buttons ── */
  .segment-row {
    display: inline-flex;
    flex-wrap: wrap;
    gap: 3px;
    width: fit-content;
    padding: 3px;
    background: var(--surface-inset);
    border: var(--rule-strong);
    border-radius: 999px;
  }
  .segment-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 7px 14px;
    min-height: 34px;
    font-family: var(--font-sans);
    font-size: 13px;
    font-weight: 600;
    background: transparent;
    color: var(--ink-3);
    border: none;
    border-radius: 999px;
    cursor: pointer;
    transition:
      background 120ms,
      color 120ms,
      box-shadow 120ms;
    white-space: nowrap;
    line-height: 1;
  }
  .segment-btn:hover:not(.segment-active) {
    background: var(--surface);
    color: var(--ink);
  }
  .segment-active {
    background: var(--brand-2);
    color: white;
    box-shadow: 0 1px 2px rgba(27, 42, 34, 0.12);
  }
  .segment-active.seg-yes {
    background: var(--success);
    color: white;
  }
  .segment-active.seg-no {
    background: var(--danger);
    color: white;
  }
  .segment-active.seg-partial {
    background: var(--warning);
    color: white;
  }
</style>
